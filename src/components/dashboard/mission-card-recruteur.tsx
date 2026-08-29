"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, MessageCircle, FileDown, ChevronDown, RotateCcw } from "lucide-react";
import { AnnulerMissionButton } from "@/components/missions/annuler-mission-button";
import { ConfirmerOuContester } from "@/components/missions/confirmer-ou-contester";
import { cn } from "@/lib/utils";
import type { MissionAvecLignes } from "@/lib/missions";

const STATUTS_ANNULABLES = ["en_attente", "confirmee"];
const STATUTS_FACTURABLES = ["sequestre", "libere"];
const STATUTS_CLOTURABLES = ["confirmee", "en_cours"];
const STATUTS_REFAISABLES = ["terminee", "litige"];

const STATUT_BADGE: Record<string, { label: string; style: string }> = {
  en_attente: { label: "🟠 En attente de confirmation", style: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  confirmee: { label: "🟢 Confirmée", style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  en_cours: { label: "🟢 En cours", style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  terminee: { label: "✅ Terminée", style: "bg-secondary text-secondary-foreground" },
  annulee: { label: "🔴 Annulée", style: "bg-destructive/10 text-destructive" },
  litige: { label: "⚠️ Litige", style: "bg-destructive/10 text-destructive" },
};

const LIGNE_STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente du prestataire",
  acceptee: "Confirmée par le prestataire",
  refusee: "Refusée par le prestataire",
  // Jamais répondue : passée 'refusee' automatiquement au paiement une
  // fois un(e) autre prestataire accepté(e) (migration 0040/0041) —
  // "Refusée par le prestataire" serait faux ici, il/elle n'a rien
  // refusé, la mission était déjà pourvue avant sa réponse.
  nonRetenue: "Non retenu(e) (mission déjà pourvue)",
};

export function MissionCardRecruteur({
  mission,
  messagesNonLus = 0,
}: {
  mission: MissionAvecLignes;
  messagesNonLus?: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const badge = STATUT_BADGE[mission.statut];

  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarDays className="size-4 text-muted-foreground" />
          {mission.date_mission}
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-medium", badge.style)}>{badge.label}</span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="size-4" />
        {mission.lieu}
      </div>

      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="mt-3 flex w-full items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm font-medium text-foreground"
      >
        {mission.lignes.length} prestataire{mission.lignes.length > 1 ? "s" : ""} · {mission.montant_total} €
        <ChevronDown className={cn("size-4 transition-transform", ouvert && "rotate-180")} />
      </button>

      {ouvert && (
        <ul className="mt-2 space-y-2">
          {mission.lignes.map((ligne) => (
            <li key={ligne.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {ligne.prenom} {ligne.nom}
                </span>
                <span className="text-muted-foreground">{ligne.tarif_applique} €</span>
              </div>
              <div className="mt-0.5 text-muted-foreground">
                {ligne.heure_debut}–{ligne.heure_fin}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {ligne.statut_acceptation === "refusee" && ligne.refus_automatique
                  ? LIGNE_STATUT_LABELS.nonRetenue
                  : LIGNE_STATUT_LABELS[ligne.statut_acceptation]}
              </div>
            </li>
          ))}
        </ul>
      )}

      {mission.statut === "litige" && mission.motif_litige && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {mission.motif_litige}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-4">
          <Link
            href={`/missions/${mission.id}`}
            className="relative inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <MessageCircle className="size-3.5" />
            Message
            {messagesNonLus > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {messagesNonLus > 9 ? "9+" : messagesNonLus}
              </span>
            )}
          </Link>
          {mission.paiement && STATUTS_FACTURABLES.includes(mission.paiement.statut) && (
            <Link
              href={`/api/factures/${mission.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <FileDown className="size-3.5" />
              Facture
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          {STATUTS_REFAISABLES.includes(mission.statut) && mission.lignes.some((l) => l.statut_acceptation === "acceptee") && (
            <Link
              href={`/tableau-de-bord/missions/${mission.id}/refaire`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <RotateCcw className="size-3.5" />
              Refaire
            </Link>
          )}
          {STATUTS_ANNULABLES.includes(mission.statut) && <AnnulerMissionButton missionId={mission.id} />}
        </div>
      </div>

      {STATUTS_CLOTURABLES.includes(mission.statut) && (
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <ConfirmerOuContester missionId={mission.id} />
        </div>
      )}
    </div>
  );
}
