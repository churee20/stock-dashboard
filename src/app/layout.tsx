import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
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
        <Header collectedAt={latestCollectedAt} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
