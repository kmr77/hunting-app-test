"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { formFieldCompact, formFieldLabel, formLabelText } from "@/lib/form-classes";
import { SubmitButton } from "@/components/submit-button";

const MAX_IMAGE_EDGE = 1600;
const WEBP_QUALITY = 0.82;
const MAX_COMPRESSED_BYTES = 1_600_000;

type PermitImageUploaderProps = {
  action: (formData: FormData) => void;
  renewalRecordId: string;
};

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

async function compressImage(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    await image.decode();

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("画像を処理できませんでした。");
    }

    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/webp", WEBP_QUALITY);

    if (dataUrlBytes(dataUrl) > MAX_COMPRESSED_BYTES) {
      throw new Error("画像サイズが大きすぎます。もう少し小さい画像を選んでください。");
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function PermitImageUploader({
  action,
  renewalRecordId,
}: PermitImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressedImageData, setCompressedImageData] = useState("");
  const [originalFileName, setOriginalFileName] = useState("");
  const [status, setStatus] = useState("画像を選択すると自動で軽量化します。");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setCompressedImageData("");
    setOriginalFileName("");

    if (!file) {
      setStatus("画像を選択すると自動で軽量化します。");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("画像ファイルを選択してください。");
      inputRef.current?.setCustomValidity("画像ファイルを選択してください。");
      return;
    }

    inputRef.current?.setCustomValidity("");
    setStatus("画像を軽量化しています...");

    try {
      const dataUrl = await compressImage(file);
      setCompressedImageData(dataUrl);
      setOriginalFileName(file.name);
      setStatus(`圧縮済み: 約${Math.ceil(dataUrlBytes(dataUrl) / 1024)}KB`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "画像の軽量化に失敗しました。";
      setStatus(message);
      inputRef.current?.setCustomValidity(message);
    }
  }

  return (
    <form action={action} className="grid min-w-0 gap-3">
      <input type="hidden" name="renewalRecordId" value={renewalRecordId} />
      <input type="hidden" name="compressedImageData" value={compressedImageData} />
      <input type="hidden" name="originalFileName" value={originalFileName} />
      <label className={formFieldLabel}>
        <span className={formLabelText}>許可証画像</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className={formFieldCompact}
        />
      </label>
      <p className="text-xs leading-6 text-slate-600">{status}</p>
      <SubmitButton
        className="min-h-11 px-4"
        disabled={!compressedImageData}
        pendingChildren="保存中..."
      >
        画像を保存
      </SubmitButton>
    </form>
  );
}
