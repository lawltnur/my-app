import Image from "next/image";
import { Suspense } from "react";
import { loadRangeData, readOverview } from "@/lib/load";
import { calculateMetrics } from "@/lib/metrics";
import { quarterRange } from "@/lib/quarters";

// Design Ref: §1 ③ 안내 띠 — 대기업 전체 수와 접속 결과를 보여 준다.
async function Overview() {
  const result = await readOverview();

  if (!result.ok) {
    return (
      <p className="rounded bg-red-50 px-3 py-2 text-red-700">
        데이터베이스 접속 오류: {result.message}
      </p>
    );
  }

  return (
    <p className="rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
      대기업 전체 {result.largeCompanyCount}곳 · 재무 데이터{" "}
      {result.financialRowCount}건
    </p>
  );
}

// Design Ref: §2-1 ③ — 입력한 분기마다 대기업 데이터가 있는지 보여 준다.
// 데이터가 없는 분기는 "데이터 없음"으로 표시한다. (결과 표는 PLAN 11번에서 만든다.)
async function RangeSummary({ quarters }: { quarters: string[] }) {
  const loaded = await loadRangeData(quarters);

  if (!loaded.ok) {
    return (
      <p className="rounded bg-red-50 px-3 py-2 text-red-700">
        데이터베이스 접속 오류: {loaded.message}
      </p>
    );
  }

  const { companies, financials } = loaded.data;
  const results = calculateMetrics({ companies, financials, quarters });

  return (
    <ul className="flex flex-col gap-1 rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
      {results.map((r) => (
        <li key={r.quarter}>
          {r.quarter}:{" "}
          {r.status === "no-data"
            ? "데이터 없음"
            : `대기업 ${r.companyCount}곳 중 재무 데이터 ${
                financials.filter((f) => f.quarter === r.quarter).length
              }건`}
        </li>
      ))}
    </ul>
  );
}

// 주소의 ?from=...&to=... 값 하나를 문자열로 꺼낸다. (없으면 빈 문자열)
function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Design Ref: §1 ② 입력 칸 — 시작·끝 분기를 받아 형식과 순서를 검사한다.
// 입력값은 주소(GET)로 전달되므로 비밀 값은 넣지 않는다.
async function QuarterForm({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const to = firstValue(params.to);
  const submitted = from !== "" || to !== "";
  const range = submitted ? quarterRange(from, to) : null;

  return (
    <section className="flex flex-col gap-3">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          시작 분기
          <input
            name="from"
            defaultValue={from}
            placeholder="예: 2024Q1"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          끝 분기
          <input
            name="to"
            defaultValue={to}
            placeholder="예: 2025Q4"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-foreground px-4 py-2 text-background"
        >
          분석하기
        </button>
      </form>

      {range && !range.ok && (
        <p className="rounded bg-red-50 px-3 py-2 text-red-700">
          {range.message}
        </p>
      )}
      {range && range.ok && (
        <p className="rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
          입력한 범위: {range.from} ~ {range.to} (분기 {range.quarters.length}개)
        </p>
      )}
      {range && range.ok && (
        <Suspense fallback={<p>재무 데이터를 불러오는 중…</p>}>
          <RangeSummary quarters={range.quarters} />
        </Suspense>
      )}
    </section>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        {/* 앱 이름 제목 */}
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
          대기업 재무지표 분석 도구
        </h1>
        <Suspense fallback={<p>입력 칸을 불러오는 중…</p>}>
          <QuarterForm searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<p>데이터베이스에 접속하는 중…</p>}>
          <Overview />
        </Suspense>
        <Image
          className="dark:invert h-5 w-[100px]"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the{" "}
            <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
              page.tsx
            </code>{" "}
            file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert h-[14px] w-4"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={14}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
