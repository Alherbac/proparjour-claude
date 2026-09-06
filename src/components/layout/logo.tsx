import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo marketing/auth/onboarding — logo fourni + mot-symbole en
 * Instrument Serif (refonte 110790prodesign, Lot 0), remplace le
 * carré "P" précédent. `href` par défaut "/" (landing publique) ;
 * /client et /prestataire ont leur propre wordmark de sidebar,
 * n'utilisent pas ce composant. Calculé côté serveur, jamais un
 * second routage côté client après coup — pas de flash.
 */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
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
