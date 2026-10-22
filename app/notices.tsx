import type { Notice } from "@/lib/notices";

// Design Ref: §1 ③ 안내 띠 — 접속 오류는 빨간 상자, 데이터 없음은 노란 상자로 구분해 보여 준다.
// 문구는 lib/notices.ts에서 만들고, 여기서는 색과 모양만 정한다.

// 데이터베이스에 접속하지 못했을 때 (빨강). 데이터가 없는 것과 다른 문제이다.
export function DbErrorBox({ notice }: { notice: Notice }) {
  return (
    <div
      role="alert"
      className="w-full rounded border border-red-300 bg-red-50 px-3 py-2 text-red-800"
    >
      <p className="font-semibold">⚠ {notice.title}</p>
      <p className="text-sm">{notice.detail}</p>
      <p className="mt-1 text-sm">{notice.hint}</p>
    </div>
  );
}

// 접속은 정상인데 입력한 분기에 저장된 데이터가 없을 때 (노랑)
export function NoDataBox({ notice }: { notice: Notice }) {
  return (
    <div
      role="status"
      className="w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900"
    >
      <p className="font-semibold">{notice.title}</p>
      <p className="text-sm">{notice.detail}</p>
      <p className="mt-1 text-sm">{notice.hint}</p>
    </div>
  );
}
