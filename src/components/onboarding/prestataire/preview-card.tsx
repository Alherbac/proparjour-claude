import { MapPin, Euro } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { METIERS } from "@/config/metiers";
import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";

export function PreviewCard({
  values,
  photoPreviewUrl,
}: {
  values: Partial<PrestataireFormValues>;
  photoPreviewUrl: string | null;
}) {
  const metier = METIERS.find((m) => m.id === values.metier);
  const initiale = values.prenom?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex aspect-4/3 items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
        {photoPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not an optimizable remote asset
          <img
            src={photoPreviewUrl}
            alt="Aperçu de la photo de profil"
            className="size-full object-cover"
          />
        ) : (
          <span className="font-heading text-4xl font-semibold text-foreground/60">
            {initiale}
          </span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-foreground">
            {values.prenom || "Votre prénom"}
          </p>
          <Badge variant="secondary" className="gap-1 text-xs font-normal">
            <MapPin className="size-3" />
            {values.ville || "Île de France"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {metier?.label ?? "Métier à choisir"}
        </p>
        {values.tarifMontant ? (
          <p className="flex items-center gap-1 text-sm font-medium text-primary">
            <Euro className="size-3.5" />
            {values.tarifMontant} €{" "}
            {values.tarifType === "horaire" ? "/ heure" : "/ jour"}
          </p>
        ) : null}
      </div>
      <p className="border-t border-border px-4 py-2 text-center text-[11px] text-muted-foreground">
        Aperçu de votre future fiche
      </p>
    </div>
  );
}
