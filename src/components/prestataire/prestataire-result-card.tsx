import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { METIERS } from "@/config/metiers";
import type { PrestatairesPublicsRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export function PrestataireResultCard({
  prestataire,
}: {
  prestataire: PrestatairesPublicsRow;
}) {
  const metier = METIERS.find((m) => m.id === prestataire.metier);
  const prenom = prestataire.prenom ?? "Prestataire";

  return (
    <Link
      href={`/prestataires/${prestataire.id}`}
      className="block overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        className={cn(
          "flex aspect-4/3 items-center justify-center bg-gradient-to-br text-4xl font-heading font-semibold text-foreground/70",
          metier?.accent.gradient,
        )}
      >
        {prenom.charAt(0)}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-foreground">{prenom}</p>
          <Badge variant="secondary" className="gap-1 text-xs font-normal">
            <MapPin className="size-3" />
            {prestataire.ville}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{metier?.label}</p>
        <p className="text-sm font-medium text-primary">
          {prestataire.tarif_montant} €{" "}
          {prestataire.tarif_type === "horaire" ? "/ heure" : "/ jour"}
        </p>
        {prestataire.specialites.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {prestataire.specialites.slice(0, 2).map((specialite) => (
              <Badge key={specialite} variant="secondary" className="font-normal">
                {specialite}
              </Badge>
            ))}
            {prestataire.specialites.length > 2 && (
              <Badge variant="secondary" className="font-normal">
                +{prestataire.specialites.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
