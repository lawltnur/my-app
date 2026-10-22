import { describe, expect, it } from "vitest";
import {
  calculateOperatingCf,
  calculateShortTermDebt,
  summarize,
  type MetricResult,
  type MetricsInput,
} from "../lib/metrics";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";
import { expectedAnswers } from "./fixtures/expected-answers";

// Plan SC: PLAN 5번 — 단기차입금과 영업활동 현금흐름의 분기별 평균을 계산하고,
// 쓰인 기업 수와 제외한 기업 수를 센다. 예시 데이터의 손계산 정답과 소수점 10자리까지 같아야 한다.
const input: MetricsInput = {
  companies: exampleCompanies,
  financials: exampleFinancials,
  quarters: Object.keys(expectedAnswers),
};

function expectSame(actual: MetricResult, expected: MetricResult) {
  expect(actual.average).not.toBeNull();
  expect(actual.average as number).toBeCloseTo(expected.average as number, 10);
  expect(actual.used).toBe(expected.used);
  expect(actual.excluded).toBe(expected.excluded);
}

describe("예시 데이터의 정답과 비교", () => {
  for (const quarter of input.quarters) {
    it(`${quarter} 단기차입금`, () => {
      expectSame(
        calculateShortTermDebt(input, quarter),
        expectedAnswers[quarter].shortTermDebt,
      );
    });

    it(`${quarter} 영업활동 현금흐름`, () => {
      expectSame(
        calculateOperatingCf(input, quarter),
        expectedAnswers[quarter].operatingCf,
      );
    });
  }
});

describe("빈 값과 없는 줄 처리", () => {
  it("값이 비어 있는 기업은 0으로 보지 않고 제외한다", () => {
    // [100, null, 300] → 0이 아니라 (100+300)/2 = 200
    expect(summarize([100, null, 300])).toEqual({
      average: 200,
      used: 2,
      excluded: 1,
    });
  });

  it("음수 값도 그대로 평균에 넣는다", () => {
    expect(summarize([-50, 150])).toEqual({ average: 50, used: 2, excluded: 0 });
  });

  it("그 분기의 재무 줄이 없는 대기업은 제외로 센다", () => {
    const withoutRow: MetricsInput = {
      ...input,
      financials: exampleFinancials.filter(
        (f) => !(f.company_code === "A" && f.quarter === "2025Q1"),
      ),
    };
    const result = calculateShortTermDebt(withoutRow, "2025Q1");
    expect(result.used).toBe(2);
    expect(result.excluded).toBe(1);
  });

  it("쓰인 기업이 0곳이면 평균은 null(누락)이다", () => {
    expect(summarize([null, null])).toEqual({ average: null, used: 0, excluded: 2 });
  });
});
