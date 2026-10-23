import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { SHEET_NAME, buildWorkbook, excelHeaders } from "../lib/excel";
import { displayedAverage, formatAverage } from "../lib/format";
import {
  METRIC_KEYS,
  calculateMetrics,
  type MetricsInput,
  type MetricsResult,
} from "../lib/metrics";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";

// Plan SC: PLAN 13번 — 화면과 같은 값을 시트 1개짜리 엑셀 파일로 만든다. (화면 값 = 엑셀 값)
function inputFor(quarters: string[]): MetricsInput {
  return { companies: exampleCompanies, financials: exampleFinancials, quarters };
}

async function readBack(results: MetricsResult) {
  const buffer = await buildWorkbook(results);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

describe("화면 값 = 엑셀 값", () => {
  const results = calculateMetrics(inputFor(["2025Q1", "2025Q2"]));

  it("시트가 1개이고 이름이 정해진 대로이다", async () => {
    const workbook = await readBack(results);
    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.worksheets[0].name).toBe(SHEET_NAME);
  });

  it("머리글이 분기, 대기업 전체, 4개 지표 × (평균, 쓰인 기업 수, 제외한 기업 수) 순서이다", async () => {
    const sheet = (await readBack(results)).worksheets[0];
    const header = sheet.getRow(1).values as unknown[];
    expect(header.slice(1)).toEqual(excelHeaders());
    expect(excelHeaders()).toHaveLength(2 + METRIC_KEYS.length * 3);
  });

  it("행은 분기이고 입력한 분기 순서와 같다", async () => {
    const sheet = (await readBack(results)).worksheets[0];
    expect(sheet.getCell(2, 1).value).toBe("2025Q1");
    expect(sheet.getCell(3, 1).value).toBe("2025Q2");
  });

  it("평균·기업 수가 화면에 보이는 값과 모두 같다", async () => {
    const sheet = (await readBack(results)).worksheets[0];
    results.forEach((r, i) => {
      if (r.status !== "ok") throw new Error("계산된 분기가 아닙니다.");
      const rowNumber = i + 2;
      expect(sheet.getCell(rowNumber, 2).value).toBe(r.companyCount);
      METRIC_KEYS.forEach((key, k) => {
        const m = r.metrics[key];
        const col = 3 + k * 3;
        // 화면에는 formatAverage의 문구가 보이고, 엑셀에는 그 문구를 숫자로 되돌린 값이 들어간다.
        const shown = formatAverage(m.average);
        const cell = sheet.getCell(rowNumber, col).value;
        expect(cell).toBe(
          shown === "누락" ? "누락" : Number(shown.replace(/,/g, "")),
        );
        expect(sheet.getCell(rowNumber, col + 1).value).toBe(m.used);
        expect(sheet.getCell(rowNumber, col + 2).value).toBe(m.excluded);
      });
    });
  });

  it("평균은 소수점 2자리로 반올림한 숫자이다 (계산 값 1100/3 → 366.67)", async () => {
    const sheet = (await readBack(results)).worksheets[0];
    // 2025Q1의 단기차입금 평균 열은 12번째 칸이다.
    expect(sheet.getCell(2, 12).value).toBe(366.67);
  });
});

describe("빈 값과 데이터 없음", () => {
  it("평균을 구할 수 없으면 빈칸이 아니라 누락이라고 쓴다", async () => {
    const results: MetricsResult = [
      {
        quarter: "2026Q4",
        status: "ok",
        companyCount: 3,
        metrics: {
          netDebtToEbitda: { average: null, used: 0, excluded: 3 },
          operatingCf: { average: 1.005, used: 1, excluded: 2 },
          interestCoverage: { average: 0, used: 1, excluded: 2 },
          shortTermDebt: { average: -2.5, used: 1, excluded: 2 },
        },
      },
    ];
    const sheet = (await readBack(results)).worksheets[0];
    expect(sheet.getCell(2, 3).value).toBe("누락");
    expect(sheet.getCell(2, 6).value).toBe(displayedAverage(1.005));
    expect(sheet.getCell(2, 9).value).toBe(0);
    expect(sheet.getCell(2, 12).value).toBe(-2.5);
  });

  it("데이터가 없는 분기는 한 줄로 합쳐 데이터 없음이라고 쓴다", async () => {
    const results = calculateMetrics(inputFor(["2025Q1", "2025Q3"]));
    const sheet = (await readBack(results)).worksheets[0];
    expect(sheet.getCell(3, 1).value).toBe("2025Q3");
    expect(sheet.getCell(3, 2).value).toBe("데이터 없음");
    // 합친 칸은 같은 값을 가리킨다.
    expect(sheet.getCell(3, 14).value).toBe("데이터 없음");
  });
});

describe("displayedAverage", () => {
  it("화면 문구를 숫자로 되돌린다", () => {
    expect(displayedAverage(12345.678)).toBe(12345.68);
    expect(displayedAverage(-1)).toBe(-1);
    expect(displayedAverage(null)).toBe("누락");
  });
});

// 지표 하나만 고른 엑셀 — 머리글과 값이 4개 전체 파일의 해당 열과 같고, 화면 값과도 같다.
describe("지표 하나만 내려받는 엑셀", () => {
  const results = calculateMetrics(inputFor(["2025Q1", "2025Q2"]));

  it("머리글이 분기, 대기업 전체, 그 지표의 3열이다", async () => {
    const buffer = await buildWorkbook(results, ["operatingCf"]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const header = (workbook.worksheets[0].getRow(1).values as unknown[]).slice(1);
    expect(header).toEqual(excelHeaders(["operatingCf"]));
    expect(header).toEqual([
      "분기",
      "대기업 전체",
      "영업활동 현금흐름 평균(억원)",
      "영업활동 현금흐름 쓰인 기업 수",
      "영업활동 현금흐름 제외한 기업 수",
    ]);
  });

  it("값이 4개 전체 파일의 같은 열과 같다", async () => {
    const full = await readBack(results);
    const buffer = await buildWorkbook(results, ["interestCoverage"]);
    const single = new ExcelJS.Workbook();
    await single.xlsx.load(buffer as unknown as ArrayBuffer);
    const fullHeader = (full.worksheets[0].getRow(1).values as unknown[]).slice(1);
    const start = fullHeader.indexOf("이자보상배율 평균(배)");
    for (const rowNumber of [2, 3]) {
      const fullRow = (full.worksheets[0].getRow(rowNumber).values as unknown[]).slice(1);
      const singleRow = (single.worksheets[0].getRow(rowNumber).values as unknown[]).slice(1);
      expect(singleRow.slice(2)).toEqual(fullRow.slice(start, start + 3));
    }
  });
});
