import { chunk, type IngestCompany, type IngestFinancial } from "./ingest";
import { fetchAllRows, type LoadResult } from "./load";
import type { getSupabase } from "./supabase";

// Design Ref: §2-2 적재 흐름 — 만들어 둔 기업·재무 데이터를 Supabase에 저장한다. (PLAN 2번)
// 같은 기업·분기는 새 값으로 덮어쓴다(upsert). 단, 저장할 줄은 lib/ingest.ts의 합치기(mergeFinancials)를 거쳐
// 바뀌는 것만 넘어온다. 그래서 같은 파일을 두 번 돌려도 결과가 같고, 비어 있는 칸이 저장된 값을 지우지 않는다.
// 이미 저장된 데이터를 지우지는 않는다.

// 저장에 필요한 Supabase 모양만 적어 둔다. (실제 클라이언트와 가짜 클라이언트를 모두 받는다.)
export type UpsertClient = {
  from(table: string): {
    upsert(
      rows: unknown[],
      options: { onConflict: string },
    ): PromiseLike<{ error: { message: string } | null }>;
  };
};

export const UPSERT_CHUNK = 1000;

export type SaveResult =
  | { ok: true; companies: number; financials: number }
  | { ok: false; message: string };

export async function saveIngest(
  client: UpsertClient,
  data: { companies: IngestCompany[]; financials: IngestFinancial[] },
  chunkSize: number = UPSERT_CHUNK,
): Promise<SaveResult> {
  // 재무 데이터가 기업 목록을 참조하므로 기업 목록을 먼저 저장한다.
  for (const part of chunk(data.companies, chunkSize)) {
    const { error } = await client
      .from("companies")
      .upsert(part, { onConflict: "company_code" });
    if (error) return { ok: false, message: `companies 저장 실패: ${error.message}` };
  }
  for (const part of chunk(data.financials, chunkSize)) {
    const { error } = await client
      .from("financials")
      .upsert(part, { onConflict: "company_code,quarter" });
    if (error) return { ok: false, message: `financials 저장 실패: ${error.message}` };
  }
  return {
    ok: true,
    companies: data.companies.length,
    financials: data.financials.length,
  };
}

// ── 이미 저장된 데이터 읽기 (합치기 위해) ─────────────────────

// 기업 목록 전체를 읽는다. (1,000행씩 나누어 끝까지)
export async function loadExistingCompanies(
  supabase: ReturnType<typeof getSupabase>,
): Promise<LoadResult<IngestCompany[]>> {
  return fetchAllRows<IngestCompany>(async (from, to) => {
    const r = await supabase
      .from("companies")
      .select("company_code, stock_code, name, size", { count: "exact" })
      .order("company_code")
      .range(from, to);
    return { data: r.data as IngestCompany[] | null, error: r.error, count: r.count };
  });
}

// 주어진 분기의 재무 데이터를 읽는다.
export async function loadExistingFinancials(
  supabase: ReturnType<typeof getSupabase>,
  quarters: string[],
): Promise<LoadResult<IngestFinancial[]>> {
  return fetchAllRows<IngestFinancial>(async (from, to) => {
    const r = await supabase
      .from("financials")
      .select(
        "company_code, quarter, total_debt, cash, ebitda, operating_cf, interest_coverage, short_term_debt",
        { count: "exact" },
      )
      .in("quarter", quarters)
      .order("company_code")
      .order("quarter")
      .range(from, to);
    return { data: r.data as IngestFinancial[] | null, error: r.error, count: r.count };
  });
}
