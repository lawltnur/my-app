"use client";

import { useState } from "react";

// 엑셀 업로드 칸 — 파일을 올리면 검사하고 저장된 값과 비교한 결과만 보여 준다. 저장은 하지 않는다.
// 서버 쪽 처리는 app/api/upload-preview/route.ts. 결과 모양은 그 파일의 PreviewBody와 같다.
type Comparison = {
  companiesInserted: number;
  companiesUpdated: number;
  companiesUnchanged: number;
  rowsInserted: number;
  rowsUpdated: number;
  changedCells: number;
  rowsUnchanged: number;
  keptCells: number;
};

type Preview =
  | {
      ok: true;
      companies: number;
      largeCompanies: number;
      financialRows: number;
      rowsByQuarter: Record<string, number>;
      comparison: Comparison | null;
    }
  | { ok: false; message: string; problems?: string[] };

const n = (value: number) => value.toLocaleString("ko-KR");

export function UploadPreview() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Preview | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/upload-preview", { method: "POST", body: form });
      setResult((await response.json()) as Preview);
    } catch {
      setResult({ ok: false, message: "검사하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass rise rise-4 flex w-full min-w-0 flex-col gap-3 p-5">
      <h2 className="text-lg font-semibold">엑셀 파일 검사 (미리보기)</h2>
      <p className="text-sm text-white/80">
        원본 엑셀(.xlsx, 4MB 이하)을 올리면 읽을 수 있는 파일인지 검사하고 저장된 값과
        비교해 보여 줍니다. 이 화면에서는 데이터를 저장하지 않습니다. 저장은{" "}
        <code>npm run ingest -- 파일 --write</code> 로 합니다.
      </p>
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-glass btn-solid"
        >
          {busy ? "검사하는 중…" : "검사하기"}
        </button>
      </form>

      {result && !result.ok && (
        <div className="rounded-2xl border border-red-300/50 bg-red-500/20 px-4 py-2 text-sm text-red-50">
          <p>{result.message}</p>
          {result.problems && (
            <ul className="mt-1 list-disc pl-5">
              {result.problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result && result.ok && (
        <div className="glass-soft flex flex-col gap-1 px-4 py-3 text-sm">
          <p>
            검사 통과 — 기업 {n(result.companies)}곳, 그중 대기업 {n(result.largeCompanies)}곳의
            재무 데이터 {n(result.financialRows)}줄
          </p>
          <p>
            분기별 줄 수:{" "}
            {Object.entries(result.rowsByQuarter)
              .map(([q, count]) => `${q} ${n(count)}`)
              .join(", ")}
          </p>
          {result.comparison ? (
            <>
              <p>
                기업: 새로 {n(result.comparison.companiesInserted)}곳, 바뀌는{" "}
                {n(result.comparison.companiesUpdated)}곳, 그대로{" "}
                {n(result.comparison.companiesUnchanged)}곳
              </p>
              <p>
                재무: 새 줄 {n(result.comparison.rowsInserted)}, 바뀌는 줄{" "}
                {n(result.comparison.rowsUpdated)}(바뀌는 칸 {n(result.comparison.changedCells)}개),
                그대로 {n(result.comparison.rowsUnchanged)}줄
              </p>
              {result.comparison.keptCells > 0 && (
                <p>
                  새 파일에서 비어 있어 저장된 값을 그대로 두는 칸{" "}
                  {n(result.comparison.keptCells)}개
                </p>
              )}
            </>
          ) : (
            <p>저장된 데이터와의 비교는 하지 못했습니다.</p>
          )}
          <p className="font-medium">미리보기만 했습니다. 아무것도 저장하지 않았습니다.</p>
        </div>
      )}
    </section>
  );
}
