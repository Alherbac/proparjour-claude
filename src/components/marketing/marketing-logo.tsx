import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Wordmark du chrome marketing (Header/Footer) — logo fourni
 * (refonte 110790prodesign, Lot 0) + mot-symbole en Instrument
 * Serif, distinct du <Logo/> partagé (carré "P" rouge) utilisé dans
 * le dashboard/admin.
 */
export function MarketingLogo({
  tone = "dark",
  height = 26,
  className,
}: {
  tone?: "dark" | "light";
  height?: number;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "flex shrink-0 items-center gap-[9px] font-display-serif text-[23px] leading-none tracking-tight",
        tone === "light" ? "text-white" : "text-ppj-ink",
        className,
      )}
    >
      <Image
        src="/proparjour-logo.png"
        alt="ProParJour"
        width={112}
        height={96}
        style={{ height, width: "auto" }}
        className="object-contain"
        priority
      />
      ProParJour
    </Link>
  );
}
