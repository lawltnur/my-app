import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

// 공개 전 보안 점검 반영 — 모든 주소(화면과 /api/export)에 보안 헤더가 붙는다.
const rules = (await nextConfig.headers?.()) ?? [];

describe("보안 헤더 설정", () => {
  const all = rules.find((r) => r.source === "/:path*");
  const headers = new Map((all?.headers ?? []).map((h) => [h.key, h.value]));

  it("모든 주소에 적용된다", () => {
    expect(all).toBeDefined();
  });

  it("다른 사이트가 화면을 끼워 넣지 못하게 한다", () => {
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("파일 종류 추측과 주소 정보 유출을 막는다", () => {
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("쓰지 않는 브라우저 기능(카메라·마이크·위치)을 끈다", () => {
    expect(headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("검색엔진 수집을 막는다", () => {
    expect(headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("스크립트 허용 범위(script-src)는 건드리지 않는다 (Next.js 내부 스크립트를 막을 수 있어서)", () => {
    expect(headers.get("Content-Security-Policy")).not.toContain("script-src");
  });
});
