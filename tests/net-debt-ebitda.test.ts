import { describe, expect, it } from "vitest";
import {
  calculateNetDebtToEbitda,
  netDebtToEbitdaOf,
  type FinancialRow,
  type MetricsInput,
} from "../lib/metrics";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";
import { expectedAnswers } from "./fixtures/expected-answers";

// Plan SC: PLAN 7번 — 순차입금/EBITDA를 기업별로 먼저 구한 뒤 평균을 낸다.
// EBITDA가 없거나 0이면 제외, 음수는 포함, 총차입금·현금이 비면 제외한다.
const input: MetricsInput = {
  companies: exampleCompanies,
  financials: exampleFinancials,
  quarters: Object.keys(expectedAnswers),
};

function row(overrides: Partial<FinancialRow>): FinancialRow {
  return {
    company_code: "X",
    quarter: "2025Q1",
    total_debt: 1000,
    cash: 400,
    ebitda: 200,
    operating_cf: null,
    interest_coverage: null,
    short_term_debt: null,
    ...overrides,
  };
}

describe("순차입금/EBITDA: 예시 데이터의 정답과 비교", () => {
  for (const quarter of input.quarters) {
    it(`${quarter} 평균과 기업 수`, () => {
      const actual = calculateNetDebtToEbitda(input, quarter);
      const expected = expectedAnswers[quarter].netDebtToEbitda;
      expect(actual.average).not.toBeNull();
      expect(actual.average as number).toBeCloseTo(expected.average, 10);
      expect(actual.used).toBe(expected.used);
      expect(actual.excluded).toBe(expected.excluded);
    });
  }
});

describe("순차입금/EBITDA: 기업 한 곳의 규칙", () => {
  it("(총차입금 − 현금) / EBITDA로 계산한다", () => {
    expect(netDebtToEbitdaOf(row({}))).toBe(3); // (1000-400)/200
  });

  it("EBITDA가 0이면 제외한다", () => {
    expect(netDebtToEbitdaOf(row({ ebitda: 0 }))).toBeNull();
  });

  it("EBITDA가 비어 있으면 제외한다", () => {
    expect(netDebtToEbitdaOf(row({ ebitda: null }))).toBeNull();
  });

  it("EBITDA가 음수이면 계산된 값 그대로 쓴다", () => {
    expect(netDebtToEbitdaOf(row({ ebitda: -300 }))).toBe(-2); // 600/-300
  });

  it("총차입금이 비어 있으면 0으로 보지 않고 제외한다", () => {
    expect(netDebtToEbitdaOf(row({ total_debt: null }))).toBeNull();
  });

  it("현금이 비어 있으면 0으로 보지 않고 제외한다", () => {
    expect(netDebtToEbitdaOf(row({ cash: null }))).toBeNull();
  });
});

describe("순차입금/EBITDA: 기업별 값의 평균", () => {
  it("전체 합계끼리 나누지 않고 기업별 값의 평균을 낸다", () => {
    const skewed: MetricsInput = {
      companies: [exampleCompanies[0], exampleCompanies[1]],
      financials: [
        row({ company_code: "A", total_debt: 1000, cash: 0, ebitda: 1000 }), // 1
        row({ company_code: "B", total_debt: 100, cash: 0, ebitda: 10 }), // 10
      ],
      quarters: ["2025Q1"],
    };
    const actual = calculateNetDebtToEbitda(skewed, "2025Q1");
    // 기업별 값의 평균 (1+10)/2 = 5.5. (합계끼리 나누면 1100/1010 ≈ 1.09가 되어 틀린다.)
    expect(actual.average as number).toBeCloseTo(5.5, 10);
  });
});
