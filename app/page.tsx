import Link from "next/link";

// 처음 화면(소개) — 도구 이름을 크게 보여 주고, 분석하기를 누르면 지표 목록 화면(/analysis)으로 간다.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="rise rise-1 mb-5 rounded-full border border-[var(--line)] bg-white px-4 py-1.5 text-sm text-soft shadow-sm">
        재정경제부 자금시장분석과
      </p>
      <h1 className="display text-5xl leading-tight sm:text-7xl">
        <span className="ln">
          <span>대기업 재무지표</span>
        </span>
        <span className="ln">
          <span>분석</span>
        </span>
      </h1>
      <p className="rise rise-3 mt-6 max-w-xl text-lg text-soft">
        분기별 대기업의 재무지표 평균을 계산해 표로 보여 주고, 엑셀로 내려받을 수 있습니다.
      </p>
      <Link href="/analysis" className="btn-glass btn-solid btn-big rise rise-4 mt-10">
        분석하기
      </Link>
    </main>
  );
}
