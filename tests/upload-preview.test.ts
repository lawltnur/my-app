import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/upload-preview/route";

// 엑셀 업로드 미리보기 — 파일을 검사해 결과만 돌려주고, 데이터베이스에는 쓰지 않는다.
// 테스트에서는 Supabase 정보가 없는 상태라 "저장된 값과의 비교"는 null로 나온다.

async function sampleWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const a = wb.addWorksheet("규모, 총차입금");
  a.addRow(["VALUESearch (재무단위: 억원)"]);
  a.addRow([]);
  a.addRow([
    "업체코드",
    "종목코드",
    "종목명",
    "691080.기업규모",
    "2025/1Quarter S19350.총차입금",
  ]);
  a.addRow(["N1", "A001", "대기업갑", "대기업", 100]);
  a.addRow(["N2", "A002", "중견을", "중견기업", 50]);

  const b = wb.addWorksheet("현금, EBITDA, 영업CF");
  b.addRow(["VALUESearch (재무단위: 억원)"]);
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

  const c = wb.addWorksheet("이자배율, 단기차입금");
  c.addRow(["VALUESearch (재무단위: 억원)"]);
  c.addRow([]);
  c.addRow([
    "업체코드",
    "종목코드",
    "종목명",
    null,
    "2025/1Quarter 115130.단기차입금",
    "2025/1Quarter S92260.영업이익이자보상비율",
  ]);
  c.addRow(["N1", "A001", "대기업갑", "대기업", 160, 19.25]);
  c.addRow(["N2", "A002", "중견을", "중견기업", 1, 3]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function requestWith(file: File | null): Request {
  const form = new FormData();
  if (file) form.set("file", file);
  return new Request("http://localhost/api/upload-preview", { method: "POST", body: form });
}

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("POST /api/upload-preview", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("올바른 파일은 검사 결과를 돌려주고 비교는 null이다", async () => {
    const buffer = await sampleWorkbook();
    const response = await POST(requestWith(new File([new Uint8Array(buffer)], "원본.xlsx", { type: XLSX })));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.companies).toBe(2);
    expect(body.largeCompanies).toBe(1);
    expect(body.comparison).toBeNull();
  });

  it("파일이 없으면 400이다", async () => {
    const response = await POST(requestWith(null));
    expect(response.status).toBe(400);
    expect((await response.json()).ok).toBe(false);
  });

  it(".xlsx가 아니면 400이다", async () => {
    const response = await POST(requestWith(new File(["a,b"], "표.csv", { type: "text/csv" })));
    expect(response.status).toBe(400);
  });

  it("4MB를 넘으면 413이다", async () => {
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "큼.xlsx", { type: XLSX });
    const response = await POST(requestWith(big));
    expect(response.status).toBe(413);
  });

  it("엑셀이 아닌 내용은 422이고 오류 원문을 보여주지 않는다", async () => {
    const response = await POST(requestWith(new File(["not an excel"], "가짜.xlsx", { type: XLSX })));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.message).toBe("파일을 검사하지 못했습니다. 올바른 원본 엑셀 파일인지 확인해 주세요.");
  });
});
