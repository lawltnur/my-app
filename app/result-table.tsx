"use client";

import { useState } from "react";
import { formatAverage } from "@/lib/format";
import {
  METRIC_KEYS,
  METRIC_LABELS,
  METRIC_UNITS,
  type MetricKey,
  type MetricsResult,
} from "@/lib/metrics";

// Design Ref: §1 ④ 결과 표 — 행은 분기, 열은 고른 지표의 평균·평균에 쓰인 기업 수·제외한 기업 수.
// 4개 지표를 한꺼번에 늘어놓지 않고, 위쪽 탭을 눌러 한 지표씩 본다. (엑셀 파일에는 4개가 모두 들어 있다.)
// 계산은 lib/metrics.ts에서만 하고, 이 파일은 받은 결과를 그대로 보여 주기만 한다.
// 값이 없으면 빈칸이 아니라 "누락", 데이터가 없는 분기는 한 줄로 "데이터 없음"이라고 쓴다.
export function ResultTable({ results }: { results: MetricsResult }) {
  const [selected, setSelected] = useState<MetricKey>(METRIC_KEYS[0]);

  const cell = "border border-zinc-300 px-2 py-1 text-right dark:border-zinc-700";
  const head =
    "whitespace-nowrap border border-zinc-300 bg-zinc-100 px-2 py-1 text-center font-medium dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div role="tablist" aria-label="지표 선택" className="flex flex-wrap gap-2">
        {METRIC_KEYS.map((key) => {
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(key)}
              className={
                active
                  ? "rounded border border-zinc-900 bg-zinc-900 px-3 py-1 text-sm font-medium text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              }
            >
              {METRIC_LABELS[key]}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        &quot;평균에 쓰인 기업 수&quot;와 &quot;제외한 기업 수&quot;를 더하면 그 분기의
        대기업 전체 수입니다. 값이 비어 있는 기업은 0으로 보지 않고 제외합니다.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={head}>분기</th>
              <th className={head}>대기업 전체</th>
              <th className={head}>
                평균{" "}
                <span className="font-normal text-zinc-500">
                  ({METRIC_UNITS[selected]})
                </span>
              </th>
              <th className={head}>쓰인 기업 수</th>
              <th className={head}>제외한 기업 수</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) =>
              r.status === "no-data" ? (
                <tr key={r.quarter}>
                  <th className={head}>{r.quarter}</th>
                  <td
                    colSpan={4}
                    className="border border-amber-300 bg-amber-50 px-2 py-1 text-center text-amber-900"
                  >
                    데이터 없음
                  </td>
                </tr>
              ) : (
                <tr key={r.quarter}>
                  <th className={head}>{r.quarter}</th>
                  <td className={cell}>{r.companyCount}</td>
                  <td className={cell}>{formatAverage(r.metrics[selected].average)}</td>
                  <td className={cell}>{r.metrics[selected].used}</td>
                  <td className={cell}>{r.metrics[selected].excluded}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
