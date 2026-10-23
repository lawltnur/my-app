import { Suspense } from "react";
import { loadRangeData, readOverview } from "@/lib/load";
import { calculateMetrics } from "@/lib/metrics";
import {
  loadFailureNotice,
  logLoadFailure,
  noDataNotice,
  rangeDataStatus,
} from "@/lib/notices";
import { quarterRange } from "@/lib/quarters";
import { DbErrorBox, NoDataBox } from "./notices";
import { ResultTable } from "./result-table";
import { UploadPreview } from "./upload-preview";

// Design Ref: §1 ③ 안내 띠 — 대기업 전체 수와 접속 결과를 보여 준다.
async function Overview() {
  const result = await readOverview();

  if (!result.ok) {
    logLoadFailure("안내 띠", result.message);
    return <DbErrorBox notice={loadFailureNotice()} />;
  }

  return (
    <p className="glass-soft rise rise-3 px-4 py-2 text-sm">
      대기업 전체 {result.largeCompanyCount}곳 · 재무 데이터{" "}
      {result.financialRowCount}건
    </p>
  );
}

// Design Ref: §2-1 ③④ — 입력한 분기의 대기업 데이터를 불러와 계산하고 결과 표로 보여 준다.
// 데이터가 없는 분기는 표에서 "데이터 없음"으로 표시한다.
// 접속 오류(빨강)와 데이터 없음(노랑)은 서로 다른 안내로 보여 준다. (PLAN 12번)
async function RangeSummary({ quarters }: { quarters: string[] }) {
  const loaded = await loadRangeData(quarters);

  if (!loaded.ok) {
    logLoadFailure("결과 표", loaded.message);
    return <DbErrorBox notice={loadFailureNotice()} />;
  }

  const { companies, financials } = loaded.data;
  const results = calculateMetrics({ companies, financials, quarters });

  // 입력한 분기가 모두 데이터 없음이면(또는 대기업이 하나도 없으면) 표 대신 안내만 보여 준다.
  const notice = noDataNotice(rangeDataStatus(companies.length, results));
  if (notice) return <NoDataBox notice={notice} />;

  // 같은 분기 범위의 결과를 엑셀로 내려받는 주소. (화면 값 = 엑셀 값, PLAN 13번)
  const exportUrl = `/api/export?from=${quarters[0]}&to=${quarters[quarters.length - 1]}`;

  return (
    <div className="glass rise flex w-full min-w-0 flex-col gap-3 p-5">
      <div>
        <a
          href={exportUrl}
          download
          className="btn-glass"
        >
          엑셀 내려받기
        </a>
      </div>
      <ResultTable results={results} />
    </div>
  );
}

// 주소의 ?from=...&to=... 값 하나를 문자열로 꺼낸다. (없으면 빈 문자열)
function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Design Ref: §1 ② 입력 칸 — 시작·끝 분기를 받아 형식과 순서를 검사한다.
// 입력값은 주소(GET)로 전달되므로 비밀 값은 넣지 않는다.
async function QuarterForm({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const to = firstValue(params.to);
  const submitted = from !== "" || to !== "";
  const range = submitted ? quarterRange(from, to) : null;

  return (
    <section className="glass rise rise-2 flex w-full min-w-0 flex-col gap-3 p-5">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          시작 분기
          <input
            name="from"
            defaultValue={from}
            placeholder="예: 2024Q1"
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          끝 분기
          <input
            name="to"
            defaultValue={to}
            placeholder="예: 2025Q4"
            className="field"
          />
        </label>
        <button
          type="submit"
          className="btn-glass btn-solid"
        >
          분석하기
        </button>
      </form>

      {range && !range.ok && (
        <p className="rounded-2xl border border-red-300/50 bg-red-500/20 px-4 py-2 text-red-100">
          {range.message}
        </p>
      )}
      {range && range.ok && (
        <p className="glass-soft px-4 py-2 text-sm">
          입력한 범위: {range.from} ~ {range.to} (분기 {range.quarters.length}개)
        </p>
      )}
      {range && range.ok && (
        <Suspense fallback={<p>재무 데이터를 불러오는 중…</p>}>
          <RangeSummary quarters={range.quarters} />
        </Suspense>
      )}
    </section>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex flex-col flex-1 items-center">
      <main className="flex flex-1 w-full max-w-6xl flex-col gap-6 px-5 py-12 sm:px-10 sm:py-16">
        {/* 앱 이름 제목 */}
        <h1 className="display text-4xl leading-tight sm:text-5xl">
          <span className="ln">
            <span>대기업 재무지표 분석 도구</span>
          </span>
        </h1>
        <Suspense fallback={<p>입력 칸을 불러오는 중…</p>}>
          <QuarterForm searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<p>데이터베이스에 접속하는 중…</p>}>
          <Overview />
        </Suspense>
        <UploadPreview />
      </main>
    </div>
  );
}
