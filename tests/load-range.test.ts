import { describe, expect, it } from "vitest";
import { PAGE_SIZE, fetchAllRows } from "../lib/load";
import { calculateMetrics, type MetricsInput } from "../lib/metrics";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";

// Plan SC: PLAN 10번 — 입력 분기 범위의 대기업 데이터를 불러오고(1,000행씩 나누어 끝까지),
// 데이터가 없는 분기는 계산하지 않고 "데이터 없음"으로 표시한다.

// 가짜 데이터베이스: 0부터 total-1까지의 행을 쪽 단위로 돌려준다.
function fakeTable(total: number, reportedCount: number | null = total) {
  const calls: Array<[number, number]> = [];
  const fetchPage = async (from: number, to: number) => {
    calls.push([from, to]);
    const data = Array.from(
      { length: Math.max(0, Math.min(to + 1, total) - from) },
      (_, i) => ({ id: from + i }),
    );
    return { data, error: null, count: reportedCount };
  };
  return { fetchPage, calls };
}

describe("fetchAllRows: 1,000행씩 나누어 끝까지 읽기", () => {
  it("한 쪽에 다 들어가면 한 번만 읽는다", async () => {
    const { fetchPage, calls } = fakeTable(300);
    const result = await fetchAllRows(fetchPage);
    expect(result.ok && result.data).toHaveLength(300);
    expect(calls).toHaveLength(1);
  });

  it("2,500행이면 1,000 + 1,000 + 500으로 3번 읽고 하나도 빠지지 않는다", async () => {
    const { fetchPage, calls } = fakeTable(2500);
    const result = await fetchAllRows(fetchPage);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(result.ok && result.data).toHaveLength(2500);
    expect(result.ok && result.data[2499]).toEqual({ id: 2499 });
  });

  it("정확히 1,000행이면 빈 쪽을 한 번 더 읽고 끝낸다", async () => {
    const { fetchPage, calls } = fakeTable(PAGE_SIZE);
    const result = await fetchAllRows(fetchPage);
    expect(result.ok && result.data).toHaveLength(PAGE_SIZE);
    expect(calls).toHaveLength(2);
  });

  it("읽은 행 수가 데이터베이스의 행 수와 다르면 오류로 알린다", async () => {
    const { fetchPage } = fakeTable(1500, 1600);
    const result = await fetchAllRows(fetchPage);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain("1500");
  });

  it("데이터베이스 오류는 그대로 오류로 돌려준다", async () => {
    const result = await fetchAllRows(async () => ({
      data: null,
      error: { message: "연결 실패" },
      count: null,
    }));
    expect(result).toEqual({ ok: false, message: "연결 실패" });
  });
});

describe("calculateMetrics: 데이터가 없는 분기", () => {
  const input: MetricsInput = {
    companies: exampleCompanies,
    financials: exampleFinancials,
    quarters: ["2025Q1", "2025Q2", "2025Q3"],
  };

  it("재무 줄이 하나도 없는 분기는 계산하지 않고 데이터 없음으로 표시한다", () => {
    const result = calculateMetrics(input);
    expect(result.map((r) => r.status)).toEqual(["ok", "ok", "no-data"]);
    expect(result[2]).toEqual({ quarter: "2025Q3", status: "no-data" });
  });

  it("데이터가 있는 분기만 계산한다", () => {
    const result = calculateMetrics(input);
    expect(result[0].status === "ok" && result[0].companyCount).toBe(3);
  });

  it("대기업이 아닌 기업의 줄만 있는 분기도 데이터 없음이다", () => {
    const onlyOther: MetricsInput = {
      companies: exampleCompanies,
      financials: [{ ...exampleFinancials[0], company_code: "ZZZ", quarter: "2025Q3" }],
      quarters: ["2025Q3"],
    };
    expect(calculateMetrics(onlyOther)[0].status).toBe("no-data");
  });
});
