import type { Metadata } from "next";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "猟務台帳",
  description: "狩猟・銃管理のローカル業務アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full">
        <div className="min-h-full bg-[linear-gradient(180deg,#edf6ef_0%,#e4ece6_36%,#d7ddd9_100%)] text-slate-950">
          <header className="border-b border-emerald-950/10 bg-white/88 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold tracking-[0.24em] text-emerald-800 uppercase">
                  ローカル狩猟業務
                </p>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-slate-950">
                    猟務台帳
                  </h1>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-900">
                    ローカル検証版
                  </span>
                </div>
              </Link>

              <div className="hidden rounded-full border border-emerald-950/10 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 sm:block">
                認証なしの固定利用者モード
              </div>
            </div>
          </header>

          <div className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:px-8">
            <AppNavigation />
            <div className="flex min-w-0 flex-1 pb-24 xl:pb-8">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
