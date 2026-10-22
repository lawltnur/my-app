// Design Ref: §2-2 적재 흐름 — 원본 엑셀에서 필요한 항목만 읽고, 기업코드로 연결하고, 금액을 억원으로 맞춘다. (PLAN 2번)
// 이 파일에는 파일·데이터베이스를 건드리지 않는 계산만 있다. (엑셀 읽기는 lib/ingest-excel.ts, 저장은 lib/ingest-db.ts)
//
// 지키는 규칙 (PRD must 1 · CLAUDE.md 5장)
//  - 기업규모가 "대기업"인 기업의 재무 데이터만 저장한다. (기업 목록은 규모와 상관없이 모두 저장한다.)
//  - 기업코드로 시트를 연결한다. 어느 시트에서든 연결되지 않은 기업이 있으면 저장하지 않고 멈춘다.
//  - 시트 머리글의 재무단위(억원·원 등)를 읽어 금액을 억원으로 맞춘다. 단위를 알 수 없으면 멈춘다.
//  - 이자보상비율은 비율이라서 단위를 바꾸지 않는다.
//  - 빈 값은 0으로 채우지 않고 null로 둔다. 원본 파일은 수정하지 않는다.

export const ITEM_KEYS = [
  "total_debt",
  "cash",
  "ebitda",
  "operating_cf",
  "interest_coverage",
  "short_term_debt",
] as const;

export type ItemKey = (typeof ITEM_KEYS)[number];

// 원본 머리글의 항목 이름 → 저장할 열
const ITEM_BY_NAME: Record<string, ItemKey> = {
  총차입금: "total_debt",
  현금및현금성자산: "cash",
  EBITDA: "ebitda",
  영업활동으로인한현금흐름: "operating_cf",
  영업이익이자보상비율: "interest_coverage",
  단기차입금: "short_term_debt",
};

// 금액이 아니라 비율이라 단위를 바꾸지 않는 항목
const RATIO_KEYS: ItemKey[] = ["interest_coverage"];

// 재무단위 → 억원으로 맞추려고 나누는 수. 나누기를 쓰는 이유는 곱하기보다 소수 오차가 적어서이다.
const DIVISOR_TO_EOK: Record<string, number> = {
  억원: 1,
  백만원: 100,
  만원: 1e4,
  천원: 1e5,
  원: 1e8,
};

// "... (재무단위: 억원)" 문구에서 억원으로 맞출 때 나눌 수를 꺼낸다. 알 수 없으면 null이다.
export function unitDivisor(unitText: string | null): number | null {
  if (!unitText) return null;
  const match = /재무단위\s*:\s*([^)\s]+)/.exec(unitText);
  if (!match) return null;
  return DIVISOR_TO_EOK[match[1]] ?? null;
}

// "2022/2nd Term S19350.총차입금" → { quarter: "2022Q2", itemName: "총차입금" }
// 분기 열이 아니면 null이다. (예: "2023.1Q" 같은 계산용 열, "종목명" 등)
export function parseHeader(
  text: string,
): { quarter: string; itemName: string } | null {
  const match =
    /^(\d{4})\/([1-4])(?:Quarter|st Term|nd Term|rd Term|th Term)\s+[A-Za-z]?\d+\.(.+)$/.exec(
      text.trim(),
    );
  if (!match) return null;
  return { quarter: `${match[1]}Q${match[2]}`, itemName: match[3].trim() };
}

// 엑셀 칸 값을 보통 값으로 바꾼다. (서식이 섞인 글자, 수식 결과 등)
export function plainCell(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return value;
  const v = value as {
    richText?: { text: string }[];
    result?: unknown;
    text?: unknown;
  };
  if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("");
  if (v.result !== undefined) return plainCell(v.result);
  if (v.text !== undefined) return plainCell(v.text);
  return value;
}

// ── 시트 읽는 위치 ──────────────────────────────────────────

export type Layout = {
  name: string;
  unitText: string | null;
  hasSize: boolean; // 기업규모 열이 있는 시트인가
  data: { key: ItemKey; quarter: string }[];
};

// 시트 한 장에서 읽을 열의 위치와, 그 열들의 뜻
export type SheetPlan = { layout: Layout; pick: number[] };

// 머리글 줄에서 필요한 열을 찾는다. "업체코드" 열이 없으면(관계없는 시트) null이다.
// pick: 한 줄에서 꺼낼 열 번호. [업체코드, 종목코드, 종목명, 기업규모, ...지표 열들] 순서이고, 없는 열은 -1이다.
export function planSheet(
  name: string,
  unitText: string | null,
  headers: unknown[],
): SheetPlan | null {
  // 빈 칸(구멍)이 있는 배열도 받을 수 있도록 Array.from으로 모든 칸을 채운다.
  const texts = Array.from(headers, (h) => {
    const p = plainCell(h);
    return typeof p === "string" ? p.trim() : "";
  });
  const code = texts.indexOf("업체코드");
  if (code < 0) return null;

  const find = (label: string) => texts.indexOf(label);
  const size = texts.findIndex((t) => t.includes("기업규모"));

  const data: Layout["data"] = [];
  const dataCols: number[] = [];
  texts.forEach((text, col) => {
    const parsed = parseHeader(text);
    if (!parsed) return;
    const key = ITEM_BY_NAME[parsed.itemName];
    if (!key) return;
    data.push({ key, quarter: parsed.quarter });
    dataCols.push(col);
  });

  return {
    layout: { name, unitText, hasSize: size >= 0, data },
    pick: [code, find("종목코드"), find("종목명"), size, ...dataCols],
  };
}

// 한 줄에서 pick에 적힌 열만 꺼낸다. (없는 열은 undefined)
export function reduceRow(row: unknown[], pick: number[]): unknown[] {
  return pick.map((col) => (col < 0 ? undefined : plainCell(row[col])));
}

export type SheetInput = Layout & { rows: unknown[][] };

// ── 만들어지는 결과 ─────────────────────────────────────────

export type IngestCompany = {
  company_code: string;
  stock_code: string | null;
  name: string;
  size: string | null;
};

export type IngestFinancial = {
  company_code: string;
  quarter: string;
  total_debt: number | null;
  cash: number | null;
  ebitda: number | null;
  operating_cf: number | null;
  interest_coverage: number | null;
  short_term_debt: number | null;
};

export type IngestSummary = {
  companiesBySize: Record<string, number>;
  largeCompanies: number;
  financialRows: number;
  rowsByQuarter: Record<string, number>;
  nonNumericCells: number;
};

export type IngestResult =
  | {
      ok: true;
      companies: IngestCompany[];
      financials: IngestFinancial[];
      summary: IngestSummary;
    }
  | { ok: false; problems: string[] };

const LARGE = "대기업";
const SHOW = 20; // 문제가 많을 때 앞의 몇 개만 보여 준다

function sample(items: string[]): string {
  const shown = items.slice(0, SHOW).join(", ");
  return items.length > SHOW ? `${shown} 외 ${items.length - SHOW}곳` : shown;
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

// 숫자면 숫자, 비어 있으면 null. 그 밖의 글자는 null로 두되 "숫자가 아닌 칸"으로 센다.
function toNumber(value: unknown): { value: number | null; odd: boolean } {
  if (value === null || value === undefined || value === "") {
    return { value: null, odd: false };
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { value, odd: false }
      : { value: null, odd: true };
  }
  return { value: null, odd: true };
}

// 시트들을 하나로 합친다. 문제가 하나라도 있으면 저장할 데이터를 만들지 않고 문제 목록만 돌려준다.
export function buildIngest(sheets: SheetInput[]): IngestResult {
  const problems: string[] = [];

  // 1) 필요한 항목이 모두 있고, 겹치지 않는지
  const base = sheets.find((s) => s.hasSize);
  if (!base) problems.push("기업규모 열이 있는 시트를 찾지 못했습니다.");

  const seen = new Map<string, string>(); // "항목|분기" → 시트 이름
  for (const sheet of sheets) {
    for (const { key, quarter } of sheet.data) {
      const id = `${key}|${quarter}`;
      const prev = seen.get(id);
      if (prev) {
        problems.push(
          `같은 항목·분기(${key} ${quarter})가 시트 "${prev}"와 "${sheet.name}"에 모두 있습니다.`,
        );
      }
      seen.set(id, sheet.name);
    }
  }
  for (const key of ITEM_KEYS) {
    if (![...seen.keys()].some((id) => id.startsWith(`${key}|`))) {
      problems.push(`필요한 항목(${key})의 열을 찾지 못했습니다.`);
    }
  }

  // 2) 금액 시트의 재무단위를 알 수 있는지
  const divisors = new Map<string, number>();
  for (const sheet of sheets) {
    const hasAmount = sheet.data.some((d) => !RATIO_KEYS.includes(d.key));
    if (!hasAmount) continue;
    const divisor = unitDivisor(sheet.unitText);
    if (divisor === null) {
      problems.push(
        `시트 "${sheet.name}"의 재무단위를 알 수 없습니다. (머리글: ${sheet.unitText ?? "없음"})`,
      );
    } else {
      divisors.set(sheet.name, divisor);
    }
  }

  // 3) 기업코드로 시트 연결: 같은 시트 안의 중복, 시트끼리 서로 없는 기업
  const codesBySheet = new Map<string, Set<string>>();
  for (const sheet of sheets) {
    const codes = new Set<string>();
    const duplicated: string[] = [];
    for (const row of sheet.rows) {
      const code = text(row[0]);
      if (code === "") continue;
      if (codes.has(code)) duplicated.push(code);
      codes.add(code);
    }
    if (duplicated.length > 0) {
      problems.push(
        `시트 "${sheet.name}"에 업체코드가 중복된 기업이 있습니다: ${sample(duplicated)}`,
      );
    }
    codesBySheet.set(sheet.name, codes);
  }
  if (base) {
    const baseCodes = codesBySheet.get(base.name) ?? new Set<string>();
    for (const sheet of sheets) {
      if (sheet === base) continue;
      const codes = codesBySheet.get(sheet.name) ?? new Set<string>();
      const onlyThere = [...codes].filter((c) => !baseCodes.has(c));
      const onlyBase = [...baseCodes].filter((c) => !codes.has(c));
      if (onlyThere.length > 0) {
        problems.push(
          `시트 "${sheet.name}"에만 있고 "${base.name}"에는 없는 기업(연결 안 됨) ${onlyThere.length}곳: ${sample(onlyThere)}`,
        );
      }
      if (onlyBase.length > 0) {
        problems.push(
          `시트 "${base.name}"에만 있고 "${sheet.name}"에는 없는 기업(연결 안 됨) ${onlyBase.length}곳: ${sample(onlyBase)}`,
        );
      }
    }
  }

  if (problems.length > 0 || !base) return { ok: false, problems };

  // 4) 기업 목록: 기업규모를 가진 시트의 모든 기업
  const companies: IngestCompany[] = [];
  const sizeOf = new Map<string, string | null>();
  for (const row of base.rows) {
    const code = text(row[0]);
    if (code === "") continue;
    const size = text(row[3]) || null;
    sizeOf.set(code, size);
    companies.push({
      company_code: code,
      stock_code: text(row[1]) || null,
      name: text(row[2]),
      size,
    });
  }

  // 5) 대기업의 (기업코드, 분기)별 값 모으기. 금액은 억원으로 맞춘다.
  const rowsByKey = new Map<string, IngestFinancial>();
  let nonNumericCells = 0;
  for (const sheet of sheets) {
    const divisor = divisors.get(sheet.name) ?? 1;
    for (const row of sheet.rows) {
      const code = text(row[0]);
      if (code === "" || sizeOf.get(code) !== LARGE) continue;
      sheet.data.forEach(({ key, quarter }, i) => {
        const cell = toNumber(row[4 + i]);
        if (cell.odd) nonNumericCells++;
        if (cell.value === null) return;
        const value = RATIO_KEYS.includes(key) ? cell.value : cell.value / divisor;
        const id = `${code}|${quarter}`;
        let target = rowsByKey.get(id);
        if (!target) {
          target = {
            company_code: code,
            quarter,
            total_debt: null,
            cash: null,
            ebitda: null,
            operating_cf: null,
            interest_coverage: null,
            short_term_debt: null,
          };
          rowsByKey.set(id, target);
        }
        target[key] = value;
      });
    }
  }

  // 값이 하나라도 있는 줄만 남는다. (위에서 값이 있을 때만 줄을 만들었다.)
  const financials = [...rowsByKey.values()].sort(
    (a, b) =>
      a.company_code.localeCompare(b.company_code) ||
      a.quarter.localeCompare(b.quarter),
  );

  const companiesBySize: Record<string, number> = {};
  for (const c of companies) {
    const label = c.size ?? "(비어 있음)";
    companiesBySize[label] = (companiesBySize[label] ?? 0) + 1;
  }
  const rowsByQuarter: Record<string, number> = {};
  for (const f of financials) {
    rowsByQuarter[f.quarter] = (rowsByQuarter[f.quarter] ?? 0) + 1;
  }

  return {
    ok: true,
    companies,
    financials,
    summary: {
      companiesBySize,
      largeCompanies: companiesBySize[LARGE] ?? 0,
      financialRows: financials.length,
      rowsByQuarter,
      nonNumericCells,
    },
  };
}

// 많은 줄을 한 번에 보내지 않도록 일정 개수씩 나눈다.
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ── 이미 저장된 데이터와 합치기 ─────────────────────────────

// 두 숫자가 같은지 (계산 끝자리 오차는 같은 값으로 본다)
function sameNumber(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

export type MergeStats = {
  inserted: number; // 새로 들어가는 줄
  updated: number; // 값이 바뀌는 줄
  unchanged: number; // 바뀌는 것이 없어 저장하지 않는 줄
  changedCells: number; // 바뀌는 칸 수
  keptCells: number; // 새 파일에서는 비어 있어, 저장된 값을 그대로 두는 칸 수
};

// 새 파일의 재무 줄을 이미 저장된 줄과 합친다.
//  - 새 파일에 값이 있으면 그 값으로 바꾼다.
//  - 새 파일에서 비어 있는 칸은 저장된 값을 지우지 않고 그대로 둔다. (빈 값으로 덮어쓰지 않는다.)
//  - 바뀌는 것이 없는 줄은 저장 대상에서 뺀다. 그래서 같은 파일을 다시 돌려도 아무것도 바뀌지 않는다.
export function mergeFinancials(
  incoming: IngestFinancial[],
  existing: IngestFinancial[],
): { rows: IngestFinancial[]; stats: MergeStats } {
  const stored = new Map(existing.map((r) => [`${r.company_code}|${r.quarter}`, r]));
  const rows: IngestFinancial[] = [];
  const stats: MergeStats = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    changedCells: 0,
    keptCells: 0,
  };

  for (const row of incoming) {
    const old = stored.get(`${row.company_code}|${row.quarter}`);
    if (!old) {
      rows.push(row);
      stats.inserted++;
      continue;
    }

    const merged: IngestFinancial = { ...row };
    let changed = false;
    for (const key of ITEM_KEYS) {
      const next = row[key];
      const prev = old[key] === null ? null : Number(old[key]);
      if (next === null) {
        if (prev !== null) {
          merged[key] = prev;
          stats.keptCells++;
        }
      } else if (!sameNumber(next, prev)) {
        stats.changedCells++;
        changed = true;
      }
    }
    if (changed) {
      rows.push(merged);
      stats.updated++;
    } else {
      stats.unchanged++;
    }
  }
  return { rows, stats };
}

export type CompanyDiffStats = { inserted: number; updated: number; unchanged: number };

// 기업 목록에서 새로 생기거나 내용(이름·종목코드·기업규모)이 바뀌는 기업만 골라낸다.
export function diffCompanies(
  incoming: IngestCompany[],
  existing: IngestCompany[],
): { rows: IngestCompany[]; stats: CompanyDiffStats } {
  const stored = new Map(existing.map((c) => [c.company_code, c]));
  const rows: IngestCompany[] = [];
  const stats: CompanyDiffStats = { inserted: 0, updated: 0, unchanged: 0 };

  for (const company of incoming) {
    const old = stored.get(company.company_code);
    if (!old) {
      rows.push(company);
      stats.inserted++;
    } else if (
      old.name !== company.name ||
      (old.stock_code ?? null) !== company.stock_code ||
      (old.size ?? null) !== company.size
    ) {
      rows.push(company);
      stats.updated++;
    } else {
      stats.unchanged++;
    }
  }
  return { rows, stats };
}
