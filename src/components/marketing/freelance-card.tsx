import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { METIERS } from "@/config/metiers";
import type { FreelanceDemo } from "@/data/freelances-demo";
import { cn } from "@/lib/utils";

export function FreelanceCard({ freelance }: { freelance: FreelanceDemo }) {
  const metier = METIERS.find((m) => m.id === freelance.metier);

  return (
    <Link
      href={`/prestataires/${freelance.id}`}
      className="block overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        className={cn(
          "flex aspect-4/3 items-center justify-center bg-gradient-to-br text-4xl font-heading font-semibold text-foreground/70",
          freelance.gradient,
        )}
      >
        {freelance.prenom.charAt(0)}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-foreground">{freelance.prenom}</p>
          <Badge variant="secondary" className="gap-1 text-xs font-normal">
            <MapPin className="size-3" />
            Île de France
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{metier?.label}</p>
      </div>
    </Link>
  );
}
