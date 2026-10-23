// Design Ref: §4 lib/metrics.ts — 4개 지표 계산의 입력·결과 형태를 한 곳에 정한다.
// 화면 표와 엑셀 파일이 모두 이 결과 형태를 그대로 쓰므로 "화면 값 = 엑셀 값"이 구조로 보장된다.
// 형태(타입)와 지표 이름 위에, 지표별 계산(PLAN 5~7번)과 이를 묶는 calculateMetrics(PLAN 8번)가 있다.

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

// 지표별 단위. 금액은 억원(원본의 재무단위를 억원으로 맞춰 저장한다), 비율은 배수이다. (PRD must 2)
// 화면 표와 엑셀 머리글이 같은 단위를 쓰도록 한 곳에 둔다.
export const METRIC_UNITS: Record<MetricKey, string> = {
  netDebtToEbitda: "배",
  operatingCf: "억원",
  interestCoverage: "배",
  shortTermDebt: "억원",
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

// ── 계산: 4개 지표의 분기별 평균 (PLAN 5~7번) ──

// 한 분기의 기업별 값을 대기업 순서대로 하나씩 꺼낸다.
// 그 분기의 재무 줄이 없거나 값이 비어 있으면 null (0으로 보지 않는다).
export function valuesForQuarter(
  companies: Company[],
  financials: FinancialRow[],
  quarter: string,
  pick: (row: FinancialRow) => number | null,
): (number | null)[] {
  return companies.map((company) => {
    const row = financials.find(
      (f) => f.company_code === company.company_code && f.quarter === quarter,
    );
    return row ? pick(row) : null;
  });
}

// 기업별 값들의 평균과 기업 수를 센다. (기업별 값을 먼저 구한 뒤 그 값들의 평균)
// null은 평균에서 빼고 "제외한 기업 수"에 센다. 쓰인 기업이 0곳이면 평균은 null이다.
export function summarize(values: (number | null)[]): MetricResult {
  const used = values.filter((v): v is number => v !== null);
  const average =
    used.length === 0 ? null : used.reduce((sum, v) => sum + v, 0) / used.length;
  return {
    average,
    used: used.length,
    excluded: values.length - used.length,
  };
}

// 한 분기의 단기차입금 평균 (값은 파일에 있는 그대로, 억원)
export function calculateShortTermDebt(
  input: MetricsInput,
  quarter: string,
): MetricResult {
  return summarize(
    valuesForQuarter(
      input.companies,
      input.financials,
      quarter,
      (row) => row.short_term_debt,
    ),
  );
}

// 한 분기의 영업활동 현금흐름 평균 (값은 파일에 있는 그대로, 억원)
export function calculateOperatingCf(
  input: MetricsInput,
  quarter: string,
): MetricResult {
  return summarize(
    valuesForQuarter(
      input.companies,
      input.financials,
      quarter,
      (row) => row.operating_cf,
    ),
  );
}

// 한 분기의 이자보상배율 평균 (값은 파일에 있는 그대로, 배수)
// 음수 값도 그대로 평균에 넣고, 비어 있는 기업만 제외한다.
export function calculateInterestCoverage(
  input: MetricsInput,
  quarter: string,
): MetricResult {
  return summarize(
    valuesForQuarter(
      input.companies,
      input.financials,
      quarter,
      (row) => row.interest_coverage,
    ),
  );
}

// 기업 한 곳의 순차입금/EBITDA = (총차입금 − 현금및현금성자산) / EBITDA
// 계산할 수 없으면 null이며 그 기업은 평균에서 제외한다.
//  - 총차입금·현금·EBITDA가 비어 있으면 0으로 보지 않고 제외
//  - EBITDA가 0이면 나눌 수 없으므로 제외
//  - EBITDA가 음수이면 계산된 값 그대로 평균에 포함
export function netDebtToEbitdaOf(row: FinancialRow): number | null {
  const { total_debt, cash, ebitda } = row;
  if (total_debt === null || cash === null || ebitda === null) return null;
  if (ebitda === 0) return null;
  return (total_debt - cash) / ebitda;
}

// 한 분기의 순차입금/EBITDA 평균 (배)
// 기업별 값을 먼저 구한 뒤 그 값들의 평균을 낸다. 전체 합계끼리 나누지 않는다.
export function calculateNetDebtToEbitda(
  input: MetricsInput,
  quarter: string,
): MetricResult {
  return summarize(
    valuesForQuarter(
      input.companies,
      input.financials,
      quarter,
      netDebtToEbitdaOf,
    ),
  );
}

// ── 계산: 4개 지표를 분기별 결과로 묶기 (PLAN 8번) ──────────

// 입력한 분기마다 4개 지표의 평균과 기업 수를 한 번에 구한다.
// 화면 표와 엑셀 파일이 이 결과를 그대로 쓴다. 결과는 입력한 분기 순서와 같다.
// 대기업의 재무 줄이 하나도 없는 분기는 계산하지 않고 "no-data"(데이터 없음)로 돌려준다. (PLAN 10번)
export function calculateMetrics(input: MetricsInput): MetricsResult {
  const companyCodes = new Set(input.companies.map((c) => c.company_code));

  return input.quarters.map((quarter): QuarterResult => {
    const hasData = input.financials.some(
      (f) => f.quarter === quarter && companyCodes.has(f.company_code),
    );
    if (!hasData) return { quarter, status: "no-data" };

    return {
      quarter,
      status: "ok",
      companyCount: input.companies.length,
      metrics: {
        netDebtToEbitda: calculateNetDebtToEbitda(input, quarter),
        operatingCf: calculateOperatingCf(input, quarter),
        interestCoverage: calculateInterestCoverage(input, quarter),
        shortTermDebt: calculateShortTermDebt(input, quarter),
      },
    };
  });
}
