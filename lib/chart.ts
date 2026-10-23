import { displayedAverage } from "./format";
import type { MetricKey, MetricsResult } from "./metrics";

// 지표별 결과 화면의 선 그래프에 쓸 값을 만든다.
// 값은 표와 엑셀이 쓰는 displayedAverage(소수점 2자리로 반올림한 평균)를 그대로 써서 "화면 표 = 그래프 = 엑셀"이 같다.
// 평균을 구할 수 없는 분기("누락")와 데이터가 없는 분기는 값이 null이며, 그래프에서는 선을 끊어 보여 준다.

export type ChartPoint = { quarter: string; value: number | null };

export function chartSeries(results: MetricsResult, metric: MetricKey): ChartPoint[] {
  return results.map((r) => {
    if (r.status === "no-data") return { quarter: r.quarter, value: null };
    const shown = displayedAverage(r.metrics[metric].average);
    return { quarter: r.quarter, value: shown === "누락" ? null : shown };
  });
}

// 세로축의 범위. 값이 하나도 없으면 null이다.
// 위아래에 여유를 두고, 값이 모두 같으면 ±1 범위를 만든다. 0이 범위 근처에 있으면 0선이 보이도록 0까지 넓힌다.
export function valueRange(points: ChartPoint[]): { min: number; max: number } | null {
  const values = points.flatMap((p) => (p.value === null ? [] : [p.value]));
  if (values.length === 0) return null;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;
  // 0이 범위 바깥이어도 범위 길이의 절반 이내이면 0까지 포함한다.
  const span = max - min;
  if (min > 0 && min < span / 2) min = 0;
  if (max < 0 && -max < span / 2) max = 0;
  return { min, max };
}

// 값이 이어지는 구간(null로 끊긴 곳은 나눔)별로 점 번호를 묶는다. 선은 구간마다 따로 긋는다.
export function segments(points: ChartPoint[]): number[][] {
  const result: number[][] = [];
  let current: number[] = [];
  points.forEach((p, i) => {
    if (p.value === null) {
      if (current.length > 0) result.push(current);
      current = [];
    } else {
      current.push(i);
    }
  });
  if (current.length > 0) result.push(current);
  return result;
}
