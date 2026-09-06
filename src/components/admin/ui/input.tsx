"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/** Champ texte admin — écrit ici plutôt que réutilisé (Règle n°0). Radius 10-13px (§2). */
export const AdminInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function AdminInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-[38px] w-full rounded-[11px] border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-ink)] outline-none placeholder:text-[var(--a-text-3)] focus:border-[var(--a-accent)]",
          className,
        )}
        {...props}
      />
    );
  },
);

export const AdminTextarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AdminTextarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-[11px] border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-3 py-2 text-[13px] text-[var(--a-ink)] outline-none placeholder:text-[var(--a-text-3)] focus:border-[var(--a-accent)]",
          className,
        )}
        {...props}
      />
    );
  },
);
