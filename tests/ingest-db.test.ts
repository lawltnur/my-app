import { describe, expect, it } from "vitest";
import type { IngestCompany, IngestFinancial } from "../lib/ingest";
import { saveIngest, type UpsertClient } from "../lib/ingest-db";

// Plan SC: PLAN 2번 — 검사를 통과한 데이터를 Supabase에 저장한다. (같은 파일을 다시 돌려도 결과가 같다: upsert)
function fakeClient(failOn?: string) {
  const calls: { table: string; count: number; onConflict: string }[] = [];
  const client: UpsertClient = {
    from(table) {
      return {
        async upsert(rows, options) {
          calls.push({ table, count: rows.length, onConflict: options.onConflict });
          return {
            error: failOn === table ? { message: "거부됨" } : null,
          };
        },
      };
    },
  };
  return { client, calls };
}

const companies: IngestCompany[] = Array.from({ length: 5 }, (_, i) => ({
  company_code: `N${i}`,
  stock_code: null,
  name: `기업${i}`,
  size: "대기업",
}));
const financials: IngestFinancial[] = Array.from({ length: 3 }, (_, i) => ({
  company_code: `N${i}`,
  quarter: "2025Q1",
  total_debt: i,
  cash: null,
  ebitda: null,
  operating_cf: null,
  interest_coverage: null,
  short_term_debt: null,
}));

describe("saveIngest", () => {
  it("기업 목록을 먼저, 재무 데이터를 나중에 저장한다", async () => {
    const { client, calls } = fakeClient();
    const result = await saveIngest(client, { companies, financials }, 100);
    expect(result).toEqual({ ok: true, companies: 5, financials: 3 });
    expect(calls.map((c) => c.table)).toEqual(["companies", "financials"]);
  });

  it("같은 기업·분기는 덮어쓰도록 기준 열을 알려 준다", async () => {
    const { client, calls } = fakeClient();
    await saveIngest(client, { companies, financials }, 100);
    expect(calls[0].onConflict).toBe("company_code");
    expect(calls[1].onConflict).toBe("company_code,quarter");
  });

  it("많은 줄은 정해 둔 개수씩 나누어 보낸다", async () => {
    const { client, calls } = fakeClient();
    await saveIngest(client, { companies, financials }, 2);
    expect(calls.filter((c) => c.table === "companies").map((c) => c.count)).toEqual([2, 2, 1]);
    expect(calls.filter((c) => c.table === "financials").map((c) => c.count)).toEqual([2, 1]);
  });

  it("기업 목록 저장이 실패하면 재무 데이터는 저장하지 않고 멈춘다", async () => {
    const { client, calls } = fakeClient("companies");
    const result = await saveIngest(client, { companies, financials }, 100);
    expect(result).toEqual({ ok: false, message: "companies 저장 실패: 거부됨" });
    expect(calls.every((c) => c.table === "companies")).toBe(true);
  });

  it("재무 데이터 저장이 실패하면 오류로 알린다", async () => {
    const { client } = fakeClient("financials");
    const result = await saveIngest(client, { companies, financials }, 100);
    expect(result.ok).toBe(false);
  });
});
