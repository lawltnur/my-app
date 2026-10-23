import { describe, expect, it } from "vitest";
import { METRIC_DESCRIPTIONS, METRIC_SLUGS, metricFromSlug } from "../lib/metric-slugs";
import { METRIC_KEYS } from "../lib/metrics";

// 지표별 상세 화면 주소 — 4개 지표마다 이름·설명이 하나씩 있고, 목록에 없는 주소는 지표로 인정하지 않는다.
describe("지표 주소 이름", () => {
  it("4개 지표마다 이름과 설명이 있다", () => {
    for (const key of METRIC_KEYS) {
      expect(METRIC_SLUGS[key]).toBeTruthy();
      expect(METRIC_DESCRIPTIONS[key]).toBeTruthy();
    }
  });

  it("이름은 서로 겹치지 않는다", () => {
    const slugs = METRIC_KEYS.map((key) => METRIC_SLUGS[key]);
    expect(new Set(slugs).size).toBe(METRIC_KEYS.length);
  });

  it("이름으로 지표를 되찾는다", () => {
    for (const key of METRIC_KEYS) {
      expect(metricFromSlug(METRIC_SLUGS[key])).toBe(key);
    }
  });

  it("목록에 없는 이름은 null이다", () => {
    expect(metricFromSlug("nope")).toBeNull();
    expect(metricFromSlug("")).toBeNull();
    expect(metricFromSlug("../etc")).toBeNull();
  });
});
