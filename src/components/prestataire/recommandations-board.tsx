"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { METIERS, type MetierId } from "@/config/metiers";
import { RecommandationHeroCard } from "@/components/prestataire/recommandation-hero-card";
import { RecommandationCompactCard } from "@/components/prestataire/recommandation-compact-card";
import { ComparaisonModal } from "@/components/prestataire/comparaison-modal";
import type { Recommandation, ResultatMatching } from "@/lib/matching";

const MAX_AFFICHES = 5;
const MAX_COMPARAISON = 3;

export type GroupeRecommandation = {
  metier: MetierId;
  quantite: number;
  heureDebut: string;
  heureFin: string;
  // Lot F — propres à ce sous-besoin (Lots B/C/D), transmis à
  // "Proposer une mission" pour que la fiche profil recalcule
  // EXACTEMENT le même score, jamais une seconde estimation (cahier §19).
  contraintes?: { label: string; niveau: "requis" | "prefere" }[];
  contexte?: string | null;
  resultat: ResultatMatching;
};

type BesoinContexte = {
  ville: string;
  date: string;
};

function lienProposer(
  prestataireId: string,
  besoin: BesoinContexte,
  heureDebut: string,
  heureFin: string,
  contraintes?: { label: string; niveau: "requis" | "prefere" }[],
  contexte?: string | null,
) {
  const params = new URLSearchParams({
    date: besoin.date,
    ville: besoin.ville,
    heureDebut,
    heureFin,
  });
  if (contraintes && contraintes.length > 0) params.set("contraintes", JSON.stringify(contraintes));
  if (contexte) params.set("contexte", contexte);
  return `/prestataires/${prestataireId}?${params.toString()}#proposer`;
}

function Section({
  groupe,
  besoin,
  enMissionIds,
  selection,
  onBasculerSelection,
}: {
  groupe: GroupeRecommandation;
  besoin: BesoinContexte;
  enMissionIds: Set<string>;
  selection: Set<string>;
  onBasculerSelection: (recommandation: Recommandation) => void;
}) {
  const metier = METIERS.find((m) => m.id === groupe.metier);
  const { recommandations, suffisant } = groupe.resultat;
  const affiches = recommandations.slice(0, MAX_AFFICHES);
  const bons = recommandations.filter((r) => r.niveau !== "partiel").length;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {metier?.filiere} — {groupe.quantite} poste{groupe.quantite > 1 ? "s" : ""}
        </h2>
        <span className="text-sm text-muted-foreground">
          {besoin.date} · {groupe.heureDebut}–{groupe.heureFin}
        </span>
      </div>

      {affiches.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          Aucun professionnel de ce métier n&apos;est encore inscrit sur ProParJour pour l&apos;instant.
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {suffisant
              ? `Nous avons trouvé ${bons} professionnel${bons > 1 ? "s" : ""} qui correspond${bons > 1 ? "ent" : ""} bien à votre besoin.`
              : `Nous n'avons pas encore de profil qui coche tous les critères pour ce besoin — voici ${affiches.length === 1 ? "le plus proche" : `les ${affiches.length} plus proches`}.`}
          </p>

          <div className="mt-4">
            <RecommandationHeroCard
              recommandation={affiches[0]}
              enMission={enMissionIds.has(affiches[0].prestataire.id)}
              lienProfil={lienProposer(affiches[0].prestataire.id, besoin, groupe.heureDebut, groupe.heureFin, groupe.contraintes, groupe.contexte)}
              selectionnable
              selectionne={selection.has(affiches[0].prestataire.id)}
              onBasculerSelection={() => onBasculerSelection(affiches[0])}
            />
          </div>

          {affiches.length > 1 && (
            <div className="mt-4 space-y-3">
              {affiches.slice(1).map((r) => (
                <RecommandationCompactCard
                  key={r.prestataire.id}
                  recommandation={r}
                  lienProfil={lienProposer(r.prestataire.id, besoin, groupe.heureDebut, groupe.heureFin, groupe.contraintes, groupe.contexte)}
                  selectionnable
                  selectionne={selection.has(r.prestataire.id)}
                  onBasculerSelection={() => onBasculerSelection(r)}
                />
              ))}
            </div>
          )}

          {!suffisant && (
            <Link
              href={`/prestataires?metier=${groupe.metier}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Élargir ma recherche
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </>
      )}
    </section>
  );
}

export function RecommandationsBoard({
  groupes,
  besoin,
  enMissionIds,
}: {
  groupes: GroupeRecommandation[];
  besoin: BesoinContexte;
  enMissionIds: string[];
}) {
  const [selection, setSelection] = useState<Recommandation[]>([]);
  const [comparaisonOuverte, setComparaisonOuverte] = useState(false);
  const enMissionSet = new Set(enMissionIds);

  function basculerSelection(recommandation: Recommandation) {
    setSelection((prev) => {
      const deja = prev.some((r) => r.prestataire.id === recommandation.prestataire.id);
      if (deja) return prev.filter((r) => r.prestataire.id !== recommandation.prestataire.id);
      if (prev.length >= MAX_COMPARAISON) return prev;
      return [...prev, recommandation];
    });
  }

  return (
    <div>
      {groupes.map((groupe) => (
        <Section
          key={groupe.metier}
          groupe={groupe}
          besoin={besoin}
          enMissionIds={enMissionSet}
          selection={new Set(selection.map((r) => r.prestataire.id))}
          onBasculerSelection={basculerSelection}
        />
      ))}

      {selection.length > 0 && (
        // Audit final — la bannière de cookies (CookieConsentBanner) est
        // elle aussi "fixed inset-x-0 bottom-0", avec un z-index de 100 :
        // à z-40/bottom-4, ce bandeau se retrouvait entièrement caché
        // derrière elle tant que le visiteur n'avait pas encore répondu
        // au bandeau de cookies — le clic sur "Comparer" n'avait alors
        // aucun effet visible, sans aucune erreur (trouvé en testant
        // réellement un premier passage sur le site, cookies non répondus).
        // z-[110] > 100 : reste cliquable même si CookieConsentBanner est
        // ouvert en mode "Personnaliser" (sa hauteur maximale) ; bottom-24
        // au lieu de bottom-4 pour éviter tout chevauchement visuel dans
        // le cas courant (bandeau de cookies non étendu).
        <div className="fixed inset-x-0 bottom-24 z-[110] flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2.5 shadow-lg">
            <span className="text-sm font-medium text-foreground">
              {selection.length} profil{selection.length > 1 ? "s" : ""} sélectionné{selection.length > 1 ? "s" : ""}
            </span>
            <Button size="sm" className="rounded-full" onClick={() => setComparaisonOuverte(true)}>
              <Scale className="size-3.5" />
              Comparer
            </Button>
            <button
              type="button"
              aria-label="Vider la sélection"
              onClick={() => setSelection([])}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <ComparaisonModal open={comparaisonOuverte} onOpenChange={setComparaisonOuverte} selection={selection} />
    </div>
  );
}
