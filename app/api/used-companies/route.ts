import { loadRangeData } from "@/lib/load";
import { metricFromSlug } from "@/lib/metric-slugs";
import { METRIC_LABELS, METRIC_UNITS, usedCompanyValues } from "@/lib/metrics";
import { loadFailureNotice, logLoadFailure } from "@/lib/notices";
import { quarterRange } from "@/lib/quarters";

// 표의 "쓰인 기업 수"를 눌렀을 때 그 분기·지표의 평균에 쓰인 기업 목록을 내려보낸다.
// 화면과 같은 불러오기·선별 함수와 usedCompanyValues(평균 계산과 같은 규칙)를 쓰므로 목록 길이 = 쓰인 기업 수이다.
// 입력값(?quarter=2025Q1&metric=operating-cf)은 형식·범위·지표 이름을 먼저 검사하고, 오류 원문은 응답에 넣지 않는다.

export type UsedCompaniesBody = {
  quarter: string;
  metric: string; // 지표 이름(한국어)
  unit: string;
  companies: { name: string; code: string; stockCode: string | null; value: number }[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const range = quarterRange(searchParams.get("quarter") ?? "", searchParams.get("quarter") ?? "");
  if (!range.ok) {
    return Response.json({ message: "분기 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const metric = metricFromSlug(searchParams.get("metric") ?? "");
  if (!metric) {
    return Response.json({ message: "알 수 없는 지표입니다." }, { status: 400 });
  }

  const quarter = range.quarters[0];
  const loaded = await loadRangeData([quarter]);
  if (!loaded.ok) {
    logLoadFailure("쓰인 기업 목록", loaded.message);
    const failure = loadFailureNotice();
    return Response.json({ message: `${failure.title}. ${failure.detail}` }, { status: 502 });
  }

  const { companies, financials } = loaded.data;
  const used = usedCompanyValues({ companies, financials, quarters: [quarter] }, quarter, metric);
  const body: UsedCompaniesBody = {
    quarter,
    metric: METRIC_LABELS[metric],
    unit: METRIC_UNITS[metric],
    companies: used.map((u) => ({
      name: u.company.name,
      code: u.company.company_code,
      stockCode: u.company.stock_code,
      value: u.value,
    })),
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
