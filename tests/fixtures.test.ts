import { describe, expect, it } from "vitest";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";
import { expectedAnswers } from "./fixtures/expected-answers";

// Plan SC: PLAN 3번 — 예시 데이터(기업 3곳 × 2분기)와 정답이 준비되고 테스트 도구가 돈다.
// 이 파일은 "예시 데이터와 정답이 서로 맞는 모양인지"만 검사한다.
// 계산 결과와 정답을 비교하는 검사는 계산 함수를 만든 뒤(PLAN 8번) 추가한다.
describe("예시 데이터와 정답의 모양", () => {
  const quarters = Object.keys(expectedAnswers);

  it("기업 3곳이 모두 대기업이다", () => {
    expect(exampleCompanies).toHaveLength(3);
    expect(exampleCompanies.every((c) => c.size === "대기업")).toBe(true);
  });

  it("분기는 2개이고 기업마다 두 분기 값이 모두 있다", () => {
    expect(quarters).toHaveLength(2);
    expect(exampleFinancials).toHaveLength(6);
    for (const company of exampleCompanies) {
      for (const quarter of quarters) {
        const rows = exampleFinancials.filter(
          (f) => f.company_code === company.company_code && f.quarter === quarter,
        );
        expect(rows).toHaveLength(1);
      }
    }
  });

  it("모든 재무 행이 예시 기업과 연결된다", () => {
    const codes = new Set(exampleCompanies.map((c) => c.company_code));
    expect(exampleFinancials.every((f) => codes.has(f.company_code))).toBe(true);
  });

  it("정답은 분기마다 4개 지표가 있고 쓰인 수 + 제외한 수 = 대기업 3곳이다", () => {
    for (const quarter of quarters) {
      const metrics = Object.values(expectedAnswers[quarter]);
      expect(metrics).toHaveLength(4);
      for (const metric of metrics) {
        expect(metric.used + metric.excluded).toBe(exampleCompanies.length);
      }
    }
  });
});
