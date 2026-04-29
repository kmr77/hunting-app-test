import type { FeedbackState } from "@/lib/feedback";

type FeedbackBannerProps = {
  feedback: FeedbackState | null;
};

export function FeedbackBanner({ feedback }: FeedbackBannerProps) {
  if (!feedback) {
    return null;
  }

  const classes =
    feedback.variant === "success"
      ? {
          container: "border-emerald-200/80 bg-emerald-50/95 text-emerald-950",
          label: "bg-emerald-900 text-emerald-50",
        }
      : {
          container: "border-rose-200/80 bg-rose-50/95 text-rose-950",
          label: "bg-rose-900 text-rose-50",
        };

  return (
    <section
      className={`rounded-[24px] border px-4 py-4 shadow-[0_22px_40px_-32px_rgba(15,23,42,0.4)] ${classes.container}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold tracking-[0.16em] uppercase ${classes.label}`}
        >
          {feedback.variant === "success" ? "成功" : "失敗"}
        </span>
        <p className="pt-1 text-sm leading-7">{feedback.message}</p>
      </div>
    </section>
  );
}
