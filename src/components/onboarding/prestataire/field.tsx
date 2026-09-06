import type { ReactNode } from "react";

/**
 * Libellé + champ + aide, stylés selon PROMPT-INSCRIPTION.txt §3 —
 * propre à cette refonte (voir ville-input.tsx pour la même remarque
 * de périmètre : components/onboarding/form-field.tsx reste utilisé
 * tel quel par l'inscription recruteur et la connexion, hors
 * périmètre de ce chantier).
 */
export function Field({
  label,
  badge,
  hint,
  children,
}: {
  label: string;
  badge?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold tracking-[0.05em] text-[#6B6660] uppercase">{label}</span>
        {badge && (
          <span className="rounded-full border border-[#EAE6E0] bg-[#F6F4F0] px-2 py-[3px] text-[10.5px] font-bold text-[#6B6660]">
            {badge}
          </span>
        )}
      </span>
      {children}
      {hint && <span className="text-[12px] leading-[1.55] text-[#6B6660]">{hint}</span>}
    </label>
  );
}

export function inputClasses(hasError?: boolean) {
  return `w-full box-border rounded-xl border bg-[#FCFBF9] px-[14px] py-[13px] font-sans text-[15px] text-[#1A1917] outline-none transition-colors focus:border-[#E21D1B] focus:bg-white placeholder:text-[#98938B] ${
    hasError ? "border-[#E21D1B]" : "border-[#E6E2DC]"
  }`;
}

export function Pill({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 font-sans text-[13px] font-medium transition-colors ${
        selected
          ? "border-[#1A1917] bg-[#1A1917] text-[#FBFAF8]"
          : disabled
            ? "cursor-not-allowed border-[#EAE6E0] text-[#C4BEB6]"
            : "cursor-pointer border-[#EAE6E0] text-[#1A1917] hover:border-[#DDD8D1]"
      }`}
    >
      {label}
    </button>
  );
}
