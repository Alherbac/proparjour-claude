"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/app/client/_components/badge";
import { DashButton } from "@/app/client/_components/button";
import { dateCourteFr, referenceMissionClient, BADGE_STATUT_OFFRE } from "@/app/client/_lib";
import { LABEL_METIER, type OffreAvecCandidatures } from "@/app/client/_types";
import { cloturerOffre } from "@/app/actions/offres";

/**
 * Carte d'une offre encore en recherche de candidat (statut "publiee")
 * — affichée uniquement sous l'onglet "Toutes" de /client/missions,
 * jamais transformée en mission (voir offresEnRecherche, _types.ts).
 * retenirCandidature bascule l'offre en "pourvue" dès qu'un candidat
 * est retenu, donc une offre "publiee" a toujours 0 poste pourvu / 1
 * poste à pourvoir — pas besoin de compter les candidatures ici.
 */
export function CarteOffre({ offre }: { offre: OffreAvecCandidatures }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, startTransition] = useTransition();

  function retirer() {
    startTransition(async () => {
      const res = await cloturerOffre(offre.id);
      if (!res.success) {
        toast.error(res.error);
        setConfirmation(false);
        return;
      }
      toast.success("Offre retirée.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14.5px] font-semibold text-[#1A1917]">{offre.titre}</p>
          <Badge tone={BADGE_STATUT_OFFRE[offre.statut].tone}>{BADGE_STATUT_OFFRE[offre.statut].label}</Badge>
        </div>
        <p className="mt-0.5 text-[12.5px] text-[#6B6660]">
          {/* Mission multi-jours (migration 0062) — repli sur l'unique
              journée de l'offre quand offres_journees est vide. */}
          {referenceMissionClient(offre)} · {LABEL_METIER[offre.metier]} ·{" "}
          {offre.journees.length > 1
            ? `${offre.journees.length} journées, du ${dateCourteFr(offre.journees[0].date)} au ${dateCourteFr(offre.journees[offre.journees.length - 1].date)}`
            : `${dateCourteFr(offre.journees[0]?.date ?? offre.date_mission)} · ${offre.journees[0]?.heureDebut ?? offre.heure_debut.slice(0, 5)}–${offre.journees[0]?.heureFin ?? offre.heure_fin.slice(0, 5)}`}{" "}
          · {offre.ville}
        </p>
        <p className="mt-1 text-[12.5px] text-[#6B6660]">0/1 poste pourvu</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link href="/client/candidatures">
          <DashButton variant="plein">Voir les candidatures</DashButton>
        </Link>
        <Link href={`/client/missions/offres/${offre.id}/modifier`}>
          <DashButton variant="secondaire">Modifier l&apos;offre</DashButton>
        </Link>
        {confirmation ? (
          <DashButton
            variant="secondaire"
            disabled={enCours}
            onClick={retirer}
            className="border-[#8E2A26] text-[#8E2A26] hover:border-[#8E2A26]"
          >
            {enCours ? "Retrait..." : "Confirmer le retrait"}
          </DashButton>
        ) : (
          <DashButton variant="secondaire" onClick={() => setConfirmation(true)}>
            Retirer l&apos;offre
          </DashButton>
        )}
      </div>
    </div>
  );
}
