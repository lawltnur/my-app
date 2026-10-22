// Design Ref: §4 tests/fixtures — 직접 계산한 정답이 있는 예시 데이터 (기업 3곳 × 2분기)
// 열 이름과 단위는 db/schema.sql과 같다. 금액은 억원, interest_coverage는 배수이다.
// 정답은 expected-answers.ts에 있다. 이 파일의 값을 바꾸면 정답도 다시 손으로 계산해야 한다.

export type ExampleCompany = {
  company_code: string;
  stock_code: string | null;
  name: string;
  size: "대기업" | "중견기업" | "중소기업" | null;
};

export type ExampleFinancial = {
  company_code: string;
  quarter: string;
  total_debt: number | null;
  cash: number | null;
  ebitda: number | null;
  operating_cf: number | null;
  interest_coverage: number | null;
  short_term_debt: number | null;
};

// 세 곳 모두 대기업이다. (대기업 선별은 별도 작업에서 검사한다.)
export const exampleCompanies: ExampleCompany[] = [
  { company_code: "A", stock_code: "000001", name: "예시A", size: "대기업" },
  { company_code: "B", stock_code: "000002", name: "예시B", size: "대기업" },
  { company_code: "C", stock_code: null, name: "예시C", size: "대기업" },
];

// 일부러 규칙을 시험하는 값을 넣었다.
// 2025Q1 — B: EBITDA가 0 → 순차입금/EBITDA에서 제외
//          C: EBITDA가 음수 → 계산된 값 그대로 평균에 포함, 이자보상배율이 비어 있음 → 제외
// 2025Q2 — B: 총차입금·단기차입금이 비어 있음 → 해당 지표에서 제외 (0으로 보지 않음)
//          C: 영업활동 현금흐름이 비어 있음 → 제외
export const exampleFinancials: ExampleFinancial[] = [
  {
    company_code: "A",
    quarter: "2025Q1",
    total_debt: 1000,
    cash: 400,
    ebitda: 200,
    operating_cf: 150,
    interest_coverage: 5.0,
    short_term_debt: 300,
  },
  {
    company_code: "B",
    quarter: "2025Q1",
    total_debt: 600,
    cash: 100,
    ebitda: 0,
    operating_cf: -50,
    interest_coverage: 2.5,
    short_term_debt: 100,
  },
  {
    company_code: "C",
    quarter: "2025Q1",
    total_debt: 2000,
    cash: 500,
    ebitda: -300,
    operating_cf: 80,
    interest_coverage: null,
    short_term_debt: 700,
  },
  {
    company_code: "A",
    quarter: "2025Q2",
    total_debt: 900,
    cash: 500,
    ebitda: 250,
    operating_cf: 200,
    interest_coverage: 6.0,
    short_term_debt: 250,
  },
  {
    company_code: "B",
    quarter: "2025Q2",
    total_debt: null,
    cash: 120,
    ebitda: 100,
    operating_cf: 30,
    interest_coverage: 3.0,
    short_term_debt: null,
  },
  {
    company_code: "C",
    quarter: "2025Q2",
    total_debt: 1800,
    cash: 600,
    ebitda: 400,
    operating_cf: null,
    interest_coverage: 4.0,
    short_term_debt: 650,
  },
];
