import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Wordmark spécifique au chrome marketing (Header/Footer) — reprend
 * .logo/.dot de proparjour-landing-v2.html telles quelles (point doré +
 * texte plein, sans mise en couleur partielle), distinct du <Logo/>
 * partagé (carré "P" rouge) utilisé dans le dashboard/admin.
 */
export function MarketingLogo({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "flex shrink-0 items-center gap-[9px] font-display text-[18.5px] font-bold",
        tone === "light" ? "text-white" : "text-ink",
        className,
      )}
    >
      <span className="size-2 rounded-full bg-gold" />
      ProParJour
    </Link>
  );
}
