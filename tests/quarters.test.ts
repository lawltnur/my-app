import { describe, expect, it } from "vitest";
import { parseQuarter, quarterRange } from "../lib/quarters";

// Plan SC: PLAN 9번 — 분기 형식이 틀렸거나 시작이 끝보다 늦으면 알리고,
// 정상이면 시작~끝 분기 목록을 만든다.
describe("parseQuarter: 분기 형식", () => {
  it("2025Q4 형식을 읽는다", () => {
    expect(parseQuarter("2025Q4")).toEqual({ year: 2025, q: 4 });
  });

  it("앞뒤 공백과 소문자 q는 봐준다", () => {
    expect(parseQuarter(" 2024q1 ")).toEqual({ year: 2024, q: 1 });
  });

  it.each(["2025", "2025Q0", "2025Q5", "25Q1", "Q1", "2025-Q1", "2025Q", "abc"])(
    "%s 는 형식이 틀리다",
    (text) => {
      expect(parseQuarter(text)).toBeNull();
    },
  );
});

describe("quarterRange: 범위 검사와 분기 목록", () => {
  it("같은 해 안의 범위를 만든다", () => {
    expect(quarterRange("2025Q1", "2025Q3")).toEqual({
      ok: true,
      from: "2025Q1",
      to: "2025Q3",
      quarters: ["2025Q1", "2025Q2", "2025Q3"],
    });
  });

  it("해를 넘기는 범위도 오래된 순으로 만든다", () => {
    const result = quarterRange("2024Q3", "2025Q2");
    expect(result.ok && result.quarters).toEqual([
      "2024Q3",
      "2024Q4",
      "2025Q1",
      "2025Q2",
    ]);
  });

  it("시작과 끝이 같으면 분기 하나이다", () => {
    const result = quarterRange("2025Q4", "2025Q4");
    expect(result.ok && result.quarters).toEqual(["2025Q4"]);
  });

  it("입력은 정리해서(공백·소문자) 돌려준다", () => {
    const result = quarterRange(" 2025q1", "2025q2 ");
    expect(result.ok && result.quarters).toEqual(["2025Q1", "2025Q2"]);
  });

  it("시작이 끝보다 늦으면 이유를 알린다", () => {
    const result = quarterRange("2025Q3", "2025Q1");
    expect(result).toEqual({
      ok: false,
      message: "시작 분기(2025Q3)가 끝 분기(2025Q1)보다 늦습니다.",
    });
  });

  it("시작 분기 형식이 틀리면 어느 칸인지 알린다", () => {
    const result = quarterRange("2025Q5", "2025Q4");
    expect(!result.ok && result.message).toContain("시작 분기");
  });

  it("끝 분기 형식이 틀리면 어느 칸인지 알린다", () => {
    const result = quarterRange("2025Q1", "내년");
    expect(!result.ok && result.message).toContain("끝 분기");
  });

  it("비어 있으면 모두 입력하라고 알린다", () => {
    expect(quarterRange("", "2025Q1")).toEqual({
      ok: false,
      message: "시작 분기와 끝 분기를 모두 입력해 주세요.",
    });
    expect(quarterRange("2025Q1", "  ").ok).toBe(false);
  });
});
