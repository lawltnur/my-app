import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { chartSeries } from "../lib/chart";
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
    // 표는 5열이고, 그 오른쪽 6번째 열은 그래프용 숨긴 열이다.
    const header = (workbook.worksheets[0].getRow(1).values as unknown[]).slice(1, 6);
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
      expect(singleRow.slice(2, 5)).toEqual(fullRow.slice(start, start + 3));
    }
  });
});

// 지표 하나만 받는 엑셀에는 엑셀 자체 선 그래프가 들어 있고, 4개 전체 파일에는 없다.
describe("엑셀 그래프", () => {
  const results = calculateMetrics(inputFor(["2025Q1", "2025Q2", "2030Q1"]));

  async function zipOf(buffer: Buffer) {
    const { default: JSZip } = await import("jszip");
    return JSZip.loadAsync(buffer);
  }

  it("지표 하나 파일에는 그래프 부품과 연결이 들어 있다", async () => {
    const zip = await zipOf(await buildWorkbook(results, ["operatingCf"]));
    expect(zip.file("xl/charts/chart1.xml")).not.toBeNull();
    expect(zip.file("xl/drawings/drawing1.xml")).not.toBeNull();
    expect(zip.file("xl/worksheets/_rels/sheet1.xml.rels")).not.toBeNull();
    const types = await zip.file("[Content_Types].xml")!.async("string");
    expect(types).toContain("/xl/charts/chart1.xml");
    expect(types).toContain("/xl/drawings/drawing1.xml");
    const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(sheet).toContain('<drawing xmlns:r=');
    expect(sheet.indexOf("<drawing")).toBeGreaterThan(sheet.indexOf("<pageMargins"));
  });

  it("그래프 값은 숨긴 열(F)에 있고 누락·데이터 없음은 빈칸이다", async () => {
    const buffer = await buildWorkbook(results, ["operatingCf"]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    expect(sheet.getColumn(6).hidden).toBe(true);
    expect(sheet.getCell(1, 6).value).toBe("그래프용 값");
    const series = chartSeries(results, "operatingCf");
    series.forEach((p, i) => {
      const cell = sheet.getCell(i + 2, 6).value;
      expect(cell).toBe(p.value === null ? null : p.value);
    });
    expect(series[2].value).toBeNull(); // 데이터 없는 분기
  });

  it("그래프 설명에 제목·단위·값 범위가 들어 있고 값이 없는 분기의 점은 없다", async () => {
    const zip = await zipOf(await buildWorkbook(results, ["operatingCf"]));
    const xml = await zip.file("xl/charts/chart1.xml")!.async("string");
    expect(xml).toContain("영업활동 현금흐름 분기별 평균");
    expect(xml).toContain("억원");
    expect(xml).toContain("$F$2:$F$4");
    expect(xml).toContain('<c:dispBlanksAs val="gap"/>');
    const series = chartSeries(results, "operatingCf");
    const valueIdx = [...xml.matchAll(/<c:numCache>[\s\S]*?<\/c:numCache>/g)][0][0];
    const have = [...valueIdx.matchAll(/<c:pt idx="(\d+)"/g)].map((m) => Number(m[1]));
    expect(have).toEqual(series.flatMap((p, i) => (p.value === null ? [] : [i])));
  });

  it("4개 지표 전체 파일에는 그래프가 없다", async () => {
    const zip = await zipOf(await buildWorkbook(results));
    expect(zip.file("xl/charts/chart1.xml")).toBeNull();
  });
});
