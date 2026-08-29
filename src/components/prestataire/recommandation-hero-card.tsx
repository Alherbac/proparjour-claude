import Link from "next/link";
import { MapPin, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { METIERS } from "@/config/metiers";
import { FavoriButton } from "@/components/prestataire/favori-button";
import { IconeCritere, classeTexteCritere } from "@/components/prestataire/critere-etat";
import { tarifJournalierAffiche } from "@/lib/tarif";
import { cn } from "@/lib/utils";
import type { Recommandation } from "@/lib/matching";

const NIVEAU_INFO: Record<Recommandation["niveau"], { label: string; classe: string }> = {
  excellent: { label: "Excellent match", classe: "bg-emerald-500 text-white" },
  bon: { label: "Bon match", classe: "bg-blue-500 text-white" },
  partiel: { label: "Correspondance partielle", classe: "bg-amber-500 text-white" },
};

export function RecommandationHeroCard({
  recommandation,
  enMission,
  lienProfil,
  selectionnable,
  selectionne,
  onBasculerSelection,
}: {
  recommandation: Recommandation;
  enMission: boolean;
  lienProfil: string;
  selectionnable?: boolean;
  selectionne?: boolean;
  onBasculerSelection?: () => void;
}) {
  const { prestataire, score, niveau, criteres, contraintesDetail } = recommandation;
  const metier = METIERS.find((m) => m.id === prestataire.metier);
  const prenom = prestataire.prenom ?? "Prestataire";
  const info = NIVEAU_INFO[niveau];

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-primary/30 bg-background shadow-md">
      <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
        <div className="relative">
          {prestataire.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet, cf. next.config.ts sans remotePatterns
            <img
              src={prestataire.photo_url}
              alt={prenom}
              className="h-48 w-full object-cover sm:h-full"
            />
          ) : (
            <div
              className={cn(
                "flex h-48 w-full items-center justify-center bg-gradient-to-br text-5xl font-heading font-semibold text-foreground/70 sm:h-full",
                metier?.accent.gradient,
              )}
            >
              {prenom.charAt(0)}
            </div>
          )}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-950 shadow-sm">
            <Sparkles className="size-3.5" />
            Meilleur match
          </span>
          <FavoriButton prestataireId={prestataire.id} className="absolute right-3 top-3" />
        </div>

        <div className="flex flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-heading text-xl font-semibold text-foreground">{prenom}</p>
              <p className="text-sm text-muted-foreground">{prestataire.titre || metier?.label}</p>
            </div>
            <span className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold", info.classe)}>
              {score}% — {info.label}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Wallet className="size-3.5" />
              {tarifJournalierAffiche(prestataire.tarif_montant, prestataire.tarif_type)} €/jour
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {prestataire.ville}
            </span>
            {enMission && <span className="text-amber-600 dark:text-amber-400">En mission actuellement</span>}
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {criteres.map((critere) => (
              <li key={critere.cle} className={cn("flex items-center gap-1.5 text-sm text-foreground", classeTexteCritere(critere.etat))}>
                <IconeCritere
                  etat={critere.etat}
                  className={cn(
                    "size-4 shrink-0",
                    critere.etat === "correspond" && "text-emerald-600 dark:text-emerald-400",
                    critere.etat === "ne_correspond_pas" && "text-muted-foreground/50",
                    critere.etat === "non_renseigne" && "text-muted-foreground/40",
                  )}
                />
                {critere.label}
              </li>
            ))}
          </ul>

          {/* Lot F §12/§14 — "Pourquoi ce profil ?" : le détail par
              contrainte, jamais une coche parce qu'un champ existe
              quelque part — un ○ reste un ○ tant que rien ne permet de
              trancher, jamais confondu avec un ✗ (cahier §15). */}
          {contraintesDetail.length > 0 && (
            <div className="mt-4 rounded-2xl bg-secondary/40 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pourquoi ce profil&nbsp;?</p>
              <ul className="mt-1.5 space-y-1">
                {contraintesDetail.map((d) => (
                  <li key={d.label} className="flex items-center gap-1.5 text-sm text-foreground">
                    <IconeCritere
                      etat={d.etat}
                      className={cn(
                        "size-3.5 shrink-0",
                        d.etat === "correspond" && "text-emerald-600 dark:text-emerald-400",
                        d.etat === "non_renseigne" && "text-muted-foreground/50",
                        d.etat === "ne_correspond_pas" && "text-muted-foreground/60",
                      )}
                    />
                    <span className={d.etat === "non_renseigne" ? "text-muted-foreground" : ""}>
                      {d.label}
                      {d.etat === "non_renseigne" && " — non renseigné"}
                      {d.niveau === "prefere" && d.etat === "correspond" && " (souhaité)"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button render={<Link href={lienProfil} />} className="rounded-full">
              Proposer une mission
            </Button>
            <Button render={<Link href={`/prestataires/${prestataire.id}`} />} variant="outline" className="rounded-full">
              Voir le profil
            </Button>
            {selectionnable && (
              <label className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
                <Checkbox checked={selectionne} onCheckedChange={() => onBasculerSelection?.()} />
                Comparer
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
