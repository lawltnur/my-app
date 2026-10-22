import { describe, expect, it } from "vitest";
import {
  diffCompanies,
  mergeFinancials,
  type IngestCompany,
  type IngestFinancial,
} from "../lib/ingest";

// Plan SC: PLAN 2번 — 같은 파일을 다시 돌려도 결과가 같고, 비어 있는 칸이 저장된 값을 지우지 않는다.
function row(overrides: Partial<IngestFinancial>): IngestFinancial {
  return {
    company_code: "N1",
    quarter: "2025Q1",
    total_debt: null,
    cash: null,
    ebitda: null,
    operating_cf: null,
    interest_coverage: null,
    short_term_debt: null,
    ...overrides,
  };
}

describe("mergeFinancials", () => {
  it("저장된 적 없는 줄은 새로 넣는다", () => {
    const { rows, stats } = mergeFinancials([row({ total_debt: 100 })], []);
    expect(rows).toHaveLength(1);
    expect(stats).toMatchObject({ inserted: 1, updated: 0, unchanged: 0 });
  });

  it("똑같은 줄은 저장하지 않는다 (같은 파일을 다시 돌려도 바뀌는 것이 없다)", () => {
    const same = row({ total_debt: 100, cash: 40.5 });
    const { rows, stats } = mergeFinancials([same], [{ ...same }]);
    expect(rows).toEqual([]);
    expect(stats).toMatchObject({ inserted: 0, updated: 0, unchanged: 1 });
  });

  it("계산 끝자리 오차만 다르면 같은 값으로 본다", () => {
    const { rows } = mergeFinancials(
      [row({ short_term_debt: 1600.0000000000002 })],
      [row({ short_term_debt: 1600 })],
    );
    expect(rows).toEqual([]);
  });

  it("새 파일에 값이 있으면 그 값으로 바꾼다", () => {
    const { rows, stats } = mergeFinancials(
      [row({ total_debt: 120 })],
      [row({ total_debt: 100 })],
    );
    expect(rows[0].total_debt).toBe(120);
    expect(stats).toMatchObject({ updated: 1, changedCells: 1 });
  });

  it("새 파일에서 비어 있는 칸은 저장된 값을 지우지 않는다", () => {
    // 저장된 줄에는 현금이 있고, 새 파일에는 총차입금만 있다. → 총차입금만 바뀌고 현금은 남는다.
    const { rows, stats } = mergeFinancials(
      [row({ total_debt: 120, cash: null })],
      [row({ total_debt: 100, cash: 55 })],
    );
    expect(rows[0]).toMatchObject({ total_debt: 120, cash: 55 });
    expect(stats.keptCells).toBe(1);
  });

  it("새 파일에서 비어 있기만 하고 바뀌는 값이 없으면 저장하지 않는다", () => {
    const { rows, stats } = mergeFinancials(
      [row({ cash: null })],
      [row({ cash: 55 })],
    );
    expect(rows).toEqual([]);
    expect(stats).toMatchObject({ unchanged: 1, keptCells: 1 });
  });

  it("저장된 값이 문자열로 와도 숫자로 비교한다", () => {
    const stored = { ...row({}), total_debt: "100" as unknown as number };
    const { rows } = mergeFinancials([row({ total_debt: 100 })], [stored]);
    expect(rows).toEqual([]);
  });
});

describe("diffCompanies", () => {
  const company = (overrides: Partial<IngestCompany>): IngestCompany => ({
    company_code: "N1",
    stock_code: "A001",
    name: "갑",
    size: "대기업",
    ...overrides,
  });

  it("새 기업, 내용이 바뀐 기업만 고르고 그대로인 기업은 뺀다", () => {
    const { rows, stats } = diffCompanies(
      [
        company({}),
        company({ company_code: "N2", name: "을(고침)" }),
        company({ company_code: "N3" }),
      ],
      [company({}), company({ company_code: "N2", name: "을(깨진글자)" })],
    );
    expect(rows.map((c) => c.company_code)).toEqual(["N2", "N3"]);
    expect(stats).toEqual({ inserted: 1, updated: 1, unchanged: 1 });
  });

  it("기업규모가 바뀌면 바뀐 것으로 본다", () => {
    const { stats } = diffCompanies([company({ size: "중견기업" })], [company({})]);
    expect(stats.updated).toBe(1);
  });

  it("저장된 쪽의 빈 종목코드(null)와 새 파일의 빈 값은 같다", () => {
    const { stats } = diffCompanies(
      [company({ stock_code: null })],
      [company({ stock_code: null })],
    );
    expect(stats.unchanged).toBe(1);
  });
});
