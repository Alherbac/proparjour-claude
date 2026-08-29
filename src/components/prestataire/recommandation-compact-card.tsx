import Link from "next/link";
import { MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { METIERS } from "@/config/metiers";
import { FavoriButton } from "@/components/prestataire/favori-button";
import { tarifJournalierAffiche } from "@/lib/tarif";
import { cn } from "@/lib/utils";
import type { Recommandation } from "@/lib/matching";

const NIVEAU_INFO: Record<Recommandation["niveau"], { label: string; classe: string }> = {
  excellent: { label: "Excellent match", classe: "bg-emerald-500 text-white" },
  bon: { label: "Bon match", classe: "bg-blue-500 text-white" },
  partiel: { label: "Correspondance partielle", classe: "bg-amber-500 text-white" },
};

export function RecommandationCompactCard({
  recommandation,
  lienProfil,
  selectionnable,
  selectionne,
  onBasculerSelection,
}: {
  recommandation: Recommandation;
  lienProfil: string;
  selectionnable?: boolean;
  selectionne?: boolean;
  onBasculerSelection?: () => void;
}) {
  const { prestataire, score, niveau, criteres } = recommandation;
  const metier = METIERS.find((m) => m.id === prestataire.metier);
  const prenom = prestataire.prenom ?? "Prestataire";
  const info = NIVEAU_INFO[niveau];
  const raisons = criteres.filter((c) => c.etat === "correspond").slice(0, 3);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 shadow-sm sm:flex-row sm:items-center">
      <Link href={`/prestataires/${prestataire.id}`} className="relative shrink-0">
        {prestataire.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet, cf. next.config.ts sans remotePatterns
          <img src={prestataire.photo_url} alt={prenom} className="size-16 rounded-xl object-cover" />
        ) : (
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-xl bg-gradient-to-br text-xl font-heading font-semibold text-foreground/70",
              metier?.accent.gradient,
            )}
          >
            {prenom.charAt(0)}
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{prenom}</p>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", info.classe)}>
            {score}%
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{prestataire.titre || metier?.label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Wallet className="size-3" />
            {tarifJournalierAffiche(prestataire.tarif_montant, prestataire.tarif_type)} €/jour
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {prestataire.ville}
          </span>
        </div>
        {raisons.length > 0 && (
          <p className="mt-1 truncate text-xs text-emerald-700 dark:text-emerald-400">
            {raisons.map((r) => r.label).join(" · ")}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {selectionnable && (
          <Checkbox
            checked={selectionne}
            onCheckedChange={() => onBasculerSelection?.()}
            aria-label={`Comparer ${prenom}`}
          />
        )}
        <FavoriButton prestataireId={prestataire.id} className="static bg-transparent shadow-none" />
        <Button render={<Link href={lienProfil} />} size="sm" variant="outline" className="rounded-full">
          Proposer
        </Button>
      </div>
    </div>
  );
}
