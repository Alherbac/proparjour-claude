import { cn } from "@/lib/utils";

/**
 * Carte KPI — piège anti-régression (b) du prompt : la valeur seule
 * sur sa ligne en `white-space: nowrap`, puis une seconde ligne avec
 * le delta (`flex: none`, nowrap) et le libellé d'aide (`min-width:
 * 0`, ellipsis). Ne JAMAIS mettre valeur + delta côte à côte sur la
 * même ligne — "298 400 €" et "+16 %" se coupent en deux sinon.
 */
export function AdminKpiCard({
  label,
  valeur,
  delta,
  deltaTone = "neutral",
  aide,
  size = "md",
}: {
  label: string;
  valeur: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  aide?: string;
  size?: "md" | "lg";
}) {
  return (
    <div className="rounded-[15px] border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
      <p
        className="text-[11px] font-semibold tracking-[0.08em] text-[var(--a-text-2)] uppercase"
        style={{ fontFamily: "var(--a-font-display)" }}
      >
        {label}
      </p>
      <p
        className={cn(
          "a-tabular mt-1.5 whitespace-nowrap font-extrabold tracking-[-0.02em] text-[var(--a-ink)]",
          size === "lg" ? "text-[27px]" : "text-[23px]",
        )}
        style={{ fontFamily: "var(--a-font-display)" }}
      >
        {valeur}
      </p>
      {(delta || aide) && (
        <div className="mt-1 flex items-baseline gap-1.5">
          {delta && (
            <span
              className={cn(
                "shrink-0 whitespace-nowrap text-[12px] font-bold",
                deltaTone === "up" && "text-[var(--a-badge-green-text)]",
                deltaTone === "down" && "text-[var(--a-badge-red-text)]",
                deltaTone === "neutral" && "text-[var(--a-text-2)]",
              )}
            >
              {delta}
            </span>
          )}
          {aide && <span className="min-w-0 truncate text-[12px] text-[var(--a-text-3)]">{aide}</span>}
        </div>
      )}
    </div>
  );
}
