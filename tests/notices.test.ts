import { describe, expect, it, vi } from "vitest";
import { calculateMetrics, type MetricsInput } from "../lib/metrics";
import {
  loadFailureNotice,
  logLoadFailure,
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
  it("연결 문제라고 알리되 오류 원문은 보여 주지 않는다", () => {
    const notice = loadFailureNotice();
    expect(notice.title).toContain("접속하지 못했습니다");
    expect(notice.hint).toContain("연결 문제");
    // 데이터베이스가 돌려준 원문(테이블 이름 등)이 들어갈 자리가 없다.
    expect(JSON.stringify(notice)).not.toContain("companies");
    expect(JSON.stringify(notice)).not.toContain("fetch failed");
  });

  it(".env 항목 이름도 화면에 알리지 않는다", () => {
    const text = JSON.stringify(loadFailureNotice());
    expect(text).not.toContain("SUPABASE_URL");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("오류 원문은 서버 기록(console.error)에만 남긴다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logLoadFailure("결과 표", "companies 읽기 실패: fetch failed");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("fetch failed");
    spy.mockRestore();
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
    const failure = loadFailureNotice();
    const noData = noDataNotice("all-no-data");
    expect(noData).not.toBeNull();
    expect(failure.title).not.toBe(noData?.title);
    // 데이터 없음 안내에는 "접속하지 못했습니다"가 들어가지 않는다.
    expect(JSON.stringify(noData)).not.toContain("접속하지 못했습니다");
  });
});
