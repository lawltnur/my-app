// 처음 화면 아래쪽에 깔리는 고층 건물 그림. (유리처럼 투명하고 연한 느낌의 디자인 참고 이미지를 따라 SVG로 직접 그렸다.)
// 건물마다 흰색→연한 청회색 그라데이션, 옆면(조금 어두운 면), 아주 옅은 창문 무늬, 반짝이는 모서리 선으로 유리 건물처럼 보이게 했다.
// 사진 파일이 없어도 되고 글자 읽기를 방해하지 않도록 전체를 연하게 하고 위쪽은 서서히 사라지게 한다.

type Tower = { x: number; w: number; h: number; spire?: number; delay: number };

const BASE = 520; // 바닥 위치
const DEPTH = 16; // 옆면 두께

// 가운데가 가장 높고 양옆으로 낮아지는 배치. (x는 왼쪽 가장자리)
const TOWERS: Tower[] = [
  { x: 20, w: 70, h: 190, delay: 0.5 },
  { x: 110, w: 56, h: 260, delay: 0.42 },
  { x: 188, w: 84, h: 330, spire: 40, delay: 0.34 },
  { x: 296, w: 64, h: 250, delay: 0.46 },
  { x: 384, w: 92, h: 410, spire: 54, delay: 0.26 },
  { x: 500, w: 74, h: 340, delay: 0.3 },
  { x: 598, w: 100, h: 470, spire: 70, delay: 0.18 },
  { x: 722, w: 70, h: 360, delay: 0.28 },
  { x: 816, w: 88, h: 420, spire: 46, delay: 0.24 },
  { x: 928, w: 62, h: 290, delay: 0.36 },
  { x: 1014, w: 80, h: 340, delay: 0.4 },
  { x: 1114, w: 58, h: 220, delay: 0.48 },
];

export function Skyline() {
  return (
    <svg
      viewBox="0 0 1200 520"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className="skyline"
    >
      <defs>
        <linearGradient id="sky-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#dfe8f4" stopOpacity="0.7" />
          <stop offset="1" stopColor="#c3d2e6" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="sky-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d6e8" stopOpacity="0.75" />
          <stop offset="1" stopColor="#9fb3cf" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="sky-shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <pattern id="sky-win" width="14" height="16" patternUnits="userSpaceOnUse">
          <rect x="2" y="3" width="9" height="9" rx="1.5" fill="#7f9bc4" fillOpacity="0.16" />
        </pattern>
      </defs>

      {TOWERS.map((t) => {
        const top = BASE - t.h;
        return (
          <g
            key={t.x}
            className="tower"
            style={{ animationDelay: `${t.delay}s`, transformOrigin: `${t.x + t.w / 2}px ${BASE}px` }}
          >
            {/* 꼭대기 안테나 */}
            {t.spire && (
              <line
                x1={t.x + t.w / 2}
                x2={t.x + t.w / 2}
                y1={top - t.spire}
                y2={top}
                stroke="#b7c6dc"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
            {/* 옆면 */}
            <polygon
              points={`${t.x + t.w},${top} ${t.x + t.w + DEPTH},${top - 10} ${t.x + t.w + DEPTH},${BASE} ${t.x + t.w},${BASE}`}
              fill="url(#sky-side)"
            />
            {/* 앞면과 창문 무늬 */}
            <rect x={t.x} y={top} width={t.w} height={t.h} fill="url(#sky-front)" />
            <rect x={t.x} y={top} width={t.w} height={t.h} fill="url(#sky-win)" />
            {/* 유리가 빛을 받는 세로 반짝임 */}
            <rect x={t.x + t.w * 0.18} y={top} width={t.w * 0.22} height={t.h} fill="url(#sky-shine)" />
            {/* 윗면과 모서리 선 */}
            <polygon
              points={`${t.x},${top} ${t.x + DEPTH},${top - 10} ${t.x + t.w + DEPTH},${top - 10} ${t.x + t.w},${top}`}
              fill="#ffffff"
              fillOpacity="0.85"
            />
            <rect
              x={t.x}
              y={top}
              width={t.w}
              height={t.h}
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.9"
              strokeWidth="1.2"
            />
          </g>
        );
      })}
    </svg>
  );
}
