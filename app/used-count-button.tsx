"use client";

import { useRef, useState } from "react";
import { formatAverage } from "@/lib/format";
import type { UsedCompaniesBody } from "./api/used-companies/route";

// 결과 표의 "쓰인 기업 수" 칸. 숫자를 누르면 그 분기·지표의 평균에 쓰인 기업 목록을 창(dialog)으로 보여 준다.
// 목록은 누를 때 서버(/api/used-companies)에서 가져온다. 분기마다 수백 곳이라 미리 모두 싣지 않는다.
// 창 안에서 기업 이름·종목코드로 걸러 볼 수 있다. 값은 표와 같은 형식(소수점 2자리)이다.

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; data: UsedCompaniesBody };

export function UsedCountButton({
  quarter,
  metricSlug,
  count,
}: {
  quarter: string;
  metricSlug: string;
  count: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [query, setQuery] = useState("");

  // 0곳이면 보여 줄 목록이 없으므로 숫자만 쓴다.
  if (count === 0) return <>{count}</>;

  async function open() {
    setQuery("");
    dialog.current?.showModal();
    if (state.kind === "ok") return; // 이미 가져온 목록은 다시 가져오지 않는다.
    setState({ kind: "loading" });
    try {
      const response = await fetch(
        `/api/used-companies?quarter=${encodeURIComponent(quarter)}&metric=${encodeURIComponent(metricSlug)}`,
      );
      const body = await response.json();
      if (!response.ok) {
        setState({ kind: "error", message: body.message ?? "목록을 가져오지 못했습니다." });
        return;
      }
      setState({ kind: "ok", data: body as UsedCompaniesBody });
    } catch {
      setState({ kind: "error", message: "목록을 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    }
  }

  const q = query.trim().toLowerCase();
  const rows =
    state.kind === "ok"
      ? state.data.companies.filter(
          (c) => q === "" || c.name.toLowerCase().includes(q) || (c.stockCode ?? "").toLowerCase().includes(q),
        )
      : [];

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="used-link"
        title="눌러서 평균에 쓰인 기업 목록 보기"
      >
        {count}
      </button>
      <dialog
        ref={dialog}
        className="used-dialog"
        onClick={(e) => {
          // 창 바깥(어두운 배경)을 누르면 닫는다.
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="display text-2xl">평균에 쓰인 기업</h2>
            <p className="text-sm text-soft">
              {quarter}
              {state.kind === "ok" && ` · ${state.data.metric} (${state.data.unit}) · ${state.data.companies.length}곳`}
            </p>
          </div>
          <button type="button" className="btn-glass" onClick={() => dialog.current?.close()}>
            닫기
          </button>
        </div>

        {state.kind === "loading" && <p className="mt-4 text-soft">기업 목록을 불러오는 중…</p>}
        {state.kind === "error" && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-red-800">{state.message}</p>
        )}
        {state.kind === "ok" && (
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="기업 이름 또는 종목코드로 찾기"
              className="field mt-4 w-full"
            />
            <div className="used-scroll mt-3">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>기업 이름</th>
                    <th>종목코드</th>
                    <th>
                      값 <span className="font-normal text-soft">({state.data.unit})</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.code}>
                      <td style={{ textAlign: "left" }}>{c.name}</td>
                      <td style={{ textAlign: "center" }}>{c.stockCode ?? "-"}</td>
                      <td>{formatAverage(c.value)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="nodata">
                        찾는 기업이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
