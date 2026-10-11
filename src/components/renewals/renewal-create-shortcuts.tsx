"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RenewalCreateForm } from "@/components/renewals/renewal-create-form";
import type { RenewalRuleConfig } from "@/lib/validation-rules";

type RenewalCreateType = "GUN_LICENSE" | "HUNTING_LICENSE";

type RenewalCreateShortcutsProps = {
  renewalRuleConfigs: Record<RenewalCreateType, RenewalRuleConfig>;
  userBirthDate: string;
};

const categoryLabels: Record<RenewalCreateType, string> = {
  GUN_LICENSE: "銃砲所持許可",
  HUNTING_LICENSE: "狩猟免許（狩猟免状）",
};

const shortcutButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[#2e7d32] bg-white px-5 text-sm font-bold tracking-[0.02em] text-emerald-800 transition-colors hover:bg-[#2e7d32] hover:text-white sm:w-auto";

export function RenewalCreateShortcuts({
  renewalRuleConfigs,
  userBirthDate,
}: RenewalCreateShortcutsProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<RenewalCreateType>("GUN_LICENSE");
  const [lastCategory, setLastCategory] =
    useState<RenewalCreateType>("GUN_LICENSE");
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  function openModal(category: RenewalCreateType, opener: HTMLButtonElement) {
    setSelectedCategory(category);
    setLastCategory(category);
    setDirty(false);
    setConfirmClose(false);
    setMessage(null);
    openerRef.current = opener;
    setOpen(true);
  }

  const closeModal = useCallback(() => {
    setOpen(false);
    setDirty(false);
    setConfirmClose(false);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  }, []);

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    closeModal();
  }, [dirty, closeModal]);

  function handleSaved(successMessage: string) {
    setMessage(successMessage);
    closeModal();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      const firstInput = modalRef.current?.querySelector<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement
      >("select, input, textarea, button");
      firstInput?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, requestClose]);

  return (
    <section className="rounded-[28px] border border-emerald-950/10 bg-emerald-50/70 p-4 shadow-[0_20px_46px_-36px_rgba(15,23,42,0.36)] sm:p-5">
      {message ? (
        <div className="mb-4 rounded-[20px] border border-emerald-200/80 bg-white/90 p-3 text-sm font-semibold text-emerald-950">
          {message}
        </div>
      ) : null}
      <div className="grid gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950">
            登録する情報を選択してください
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            新規登録はモーダルで入力します。一覧を見ながら必要な情報だけ追加できます。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={(event) =>
              openModal("GUN_LICENSE", event.currentTarget)
            }
            className={shortcutButtonClass}
          >
            銃砲所持許可を追加
          </button>
          <button
            type="button"
            onClick={(event) =>
              openModal("HUNTING_LICENSE", event.currentTarget)
            }
            className={shortcutButtonClass}
          >
            狩猟免許を追加
          </button>
          <button
            type="button"
            onClick={(event) => openModal(lastCategory, event.currentTarget)}
            className={shortcutButtonClass}
          >
            新規登録
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-5 sm:px-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              requestClose();
            }
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="renewal-create-modal-title"
            className="renewal-create-modal max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white p-4 shadow-[0_30px_90px_-32px_rgba(15,23,42,0.55)] sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-[0.18em] text-emerald-700">
                  新規登録
                </p>
                <h2
                  id="renewal-create-modal-title"
                  className="mt-2 text-xl font-bold leading-8 text-slate-950"
                >
                  {categoryLabels[selectedCategory]}を追加
                </h2>
              </div>
              <button
                type="button"
                onClick={requestClose}
                aria-label="閉じる"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                ×
              </button>
            </div>

            {confirmClose ? (
              <div className="mb-4 rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <p className="font-bold">入力中の内容を破棄して閉じますか？</p>
                <p className="mt-1">
                  閉じると、まだ保存していない入力内容は残りません。
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-amber-700 px-4 text-sm font-bold text-white hover:bg-amber-800"
                  >
                    破棄して閉じる
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClose(false)}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-amber-200 bg-white px-4 text-sm font-bold text-amber-900 hover:bg-amber-100"
                  >
                    編集に戻る
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("GUN_LICENSE");
                  setLastCategory("GUN_LICENSE");
                }}
                className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold transition-colors ${
                  selectedCategory === "GUN_LICENSE"
                    ? "bg-[#2e7d32] text-white hover:bg-[#256528]"
                    : "border border-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                銃砲所持許可
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("HUNTING_LICENSE");
                  setLastCategory("HUNTING_LICENSE");
                }}
                className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold transition-colors ${
                  selectedCategory === "HUNTING_LICENSE"
                    ? "bg-[#2e7d32] text-white hover:bg-[#256528]"
                    : "border border-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                狩猟免許（狩猟免状）
              </button>
            </div>

            <RenewalCreateForm
              key={selectedCategory}
              renewalRuleConfigs={renewalRuleConfigs}
              userBirthDate={userBirthDate}
              defaultCategory={selectedCategory}
              onSaved={handleSaved}
              onCategoryChange={(category) => {
                setSelectedCategory(category);
                setLastCategory(category);
              }}
              onDirtyChange={(nextDirty) => {
                if (nextDirty) {
                  setConfirmClose(false);
                }
                setDirty(nextDirty);
              }}
              className="w-full max-w-none p-0"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
