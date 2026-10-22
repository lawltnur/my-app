import { describe, expect, it } from "vitest";
import {
  METRIC_KEYS,
  METRIC_LABELS,
  type MetricsInput,
  type MetricsResult,
} from "../lib/metrics";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";
import { expectedAnswers } from "./fixtures/expected-answers";

// Plan SC: PLAN 4번 — 화면과 엑셀이 함께 쓸 계산 함수의 입력·결과 형태를 한 곳에 정한다.
// 아래 두 값이 타입에 맞지 않으면 npm run build(타입 검사)가 먼저 실패한다.
describe("계산의 입력·결과 형태", () => {
  it("예시 데이터를 그대로 입력 형태에 넣을 수 있다", () => {
    const input: MetricsInput = {
      companies: exampleCompanies,
      financials: exampleFinancials,
      quarters: Object.keys(expectedAnswers),
    };
    expect(input.quarters).toEqual(["2025Q1", "2025Q2"]);
  });

  it("손으로 계산한 정답을 결과 형태로 만들 수 있다", () => {
    const result: MetricsResult = Object.entries(expectedAnswers).map(
      ([quarter, metrics]) => ({
        quarter,
        status: "ok" as const,
        companyCount: exampleCompanies.length,
        metrics,
      }),
    );
    expect(result).toHaveLength(2);
  });

  it("지표 이름표와 한국어 이름이 4개씩 짝이 맞고 정답의 열쇠와 같다", () => {
    expect(METRIC_KEYS).toHaveLength(4);
    expect(Object.keys(METRIC_LABELS).sort()).toEqual([...METRIC_KEYS].sort());
    for (const quarter of Object.values(expectedAnswers)) {
      expect(Object.keys(quarter).sort()).toEqual([...METRIC_KEYS].sort());
    }
  });
});
