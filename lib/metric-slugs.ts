import { METRIC_KEYS, type MetricKey } from "./metrics";

// 지표별 상세 화면 주소(/analysis/○○)에 쓰는 이름과, 지표 카드에 적는 쉬운 설명.
// 주소로 받은 값은 믿지 않고, 아래 목록에 있는 것만 지표로 인정한다.

export const METRIC_SLUGS: Record<MetricKey, string> = {
  netDebtToEbitda: "net-debt-ebitda",
  operatingCf: "operating-cf",
  interestCoverage: "interest-coverage",
  shortTermDebt: "short-term-debt",
};

export const METRIC_DESCRIPTIONS: Record<MetricKey, string> = {
  netDebtToEbitda: "빚에서 현금을 뺀 금액이 1년 벌이(EBITDA)의 몇 배인지",
  operatingCf: "본업으로 실제 들어온 현금",
  interestCoverage: "번 돈이 이자의 몇 배인지",
  shortTermDebt: "1년 안에 갚아야 하는 빚",
};

// 주소의 이름으로 지표를 찾는다. 목록에 없으면 null이다.
export function metricFromSlug(slug: string): MetricKey | null {
  return METRIC_KEYS.find((key) => METRIC_SLUGS[key] === slug) ?? null;
}
