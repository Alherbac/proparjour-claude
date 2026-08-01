import Link from "next/link";
import { ShieldCheck, UserRound, ShoppingBag } from "lucide-react";
import { METIERS } from "@/config/metiers";
import { cn } from "@/lib/utils";

const FILIERE_ICONS = {
  securite: ShieldCheck,
  accueil: UserRound,
  vente: ShoppingBag,
} as const;

export function FiliereBadges({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {METIERS.map((metier) => {
        const Icon = FILIERE_ICONS[metier.id];
        return (
          <Link
            key={metier.id}
            href={`/prestataires?metier=${metier.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
          >
            <Icon className="size-3.5 text-primary" />
            {metier.filiere}
          </Link>
        );
      })}
    </div>
  );
}
