import { createClient } from "@supabase/supabase-js";

// Design Ref: §4 — Supabase 접속은 이 파일 한 곳에서만 만들고, 서버 코드에서만 가져다 쓴다.
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY는 NEXT_PUBLIC_으로 시작하지 않으므로 브라우저로 나가지 않는다.
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      ".env에 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.",
    );
  }

  // 로그인 상태를 저장할 필요가 없는 서버 전용 연결이다.
  return createClient(url, key, { auth: { persistSession: false } });
}
