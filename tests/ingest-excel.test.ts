import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildIngest } from "../lib/ingest";
import { readIngestSheets } from "../lib/ingest-excel";

// Plan SC: PLAN 2번 — 실제 엑셀 파일(작게 만든 것)을 읽어 같은 규칙으로 걸러 낸다.
// 원본과 같은 모양: 1행에 재무단위, 머리글 줄이 3~4번째, 시트마다 항목이 다름, 관계없는 시트 포함.
let dir: string;
let file: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "ingest-test-"));
  file = join(dir, "원본.xlsx");

  const wb = new ExcelJS.Workbook();

  // 관계없는 시트 (업체코드 열이 없음)
  const note = wb.addWorksheet("수정본");
  note.addRow([null, "분기별 순차입금"]);
  note.addRow(["삼성전자", 1, 2]);

  // 규모, 총차입금 (억원) — 머리글이 4번째 줄, 서식이 섞인 머리글 포함
  const a = wb.addWorksheet("규모, 총차입금, 영익");
  a.addRow(["VALUESearch - Massive Download [IFRS] / 외부감사법인 (재무단위: 억원)"]);
  a.addRow([null, null, null, "(대기업 평균, 천억원)", 12.4]);
  a.addRow([]);
  a.addRow([
    "업체코드",
    "종목코드",
    "종목명",
    "691080.기업규모",
    "2025/1Quarter S19350.총차입금",
    { richText: [{ text: "2025/2nd Term S19350." }, { text: "총차입금" }] },
    "2025.1Q",
    "2025/1Quarter S25000.영업이익(손실)",
  ]);
  a.addRow(["N1", "A001", "대기업갑", "대기업", 100, 110, 9, 9]);
  a.addRow(["N2", "A002", "중견을", "중견기업", 50, 60, 9, 9]);
  a.addRow(["N3", "A003", "대기업병", "대기업", null, null, 9, 9]);

  // 현금, EBITDA, 영업CF (억원) — 머리글이 3번째 줄
  const b = wb.addWorksheet("현금, EBITDA, 영업CF");
  b.addRow(["VALUESearch - Massive Download [IFRS] / 외부감사법인 (재무단위: 억원)"]);
  b.addRow([]);
  b.addRow([
    "업체코드",
    "종목코드",
    "종목명",
    null,
    "2025/1Quarter S11100.현금및현금성자산",
    "2025/1Quarter S29700.EBITDA",
    "2025/1Quarter S61000.영업활동으로인한현금흐름",
  ]);
  b.addRow(["N1", "A001", "대기업갑", "대기업", 40, 30, -5]);
  b.addRow(["N2", "A002", "중견을", "중견기업", 1, 1, 1]);
  b.addRow(["N3", "A003", "대기업병", "대기업", null, null, null]);

  // 이자배율, 단기차입금 (원)
  const c = wb.addWorksheet("이자배율, 단기차입금");
  c.addRow(["VALUESearch - Massive Download [IFRS] / 외부감사법인 (재무단위: 원)"]);
  c.addRow([]);
  c.addRow([
    "업체코드",
    "종목코드",
    "종목명",
    null,
    "2025/1Quarter 115130.단기차입금",
    "2025/1Quarter S92260.영업이익이자보상비율",
  ]);
  c.addRow(["N1", "A001", "대기업갑", "대기업", 160_000_000_000, 19.25]);
  c.addRow(["N2", "A002", "중견을", "중견기업", 1_000_000, 3]);
  c.addRow(["N3", "A003", "대기업병", "대기업", null, null]);

  await wb.xlsx.writeFile(file);
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("readIngestSheets: 실제 엑셀 파일 읽기", () => {
  it("관계없는 시트는 버리고 필요한 시트 3장만 읽는다", async () => {
    const sheets = await readIngestSheets(file);
    expect(sheets.map((s) => s.name)).toEqual([
      "규모, 총차입금, 영익",
      "현금, EBITDA, 영업CF",
      "이자배율, 단기차입금",
    ]);
  });

  it("1행의 재무단위를 읽는다", async () => {
    const sheets = await readIngestSheets(file);
    expect(sheets[0].unitText).toContain("억원");
    expect(sheets[2].unitText).toContain("(재무단위: 원)");
  });

  it("필요한 열만 꺼낸다 (영업이익, 계산용 열은 건너뜀)", async () => {
    const sheets = await readIngestSheets(file);
    expect(sheets[0].data).toEqual([
      { key: "total_debt", quarter: "2025Q1" },
      { key: "total_debt", quarter: "2025Q2" },
    ]);
    expect(sheets[0].rows[0]).toEqual(["N1", "A001", "대기업갑", "대기업", 100, 110]);
  });
});

describe("엑셀 파일 → 저장할 데이터", () => {
  it("대기업만 걸러 억원으로 맞춘 줄을 만든다", async () => {
    const result = buildIngest(await readIngestSheets(file));
    if (!result.ok) throw new Error(result.problems.join(" / "));
    expect(result.companies).toHaveLength(3);
    expect(result.financials).toEqual([
      {
        company_code: "N1",
        quarter: "2025Q1",
        total_debt: 100,
        cash: 40,
        ebitda: 30,
        operating_cf: -5,
        interest_coverage: 19.25,
        short_term_debt: 1600,
      },
      {
        company_code: "N1",
        quarter: "2025Q2",
        total_debt: 110,
        cash: null,
        ebitda: null,
        operating_cf: null,
        interest_coverage: null,
        short_term_debt: null,
      },
    ]);
  });
});
