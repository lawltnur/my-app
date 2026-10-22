import { describe, expect, it } from "vitest";
import { calculateInterestCoverage, type MetricsInput } from "../lib/metrics";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";
import { expectedAnswers } from "./fixtures/expected-answers";

// Plan SC: PLAN 6번 — 이자보상배율의 분기별 평균을 같은 방식으로 계산한다.
// 예시 데이터의 손계산 정답과 소수점 10자리까지 같아야 한다.
const input: MetricsInput = {
  companies: exampleCompanies,
  financials: exampleFinancials,
  quarters: Object.keys(expectedAnswers),
};

describe("이자보상배율: 예시 데이터의 정답과 비교", () => {
  for (const quarter of input.quarters) {
    it(`${quarter} 평균과 기업 수`, () => {
      const actual = calculateInterestCoverage(input, quarter);
      const expected = expectedAnswers[quarter].interestCoverage;
      expect(actual.average).not.toBeNull();
      expect(actual.average as number).toBeCloseTo(expected.average, 10);
      expect(actual.used).toBe(expected.used);
      expect(actual.excluded).toBe(expected.excluded);
    });
  }
});

describe("이자보상배율: 빈 값과 음수", () => {
  it("값이 비어 있는 기업은 0으로 보지 않고 제외한다 (2025Q1의 C)", () => {
    const actual = calculateInterestCoverage(input, "2025Q1");
    // A=5.0, B=2.5 → 평균 3.75. C를 0으로 봤다면 2.5가 되어 달라진다.
    expect(actual.average as number).toBeCloseTo(3.75, 10);
    expect(actual.excluded).toBe(1);
  });

  it("음수 이자보상배율도 그대로 평균에 넣는다", () => {
    const withNegative: MetricsInput = {
      ...input,
      financials: exampleFinancials.map((f) =>
        f.company_code === "A" && f.quarter === "2025Q1"
          ? { ...f, interest_coverage: -1.0 }
          : f,
      ),
    };
    // A=-1.0, B=2.5 → 0.75
    const actual = calculateInterestCoverage(withNegative, "2025Q1");
    expect(actual.average as number).toBeCloseTo(0.75, 10);
    expect(actual.used).toBe(2);
  });
});
