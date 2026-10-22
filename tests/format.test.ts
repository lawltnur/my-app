import { describe, expect, it } from "vitest";
import { formatAverage } from "../lib/format";

// Plan SC: PLAN 11번 — 평균을 화면에 보여 주는 형식. 빈 값은 빈칸이 아니라 "누락"으로 쓴다.
describe("formatAverage: 평균 표시 형식", () => {
  it("소수점 아래 2자리까지 보여 준다", () => {
    expect(formatAverage(3.75)).toBe("3.75");
    expect(formatAverage(1100 / 3)).toBe("366.67");
  });

  it("자리가 모자라면 0으로 채운다", () => {
    expect(formatAverage(60)).toBe("60.00");
  });

  it("천 단위마다 쉼표를 넣는다", () => {
    expect(formatAverage(12345.678)).toBe("12,345.68");
  });

  it("음수도 그대로 보여 준다", () => {
    expect(formatAverage(-1)).toBe("-1.00");
  });

  it("0은 누락이 아니라 0.00으로 보여 준다", () => {
    expect(formatAverage(0)).toBe("0.00");
  });

  it("평균을 구할 수 없으면(null) 누락이라고 쓴다", () => {
    expect(formatAverage(null)).toBe("누락");
  });
});
