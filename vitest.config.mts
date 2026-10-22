import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 테스트 도구 설정: tests 폴더의 *.test.ts만 실행하고, 코드의 "@/" 경로를 프로젝트 루트로 연결한다.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
