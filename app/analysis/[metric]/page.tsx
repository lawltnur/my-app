import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadRangeData } from "@/lib/load";
import { METRIC_SLUGS, metricFromSlug } from "@/lib/metric-slugs";
import { METRIC_KEYS, METRIC_LABELS, calculateMetrics, type MetricKey } from "@/lib/metrics";
import {
  loadFailureNotice,
  logLoadFailure,
  noDataNotice,
  rangeDataStatus,
} from "@/lib/notices";
import { quarterRange } from "@/lib/quarters";
import { DbErrorBox, NoDataBox } from "../../notices";
import { firstValue, RangeForm } from "../../range-form";
import { ResultTable } from "../../result-table";

// 지표별 결과 화면 — 고른 지표 하나의 분기별 평균과 기업 수를 표로 보여 준다.
// 주소의 지표 이름은 목록에 있는 4개만 인정하고, 아니면 "없는 화면"으로 보낸다.

// 주소를 미리 만들어 둘 4개 지표 이름
export function generateStaticParams() {
  return METRIC_KEYS.map((key) => ({ metric: METRIC_SLUGS[key] }));
}

// 입력한 분기의 대기업 데이터를 불러와 계산하고, 이 지표의 표를 보여 준다.
// 접속 오류(빨강)와 데이터 없음(노랑)은 서로 다른 안내로 보여 준다.
async function RangeSummary({ quarters, metric }: { quarters: string[]; metric: MetricKey }) {
  const loaded = await loadRangeData(quarters);

  if (!loaded.ok) {
    logLoadFailure("결과 표", loaded.message);
    return <DbErrorBox notice={loadFailureNotice()} />;
  }

  const { companies, financials } = loaded.data;
  const results = calculateMetrics({ companies, financials, quarters });

  const notice = noDataNotice(rangeDataStatus(companies.length, results));
  if (notice) return <NoDataBox notice={notice} />;

  // 같은 분기 범위의 결과를 엑셀로 내려받는 주소. (엑셀에는 4개 지표가 모두 들어 있고 값은 화면과 같다.)
  const exportUrl = `/api/export?from=${quarters[0]}&to=${quarters[quarters.length - 1]}`;

  return (
    <div className="glass rise flex w-full min-w-0 flex-col gap-3 p-5">
      <div>
        <a href={exportUrl} download className="btn-glass">
          엑셀 내려받기 (4개 지표 전체)
        </a>
      </div>
      <ResultTable results={results} metric={metric} />
    </div>
  );
}

async function MetricResult({
  params,
  searchParams,
}: {
  params: PageProps<"/analysis/[metric]">["params"];
  searchParams: PageProps<"/analysis/[metric]">["searchParams"];
}) {
  const { metric: slug } = await params;
  const metric = metricFromSlug(slug);
  if (!metric) notFound();

  const query = await searchParams;
  const from = firstValue(query.from);
  const to = firstValue(query.to);
  const range = from !== "" || to !== "" ? quarterRange(from, to) : null;
  const rangeQuery = range && range.ok ? `?from=${range.from}&to=${range.to}` : "";

  return (
    <>
      <div>
        <Link href={`/analysis${rangeQuery}`} className="text-sm text-soft hover:underline">
          ← 지표 목록으로
        </Link>
        <h1 className="display mt-2 text-4xl leading-tight sm:text-5xl">{METRIC_LABELS[metric]}</h1>
      </div>
      <RangeForm action={`/analysis/${slug}`} from={from} to={to} range={range} />
      {range && range.ok ? (
        <Suspense fallback={<p>재무 데이터를 불러오는 중…</p>}>
          <RangeSummary quarters={range.quarters} metric={metric} />
        </Suspense>
      ) : (
        <p className="text-soft">분기 범위를 입력하고 적용하기를 누르면 결과가 나옵니다.</p>
      )}
      <nav className="flex flex-wrap gap-2" aria-label="다른 지표">
        {METRIC_KEYS.filter((key) => key !== metric).map((key) => (
          <Link key={key} href={`/analysis/${METRIC_SLUGS[key]}${rangeQuery}`} className="btn-glass">
            {METRIC_LABELS[key]}
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function MetricPage({ params, searchParams }: PageProps<"/analysis/[metric]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-12 sm:px-10 sm:py-16">
      <Suspense fallback={<p>불러오는 중…</p>}>
        <MetricResult params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
