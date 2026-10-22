// Design Ref: §4 lib/quarters.ts — 분기 형식 검사와 분기 목록 만들기 (PLAN 9번)
// 분기는 "2025Q4"처럼 연도 4자리 + Q + 1~4로 쓴다. db/schema.sql의 quarter 열과 같은 형식이다.
//
// 보안: 사용자가 주소에 넣은 값은 믿지 않는다. (공개 전 보안 점검 반영)
//  - 입력 원문은 안내 문구에 되돌려 넣지 않는다. (가짜 안내 문구를 끼워 넣는 링크를 막기 위해)
//  - 연도와 분기 개수에 한도를 둔다. (아주 넓은 범위로 서버와 데이터베이스에 부담을 주는 요청을 막기 위해)

export type QuarterRangeResult =
  | { ok: true; from: string; to: string; quarters: string[] }
  | { ok: false; message: string };

type ParsedQuarter = { year: number; q: number };

// 받아들이는 연도 범위와, 한 번에 분석할 수 있는 최대 분기 수 (40분기 = 10년)
export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;
export const MAX_QUARTERS = 40;

// 형식이 맞으면 연도와 분기 번호를, 아니면 null을 돌려준다. 앞뒤 공백과 소문자 q는 봐준다.
export function parseQuarter(text: string): ParsedQuarter | null {
  const match = /^(\d{4})Q([1-4])$/.exec(text.trim().toUpperCase());
  if (!match) return null;
  return { year: Number(match[1]), q: Number(match[2]) };
}

function format({ year, q }: ParsedQuarter): string {
  return `${year}Q${q}`;
}

// 시작·끝 분기를 검사하고, 정상이면 그 사이의 모든 분기를 오래된 순으로 만든다. (양 끝 포함)
export function quarterRange(from: string, to: string): QuarterRangeResult {
  if (from.trim() === "" || to.trim() === "") {
    return { ok: false, message: "시작 분기와 끝 분기를 모두 입력해 주세요." };
  }

  const start = parseQuarter(from);
  if (!start) {
    return {
      ok: false,
      message:
        "시작 분기의 형식이 올바르지 않습니다. 2025Q1처럼 연도 4자리, Q, 1~4 순서로 써 주세요.",
    };
  }

  const end = parseQuarter(to);
  if (!end) {
    return {
      ok: false,
      message:
        "끝 분기의 형식이 올바르지 않습니다. 2025Q4처럼 연도 4자리, Q, 1~4 순서로 써 주세요.",
    };
  }

  for (const [label, parsed] of [
    ["시작", start],
    ["끝", end],
  ] as const) {
    if (parsed.year < MIN_YEAR || parsed.year > MAX_YEAR) {
      return {
        ok: false,
        message: `${label} 분기의 연도는 ${MIN_YEAR}~${MAX_YEAR} 사이여야 합니다.`,
      };
    }
  }

  // 연도를 4배 해서 분기 번호를 더하면 한 줄의 숫자로 순서를 비교할 수 있다.
  const startIndex = start.year * 4 + (start.q - 1);
  const endIndex = end.year * 4 + (end.q - 1);

  // 아래 두 문구에 들어가는 분기는 입력 원문이 아니라 검사를 거쳐 다시 조립한 값이다.
  if (startIndex > endIndex) {
    return {
      ok: false,
      message: `시작 분기(${format(start)})가 끝 분기(${format(end)})보다 늦습니다.`,
    };
  }

  const count = endIndex - startIndex + 1;
  if (count > MAX_QUARTERS) {
    return {
      ok: false,
      message: `한 번에 최대 ${MAX_QUARTERS}개 분기(${MAX_QUARTERS / 4}년)까지 분석할 수 있습니다. 입력한 범위는 ${count}개 분기입니다.`,
    };
  }

  const quarters: string[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    quarters.push(format({ year: Math.floor(i / 4), q: (i % 4) + 1 }));
  }

  return { ok: true, from: format(start), to: format(end), quarters };
}
