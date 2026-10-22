import type { NextConfig } from "next";

// 모든 주소(화면과 엑셀 내려받기 포함)에 붙이는 보안 헤더. (공개 전 보안 점검 반영)
//  - 다른 사이트가 이 화면을 끼워 넣는 것(클릭 위장)을 막는다.
//  - 브라우저가 파일 종류를 멋대로 추측해 실행하지 못하게 한다.
//  - 다른 사이트로 이동할 때 주소 정보가 새지 않게 한다.
//  - 카메라·마이크·위치 같은 기능은 쓰지 않으므로 끈다.
//  - 검색엔진이 수집하지 않게 한다. (내부 자료로 간주하는 데이터)
// 스크립트 허용 범위를 정하는 CSP(script-src)는 Next.js가 쓰는 내부 스크립트까지 막을 수 있어
// 넣지 않고, 위험이 작고 안전한 항목만 넣었다.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
