import { describe, expect, it } from "vitest";
import {
  METRIC_KEYS,
  calculateMetrics,
  type MetricsInput,
} from "../lib/metrics";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";
import { expectedAnswers } from "./fixtures/expected-answers";

// Plan SC: PLAN 8번 — 예시 데이터(기업 3곳 × 2분기)로 4개 지표가 손계산 정답과
// 소수점 10자리까지 모두 일치한다. (PRD 성공 기준)
const input: MetricsInput = {
  companies: exampleCompanies,
  financials: exampleFinancials,
  quarters: Object.keys(expectedAnswers),
};

describe("calculateMetrics: 4개 지표를 한 번에 정답과 비교", () => {
  const result = calculateMetrics(input);

  it("입력한 분기 순서대로 분기마다 결과가 하나씩 나온다", () => {
    expect(result.map((r) => r.quarter)).toEqual(["2025Q1", "2025Q2"]);
  });

  for (const quarter of Object.keys(expectedAnswers)) {
    describe(quarter, () => {
      const found = result.find((r) => r.quarter === quarter);

      it("대기업 전체 수가 3이다", () => {
        expect(found?.status).toBe("ok");
        if (found?.status === "ok") expect(found.companyCount).toBe(3);
      });

      for (const key of METRIC_KEYS) {
        it(`${key}: 평균, 쓰인 기업 수, 제외한 기업 수가 정답과 같다`, () => {
          if (found?.status !== "ok") throw new Error("계산된 분기가 아닙니다.");
          const actual = found.metrics[key];
          const expected = expectedAnswers[quarter][key];
          expect(actual.average).not.toBeNull();
          expect(actual.average as number).toBeCloseTo(expected.average, 10);
          expect(actual.used).toBe(expected.used);
          expect(actual.excluded).toBe(expected.excluded);
        });
      }
    });
  }

  it("지표마다 쓰인 기업 수 + 제외한 기업 수 = 대기업 전체 수이다", () => {
    for (const quarter of result) {
      if (quarter.status !== "ok") continue;
      for (const key of METRIC_KEYS) {
        const { used, excluded } = quarter.metrics[key];
        expect(used + excluded).toBe(quarter.companyCount);
      }
    }
  });
});
