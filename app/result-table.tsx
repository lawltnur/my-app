import { formatAverage } from "@/lib/format";
import { METRIC_KEYS, METRIC_LABELS, type MetricsResult } from "@/lib/metrics";

// Design Ref: §1 ④ 결과 표 — 행은 분기, 열은 4개 지표 각각의 평균·평균에 쓰인 기업 수·제외한 기업 수.
// 계산은 lib/metrics.ts에서만 하고, 이 파일은 받은 결과를 그대로 보여 주기만 한다.
// 값이 없으면 빈칸이 아니라 "누락", 데이터가 없는 분기는 한 줄로 "데이터 없음"이라고 쓴다.
export function ResultTable({ results }: { results: MetricsResult }) {
  const cell = "border border-zinc-300 px-2 py-1 text-right dark:border-zinc-700";
  const head =
    "whitespace-nowrap border border-zinc-300 bg-zinc-100 px-2 py-1 text-center font-medium dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        지표마다 &quot;평균에 쓰인 기업 수&quot;와 &quot;제외한 기업 수&quot;를 더하면
        그 분기의 대기업 전체 수입니다. 값이 비어 있는 기업은 0으로 보지 않고
        제외합니다.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th rowSpan={2} className={head}>
                분기
              </th>
              <th rowSpan={2} className={head}>
                대기업 전체
              </th>
              {METRIC_KEYS.map((key) => (
                <th key={key} colSpan={3} className={head}>
                  {METRIC_LABELS[key]}
                </th>
              ))}
            </tr>
            <tr>
              {METRIC_KEYS.map((key) => [
                <th key={`${key}-avg`} className={head}>
                  평균
                </th>,
                <th key={`${key}-used`} className={head}>
                  쓰인 기업 수
                </th>,
                <th key={`${key}-excluded`} className={head}>
                  제외한 기업 수
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {results.map((r) =>
              r.status === "no-data" ? (
                <tr key={r.quarter}>
                  <th className={head}>{r.quarter}</th>
                  <td
                    colSpan={1 + METRIC_KEYS.length * 3}
                    className="border border-zinc-300 px-2 py-1 text-center text-zinc-500 dark:border-zinc-700"
                  >
                    데이터 없음
                  </td>
                </tr>
              ) : (
                <tr key={r.quarter}>
                  <th className={head}>{r.quarter}</th>
                  <td className={cell}>{r.companyCount}</td>
                  {METRIC_KEYS.map((key) => {
                    const m = r.metrics[key];
                    return [
                      <td key={`${key}-avg`} className={cell}>
                        {formatAverage(m.average)}
                      </td>,
                      <td key={`${key}-used`} className={cell}>
                        {m.used}
                      </td>,
                      <td key={`${key}-excluded`} className={cell}>
                        {m.excluded}
                      </td>,
                    ];
                  })}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
