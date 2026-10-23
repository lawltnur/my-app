import Link from "next/link";
import { Suspense } from "react";
import { readOverview } from "@/lib/load";
import { METRIC_DESCRIPTIONS, METRIC_SLUGS } from "@/lib/metric-slugs";
import { METRIC_KEYS, METRIC_LABELS, METRIC_UNITS } from "@/lib/metrics";
import { loadFailureNotice, logLoadFailure } from "@/lib/notices";
import { quarterRange } from "@/lib/quarters";
import { DbErrorBox } from "../notices";
import { firstValue, RangeForm } from "../range-form";
import { UploadPreview } from "../upload-preview";

// 지표 목록 화면 — 지표 4개가 칸 하나씩 들어 있고, 누르면 그 지표의 결과 화면(/analysis/지표이름)으로 간다.
// 분기 범위를 입력해 두면 그 범위가 결과 화면으로 이어진다.

// Design Ref: §1 ③ 안내 띠 — 대기업 전체 수와 접속 결과를 보여 준다.
async function Overview() {
  const result = await readOverview();

  if (!result.ok) {
    logLoadFailure("안내 띠", result.message);
    return <DbErrorBox notice={loadFailureNotice()} />;
  }

  return (
    <p className="glass-soft rise rise-3 px-4 py-2 text-sm">
      대기업 전체 {result.largeCompanyCount}곳 · 재무 데이터 {result.financialRowCount}건
    </p>
  );
}

async function Metrics({
  searchParams,
}: {
  searchParams: PageProps<"/analysis">["searchParams"];
}) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const to = firstValue(params.to);
  const range = from !== "" || to !== "" ? quarterRange(from, to) : null;
  // 범위가 올바를 때만 결과 화면 주소에 붙인다. (검사를 통과한 값만 쓴다.)
  const query = range && range.ok ? `?from=${range.from}&to=${range.to}` : "";

  return (
    <>
      <RangeForm action="/analysis" from={from} to={to} range={range} />
      <section className="grid w-full gap-4 sm:grid-cols-2">
        {METRIC_KEYS.map((key, i) => (
          <Link
            key={key}
            href={`/analysis/${METRIC_SLUGS[key]}${query}`}
            className={`glass metric-card rise rise-${Math.min(i + 1, 4)}`}
          >
            <span className="text-sm text-soft">단위 {METRIC_UNITS[key]}</span>
            <span className="display text-2xl">{METRIC_LABELS[key]}</span>
            <span className="text-sm text-soft">{METRIC_DESCRIPTIONS[key]}</span>
            <span className="go">결과 보기 →</span>
          </Link>
        ))}
      </section>
    </>
  );
}

export default function AnalysisPage({ searchParams }: PageProps<"/analysis">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-12 sm:px-10 sm:py-16">
      <div>
        <Link href="/" className="text-sm text-soft hover:underline">
          ← 처음으로
        </Link>
        <h1 className="display mt-2 text-4xl leading-tight sm:text-5xl">분석할 지표 고르기</h1>
        <p className="mt-2 text-soft">
          지표를 누르면 분기별 평균과 기업 수가 나오는 화면으로 이동합니다.
        </p>
      </div>
      <Suspense fallback={<p>입력 칸을 불러오는 중…</p>}>
        <Metrics searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p>데이터베이스에 접속하는 중…</p>}>
        <Overview />
      </Suspense>
      <UploadPreview />
    </main>
  );
}
