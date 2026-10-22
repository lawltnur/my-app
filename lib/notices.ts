import type { MetricsResult } from "./metrics";

// Design Ref: §1 ③ 안내 띠 — 데이터베이스 접속 오류와 "데이터 없음"은 문구와 색을 다르게 보여 준다. (PLAN 12번)
//  - 접속 오류(빨강): 데이터가 없는 것이 아니라 연결이 안 된 것이다. 계산하지 않는다.
//  - 데이터 없음(노랑): 접속은 정상인데 입력한 분기에 저장된 대기업 데이터가 없는 것이다.
// 문구와 분류는 화면 코드와 분리해 두고, 화면(app/notices.tsx)은 이를 그대로 보여 주기만 한다.

export type Notice = {
  title: string;
  detail: string;
  hint: string;
};

// 데이터베이스에 접속하지 못했거나 읽는 중 오류가 났을 때의 안내
// 보안: 데이터베이스가 돌려준 오류 원문(테이블 이름 등)과 .env 항목 이름은 화면과 응답에 넣지 않는다.
// 자세한 원인은 logLoadFailure로 서버 기록(Vercel 로그)에만 남긴다.
export function loadFailureNotice(): Notice {
  return {
    title: "데이터베이스에 접속하지 못했습니다",
    detail: "데이터를 읽는 중 오류가 났습니다.",
    hint: "데이터가 없는 것이 아니라 연결 문제입니다. 잠시 뒤 다시 시도해 주세요. 계속되면 서버 기록에서 자세한 원인을 확인하세요.",
  };
}

// 오류 원문을 서버 기록에만 남긴다. (브라우저로는 나가지 않는다.)
export function logLoadFailure(where: string, message: string): void {
  console.error(`[데이터베이스 오류] ${where}: ${message}`);
}

export type RangeDataStatus =
  | "no-companies" // 저장된 대기업이 하나도 없다
  | "all-no-data" // 입력한 분기가 모두 데이터 없음
  | "has-data"; // 데이터가 있는 분기가 하나 이상 있다 (일부 분기만 없을 수 있다)

// 접속에 성공한 뒤, 입력 범위에 계산할 데이터가 있는지 가른다.
export function rangeDataStatus(
  companyCount: number,
  results: MetricsResult,
): RangeDataStatus {
  if (companyCount === 0) return "no-companies";
  if (results.every((r) => r.status === "no-data")) return "all-no-data";
  return "has-data";
}

// 접속은 정상인데 보여 줄 데이터가 없을 때의 안내. 계산할 데이터가 있으면 null이다.
export function noDataNotice(status: RangeDataStatus): Notice | null {
  if (status === "no-companies") {
    return {
      title: "저장된 대기업 데이터가 없습니다",
      detail: "데이터베이스 접속은 정상이지만 기업규모가 대기업인 기업이 없습니다.",
      hint: "적재 스크립트로 데이터를 먼저 저장해 주세요.",
    };
  }
  if (status === "all-no-data") {
    return {
      title: "입력한 분기에는 저장된 대기업 데이터가 없습니다",
      detail: "데이터베이스 접속은 정상입니다.",
      hint: "다른 분기를 입력하거나, 새 분기 데이터를 저장해 주세요.",
    };
  }
  return null;
}
