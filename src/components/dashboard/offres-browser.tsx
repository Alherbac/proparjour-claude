"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Briefcase, MapPin, CalendarDays, Euro, Send, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { METIERS, type MetierId } from "@/config/metiers";
import { postulerOffre } from "@/app/actions/offres";
import { montantMission } from "@/lib/duree";
import { cn } from "@/lib/utils";
import type { OffresRow } from "@/lib/supabase/database.types";

const STATUT_CANDIDATURE_LABEL: Record<string, string> = {
  en_attente: "Candidature envoyée",
  acceptee: "Candidature acceptée",
  refusee: "Candidature refusée",
};

function OffreCard({
  offre,
  statutCandidature,
  postulable,
}: {
  offre: OffresRow;
  statutCandidature: string | undefined;
  postulable: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [statut, setStatut] = useState(statutCandidature);
  const metier = METIERS.find((m) => m.id === offre.metier);
  const total = montantMission(offre.heure_debut, offre.heure_fin, offre.tarif_horaire);

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
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{offre.titre}</p>
          <p className="text-sm text-muted-foreground">{metier?.filiere}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="flex items-center gap-1 text-sm font-medium text-primary">
            <Euro className="size-3.5" />
            {total} € au total
          </p>
          <p className="text-xs text-muted-foreground">{offre.tarif_horaire} € / heure</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="size-3" />
          {offre.ville}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="size-3" />
          {offre.date_mission} · {offre.heure_debut}–{offre.heure_fin}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{offre.description}</p>

      {postulable && (
        <div className="mt-4">
          {statut ? (
            <Badge variant="secondary" className="font-normal">
              {STATUT_CANDIDATURE_LABEL[statut]}
            </Badge>
          ) : (
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              disabled={isPending}
              onClick={postuler}
            >
              <Send className="size-3.5" />
              Postuler
            </Button>
          )}
        </div>
      )}
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
  candidaturesParOffre = {},
  metierDefaut,
  postulable,
  titre = "Offres de mission",
  sousTitre,
}: {
  offres: OffresRow[];
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
          <h2 className="font-heading text-2xl font-semibold text-foreground">{titre}</h2>
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
                  ? "bg-primary text-primary-foreground"
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
                  ? "bg-primary text-primary-foreground"
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
        <div className="mt-6 space-y-4">
          {resultats.map((offre) => (
            <OffreCard
              key={offre.id}
              offre={offre}
              statutCandidature={candidaturesParOffre[offre.id]}
              postulable={postulable}
            />
          ))}
        </div>
      )}
    </div>
  );
}
