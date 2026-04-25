"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  pendingChildren?: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

const variantClasses = {
  primary:
    "bg-emerald-950 !text-white hover:bg-emerald-900 disabled:bg-emerald-950/55",
  secondary:
    "border border-emerald-200 text-emerald-800 hover:bg-emerald-50 disabled:text-emerald-800/55 disabled:border-emerald-200/60",
  danger:
    "border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:text-rose-700/55 disabled:border-rose-200/60",
} as const;

export function SubmitButton({
  children,
  pendingChildren,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {pending ? pendingChildren ?? "送信中..." : children}
    </button>
  );
}
