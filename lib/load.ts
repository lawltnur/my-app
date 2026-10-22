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
