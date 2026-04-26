import { updateAccountAction } from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { SubmitButton } from "@/components/submit-button";
import {
  getDataLoadErrorMessage,
  getAccountPageData,
  planCodeOptions,
  userStatusOptions,
} from "@/lib/app-data";
import {
  getFeedbackFromSearchParams,
  type SearchParamsInput,
} from "@/lib/feedback";
import { formatDateInput } from "@/lib/format";
import { planCodeLabels, userStatusLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const searchFeedback = await getFeedbackFromSearchParams(searchParams);
  let feedback = searchFeedback;
  let data: Awaited<ReturnType<typeof getAccountPageData>> | null = null;

  try {
    data = await getAccountPageData();
  } catch (error) {
    feedback ??= {
      variant: "error",
      message: getDataLoadErrorMessage(error),
    };
  }

  const profile = data?.profile;
  const fullName = `${profile?.lastName ?? ""}${profile?.firstName ?? ""}`.trim();

  return (
    <main className="flex flex-1 flex-col gap-5">
      <FeedbackBanner feedback={feedback} />

      <section className="rounded-[32px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.38)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-700 uppercase">
              利用者設定
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              固定利用者のプロフィールを管理
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              MVP では認証前提を入れず、1人分のプロフィールと状態だけを更新します。
            </p>
          </div>

          <div className="rounded-[28px] bg-slate-950 px-5 py-4 text-white">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-300 uppercase">
              利用者
            </p>
            <p className="mt-2 text-lg font-semibold">
              {fullName || "固定利用者"}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {data?.email ?? "demo@local.hunting-app"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <form
          action={updateAccountAction}
          className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]"
        >
          <div className="mb-4">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
              基本情報
            </p>
            <h3 className="mt-1 text-lg font-semibold">プロフィールを更新</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">姓</span>
              <input
                name="lastName"
                required
                defaultValue={profile?.lastName ?? ""}
                className="min-h-12 w-full min-w-0 rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">名</span>
              <input
                name="firstName"
                required
                defaultValue={profile?.firstName ?? ""}
                className="min-h-12 w-full min-w-0 rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">メールアドレス</span>
              <input
                name="email"
                type="email"
                required
                defaultValue={data?.email ?? "demo@local.hunting-app"}
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">電話番号</span>
              <input
                name="phoneNumber"
                defaultValue={profile?.phoneNumber ?? ""}
                placeholder="例: 090-0000-0000"
                className="min-h-12 w-full min-w-0 rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">生年月日</span>
              <input
                type="date"
                name="birthDate"
                defaultValue={formatDateInput(profile?.birthDate)}
                className="min-h-12 w-full min-w-0 rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">利用状態</span>
              <select
                name="status"
                defaultValue={data?.status ?? "ACTIVE"}
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              >
                {userStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {userStatusLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">プラン</span>
              <select
                name="planCode"
                defaultValue={data?.planCode ?? "FREE"}
                className="min-h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              >
                {planCodeOptions.map((option) => (
                  <option key={option} value={option}>
                    {planCodeLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 space-y-1.5 text-sm lg:col-span-3">
              <span className="font-medium text-slate-700">住所</span>
              <input
                name="addressLine1"
                defaultValue={[profile?.addressLine1, profile?.addressLine2]
                  .filter(Boolean)
                  .join(" ")}
                placeholder="例：北海道札幌市中央区〇条〇丁目〇-〇"
                className="min-h-12 w-full min-w-0 rounded-[20px] border border-slate-200 bg-slate-50 px-4"
              />
            </label>
            <input type="hidden" name="prefectureCode" value="" />
            <input type="hidden" name="addressLine2" value="" />
          </div>

          <SubmitButton
            className="mt-5 min-h-12 w-full px-5"
            pendingChildren="保存中..."
          >
            プロフィールを保存
          </SubmitButton>
        </form>

        <section className="grid gap-4">
          <article className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
              現在の設定
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-[22px] bg-slate-50 p-4">
                <p className="text-xs text-slate-500">氏名</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {fullName || "未設定"}
                </p>
              </div>
              <div className="rounded-[22px] bg-slate-50 p-4">
                <p className="text-xs text-slate-500">利用状態</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {data ? userStatusLabels[data.status] : "利用中"}
                </p>
              </div>
              <div className="rounded-[22px] bg-slate-50 p-4">
                <p className="text-xs text-slate-500">プラン</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {data ? planCodeLabels[data.planCode] : "無料プラン"}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
              利用状況
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-[22px] bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">更新管理</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-950">
                  {data?.renewalRecords.length ?? 0}
                </p>
              </div>
              <div className="rounded-[22px] bg-lime-50 p-4">
                <p className="text-xs text-lime-700">実包帳簿</p>
                <p className="mt-2 text-2xl font-semibold text-lime-950">
                  {data?.ammoRecords.length ?? 0}
                </p>
              </div>
              <div className="rounded-[22px] bg-slate-100 p-4">
                <p className="text-xs text-slate-500">記録件数</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {data?.huntingEvents.length ?? 0}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[30px] border border-emerald-950/10 bg-white/92 p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.38)]">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
              運用メモ
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
              <li>認証は未実装のため、固定利用者1名で運用しています。</li>
              <li>本番メール送信や外部連携は接続していません。</li>
              <li>保存ロジックは既存の Server Actions を継続利用しています。</li>
            </ul>
          </article>
        </section>
      </section>
    </main>
  );
}
