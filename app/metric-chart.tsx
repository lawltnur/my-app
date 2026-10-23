"use client";

import { useState } from "react";
import { chartSeries, segments, valueRange } from "@/lib/chart";
import { formatAverage } from "@/lib/format";
import { METRIC_LABELS, METRIC_UNITS, type MetricKey, type MetricsResult } from "@/lib/metrics";

// 지표 하나의 분기별 평균을 선 그래프로 보여 준다. (새 패키지 없이 SVG로 직접 그린다.)
// 값은 표와 같은 값(lib/chart.ts → displayedAverage)이다. "누락"이거나 데이터가 없는 분기는 점을 찍지 않고 선을 끊는다.
// 분기마다 세로 띠(눈에 안 보이는 칸)를 두어, 그 칸에 마우스를 올리면(터치하면) 안내선과 함께 수치 상자를 보여 준다.
// 마우스 이벤트 때문에 클라이언트 컴포넌트이다. 계산은 하지 않고 받은 결과를 그리기만 한다.

const W = 800;
const H = 300;
const PAD = { left: 70, right: 24, top: 20, bottom: 40 };
const TICKS = 5; // 세로축 눈금 수
const MAX_X_LABELS = 10; // 가로축에 글자를 모두 쓰면 겹치므로 이 수 이하로 줄여 쓴다.
const BOX_W = 170;
const BOX_H = 62;

export function MetricChart({ results, metric }: { results: MetricsResult; metric: MetricKey }) {
  const [hover, setHover] = useState<number | null>(null);
  const points = chartSeries(results, metric);
  const range = valueRange(points);

  if (!range) {
    return (
      <p className="glass-soft px-4 py-3 text-sm text-soft">
        이 범위에는 그래프로 그릴 평균이 없습니다. (모두 &quot;누락&quot;이거나 데이터가 없는 분기입니다.)
      </p>
    );
  }

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const step = points.length === 1 ? plotW : plotW / (points.length - 1);
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
  const y = (v: number) => PAD.top + plotH * (1 - (v - range.min) / (range.max - range.min));

  const ticks = Array.from(
    { length: TICKS },
    (_, i) => range.min + ((range.max - range.min) * i) / (TICKS - 1),
  );
  const labelEvery = Math.ceil(points.length / MAX_X_LABELS);
  const zeroVisible = range.min < 0 && range.max > 0;

  // 수치 상자에 쓸 내용: 값이 있으면 평균과 쓰인 기업 수, 없으면 이유(누락 / 데이터 없음)
  const hovered = hover === null ? null : points[hover];
  const hoveredResult = hover === null ? null : results[hover];
  let boxX = 0;
  let boxY = 0;
  let lines: string[] = [];
  if (hovered && hoveredResult && hover !== null) {
    const hasValue = hovered.value !== null;
    const px = x(hover);
    const py = hasValue ? y(hovered.value as number) : PAD.top + plotH / 2;
    boxX = Math.min(Math.max(px - BOX_W / 2, PAD.left), W - PAD.right - BOX_W);
    boxY = py - BOX_H - 12 < 2 ? py + 14 : py - BOX_H - 12;
    if (hoveredResult.status === "no-data") {
      lines = [hovered.quarter, "데이터 없음"];
    } else if (!hasValue) {
      lines = [hovered.quarter, "누락 (평균을 구할 수 없음)"];
    } else {
      lines = [
        hovered.quarter,
        `${formatAverage(hovered.value)} ${METRIC_UNITS[metric]}`,
        `평균에 쓰인 기업 ${hoveredResult.metrics[metric].used}곳`,
      ];
    }
  }

  return (
    <figure className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${METRIC_LABELS[metric]} 분기별 평균 선 그래프 (${METRIC_UNITS[metric]}). 같은 값이 아래 표에 있습니다.`}
        className="h-auto w-full"
        onMouseLeave={() => setHover(null)}
      >
        {/* 가로 눈금선과 세로축 값 */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e3e9f1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#52627a">
              {formatAverage(t)}
            </text>
          </g>
        ))}
        {zeroVisible && (
          <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="#9aa8bd" strokeDasharray="4 4" />
        )}

        {/* 가로축 분기 */}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={p.quarter} x={x(i)} y={H - 14} textAnchor="middle" fontSize="11" fill="#52627a">
              {p.quarter}
            </text>
          ) : null,
        )}

        {/* 마우스를 올린 분기의 세로 안내선 */}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="#1f6feb"
            strokeOpacity="0.35"
            strokeDasharray="3 3"
          />
        )}

        {/* 값이 이어지는 구간마다 선 */}
        {segments(points).map((seg) =>
          seg.length > 1 ? (
            <polyline
              key={seg[0]}
              fill="none"
              stroke="#1f6feb"
              strokeWidth="2.5"
              strokeLinejoin="round"
              points={seg.map((i) => `${x(i)},${y(points[i].value as number)}`).join(" ")}
            />
          ) : null,
        )}

        {/* 점. 값이 있는 분기에만 찍고, 마우스를 올린 분기는 크고 파랗게 채운다. */}
        {points.map((p, i) =>
          p.value === null ? null : (
            <circle
              key={p.quarter}
              cx={x(i)}
              cy={y(p.value)}
              r={hover === i ? 6.5 : 4.5}
              fill={hover === i ? "#1f6feb" : "#fff"}
              stroke="#1f6feb"
              strokeWidth="2.5"
            />
          ),
        )}

        {/* 분기마다 눈에 안 보이는 세로 띠 — 값이 없는 분기에서도 마우스에 반응한다. */}
        {points.map((p, i) => (
          <rect
            key={p.quarter}
            x={x(i) - step / 2}
            y={PAD.top}
            width={step}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseMove={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          />
        ))}

        {/* 수치 상자 */}
        {hovered && lines.length > 0 && (
          <g pointerEvents="none">
            <rect
              x={boxX}
              y={boxY}
              width={BOX_W}
              height={lines.length === 3 ? BOX_H : 44}
              rx="10"
              fill="#0f1b2d"
              fillOpacity="0.94"
            />
            <text x={boxX + 12} y={boxY + 18} fontSize="11" fill="#b9c6da">
              {lines[0]}
            </text>
            <text x={boxX + 12} y={boxY + 36} fontSize="14" fontWeight="600" fill="#fff">
              {lines[1]}
            </text>
            {lines[2] && (
              <text x={boxX + 12} y={boxY + 53} fontSize="11" fill="#b9c6da">
                {lines[2]}
              </text>
            )}
          </g>
        )}
      </svg>
      <figcaption className="mt-1 text-xs text-soft">
        분기별 평균 ({METRIC_UNITS[metric]}) · 그래프에 마우스를 올리면 그 분기의 수치가 나옵니다. 평균을 구할 수 없는
        분기(누락)와 데이터 없는 분기는 점 없이 선이 끊깁니다.
      </figcaption>
    </figure>
  );
}
