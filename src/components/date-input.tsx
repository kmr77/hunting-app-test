"use client";

import { useCallback, useRef } from "react";
import type { InputHTMLAttributes } from "react";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function DateInput({ className, onClick, onPointerUp, ...rest }: DateInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = useCallback(() => {
    const input = inputRef.current;
    if (input?.showPicker) {
      input.showPicker();
    }
  }, []);

  return (
    <input
      ref={inputRef}
      type="date"
      className={className}
      onClick={(event) => {
        openPicker();
        onClick?.(event);
      }}
      onPointerUp={(event) => {
        openPicker();
        onPointerUp?.(event);
      }}
      {...rest}
    />
  );
}
