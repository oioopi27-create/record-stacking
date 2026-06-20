import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "기록쌓기",
  description: "일정·지출·습관·메모를 빠르게 기록하는 생활 다이어리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" data-theme="pink">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
