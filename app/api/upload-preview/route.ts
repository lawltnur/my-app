import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildIngest, diffCompanies, mergeFinancials } from "@/lib/ingest";
import { loadExistingCompanies, loadExistingFinancials } from "@/lib/ingest-db";
import { readIngestSheets } from "@/lib/ingest-excel";
import { logLoadFailure } from "@/lib/notices";
import { getSupabase } from "@/lib/supabase";

// 엑셀 업로드 미리보기 — 올린 파일을 검사하고 저장된 값과 비교한 결과만 돌려준다.
// 데이터베이스에는 아무것도 쓰지 않는다. (저장은 앱 밖 스크립트 npm run ingest -- 파일 --write 로만 한다.)
// Vercel은 요청 본문을 4.5MB까지만 받으므로, 그보다 작은 파일만 검사할 수 있다.

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PROBLEMS = 20;

type PreviewBody =
  | {
      ok: true;
      companies: number;
      largeCompanies: number;
      financialRows: number;
      rowsByQuarter: Record<string, number>;
      comparison: {
        companiesInserted: number;
        companiesUpdated: number;
        companiesUnchanged: number;
        rowsInserted: number;
        rowsUpdated: number;
        changedCells: number;
        rowsUnchanged: number;
        keptCells: number;
      } | null;
    }
  | { ok: false; message: string; problems?: string[] };

function fail(message: string, status: number, problems?: string[]) {
  const body: PreviewBody = { ok: false, message, problems };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return fail("파일을 읽지 못했습니다. 다시 올려 주세요.", 400);
  }

  if (!file || file.size === 0) return fail("엑셀 파일을 골라 주세요.", 400);
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return fail(".xlsx 형식의 엑셀 파일만 올릴 수 있습니다.", 400);
  }
  if (file.size > MAX_BYTES) {
    return fail("파일이 너무 큽니다. 4MB 이하 파일만 검사할 수 있습니다.", 413);
  }

  // 올린 파일은 임시 폴더에 잠깐 두고 읽은 뒤 바로 지운다.
  const tempPath = join(tmpdir(), `upload-${randomUUID()}.xlsx`);
  try {
    await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));
    const sheets = await readIngestSheets(tempPath);
    const result = buildIngest(sheets);
    if (!result.ok) {
      return fail(
        "저장할 수 없는 파일입니다. 아래 문제를 먼저 해결해 주세요.",
        422,
        result.problems.slice(0, MAX_PROBLEMS),
      );
    }

    // 저장된 데이터와 비교만 한다. (읽기 전용)
    let comparison: Extract<PreviewBody, { ok: true }>["comparison"] = null;
    try {
      const supabase = getSupabase();
      const quarters = Object.keys(result.summary.rowsByQuarter);
      const existingCompanies = await loadExistingCompanies(supabase);
      const existingFinancials = await loadExistingFinancials(supabase, quarters);
      if (existingCompanies.ok && existingFinancials.ok) {
        const c = diffCompanies(result.companies, existingCompanies.data).stats;
        const f = mergeFinancials(result.financials, existingFinancials.data).stats;
        comparison = {
          companiesInserted: c.inserted,
          companiesUpdated: c.updated,
          companiesUnchanged: c.unchanged,
          rowsInserted: f.inserted,
          rowsUpdated: f.updated,
          changedCells: f.changedCells,
          rowsUnchanged: f.unchanged,
          keptCells: f.keptCells,
        };
      } else {
        logLoadFailure(
          "upload-preview",
          !existingCompanies.ok
            ? existingCompanies.message
            : !existingFinancials.ok
              ? existingFinancials.message
              : "",
        );
      }
    } catch (error) {
      logLoadFailure("upload-preview", error instanceof Error ? error.message : String(error));
    }

    const body: PreviewBody = {
      ok: true,
      companies: result.companies.length,
      largeCompanies: result.summary.largeCompanies,
      financialRows: result.summary.financialRows,
      rowsByQuarter: result.summary.rowsByQuarter,
      comparison,
    };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("upload-preview 실패:", error instanceof Error ? error.message : String(error));
    return fail("파일을 검사하지 못했습니다. 올바른 원본 엑셀 파일인지 확인해 주세요.", 422);
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
