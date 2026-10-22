// Design Ref: §1 ④ 결과 표 — 평균을 화면에 보여 주는 형식을 한 곳에 정한다.
// 엑셀 파일도 같은 형식을 쓸 수 있도록 화면 코드와 분리해 두었다. (PLAN 13번)

// 평균은 소수점 아래 2자리까지 보여 주고, 평균을 구할 수 없으면(쓰인 기업이 0곳) "누락"이라고 쓴다.
// 계산 자체는 반올림하지 않은 값으로 하고, 이 함수는 보여 줄 때만 쓴다.
export function formatAverage(value: number | null): string {
  if (value === null) return "누락";
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// 엑셀에 넣을 숫자: 화면에 보이는 문구(formatAverage)를 그대로 숫자로 되돌린 값이다.
// 같은 형식에서 만들기 때문에 "화면 값 = 엑셀 값"이 항상 같다. 평균을 구할 수 없으면 "누락"이다. (PLAN 13번)
export function displayedAverage(value: number | null): number | "누락" {
  const text = formatAverage(value);
  return text === "누락" ? "누락" : Number(text.replace(/,/g, ""));
}
