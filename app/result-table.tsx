import { formatAverage } from "@/lib/format";
import { METRIC_UNITS, type MetricKey, type MetricsResult } from "@/lib/metrics";

// Design Ref: §1 ④ 결과 표 — 행은 분기, 열은 지표 하나의 평균·평균에 쓰인 기업 수·제외한 기업 수.
// 지표마다 결과 화면이 따로 있어서(/analysis/지표이름) 한 번에 한 지표만 보여 준다. (엑셀 파일에는 4개가 모두 들어 있다.)
// 계산은 lib/metrics.ts에서만 하고, 이 파일은 받은 결과를 그대로 보여 주기만 한다.
// 값이 없으면 빈칸이 아니라 "누락", 데이터가 없는 분기는 한 줄로 "데이터 없음"이라고 쓴다.
// 모양은 app/globals.css의 .glass-table 규칙을 쓴다.
export function ResultTable({
  results,
  metric,
}: {
  results: MetricsResult;
  metric: MetricKey;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <p className="text-sm text-soft">
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
                평균 <span className="font-normal text-soft">({METRIC_UNITS[metric]})</span>
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
                  <td>{formatAverage(r.metrics[metric].average)}</td>
                  <td>{r.metrics[metric].used}</td>
                  <td>{r.metrics[metric].excluded}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
