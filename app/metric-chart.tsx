import { chartSeries, segments, valueRange } from "@/lib/chart";
import { formatAverage } from "@/lib/format";
import { METRIC_LABELS, METRIC_UNITS, type MetricKey, type MetricsResult } from "@/lib/metrics";

// 지표 하나의 분기별 평균을 선 그래프로 보여 준다. (새 패키지 없이 SVG로 직접 그린다.)
// 값은 표와 같은 값(lib/chart.ts → displayedAverage)이다. "누락"이거나 데이터가 없는 분기는 점을 찍지 않고 선을 끊는다.
// 점에 마우스를 올리면 분기와 값이 말풍선(title)으로 보인다.

const W = 800;
const H = 300;
const PAD = { left: 70, right: 24, top: 20, bottom: 40 };
const TICKS = 5; // 세로축 눈금 수
const MAX_X_LABELS = 10; // 가로축에 글자를 모두 쓰면 겹치므로 이 수 이하로 줄여 쓴다.

export function MetricChart({ results, metric }: { results: MetricsResult; metric: MetricKey }) {
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
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
  const y = (v: number) => PAD.top + plotH * (1 - (v - range.min) / (range.max - range.min));

  const ticks = Array.from(
    { length: TICKS },
    (_, i) => range.min + ((range.max - range.min) * i) / (TICKS - 1),
  );
  const labelEvery = Math.ceil(points.length / MAX_X_LABELS);
  const zeroVisible = range.min < 0 && range.max > 0;

  return (
    <figure className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${METRIC_LABELS[metric]} 분기별 평균 선 그래프 (${METRIC_UNITS[metric]})`}
        className="h-auto w-full"
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

        {/* 점. 값이 있는 분기에만 찍는다. */}
        {points.map((p, i) =>
          p.value === null ? null : (
            <circle key={p.quarter} cx={x(i)} cy={y(p.value)} r="4.5" fill="#fff" stroke="#1f6feb" strokeWidth="2.5">
              <title>{`${p.quarter}: ${formatAverage(p.value)} ${METRIC_UNITS[metric]}`}</title>
            </circle>
          ),
        )}
      </svg>
      <figcaption className="mt-1 text-xs text-soft">
        분기별 평균 ({METRIC_UNITS[metric]}) · 평균을 구할 수 없는 분기(누락)와 데이터 없는 분기는 점 없이 선이 끊깁니다.
      </figcaption>
    </figure>
  );
}
