"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Bouton admin, écrit ici plutôt que réutilisé depuis
 * @/components/ui/button (Règle n°0 : "si tu as besoin d'un bouton,
 * écris-en un dans /admin") — radius 9-10px (jamais rounded-full),
 * jamais d'ombre (§2).
 */
export type AdminButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANT_STYLE: Record<AdminButtonVariant, string> = {
  primary: "bg-[var(--a-accent)] text-white hover:bg-[var(--a-accent-hover)] border border-transparent",
  secondary: "bg-[var(--a-surface)] text-[var(--a-ink)] border border-[var(--a-border-strong)] hover:border-[var(--a-ink)]/30 hover:bg-[var(--a-surface-2)]",
  ghost: "bg-transparent text-[var(--a-text-2)] border border-transparent hover:bg-[var(--a-surface-2)] hover:text-[var(--a-ink)]",
  danger: "bg-[rgba(224,90,58,0.1)] text-[var(--a-accent-hover)] border border-[rgba(224,90,58,0.4)] hover:bg-[rgba(224,90,58,0.16)]",
  success: "bg-[var(--a-green)] text-white border border-transparent hover:brightness-95",
};

export const AdminButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: AdminButtonVariant; size?: "sm" | "md" }
>(function AdminButton({ variant = "secondary", size = "md", className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] font-heading text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3" : "h-[38px] px-4",
        VARIANT_STYLE[variant],
        className,
      )}
      style={{ fontFamily: "var(--a-font-display)" }}
      {...props}
    >
      {children}
    </button>
  );
});
