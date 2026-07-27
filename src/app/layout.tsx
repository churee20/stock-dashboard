import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLatestCollectedAt } from "@/lib/supabase/queries";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Investment Dashboard",
  description: "투자 실적 현황",
};

// Vercel Cron이 매일 새로 수집하는 Supabase 데이터를 항상 최신 상태로 반영해야 하므로
// 정적 프리렌더링을 금지하고 매 요청마다 서버에서 새로 조회한다.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let latestCollectedAt: string | undefined
  try {
    latestCollectedAt = await getLatestCollectedAt()
  } catch {
    latestCollectedAt = undefined
  }

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <Header collectedAt={latestCollectedAt} />
          <main className="flex-1">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
