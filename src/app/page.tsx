import Link from "next/link";
import { FeedbackBanner } from "@/components/feedback-banner";
import {
  getDashboardSummary,
  getDashboardSummaryFallback,
  getDataLoadErrorMessage,
  getDemoUserBundle,
} from "@/lib/app-data";
import type { FeedbackState } from "@/lib/feedback";
import { planCodeLabels, userStatusLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

const quickActions = [
  {
    href: "/renewals",
    title: "更新管理",
    description: "免許と許可の期限を一覧で確認します。",
    accent: "bg-emerald-100 text-emerald-950",
    cta: "期限を確認",
  },
  {
    href: "/ammo",
    title: "実包帳簿",
    description: "購入と消費の履歴を残して残数を把握します。",
    accent: "bg-lime-100 text-lime-950",
    cta: "帳簿を開く",
  },
  {
    href: "/reports",
    title: "報告書転記",
    description: "狩猟記録から転記用の要点を整理します。",
    accent: "bg-emerald-50 text-emerald-900",
    cta: "記録を見る",
  },
  {
    href: "/account",
    title: "利用者設定",
    description: "固定利用者の基本情報と利用状況を確認します。",
    accent: "bg-slate-100 text-slate-900",
    cta: "設定を確認",
  },
] as const;

export default async function Home() {
  let summary = getDashboardSummaryFallback();
  let userBundle: Awaited<ReturnType<typeof getDemoUserBundle>> | null = null;
  let feedback: FeedbackState | null = null;

  try {
    summary = await getDashboardSummary();
    userBundle = await getDemoUserBundle();
  } catch (error) {
    feedback = {
      variant: "error",
      message: getDataLoadErrorMessage(error),
    };
  }

  const fullName = `${userBundle?.profile?.lastName ?? ""}${userBundle?.profile?.firstName ?? ""}`.trim();

  return (
    <main className="flex flex-1 flex-col gap-5">
      <FeedbackBanner feedback={feedback} />

      <section className="overflow-hidden rounded-[32px] border border-emerald-950/10 bg-[linear-gradient(145deg,#0f2d1f_0%,#1f5f3f_52%,#5c9b68_100%)] px-5 py-6 text-white shadow-[0_26px_60px_-34px_rgba(15,23,42,0.55)] sm:px-6 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-emerald-100 uppercase">
              ダッシュボード
            </p>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              狩猟・銃管理の主要項目を
              <br />
              ひと目で確認できます
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-emerald-50/90">
              更新期限、実包残数、報告書転記待ちをまとめて確認するための
              ローカル業務アプリです。日常の記録をスマホ中心で扱える前提に
              整えています。
            </p>
          </div>

          <div className="rounded-[28px] border border-white/16 bg-white/12 p-4 backdrop-blur">
            <p className="text-xs tracking-[0.16em] text-emerald-100 uppercase">
              利用者
            </p>
            <p className="mt-2 text-lg font-semibold">
              {fullName || "固定利用者"}
            </p>
            <p className="mt-1 text-sm text-emerald-50/85">
              {userBundle?.email ?? "demo@local.hunting-app"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/12 px-3 py-1">
                {userStatusLabels[userBundle?.status ?? "ACTIVE"]}
              </span>
              <span className="rounded-full bg-white/12 px-3 py-1">
                {planCodeLabels[userBundle?.planCode ?? "FREE"]}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[28px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_22px_40px_-32px_rgba(15,23,42,0.34)]">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            更新管理
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {summary.renewals}
          </p>
          <p className="mt-2 text-sm text-slate-600">対応中の更新記録</p>
        </article>
        <article className="rounded-[28px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_22px_40px_-32px_rgba(15,23,42,0.34)]">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            実包残数
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {summary.ammoBalance} 発
          </p>
          <p className="mt-2 text-sm text-slate-600">現在の帳簿残数</p>
        </article>
        <article className="rounded-[28px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_22px_40px_-32px_rgba(15,23,42,0.34)]">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            報告書転記
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {summary.pendingReports} 件
          </p>
          <p className="mt-2 text-sm text-slate-600">未転記の狩猟記録</p>
        </article>
        <article className="rounded-[28px] border border-emerald-950/10 bg-[linear-gradient(180deg,#f7faf7_0%,#eef5ef_100%)] p-5 shadow-[0_22px_40px_-32px_rgba(15,23,42,0.34)]">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            今日のメモ
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
            <li>更新期限を先に確認</li>
            <li>狩猟後は実包と記録を同日に登録</li>
            <li>報告書転記後に状態を切替</li>
          </ul>
        </article>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.25fr,0.75fr]">
        <div className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-4 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)] sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
                主要機能
              </p>
              <h3 className="mt-1 text-lg font-semibold">日々の入力入口</h3>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
              スマホ優先
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {quickActions.map((item) => (
              <article
                key={item.href}
                className="rounded-[26px] border border-emerald-950/8 bg-slate-50/90 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${item.accent}`}
                    >
                      {item.title}
                    </span>
                    <p className="text-sm leading-7 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </div>
                <Link
                  href={item.href}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-950 px-4 text-sm font-medium !text-white transition-colors hover:bg-emerald-900"
                >
                  {item.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-3 rounded-[30px] border border-emerald-950/10 bg-white/92 p-4 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)] sm:p-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
              運用メモ
            </p>
            <h3 className="mt-1 text-lg font-semibold">MVP の前提</h3>
          </div>
          <ul className="space-y-3 text-sm leading-7 text-slate-600">
            <li>認証は未実装のため、固定利用者で運用します。</li>
            <li>保存処理はローカル DB に限定し、本番接続は行いません。</li>
            <li>画面はカード中心で、片手入力しやすい構成を優先しています。</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
