"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavigationItems } from "@/lib/labels";

function isCurrentPath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-72 shrink-0 xl:block">
        <div className="sticky top-6 space-y-3 rounded-[32px] border border-emerald-950/10 bg-white/92 p-4 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.32)] backdrop-blur">
          <p className="px-3 text-[11px] font-semibold tracking-[0.22em] text-emerald-700 uppercase">
            主要メニュー
          </p>
          <nav aria-label="主要メニュー">
            <ul className="space-y-2">
              {appNavigationItems.map((item) => {
                const active = isCurrentPath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex rounded-[24px] px-4 py-3 transition-colors ${
                        active
                          ? "bg-emerald-950 text-white shadow-[0_20px_35px_-28px_rgba(6,78,59,0.8)]"
                          : "bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p
                          className={`text-xs leading-6 ${
                            active ? "text-emerald-100/90" : "text-slate-500"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      <nav
        aria-label="下部ナビゲーション"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-950/10 bg-white/92 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-18px_40px_-24px_rgba(15,23,42,0.22)] backdrop-blur xl:hidden"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-2">
          {appNavigationItems.map((item) => {
            const active = isCurrentPath(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-[18px] px-1 text-center transition-colors ${
                    active
                      ? "bg-emerald-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"
                  }`}
                >
                  <span className="text-[11px] font-semibold tracking-[0.12em] uppercase">
                    {item.shortLabel}
                  </span>
                  <span
                    className={`mt-1 text-[10px] leading-4 ${
                      active ? "text-emerald-100" : "text-slate-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
