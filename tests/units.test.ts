import { describe, expect, it } from "vitest";
import { excelHeaders } from "../lib/excel";
import { METRIC_KEYS, METRIC_UNITS } from "../lib/metrics";

// 사용자 경험 개선 — 결과 표와 엑셀 머리글에 단위(억원, 배)를 보여 준다. (PRD must 2: 금액은 억원, 이자보상배율은 배수)
describe("지표별 단위", () => {
  it("4개 지표마다 단위가 하나씩 있다", () => {
    expect(Object.keys(METRIC_UNITS).sort()).toEqual([...METRIC_KEYS].sort());
  });

  it("금액 지표는 억원, 비율 지표는 배이다", () => {
    expect(METRIC_UNITS.operatingCf).toBe("억원");
    expect(METRIC_UNITS.shortTermDebt).toBe("억원");
    expect(METRIC_UNITS.netDebtToEbitda).toBe("배");
    expect(METRIC_UNITS.interestCoverage).toBe("배");
  });
});

describe("엑셀 머리글의 단위", () => {
  const headers = excelHeaders();

  it("평균 열에는 단위가 붙는다", () => {
    expect(headers).toContain("영업활동 현금흐름 평균(억원)");
    expect(headers).toContain("단기차입금 평균(억원)");
    expect(headers).toContain("순차입금/EBITDA 평균(배)");
    expect(headers).toContain("이자보상배율 평균(배)");
  });

  it("기업 수 열에는 단위를 붙이지 않는다 (곳 수는 단위 문제가 아니라서)", () => {
    expect(headers).toContain("영업활동 현금흐름 쓰인 기업 수");
    expect(headers).toContain("영업활동 현금흐름 제외한 기업 수");
  });

  it("열 개수와 순서는 그대로이다 (분기, 대기업 전체, 4개 지표 × 3)", () => {
    expect(headers).toHaveLength(14);
    expect(headers.slice(0, 2)).toEqual(["분기", "대기업 전체"]);
  });
});
