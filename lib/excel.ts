import ExcelJS from "exceljs";
import { displayedAverage } from "./format";
import {
  METRIC_KEYS,
  METRIC_LABELS,
  METRIC_UNITS,
  type MetricKey,
  type MetricsResult,
} from "./metrics";

// Design Ref: §4 lib/excel.ts — 결과를 시트 1개짜리 엑셀 파일로 만든다. (PLAN 13번)
// 화면 표와 같은 계산 결과(MetricsResult)와 같은 표시 형식(lib/format.ts)을 쓰므로 화면 값 = 엑셀 값이다.
// 행은 분기, 열은 대기업 전체 수와 지표 각각의 평균·쓰인 기업 수·제외한 기업 수이다.
// 지표는 기본이 4개 전체이고, 지표 하나만 골라 내려받을 때는 그 지표만 넣는다.

export const SHEET_NAME = "분기별 평균";

export type ExcelCell = string | number;

// 머리글: 분기, 대기업 전체, 그다음 지표마다 평균·쓰인 기업 수·제외한 기업 수
export function excelHeaders(keys: readonly MetricKey[] = METRIC_KEYS): string[] {
  return [
    "분기",
    "대기업 전체",
    ...keys.flatMap((key) => [
      `${METRIC_LABELS[key]} 평균(${METRIC_UNITS[key]})`,
      `${METRIC_LABELS[key]} 쓰인 기업 수`,
      `${METRIC_LABELS[key]} 제외한 기업 수`,
    ]),
  ];
}

// 분기마다 한 줄. 평균은 화면과 같이 소수점 2자리로 반올림한 숫자, 구할 수 없으면 "누락"이다.
// 데이터가 없는 분기는 [분기, "데이터 없음"] 두 칸뿐이고, 파일에서는 나머지 칸과 합친다.
export function excelRows(
  results: MetricsResult,
  keys: readonly MetricKey[] = METRIC_KEYS,
): ExcelCell[][] {
  return results.map((r) => {
    if (r.status === "no-data") return [r.quarter, "데이터 없음"];
    return [
      r.quarter,
      r.companyCount,
      ...keys.flatMap((key) => {
        const m = r.metrics[key];
        return [displayedAverage(m.average), m.used, m.excluded];
      }),
    ];
  });
}

const AVERAGE_FORMAT = "#,##0.00";

export async function buildWorkbook(
  results: MetricsResult,
  keys: readonly MetricKey[] = METRIC_KEYS,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME);

  const headers = excelHeaders(keys);
  sheet.addRow(headers).font = { bold: true };

  for (const cells of excelRows(results, keys)) {
    const row = sheet.addRow(cells);
    if (cells.length === 2) {
      // 데이터 없음: 둘째 칸부터 끝 칸까지 합쳐 한 줄로 쓴다.
      sheet.mergeCells(row.number, 2, row.number, headers.length);
    }
  }

  // 평균 열(3, 6, 9, 12번째)은 소수점 2자리 형식으로 보이게 한다.
  keys.forEach((_, i) => {
    sheet.getColumn(3 + i * 3).numFmt = AVERAGE_FORMAT;
  });
  sheet.columns.forEach((column, i) => {
    column.width = i === 0 ? 10 : 18;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
