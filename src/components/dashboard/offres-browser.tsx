"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Briefcase, Send, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { METIERS, type MetierId } from "@/config/metiers";
import { postulerOffre } from "@/app/actions/offres";
import { type JourneeMission, montantTotalJournees } from "@/lib/journees";
import { dateCourteFr } from "@/lib/date-fr";
import { cn } from "@/lib/utils";
import type { OffresRow } from "@/lib/supabase/database.types";

const STATUT_CANDIDATURE_LABEL: Record<string, string> = {
  en_attente: "Candidature envoyée",
  en_discussion: "Retenue — en discussion",
  acceptee: "Candidature acceptée",
  refusee: "Candidature refusée",
};

function publieeDepuis(iso: string): string {
  const heures = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));
  if (heures < 1) return "à l'instant";
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  return jours === 1 ? "hier" : `il y a ${jours} j`;
}

function OffreCard({
  offre,
  journees,
  statutCandidature,
  postulable,
}: {
  offre: OffresRow;
  /** Mission multi-jours (migration 0062) — journées réelles ; repli sur l'unique journée de l'offre si vide. */
  journees: JourneeMission[];
  statutCandidature: string | undefined;
  postulable: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [statut, setStatut] = useState(statutCandidature);
  const metier = METIERS.find((m) => m.id === offre.metier);
  const journeesEffectives =
    journees.length > 0 ? journees : [{ date: offre.date_mission, heureDebut: offre.heure_debut.slice(0, 5), heureFin: offre.heure_fin.slice(0, 5) }];
  const plusieursJournees = journeesEffectives.length > 1;
  const total = montantTotalJournees(journeesEffectives.map((j) => ({ ...j, tarifHoraire: offre.tarif_horaire })));

  function postuler() {
    startTransition(async () => {
      const result = await postulerOffre(offre.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setStatut("en_attente");
      toast.success("Votre candidature a été envoyée.");
    });
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-background p-[18px] transition-colors hover:border-foreground/30">
      <div className="flex flex-wrap items-center gap-2.5">
        {postulable ? (
          <Link href={`/prestataire/opportunites/${offre.id}`} className="text-[15.5px] font-semibold text-foreground hover:underline">
            {offre.titre}
          </Link>
        ) : (
          <span className="text-[15.5px] font-semibold text-foreground">{offre.titre}</span>
        )}
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{publieeDepuis(offre.created_at)}</span>
      </div>

      <p className="text-[13.5px] text-muted-foreground">
        {metier?.filiere} · {offre.ville} ·{" "}
        {plusieursJournees
          ? `${journeesEffectives.length} journées, du ${dateCourteFr(journeesEffectives[0].date)} au ${dateCourteFr(journeesEffectives[journeesEffectives.length - 1].date)}`
          : `${dateCourteFr(journeesEffectives[0].date)} · ${journeesEffectives[0].heureDebut}–${journeesEffectives[0].heureFin}`}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11.5px] text-foreground/80">
          {total} € au total
        </span>
        <span className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11.5px] text-foreground/80">
          {offre.tarif_horaire} € / heure
        </span>
      </div>

      <div className="flex-1" />

      {postulable &&
        (statut ? (
          <Badge variant="secondary" className="w-fit font-normal">
            {STATUT_CANDIDATURE_LABEL[statut]}
          </Badge>
        ) : (
          <Button type="button" className="w-full rounded-xl" disabled={isPending} onClick={postuler}>
            <Send className="size-3.5" />
            Candidater
          </Button>
        ))}
    </div>
  );
}

function correspond(offre: OffresRow, recherche: string): boolean {
  const q = recherche.trim().toLowerCase();
  if (!q) return true;
  return (
    offre.ville.toLowerCase().includes(q) ||
    offre.titre.toLowerCase().includes(q) ||
    offre.description.toLowerCase().includes(q)
  );
}

export function OffresBrowser({
  offres,
  journeesParOffre = {},
  candidaturesParOffre = {},
  metierDefaut,
  postulable,
  titre = "Offres de mission",
  sousTitre,
}: {
  offres: OffresRow[];
  /** Mission multi-jours (migration 0062) — journées réelles par offre_id ; repli sur l'unique journée de l'offre quand absente. */
  journeesParOffre?: Record<string, JourneeMission[]>;
  candidaturesParOffre?: Record<string, string>;
  metierDefaut?: MetierId;
  postulable: boolean;
  titre?: string;
  sousTitre?: string;
}) {
  const [filtre, setFiltre] = useState<"mon-metier" | "tous">(metierDefaut ? "mon-metier" : "tous");
  const [recherche, setRecherche] = useState("");

  const resultats = useMemo(() => {
    return offres.filter((offre) => {
      if (filtre === "mon-metier" && metierDefaut && offre.metier !== metierDefaut) return false;
      return correspond(offre, recherche);
    });
  }, [offres, filtre, metierDefaut, recherche]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display-serif text-2xl text-foreground">{titre}</h2>
          {sousTitre && <p className="mt-1 text-sm text-muted-foreground">{sousTitre}</p>}
        </div>

        {metierDefaut && (
          <div className="flex gap-1.5 rounded-full border border-border bg-secondary/30 p-1">
            <button
              type="button"
              onClick={() => setFiltre("mon-metier")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                filtre === "mon-metier"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Mon métier
            </button>
            <button
              type="button"
              onClick={() => setFiltre("tous")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                filtre === "tous"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Tous les métiers
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-full border border-border bg-background px-4 py-2.5 shadow-sm">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Ville, mot-clé de spécialité..."
          className="border-0 p-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {resultats.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 py-10 text-center">
          <Briefcase className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            {offres.length === 0
              ? "Aucune offre publiée pour l'instant."
              : "Aucune offre ne correspond à ces critères."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid items-stretch gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))" }}>
          {resultats.map((offre) => (
            <OffreCard
              key={offre.id}
              offre={offre}
              journees={journeesParOffre[offre.id] ?? []}
              statutCandidature={candidaturesParOffre[offre.id]}
              postulable={postulable}
            />
          ))}
        </div>
      )}
    </div>
  );
}
