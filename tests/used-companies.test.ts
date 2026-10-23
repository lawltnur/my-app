import { describe, expect, it } from "vitest";
import { METRIC_KEYS, calculateMetrics, usedCompanyValues } from "../lib/metrics";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";

// 평균에 쓰인 기업 목록 — 길이는 "쓰인 기업 수"와 같고, 값이 빈 기업은 들어가지 않는다.
const quarters = ["2025Q1", "2025Q2"];
const input = { companies: exampleCompanies, financials: exampleFinancials, quarters };

describe("평균에 쓰인 기업 목록", () => {
  const results = calculateMetrics(input);

  it("목록 길이가 모든 지표·분기에서 쓰인 기업 수와 같다", () => {
    for (const r of results) {
      if (r.status !== "ok") continue;
      for (const key of METRIC_KEYS) {
        expect(usedCompanyValues(input, r.quarter, key)).toHaveLength(r.metrics[key].used);
      }
    }
  });

  it("목록 값의 평균이 표의 평균과 같다", () => {
    for (const r of results) {
      if (r.status !== "ok") continue;
      for (const key of METRIC_KEYS) {
        const list = usedCompanyValues(input, r.quarter, key);
        if (list.length === 0) continue;
        const mean = list.reduce((s, u) => s + u.value, 0) / list.length;
        expect(mean).toBeCloseTo(r.metrics[key].average as number, 10);
      }
    }
  });

  it("값이 비어 제외된 기업은 목록에 없다 (예: 2025Q2 기업 A는 현금이 비어 순차입금/EBITDA에서 제외)", () => {
    const names = usedCompanyValues(input, "2025Q2", "netDebtToEbitda").map((u) => u.company.company_code);
    const withCash = exampleFinancials.filter((f) => f.quarter === "2025Q2" && f.cash === null).map((f) => f.company_code);
    for (const code of withCash) expect(names).not.toContain(code);
  });

  it("데이터가 없는 분기는 빈 목록이다", () => {
    expect(usedCompanyValues(input, "2030Q1", "operatingCf")).toEqual([]);
  });
});
