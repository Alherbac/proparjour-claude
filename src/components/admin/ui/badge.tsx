import { cn } from "@/lib/utils";

/**
 * Badge admin — trois valeurs cohérentes (fond translucide, bordure
 * translucide plus dense, texte foncé), jamais de fond plein (§2).
 * Code couleur documentaire fixe (§2) : vert = validé, orange = en
 * attente/expire bientôt, rouge = expiré/refusé/gelé, gris = non
 * fourni, bleu = information neutre, violet = cas particulier, or =
 * mise en avant (crédibilité, taux individuel).
 */
export type AdminBadgeTone = "green" | "orange" | "red" | "blue" | "violet" | "gold" | "grey";

const TONE_STYLE: Record<AdminBadgeTone, string> = {
  green: "bg-[var(--a-badge-green-bg)] border-[var(--a-badge-green-border)] text-[var(--a-badge-green-text)]",
  orange: "bg-[var(--a-badge-orange-bg)] border-[var(--a-badge-orange-border)] text-[var(--a-badge-orange-text)]",
  red: "bg-[var(--a-badge-red-bg)] border-[var(--a-badge-red-border)] text-[var(--a-badge-red-text)]",
  blue: "bg-[var(--a-badge-blue-bg)] border-[var(--a-badge-blue-border)] text-[var(--a-badge-blue-text)]",
  violet: "bg-[var(--a-badge-violet-bg)] border-[var(--a-badge-violet-border)] text-[var(--a-badge-violet-text)]",
  gold: "bg-[var(--a-badge-gold-bg)] border-[var(--a-badge-gold-border)] text-[var(--a-badge-gold-text)]",
  grey: "bg-[var(--a-badge-grey-bg)] border-[var(--a-badge-grey-border)] text-[var(--a-badge-grey-text)]",
};

export function AdminBadge({
  tone,
  children,
  className,
}: {
  tone: AdminBadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-[9px] py-[4px] text-[11px] font-bold",
        TONE_STYLE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
