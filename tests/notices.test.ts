import { describe, expect, it } from "vitest";
import { calculateMetrics, type MetricsInput } from "../lib/metrics";
import {
  loadFailureNotice,
  noDataNotice,
  rangeDataStatus,
} from "../lib/notices";
import { exampleCompanies, exampleFinancials } from "./fixtures/example-data";

// Plan SC: PLAN 12번 — 데이터베이스 접속 오류와 "데이터 없음"을 서로 다른 안내로 보여 준다.
function resultsFor(quarters: string[], companies = exampleCompanies) {
  const input: MetricsInput = { companies, financials: exampleFinancials, quarters };
  return { input, results: calculateMetrics(input) };
}

describe("접속 오류 안내", () => {
  it("오류 원인을 그대로 보여 주고 연결 문제라고 알린다", () => {
    const notice = loadFailureNotice("접속 실패: fetch failed");
    expect(notice.title).toContain("접속하지 못했습니다");
    expect(notice.detail).toBe("접속 실패: fetch failed");
    expect(notice.hint).toContain("연결 문제");
  });

  it("키 값 자체는 문구에 넣지 않고 .env 항목 이름만 알려 준다", () => {
    const notice = loadFailureNotice("오류");
    expect(notice.hint).toContain("SUPABASE_URL");
    expect(notice.hint).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});

describe("데이터 없음 안내", () => {
  it("데이터가 있는 분기가 있으면 안내를 띄우지 않는다 (일부 분기만 없어도)", () => {
    const { input, results } = resultsFor(["2025Q1", "2025Q3"]);
    const status = rangeDataStatus(input.companies.length, results);
    expect(status).toBe("has-data");
    expect(noDataNotice(status)).toBeNull();
  });

  it("입력한 분기가 모두 데이터 없음이면 접속은 정상이라고 알린다", () => {
    const { input, results } = resultsFor(["2030Q1", "2030Q2"]);
    const status = rangeDataStatus(input.companies.length, results);
    expect(status).toBe("all-no-data");
    const notice = noDataNotice(status);
    expect(notice?.title).toContain("저장된 대기업 데이터가 없습니다");
    expect(notice?.detail).toContain("접속은 정상");
  });

  it("저장된 대기업이 하나도 없으면 적재를 안내한다", () => {
    const { input, results } = resultsFor(["2025Q1"], []);
    const status = rangeDataStatus(input.companies.length, results);
    expect(status).toBe("no-companies");
    expect(noDataNotice(status)?.hint).toContain("적재");
  });
});

describe("두 안내는 서로 다르다", () => {
  it("접속 오류와 데이터 없음의 제목이 같지 않다", () => {
    const failure = loadFailureNotice("x");
    const noData = noDataNotice("all-no-data");
    expect(noData).not.toBeNull();
    expect(failure.title).not.toBe(noData?.title);
    // 데이터 없음 안내에는 "접속하지 못했습니다"가 들어가지 않는다.
    expect(JSON.stringify(noData)).not.toContain("접속하지 못했습니다");
  });
});
