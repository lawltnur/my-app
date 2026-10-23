import { describe, expect, it } from "vitest";
import { chartSeries, segments, valueRange } from "../lib/chart";
import { displayedAverage } from "../lib/format";
import { METRIC_KEYS, calculateMetrics } from "../lib/metrics";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";

// 지표별 선 그래프 — 값은 표·엑셀과 같고, 값이 없는 분기는 null이며, 선은 null에서 끊긴다.
describe("그래프 값", () => {
  const results = calculateMetrics({
    companies: exampleCompanies,
    financials: exampleFinancials,
    quarters: ["2025Q1", "2025Q2", "2030Q1"],
  });

  it("지표마다 분기 수만큼 점이 있고 분기 이름이 같다", () => {
    for (const key of METRIC_KEYS) {
      expect(chartSeries(results, key).map((p) => p.quarter)).toEqual(["2025Q1", "2025Q2", "2030Q1"]);
    }
  });

  it("값은 표·엑셀과 같은 displayedAverage이다", () => {
    for (const key of METRIC_KEYS) {
      const series = chartSeries(results, key);
      for (const [i, r] of results.entries()) {
        if (r.status !== "ok") continue;
        const shown = displayedAverage(r.metrics[key].average);
        expect(series[i].value).toBe(shown === "누락" ? null : shown);
      }
    }
  });

  it("데이터가 없는 분기는 null이다", () => {
    for (const key of METRIC_KEYS) {
      expect(chartSeries(results, key)[2].value).toBeNull();
    }
  });
});

describe("세로축 범위", () => {
  it("값이 없으면 null이다", () => {
    expect(valueRange([{ quarter: "2025Q1", value: null }])).toBeNull();
  });

  it("모든 값을 포함하고 위아래에 여유가 있다", () => {
    const r = valueRange([
      { quarter: "a", value: 10 },
      { quarter: "b", value: 20 },
    ])!;
    expect(r.min).toBeLessThan(10);
    expect(r.max).toBeGreaterThan(20);
  });

  it("값이 모두 같아도 범위가 0보다 크다", () => {
    const r = valueRange([
      { quarter: "a", value: 5 },
      { quarter: "b", value: 5 },
    ])!;
    expect(r.max).toBeGreaterThan(r.min);
  });

  it("음수와 양수가 섞이면 0이 범위 안에 있다", () => {
    const r = valueRange([
      { quarter: "a", value: -3 },
      { quarter: "b", value: 4 },
    ])!;
    expect(r.min).toBeLessThan(0);
    expect(r.max).toBeGreaterThan(0);
  });
});

describe("선 구간", () => {
  it("null에서 끊어 구간을 나눈다", () => {
    const points = [1, 2, null, 4, null, null, 7, 8].map((value, i) => ({ quarter: `q${i}`, value }));
    expect(segments(points)).toEqual([[0, 1], [3], [6, 7]]);
  });

  it("값이 모두 null이면 구간이 없다", () => {
    expect(segments([{ quarter: "a", value: null }])).toEqual([]);
  });
});
