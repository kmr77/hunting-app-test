"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteRenewalAction } from "@/app/actions";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";

type RenewalDeleteFormProps = {
  renewalId: string;
  triggerLabel: string;
  modalTitle: string;
  title: string;
  categoryLabel: string;
  issuedOnLabel?: string | null;
  permittedOnLabel?: string | null;
  expiresOnLabel: string;
  permitNumberLabel?: string | null;
  warningText: string;
  relatedItemsTitle?: string | null;
  imageCount?: number;
  firearmCount: number;
  barrelCount: number;
  inspectionCount: number;
  confirmLabel: string;
  successMessage: string;
  errorMessage: string;
};

export function RenewalDeleteForm({
  renewalId,
  triggerLabel,
  modalTitle,
  title,
  categoryLabel,
  issuedOnLabel,
  permittedOnLabel,
  expiresOnLabel,
  permitNumberLabel,
  warningText,
  relatedItemsTitle,
  imageCount = 0,
  firearmCount,
  barrelCount,
  inspectionCount,
  confirmLabel,
  successMessage,
  errorMessage,
}: RenewalDeleteFormProps) {
  const router = useRouter();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const targetDetails = permittedOnLabel
    ? [
        { label: "管理名", value: title },
        { label: "種別", value: categoryLabel },
        { label: "許可日", value: permittedOnLabel },
        { label: "有効期限日", value: expiresOnLabel },
        { label: "今回の許可番号", value: permitNumberLabel ?? "未登録" },
      ]
    : [
        { label: "管理名", value: title },
        { label: "種別", value: categoryLabel },
        { label: "交付日", value: issuedOnLabel ?? "未登録" },
        { label: "有効期限日", value: expiresOnLabel },
      ];

  function closeModal() {
    setOpen(false);
    setError(null);
    window.setTimeout(() => deleteButtonRef.current?.focus(), 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    setMessage(null);
    setError(null);
    setPending(true);

    const formData = new FormData();
    formData.set("id", renewalId);

    const result = await deleteRenewalAction(formData);
    setPending(false);

    if (!result.success) {
      setError(errorMessage);
      return;
    }

    setOpen(false);
    setMessage(successMessage);
    window.setTimeout(() => {
      router.refresh();
    }, 450);
  }

  return (
    <div className="mt-3 scroll-mt-6">
      {message ? (
        <div className="mb-3 rounded-[20px] border border-emerald-200/80 bg-emerald-50/95 p-3 text-sm font-semibold text-emerald-950">
          {message}
        </div>
      ) : null}
      <button
        ref={deleteButtonRef}
        type="button"
        onClick={() => {
          setMessage(null);
          setError(null);
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
      >
        {triggerLabel}
      </button>

      <ConfirmDeleteModal
        open={open}
        title={modalTitle}
        error={error}
        pending={pending}
        confirmLabel={confirmLabel}
        pendingLabel="削除中…"
        onClose={closeModal}
        onSubmit={handleSubmit}
      >
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-950">
          <p>{warningText}</p>
          <p className="mt-1 font-semibold">この操作は元に戻せません。</p>
        </div>

        <dl className="grid gap-3 rounded-[20px] bg-slate-50 p-4 text-sm sm:grid-cols-2">
          {targetDetails.map((detail) => (
            <div key={detail.label} className="min-w-0">
              <dt className="font-semibold text-slate-500">{detail.label}</dt>
              <dd className="mt-1 break-words font-semibold text-slate-950">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>

        {relatedItemsTitle ? (
          <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
            <p className="font-semibold text-slate-950">{relatedItemsTitle}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>銃本体：{firearmCount}丁</li>
              <li>銃身情報：{barrelCount}件</li>
              <li>銃検履歴：{inspectionCount}件</li>
              <li>許可証画像：{imageCount}件</li>
            </ul>
          </div>
        ) : null}
      </ConfirmDeleteModal>
    </div>
  );
}
