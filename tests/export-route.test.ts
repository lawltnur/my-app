import { describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/export/route";

// 엑셀 내려받기 주소 — 지표 이름(metric)이 목록에 없으면 데이터베이스에 가기 전에 400으로 막는다.
describe("GET /api/export 의 metric 값", () => {
  it("모르는 지표 이름은 400이다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(
      new Request("http://localhost/api/export?from=2025Q1&to=2025Q2&metric=bogus"),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe("알 수 없는 지표입니다.");
  });

  it("분기가 올바르지 않으면 지표와 상관없이 400이다", async () => {
    const response = await GET(
      new Request("http://localhost/api/export?from=x&to=y&metric=operating-cf"),
    );
    expect(response.status).toBe(400);
  });
});
