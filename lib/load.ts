import type { Company, FinancialRow } from "./metrics";
import { getSupabase } from "./supabase";

export type OverviewResult =
  | { ok: true; largeCompanyCount: number; financialRowCount: number }
  | { ok: false; message: string };

// Design Ref: §2-1 ③ — 저장된 데이터에서 대기업 수와 재무 데이터 건수를 읽어 접속을 확인한다.
// Plan SC: PLAN 1번 — 서버 코드에서 Supabase에 접속해 대기업 수와 데이터 건수가 읽히는지 확인
export async function readOverview(): Promise<OverviewResult> {
  try {
    const supabase = getSupabase();

    // 행 내용은 가져오지 않고 개수만 센다. (head: true)
    const [companies, financials] = await Promise.all([
      supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("size", "대기업"),
      supabase.from("financials").select("*", { count: "exact", head: true }),
    ]);

    if (companies.error) {
      return { ok: false, message: `companies 읽기 실패: ${companies.error.message}` };
    }
    if (financials.error) {
      return { ok: false, message: `financials 읽기 실패: ${financials.error.message}` };
    }

    return {
      ok: true,
      largeCompanyCount: companies.count ?? 0,
      financialRowCount: financials.count ?? 0,
    };
  } catch (error) {
    // 키 값은 메시지에 넣지 않는다.
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return { ok: false, message: `접속 실패: ${message}` };
  }
}

// ── 입력 분기 범위의 대기업 데이터 불러오기 (PLAN 10번) ──────────

// Supabase는 한 번에 1,000행까지만 돌려준다. 그래서 1,000행씩 나누어 끝까지 읽는다.
// 중간에 빠지면 평균이 조용히 틀어지므로, 읽은 행 수가 DB의 행 수와 같은지 마지막에 확인한다.
export const PAGE_SIZE = 1000;

export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

type Page<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count: number | null;
};

export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<Page<T>>,
  pageSize: number = PAGE_SIZE,
): Promise<LoadResult<T[]>> {
  const rows: T[] = [];
  let expectedCount: number | null = null;

  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    if (page.error) return { ok: false, message: page.error.message };

    const data = page.data ?? [];
    rows.push(...data);
    if (page.count !== null) expectedCount = page.count;

    // 한 쪽이 가득 차지 않았다면 마지막 쪽이다.
    if (data.length < pageSize) break;
  }

  if (expectedCount !== null && rows.length !== expectedCount) {
    return {
      ok: false,
      message: `읽은 행 수(${rows.length})가 데이터베이스의 행 수(${expectedCount})와 다릅니다.`,
    };
  }
  return { ok: true, data: rows };
}

export type RangeData = {
  companies: Company[];
  financials: FinancialRow[];
};

// Design Ref: §2-1 ③ — 기업규모가 "대기업"인 기업과, 입력한 분기의 재무 데이터를 불러온다.
// 대기업이 아닌 기업의 재무 줄은 버린다. (PRD: 구분이 "대기업"인 기업만 계산에 쓴다.)
export async function loadRangeData(
  quarters: string[],
): Promise<LoadResult<RangeData>> {
  try {
    const supabase = getSupabase();

    const companies = await fetchAllRows<Company>(async (from, to) => {
      const r = await supabase
        .from("companies")
        .select("company_code, stock_code, name, size", { count: "exact" })
        .eq("size", "대기업")
        .order("company_code")
        .range(from, to);
      return { data: r.data as Company[] | null, error: r.error, count: r.count };
    });
    if (!companies.ok) {
      return { ok: false, message: `companies 읽기 실패: ${companies.message}` };
    }

    const financials = await fetchAllRows<FinancialRow>(async (from, to) => {
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
      return { data: r.data as FinancialRow[] | null, error: r.error, count: r.count };
    });
    if (!financials.ok) {
      return { ok: false, message: `financials 읽기 실패: ${financials.message}` };
    }

    const largeCodes = new Set(companies.data.map((c) => c.company_code));
    return {
      ok: true,
      data: {
        companies: companies.data,
        financials: financials.data.filter((f) => largeCodes.has(f.company_code)),
      },
    };
  } catch (error) {
    // 키 값은 메시지에 넣지 않는다.
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return { ok: false, message: `접속 실패: ${message}` };
  }
}
