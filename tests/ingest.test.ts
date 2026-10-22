import { describe, expect, it } from "vitest";
import {
  buildIngest,
  chunk,
  parseHeader,
  planSheet,
  plainCell,
  reduceRow,
  unitDivisor,
  type SheetInput,
} from "../lib/ingest";

// Plan SC: PLAN 2번 — 원본에서 필요한 항목만 추려 기업코드로 연결하고, 금액을 억원으로 맞추며,
// 연결 안 된 기업이 있거나 단위를 알 수 없으면 멈춘다.

describe("parseHeader: 분기 머리글", () => {
  it.each([
    ["2022/1Quarter S19350.총차입금", "2022Q1", "총차입금"],
    ["2022/2nd Term S19350.총차입금", "2022Q2", "총차입금"],
    ["2023/3rd Term S11100.현금및현금성자산", "2023Q3", "현금및현금성자산"],
    ["2026/4th Term S29700.EBITDA", "2026Q4", "EBITDA"],
    ["2024/1Quarter 115130.단기차입금", "2024Q1", "단기차입금"],
  ])("%s → %s, %s", (text, quarter, itemName) => {
    expect(parseHeader(text)).toEqual({ quarter, itemName });
  });

  it("분기 열이 아니면 null이다", () => {
    expect(parseHeader("업체코드")).toBeNull();
    expect(parseHeader("2023.1Q")).toBeNull();
    expect(parseHeader("691080.기업규모")).toBeNull();
  });
});

describe("unitDivisor: 재무단위를 억원으로 맞출 때 나눌 수", () => {
  it("억원은 그대로, 원은 1억으로 나눈다", () => {
    expect(unitDivisor("VALUESearch [IFRS] / 외부감사법인 (재무단위: 억원)")).toBe(1);
    expect(unitDivisor("VALUESearch [IFRS] / 외부감사법인 (재무단위: 원)")).toBe(1e8);
    expect(unitDivisor("(재무단위: 백만원)")).toBe(100);
  });

  it("단위를 알 수 없으면 null이다", () => {
    expect(unitDivisor(null)).toBeNull();
    expect(unitDivisor("단위 표시 없음")).toBeNull();
    expect(unitDivisor("(재무단위: 달러)")).toBeNull();
  });
});

describe("plainCell: 서식이 섞인 칸", () => {
  it("서식이 섞인 글자는 이어 붙이고, 수식은 결과를 쓴다", () => {
    expect(plainCell({ richText: [{ text: "2023/1Quarter S19350." }, { text: "총차입금" }] })).toBe(
      "2023/1Quarter S19350.총차입금",
    );
    expect(plainCell({ formula: "A1+1", result: 5 })).toBe(5);
    expect(plainCell(null)).toBeNull();
    expect(plainCell(3)).toBe(3);
  });
});

describe("planSheet: 시트에서 읽을 열 찾기", () => {
  it("업체코드 열이 없는 시트는 관계없는 시트이다", () => {
    expect(planSheet("수정본", null, [null, "2023.1Q"])).toBeNull();
  });

  it("필요한 항목 열만 고르고, 관계없는 항목은 건너뛴다", () => {
    const plan = planSheet("시트", "(재무단위: 억원)", [
      "업체코드",
      "종목코드",
      "종목명",
      "691080.기업규모",
      "2025/1Quarter S19350.총차입금",
      "2025/1Quarter S25000.영업이익(손실)",
      "2025/2nd Term S19350.총차입금",
    ]);
    expect(plan?.layout.hasSize).toBe(true);
    expect(plan?.layout.data).toEqual([
      { key: "total_debt", quarter: "2025Q1" },
      { key: "total_debt", quarter: "2025Q2" },
    ]);
    expect(plan?.pick).toEqual([0, 1, 2, 3, 4, 6]);
  });

  it("reduceRow는 고른 열만 꺼낸다", () => {
    expect(reduceRow(["a", "b", "c", "d", 1, 2, 3], [0, 2, -1, 4])).toEqual([
      "a",
      "c",
      undefined,
      1,
    ]);
  });
});

// 작은 시트 두 장: 규모·총차입금(억원)과 단기차입금·이자보상비율(원)
function sheets(): SheetInput[] {
  return [
    {
      name: "규모, 총차입금",
      unitText: "(재무단위: 억원)",
      hasSize: true,
      data: [
        { key: "total_debt", quarter: "2025Q1" },
        { key: "total_debt", quarter: "2025Q2" },
      ],
      rows: [
        ["N1", "A001", "대기업갑", "대기업", 100, null],
        ["N2", "A002", "중견을", "중견기업", 50, 60],
        ["N3", null, "대기업병", "대기업", null, null],
      ],
    },
    {
      name: "이자배율, 단기차입금",
      unitText: "(재무단위: 원)",
      hasSize: false,
      data: [
        { key: "short_term_debt", quarter: "2025Q1" },
        { key: "interest_coverage", quarter: "2025Q1" },
      ],
      rows: [
        ["N1", "A001", "대기업갑", undefined, 160_000_000_000, 19.25],
        ["N2", "A002", "중견을", undefined, 1_000_000, 3],
        ["N3", null, "대기업병", undefined, null, null],
      ],
    },
    {
      name: "현금, EBITDA, 영업CF",
      unitText: "(재무단위: 억원)",
      hasSize: false,
      data: [
        { key: "cash", quarter: "2025Q1" },
        { key: "ebitda", quarter: "2025Q1" },
        { key: "operating_cf", quarter: "2025Q1" },
      ],
      rows: [
        ["N1", "A001", "대기업갑", undefined, 40, 30, -5],
        ["N2", "A002", "중견을", undefined, 1, 1, 1],
        ["N3", null, "대기업병", undefined, null, null, null],
      ],
    },
  ];
}

describe("buildIngest: 정상", () => {
  const result = buildIngest(sheets());

  it("검사를 통과한다", () => {
    expect(result.ok).toBe(true);
  });

  it("기업 목록에는 규모와 상관없이 모든 기업이 들어간다", () => {
    if (!result.ok) throw new Error("실패");
    expect(result.companies.map((c) => c.company_code)).toEqual(["N1", "N2", "N3"]);
    expect(result.companies[2]).toEqual({
      company_code: "N3",
      stock_code: null,
      name: "대기업병",
      size: "대기업",
    });
  });

  it("재무 데이터는 대기업만, 값이 하나라도 있는 줄만 저장한다", () => {
    if (!result.ok) throw new Error("실패");
    // N2(중견)는 제외, N3(대기업)은 값이 모두 비어 있어 줄이 없다.
    expect(result.financials.map((f) => `${f.company_code} ${f.quarter}`)).toEqual([
      "N1 2025Q1",
    ]);
  });

  it("금액은 억원으로 맞추고 비율은 그대로 둔다", () => {
    if (!result.ok) throw new Error("실패");
    expect(result.financials[0]).toEqual({
      company_code: "N1",
      quarter: "2025Q1",
      total_debt: 100,
      cash: 40,
      ebitda: 30,
      operating_cf: -5,
      interest_coverage: 19.25, // 비율: 변환하지 않음
      short_term_debt: 1600, // 160,000,000,000원 → 1,600억원
    });
  });

  it("빈 값은 0이 아니라 null로 둔다", () => {
    const withGap = sheets();
    withGap[0].rows[0] = ["N1", "A001", "대기업갑", "대기업", null, 70];
    const r = buildIngest(withGap);
    if (!r.ok) throw new Error("실패");
    const q1 = r.financials.find((f) => f.quarter === "2025Q1");
    const q2 = r.financials.find((f) => f.quarter === "2025Q2");
    expect(q1?.total_debt).toBeNull();
    expect(q2).toMatchObject({ total_debt: 70, cash: null });
  });

  it("요약에 규모별 기업 수와 분기별 줄 수가 있다", () => {
    if (!result.ok) throw new Error("실패");
    expect(result.summary.companiesBySize).toEqual({ 대기업: 2, 중견기업: 1 });
    expect(result.summary.largeCompanies).toBe(2);
    expect(result.summary.financialRows).toBe(1);
    expect(result.summary.rowsByQuarter).toEqual({ "2025Q1": 1 });
  });

  it("숫자가 아닌 글자는 비워 두고 개수를 센다", () => {
    const odd = sheets();
    odd[2].rows[0] = ["N1", "A001", "대기업갑", undefined, "-", 30, -5];
    const r = buildIngest(odd);
    if (!r.ok) throw new Error("실패");
    expect(r.summary.nonNumericCells).toBe(1);
    expect(r.financials[0].cash).toBeNull();
  });
});

describe("buildIngest: 멈춰야 하는 경우", () => {
  it("다른 시트에만 있는 기업이 있으면 연결 안 된 기업으로 멈춘다", () => {
    const s = sheets();
    s[1].rows.push(["N9", "A009", "유령기업", undefined, 1, 1]);
    const r = buildIngest(s);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problems.join("\n")).toContain("연결 안 됨");
    expect(!r.ok && r.problems.join("\n")).toContain("N9");
  });

  it("기준 시트에만 있는 기업도 연결 안 된 기업으로 멈춘다", () => {
    const s = sheets();
    s[2].rows.pop(); // N3 제거
    const r = buildIngest(s);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problems.join("\n")).toContain("N3");
  });

  it("금액 시트의 재무단위를 알 수 없으면 멈춘다", () => {
    const s = sheets();
    s[1].unitText = "단위 표시 없음";
    const r = buildIngest(s);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problems.join("\n")).toContain("재무단위를 알 수 없습니다");
  });

  it("업체코드가 중복된 시트가 있으면 멈춘다", () => {
    const s = sheets();
    s[0].rows.push(["N1", "A001", "대기업갑", "대기업", 1, 1]);
    const r = buildIngest(s);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problems.join("\n")).toContain("중복");
  });

  it("필요한 항목 열이 빠져 있으면 멈춘다", () => {
    const s = sheets().slice(0, 2); // 현금·EBITDA·영업CF 시트 없음
    const r = buildIngest(s);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problems.join("\n")).toContain("cash");
  });

  it("기업규모 시트가 없으면 멈춘다", () => {
    const s = sheets();
    s[0].hasSize = false;
    const r = buildIngest(s);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problems.join("\n")).toContain("기업규모");
  });

  it("같은 항목·분기가 두 시트에 있으면 멈춘다", () => {
    const s = sheets();
    s[2].data.push({ key: "total_debt", quarter: "2025Q1" });
    s[2].rows = s[2].rows.map((row) => [...row, 1]);
    const r = buildIngest(s);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problems.join("\n")).toContain("모두 있습니다");
  });
});

describe("chunk", () => {
  it("일정 개수씩 나눈다", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
