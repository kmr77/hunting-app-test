"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteRenewalAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

type RenewalDeleteFormProps = {
  renewalId: string;
};

export function RenewalDeleteForm({ renewalId }: RenewalDeleteFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);

    const result = await deleteRenewalAction(formData);
    if (!result.success) {
      setError(result.message ?? "免許・許可情報の削除に失敗しました。");
      return;
    }

    setMessage("免許・許可情報を削除しました。");
    window.setTimeout(() => {
      router.refresh();
    }, 450);
  }

  return (
    <form action={handleSubmit} className="mt-3 scroll-mt-6">
      <input type="hidden" name="id" value={renewalId} />
      {message ? (
        <div className="mb-3 rounded-[20px] border border-emerald-200/80 bg-emerald-50/95 p-3 text-sm font-semibold text-emerald-950">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-[20px] border border-rose-200/80 bg-rose-50/95 p-3 text-sm font-semibold text-rose-950">
          {error}
        </div>
      ) : null}
      <SubmitButton variant="danger" pendingChildren="削除中...">
        この免許・許可情報を削除
      </SubmitButton>
    </form>
  );
}
