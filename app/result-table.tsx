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
// 모양(유리 표·탭)은 app/globals.css의 .tab, .glass-table 규칙을 쓴다.
export function ResultTable({ results }: { results: MetricsResult }) {
  const [selected, setSelected] = useState<MetricKey>(METRIC_KEYS[0]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div role="tablist" aria-label="지표 선택" className="flex flex-wrap gap-2">
        {METRIC_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === selected}
            onClick={() => setSelected(key)}
            className="tab"
          >
            {METRIC_LABELS[key]}
          </button>
        ))}
      </div>
      <p className="text-sm text-white/80">
        &quot;평균에 쓰인 기업 수&quot;와 &quot;제외한 기업 수&quot;를 더하면 그 분기의
        대기업 전체 수입니다. 값이 비어 있는 기업은 0으로 보지 않고 제외합니다.
      </p>
      <div className="overflow-x-auto">
        <table className="glass-table">
          <thead>
            <tr>
              <th>분기</th>
              <th>대기업 전체</th>
              <th>
                평균 <span className="font-normal text-white/70">({METRIC_UNITS[selected]})</span>
              </th>
              <th>쓰인 기업 수</th>
              <th>제외한 기업 수</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) =>
              r.status === "no-data" ? (
                <tr key={r.quarter}>
                  <th>{r.quarter}</th>
                  <td colSpan={4} className="nodata">
                    데이터 없음
                  </td>
                </tr>
              ) : (
                <tr key={r.quarter}>
                  <th>{r.quarter}</th>
                  <td>{r.companyCount}</td>
                  <td>{formatAverage(r.metrics[selected].average)}</td>
                  <td>{r.metrics[selected].used}</td>
                  <td>{r.metrics[selected].excluded}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
