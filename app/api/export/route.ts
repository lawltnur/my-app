import { buildWorkbook } from "@/lib/excel";
import { loadRangeData } from "@/lib/load";
import { metricFromSlug } from "@/lib/metric-slugs";
import { METRIC_KEYS, METRIC_LABELS, calculateMetrics } from "@/lib/metrics";
import {
  loadFailureNotice,
  logLoadFailure,
  noDataNotice,
  rangeDataStatus,
} from "@/lib/notices";
import { quarterRange } from "@/lib/quarters";

// Design Ref: §3-1 서버 주소 — 입력한 분기 범위의 결과를 엑셀 파일로 내려보낸다. (PLAN 13번)
// 화면과 같은 불러오기·계산 함수를 쓰므로 화면 값 = 엑셀 값이다.
// 입력값은 주소(?from=2024Q1&to=2025Q4)로 받으며 비밀 값은 넣지 않는다.
// 지표 이름(&metric=operating-cf)을 붙이면 그 지표만, 없으면 4개 지표 전체를 내려보낸다.
const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = quarterRange(
    searchParams.get("from") ?? "",
    searchParams.get("to") ?? "",
  );
  if (!range.ok) {
    return Response.json({ message: range.message }, { status: 400 });
  }

  // 지표 이름은 목록에 있는 4개만 인정한다. (없으면 전체, 모르는 이름이면 오류)
  const metricParam = searchParams.get("metric");
  const metric = metricParam === null ? null : metricFromSlug(metricParam);
  if (metricParam !== null && metric === null) {
    return Response.json({ message: "알 수 없는 지표입니다." }, { status: 400 });
  }

  const loaded = await loadRangeData(range.quarters);
  if (!loaded.ok) {
    // 오류 원문은 서버 기록에만 남기고, 응답에는 고정 문구만 보낸다.
    logLoadFailure("엑셀 내려받기", loaded.message);
    const failure = loadFailureNotice();
    return Response.json(
      { message: `${failure.title}. ${failure.detail}` },
      { status: 502 },
    );
  }

  const { companies, financials } = loaded.data;
  const results = calculateMetrics({
    companies,
    financials,
    quarters: range.quarters,
  });

  // 입력한 분기가 모두 데이터 없음이면 내려받을 결과가 없다.
  const notice = noDataNotice(rangeDataStatus(companies.length, results));
  if (notice) {
    return Response.json({ message: notice.title }, { status: 404 });
  }

  const buffer = await buildWorkbook(results, metric ? [metric] : METRIC_KEYS);
  const name = metricParam ? `${metricParam}_${range.from}-${range.to}` : `${range.from}-${range.to}`;
  const koName = metric ? `${METRIC_LABELS[metric]}_${range.from}-${range.to}` : `${range.from}-${range.to}`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_TYPE,
      // 한글 파일 이름은 filename*로, 구형 프로그램용 영문 이름은 filename으로 함께 보낸다.
      "Content-Disposition": `attachment; filename="financial-metrics_${name}.xlsx"; filename*=UTF-8''${encodeURIComponent(`대기업_재무지표_${koName}.xlsx`)}`,
      "Cache-Control": "no-store",
    },
  });
}
