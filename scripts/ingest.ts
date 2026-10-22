import {
  buildIngest,
  diffCompanies,
  mergeFinancials,
  type IngestCompany,
  type IngestFinancial,
  type MergeStats,
  type CompanyDiffStats,
} from "../lib/ingest";
import {
  loadExistingCompanies,
  loadExistingFinancials,
  saveIngest,
  type UpsertClient,
} from "../lib/ingest-db";
import { readIngestSheets } from "../lib/ingest-excel";
import { getSupabase } from "../lib/supabase";

// Design Ref: §2-2 적재 흐름, §4 scripts/ingest.ts — 앱 밖에서 한 번 돌리는 적재 스크립트 (PLAN 2번)
// 원본 엑셀에서 필요한 항목만 추려 Supabase에 저장한다. 앱 화면에서 엑셀을 올리는 기능은 없다.
//
// 사용법
//   npm run ingest -- "엑셀 파일 경로"            미리보기: 읽고 검사하고 저장된 값과 비교만 한다. 저장하지 않는다.
//   npm run ingest -- "엑셀 파일 경로" --write    검사를 통과하면 바뀌는 부분만 Supabase에 저장한다.
//
// 연결 안 된 기업이 있거나 재무단위를 알 수 없으면 아무것도 저장하지 않고 멈춘다.
// 새 파일에서 비어 있는 칸은 이미 저장된 값을 지우지 않는다. 같은 파일을 다시 돌려도 바뀌는 것이 없다.

function printComparison(c: CompanyDiffStats, f: MergeStats): void {
  console.log("\n저장된 데이터와 비교 (읽기만 했습니다):");
  console.log(
    `  기업: 새로 ${c.inserted.toLocaleString()}곳, 내용이 바뀌는 ${c.updated.toLocaleString()}곳, 그대로 ${c.unchanged.toLocaleString()}곳`,
  );
  console.log(
    `  재무: 새 줄 ${f.inserted.toLocaleString()}, 값이 바뀌는 줄 ${f.updated.toLocaleString()}(바뀌는 칸 ${f.changedCells.toLocaleString()}개), 그대로 ${f.unchanged.toLocaleString()}줄`,
  );
  if (f.keptCells > 0) {
    console.log(
      `  새 파일에서는 비어 있어 저장된 값을 그대로 두는 칸 ${f.keptCells.toLocaleString()}개 (지우지 않습니다)`,
    );
  }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const filePath = args.find((a) => !a.startsWith("--"));

  if (!filePath) {
    console.error('엑셀 파일 경로를 적어 주세요. 예: npm run ingest -- "C:\\경로\\파일.xlsx"');
    return 1;
  }

  console.log(`원본 읽는 중(수정하지 않습니다): ${filePath}`);
  const sheets = await readIngestSheets(filePath);
  console.log(
    `읽은 시트 ${sheets.length}개: ${sheets.map((s) => `"${s.name}"(${s.rows.length}줄)`).join(", ")}`,
  );

  const result = buildIngest(sheets);
  if (!result.ok) {
    console.error("\n저장하지 않고 멈춥니다. 아래 문제를 먼저 해결해 주세요.");
    for (const problem of result.problems) console.error(`  - ${problem}`);
    return 1;
  }

  const { summary } = result;
  console.log("\n검사 통과. 원본에서 추린 내용:");
  console.log(
    `  기업 ${result.companies.length.toLocaleString()}곳 (${Object.entries(summary.companiesBySize)
      .map(([size, n]) => `${size} ${n.toLocaleString()}`)
      .join(", ")})`,
  );
  console.log(
    `  대기업 ${summary.largeCompanies.toLocaleString()}곳의 재무 데이터 ${summary.financialRows.toLocaleString()}줄`,
  );
  console.log(
    "  분기별 줄 수: " +
      Object.entries(summary.rowsByQuarter)
        .map(([q, n]) => `${q} ${n}`)
        .join(", "),
  );
  if (summary.nonNumericCells > 0) {
    console.log(`  주의: 숫자가 아니어서 비워 둔 칸 ${summary.nonNumericCells}개`);
  }

  // 저장된 데이터와 비교해 바뀌는 것만 고른다.
  let toSaveCompanies: IngestCompany[] = result.companies;
  let toSaveFinancials: IngestFinancial[] = result.financials;
  let supabase: ReturnType<typeof getSupabase> | null = null;
  try {
    supabase = getSupabase();
  } catch {
    supabase = null;
  }

  if (!supabase) {
    if (write) {
      console.error("\n.env에 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없어 저장할 수 없습니다.");
      return 1;
    }
    console.log("\n(.env에 Supabase 정보가 없어 저장된 데이터와의 비교는 건너뜁니다.)");
  } else {
    const quarters = Object.keys(summary.rowsByQuarter);
    const existingCompanies = await loadExistingCompanies(supabase);
    const existingFinancials = await loadExistingFinancials(supabase, quarters);
    if (!existingCompanies.ok || !existingFinancials.ok) {
      const message = !existingCompanies.ok
        ? existingCompanies.message
        : !existingFinancials.ok
          ? existingFinancials.message
          : "";
      console.error(`\n저장된 데이터를 읽지 못해 멈춥니다: ${message}`);
      return 1;
    }
    const companies = diffCompanies(result.companies, existingCompanies.data);
    const financials = mergeFinancials(result.financials, existingFinancials.data);
    toSaveCompanies = companies.rows;
    toSaveFinancials = financials.rows;
    printComparison(companies.stats, financials.stats);
  }

  if (!write) {
    console.log("\n미리보기만 했습니다. 저장하려면 같은 명령 끝에 --write 를 붙이세요.");
    return 0;
  }

  console.log("\nSupabase에 저장하는 중...");
  const saved = await saveIngest(supabase as unknown as UpsertClient, {
    companies: toSaveCompanies,
    financials: toSaveFinancials,
  });
  if (!saved.ok) {
    console.error(saved.message);
    return 1;
  }
  console.log(
    `저장 완료: 기업 ${saved.companies.toLocaleString()}곳, 재무 데이터 ${saved.financials.toLocaleString()}줄`,
  );
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    // 키 값이 들어 있을 수 있는 객체는 출력하지 않고 메시지만 보여 준다.
    console.error("적재 중 오류:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
