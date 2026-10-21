"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, FieldSize } from "@/components/ui/Input";

interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  error?: string | null;
  hint?: string;
  size?: FieldSize;
}

export function PasswordField({ label, error, hint, size, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <Input
      {...props}
      label={label}
      error={error}
      hint={hint}
      size={size}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-parchment)]"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      }
    />
  );
}
