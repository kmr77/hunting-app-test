"use client";

import {
  useEffect,
  useId,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";

type ConfirmDeleteModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  error?: string | null;
  pending?: boolean;
  confirmLabel?: string;
  pendingLabel?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ConfirmDeleteModal({
  open,
  title,
  children,
  error,
  pending = false,
  confirmLabel = "削除する",
  pendingLabel = "削除中...",
  onClose,
  onSubmit,
}: ConfirmDeleteModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, pending]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_30px_90px_-32px_rgba(15,23,42,0.55)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.18em] text-rose-600">
              削除確認
            </p>
            <h2
              id={titleId}
              className="mt-2 text-xl font-bold leading-8 text-slate-950"
            >
              {title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            disabled={pending}
            onClick={onClose}
            aria-label="閉じる"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid gap-4">
          {children}

          {error ? (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-full bg-rose-600 px-5 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-400"
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
