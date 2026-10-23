import { quarterRange } from "@/lib/quarters";

// Design Ref: §1 ② 입력 칸 — 시작·끝 분기를 받아 형식과 순서를 검사한다.
// 지표 목록 화면과 지표별 결과 화면이 같이 쓴다. 입력값은 주소(GET)로 전달되므로 비밀 값은 넣지 않는다.

// 주소의 ?from=...&to=... 값 하나를 문자열로 꺼낸다. (없으면 빈 문자열)
export function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function RangeForm({
  action,
  from,
  to,
  range,
}: {
  action: string; // 제출하면 이동할 화면 주소
  from: string;
  to: string;
  range: ReturnType<typeof quarterRange> | null;
}) {
  return (
    <section className="glass rise rise-2 flex w-full min-w-0 flex-col gap-3 p-5">
      <form method="get" action={action} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          시작 분기
          <input name="from" defaultValue={from} placeholder="예: 2024Q1" className="field" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          끝 분기
          <input name="to" defaultValue={to} placeholder="예: 2025Q4" className="field" />
        </label>
        <button type="submit" className="btn-glass btn-solid">
          적용하기
        </button>
      </form>

      {range && !range.ok && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-red-800">
          {range.message}
        </p>
      )}
      {range && range.ok && (
        <p className="glass-soft px-4 py-2 text-sm">
          입력한 범위: {range.from} ~ {range.to} (분기 {range.quarters.length}개)
        </p>
      )}
    </section>
  );
}
