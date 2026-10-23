import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

// 디자인 참고 화면과 같은 글꼴: 본문 Inter, 큰 제목 Inter Tight
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "대기업 재무지표 분석",
  description: "대기업의 분기별 재무지표 평균을 계산하고 엑셀로 내려받는 도구",
  // 내부 자료로 간주하는 도구이므로 검색엔진에 나오지 않게 한다.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
