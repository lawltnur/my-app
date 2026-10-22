import { statSync } from "node:fs";
import ExcelJS from "exceljs";
import { plainCell, planSheet, reduceRow, type SheetInput } from "./ingest";

// Design Ref: §2-2 적재 흐름 — 원본 엑셀에서 필요한 시트·열만 꺼내 SheetInput으로 돌려준다.
// 원본 파일은 읽기만 하고 수정하지 않는다.
//
// 원본은 수십 MB(시트 하나가 100MB가 넘는 XML)라서 통째로 열면 메모리가 모자란다.
// 그래서 큰 파일은 한 줄씩 읽는 방식(스트리밍)으로 읽고, 작은 파일은 보통 방식으로 읽는다.
// 두 방식 모두 같은 규칙(readSheet)으로 줄을 걸러 낸다.

// 머리글을 찾아볼 맨 위 줄 수 (원본에서는 3~4번째 줄에 있다)
const HEADER_SEARCH_ROWS = 10;

// 이 크기보다 큰 파일은 한 줄씩 읽는다.
const STREAM_THRESHOLD_BYTES = 20 * 1024 * 1024;

type RowLike = { number: number; values: unknown };

// 시트 한 장의 줄들을 받아, 필요한 열만 남긴 SheetInput을 만든다. 관계없는 시트는 null이다.
async function readSheet(
  name: string,
  rows: AsyncIterable<RowLike>,
): Promise<SheetInput | null> {
  let unitText: string | null = null;
  let plan: ReturnType<typeof planSheet> = null;
  const kept: unknown[][] = [];

  for await (const row of rows) {
    const cells = row.values as unknown[]; // 1번 칸부터 시작하는 배열
    if (row.number === 1) {
      const first = plainCell(cells[1]);
      unitText = typeof first === "string" ? first : null;
    }

    if (!plan) {
      if (row.number > HEADER_SEARCH_ROWS) break; // 머리글이 없는 시트는 건너뛴다
      plan = planSheet(name, unitText, cells.slice(1));
      continue;
    }

    // 머리글 아래 줄: 필요한 열만 꺼낸다. (열 번호는 0부터이므로 한 칸 당긴다.)
    kept.push(reduceRow(cells.slice(1), plan.pick));
  }

  // 필요한 지표나 기업규모 열이 없는 시트(관계없는 시트)는 버린다.
  if (plan && (plan.layout.hasSize || plan.layout.data.length > 0)) {
    return { ...plan.layout, rows: kept };
  }
  return null;
}

async function* rowsOf(sheet: ExcelJS.Worksheet): AsyncGenerator<RowLike> {
  for (let n = 1; n <= sheet.rowCount; n++) {
    yield { number: n, values: sheet.getRow(n).values };
  }
}

export async function readIngestSheets(filePath: string): Promise<SheetInput[]> {
  const sheets: SheetInput[] = [];

  if (statSync(filePath).size <= STREAM_THRESHOLD_BYTES) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    for (const sheet of workbook.worksheets) {
      const read = await readSheet(sheet.name, rowsOf(sheet));
      if (read) sheets.push(read);
    }
    return sheets;
  }

  const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    sharedStrings: "cache",
    worksheets: "emit",
    styles: "ignore",
    hyperlinks: "ignore",
    entries: "ignore",
  });
  type StreamSheet = AsyncIterable<RowLike> & { name?: string };

  let order = 0;
  for await (const item of reader as unknown as AsyncIterable<StreamSheet>) {
    order++;
    const read = await readSheet(item.name ?? `시트${order}`, item);
    if (read) sheets.push(read);
  }
  return sheets;
}
