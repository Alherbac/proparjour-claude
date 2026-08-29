import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo du dashboard/admin (sidebar) — logo fourni + mot-symbole en
 * Instrument Serif (refonte 110790prodesign, Lot 0), remplace le
 * carré "P" précédent.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-[9px] shrink-0 font-display-serif text-xl leading-none tracking-tight text-foreground",
        className,
      )}
    >
      <Image
        src="/proparjour-logo.png"
        alt="ProParJour"
        width={112}
        height={96}
        style={{ height: 24, width: "auto" }}
        className="object-contain"
      />
      ProParJour
    </Link>
  );
}
