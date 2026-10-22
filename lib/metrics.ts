// Design Ref: §4 lib/metrics.ts — 4개 지표 계산의 입력·결과 형태를 한 곳에 정한다.
// 화면 표와 엑셀 파일이 모두 이 결과 형태를 그대로 쓰므로 "화면 값 = 엑셀 값"이 구조로 보장된다.
// 이 파일에는 형태(타입)와 지표 이름만 있고, 계산 코드는 PLAN 5~7번에서 추가한다.

// ── 입력 ────────────────────────────────────────────────

// 대기업 한 곳. db/schema.sql의 companies 테이블과 같다.
export type Company = {
  company_code: string;
  stock_code: string | null;
  name: string;
  size: string | null;
};

// 기업·분기별 재무 한 줄. db/schema.sql의 financials 테이블과 같다.
// 금액은 억원, interest_coverage는 배수이며, 빈 값은 0이 아니라 null이다.
export type FinancialRow = {
  company_code: string;
  quarter: string; // 예: 2025Q4
  total_debt: number | null;
  cash: number | null;
  ebitda: number | null;
  operating_cf: number | null;
  interest_coverage: number | null;
  short_term_debt: number | null;
};

// 계산 함수가 받는 값. companies에는 대기업만 담아서 넘긴다. (선별은 불러오기 단계에서 한다.)
export type MetricsInput = {
  companies: Company[];
  financials: FinancialRow[];
  quarters: string[]; // 사용자가 입력한 범위의 분기, 오래된 순
};

// ── 결과 ────────────────────────────────────────────────

// 4개 지표의 이름표. 결과 객체의 열쇠이자 화면·엑셀 머리글의 순서이다.
export const METRIC_KEYS = [
  "netDebtToEbitda",
  "operatingCf",
  "interestCoverage",
  "shortTermDebt",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

// 화면·엑셀 머리글에 쓰는 한국어 이름
export const METRIC_LABELS: Record<MetricKey, string> = {
  netDebtToEbitda: "순차입금/EBITDA",
  operatingCf: "영업활동 현금흐름",
  interestCoverage: "이자보상배율",
  shortTermDebt: "단기차입금",
};

// 한 지표의 한 분기 결과
export type MetricResult = {
  // 평균. 평균에 쓰인 기업이 0곳이면 null이며, 화면과 엑셀에는 "누락"으로 쓴다.
  average: number | null;
  used: number; // 평균에 쓰인 기업 수
  excluded: number; // 제외한 기업 수 (= 대기업 전체 수 − used)
};

// 한 분기의 결과. 데이터가 없는 분기는 계산하지 않고 "no-data"로 표시한다.
export type QuarterResult =
  | {
      quarter: string;
      status: "ok";
      companyCount: number; // 대기업 전체 기업 수
      metrics: Record<MetricKey, MetricResult>;
    }
  | { quarter: string; status: "no-data" };

// 계산 함수가 돌려주는 값: 입력한 분기 순서대로 한 분기에 하나씩
export type MetricsResult = QuarterResult[];
