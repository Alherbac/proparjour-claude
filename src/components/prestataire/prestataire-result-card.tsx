import Link from "next/link";
import { MapPin, BadgeCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { METIERS } from "@/config/metiers";
import type { PrestatairesPublicsRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { tarifJournalierAffiche } from "@/lib/tarif";

// Badges à largeur naturelle (comme la référence fournie) — pas
// étirés en pleine largeur, ils s'enroulent naturellement à 2 ou 3
// par ligne selon leur longueur. Le conteneur reste limité à 2
// lignes de hauteur (overflow-hidden) pour garder une hauteur de
// carte identique quel que soit le nombre de spécialités.
const MAX_SPECIALITES_AFFICHEES = 4;

export function PrestataireResultCard({
  prestataire,
  enMission = false,
}: {
  prestataire: PrestatairesPublicsRow;
  enMission?: boolean;
}) {
  const metier = METIERS.find((m) => m.id === prestataire.metier);
  const prenom = prestataire.prenom ?? "Prestataire";
  const total = prestataire.specialites.length;
  const visibles = total > MAX_SPECIALITES_AFFICHEES ? MAX_SPECIALITES_AFFICHEES - 1 : total;
  const specialitesAffichees = prestataire.specialites.slice(0, visibles);
  const specialitesRestantes = total - visibles;

  return (
    <Link
      href={`/prestataires/${prestataire.id}`}
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative">
        {prestataire.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet, cf. next.config.ts sans remotePatterns
          <img
            src={prestataire.photo_url}
            alt={prenom}
            className="aspect-4/3 w-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex aspect-4/3 items-center justify-center bg-gradient-to-br text-4xl font-heading font-semibold text-foreground/70",
              metier?.accent.gradient,
            )}
          >
            {prenom.charAt(0)}
          </div>
        )}

        {enMission ? (
          <Badge className="absolute left-2 top-2 gap-1 bg-amber-500 text-xs font-medium text-white hover:bg-amber-500">
            En mission
          </Badge>
        ) : (
          <Badge className="absolute left-2 top-2 gap-1 bg-emerald-500 text-xs font-medium text-white hover:bg-emerald-500">
            <span className="size-1.5 rounded-full bg-white" />
            Disponibilité confirmée
          </Badge>
        )}

        <span
          title="Profil vérifié"
          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm"
        >
          <BadgeCheck className="size-4" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className={cn("truncate text-sm font-semibold", metier?.accent.text ?? "text-primary")}>
          {prenom}
        </p>
        <p className="mt-1 line-clamp-2 min-h-[2.75rem] font-heading text-base font-bold leading-snug text-foreground">
          {prestataire.titre || metier?.label}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 font-medium text-foreground">
            <Wallet className="size-3.5" />
            {tarifJournalierAffiche(prestataire.tarif_montant, prestataire.tarif_type)} €/jour
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {prestataire.ville}
          </span>
        </div>
        <div className="mt-2 flex max-h-[3.25rem] min-h-[3.25rem] flex-wrap gap-1.5 overflow-hidden">
          {specialitesAffichees.map((specialite) => (
            <Badge
              key={specialite}
              className="max-w-[9rem] shrink-0 truncate px-2.5 border-blue-200 bg-blue-50 font-normal text-blue-700 hover:bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
            >
              <span className="truncate">{specialite}</span>
            </Badge>
          ))}
          {specialitesRestantes > 0 && (
            <Badge variant="secondary" className="shrink-0 px-2.5 font-normal">
              +{specialitesRestantes}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
