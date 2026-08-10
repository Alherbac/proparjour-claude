"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JOURS_SEMAINE } from "@/components/onboarding/prestataire/schema";
import {
  definirExceptionsDisponibilite,
  supprimerExceptionsDisponibilite,
} from "@/app/actions/compte";
import type { PrestatairesDisponibilitesExceptionsRow } from "@/lib/supabase/database.types";

const JOURS_LABEL = ["L", "M", "M", "J", "V", "S", "D"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function dateStr(annee: number, mois: number, jour: number) {
  return `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

export function CalendrierDisponibilites({
  disponibilitesHebdo,
  exceptionsInitiales,
}: {
  disponibilitesHebdo: string[];
  exceptionsInitiales: PrestatairesDisponibilitesExceptionsRow[];
}) {
  const aujourdhui = new Date();
  const [annee, setAnnee] = useState(aujourdhui.getFullYear());
  const [mois, setMois] = useState(aujourdhui.getMonth());
  const [exceptions, setExceptions] = useState(
    new Map(exceptionsInitiales.map((e) => [e.date, e])),
  );
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [dernierJourClique, setDernierJourClique] = useState<string | null>(null);
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [heureFin, setHeureFin] = useState("18:00");
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const premierJourMois = new Date(annee, mois, 1);
  const decalage = (premierJourMois.getDay() + 6) % 7;
  const joursDansMois = new Date(annee, mois + 1, 0).getDate();
  const cases: (number | null)[] = [
    ...Array(decalage).fill(null),
    ...Array.from({ length: joursDansMois }, (_, i) => i + 1),
  ];
  const datesDuMois = Array.from({ length: joursDansMois }, (_, i) => dateStr(annee, mois, i + 1));

  const joursHebdoIndex = useMemo(
    () => new Set(disponibilitesHebdo.map((j) => JOURS_SEMAINE.indexOf(j as (typeof JOURS_SEMAINE)[number]))),
    [disponibilitesHebdo],
  );

  function toggleJour(date: string) {
    setDernierJourClique(date);
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function selectionnerSemaine() {
    const reference = dernierJourClique ? new Date(dernierJourClique) : aujourdhui;
    const jourSemaine = (reference.getDay() + 6) % 7; // lundi = 0
    const lundi = new Date(reference);
    lundi.setDate(reference.getDate() - jourSemaine);
    const semaine = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lundi);
      d.setDate(lundi.getDate() + i);
      return dateStr(d.getFullYear(), d.getMonth(), d.getDate());
    });
    setSelection(new Set(semaine));
  }

  function selectionnerMois() {
    setSelection(new Set(datesDuMois));
  }

  function viderSelection() {
    setSelection(new Set());
  }

  async function appliquer(disponible: boolean) {
    if (selection.size === 0) {
      setMessage("Sélectionnez d'abord un ou plusieurs jours.");
      return;
    }
    setEnregistrement(true);
    setMessage(null);
    const dates = [...selection];
    const result = await definirExceptionsDisponibilite(
      dates,
      disponible,
      disponible ? heureDebut : null,
      disponible ? heureFin : null,
    );
    setEnregistrement(false);
    if (!result.success) {
      setMessage(result.error);
      return;
    }
    setExceptions((prev) => {
      const next = new Map(prev);
      for (const date of dates) {
        next.set(date, {
          id: prev.get(date)?.id ?? date,
          prestataire_id: prev.get(date)?.prestataire_id ?? "",
          date,
          disponible,
          heure_debut: disponible ? heureDebut : null,
          heure_fin: disponible ? heureFin : null,
          created_at: prev.get(date)?.created_at ?? new Date().toISOString(),
        });
      }
      return next;
    });
    setMessage(`${dates.length} jour${dates.length > 1 ? "s" : ""} mis à jour.`);
  }

  async function retirerExceptions() {
    if (selection.size === 0) {
      setMessage("Sélectionnez d'abord un ou plusieurs jours.");
      return;
    }
    setEnregistrement(true);
    setMessage(null);
    const dates = [...selection];
    const result = await supprimerExceptionsDisponibilite(dates);
    setEnregistrement(false);
    if (!result.success) {
      setMessage(result.error);
      return;
    }
    setExceptions((prev) => {
      const next = new Map(prev);
      for (const date of dates) next.delete(date);
      return next;
    });
    setMessage(`${dates.length} exception${dates.length > 1 ? "s" : ""} retirée${dates.length > 1 ? "s" : ""}.`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Mois précédent"
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
            onClick={() => {
              const d = new Date(annee, mois - 1, 1);
              setAnnee(d.getFullYear());
              setMois(d.getMonth());
            }}
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-heading font-semibold text-foreground">
            {MOIS[mois]} {annee}
          </p>
          <button
            type="button"
            aria-label="Mois suivant"
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
            onClick={() => {
              const d = new Date(annee, mois + 1, 1);
              setAnnee(d.getFullYear());
              setMois(d.getMonth());
            }}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {JOURS_LABEL.map((j, i) => (
            <div key={i}>{j}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cases.map((jour, i) => {
            if (jour === null) return <div key={i} />;
            const date = dateStr(annee, mois, jour);
            const exception = exceptions.get(date);
            const indexHebdo = (new Date(annee, mois, jour).getDay() + 6) % 7;
            const disponibleParDefaut = joursHebdoIndex.has(indexHebdo);
            const estSelectionne = selection.has(date);

            let pastille: string | null = null;
            if (exception) pastille = exception.disponible ? "bg-emerald-500" : "bg-destructive";
            else if (disponibleParDefaut) pastille = "bg-muted-foreground/30";

            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleJour(date)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors",
                  estSelectionne
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                    : "text-foreground hover:bg-background",
                )}
              >
                {jour}
                {pastille && (
                  <span className={cn("size-1.5 rounded-full", estSelectionne ? "bg-primary-foreground" : pastille)} />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/30" /> Jour habituel
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-destructive" /> Indisponible
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={selectionnerSemaine}>
          Sélectionner la semaine
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={selectionnerMois}>
          Sélectionner le mois
        </Button>
        {selection.size > 0 && (
          <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={viderSelection}>
            Tout désélectionner ({selection.size})
          </Button>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
        <p className="text-sm font-medium text-foreground">
          {selection.size === 0
            ? "Cliquez sur un ou plusieurs jours du calendrier pour les modifier."
            : `${selection.size} jour${selection.size > 1 ? "s" : ""} sélectionné${selection.size > 1 ? "s" : ""}`}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="heureDebutJour">
              Début
            </label>
            <Input
              id="heureDebutJour"
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="heureFinJour">
              Fin
            </label>
            <Input
              id="heureFinJour"
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            disabled={enregistrement || selection.size === 0}
            onClick={() => appliquer(true)}
          >
            {enregistrement && <Loader2 className="size-3.5 animate-spin" />}
            Marquer disponible
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={enregistrement || selection.size === 0}
            onClick={() => appliquer(false)}
          >
            Marquer indisponible
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-40"
            disabled={enregistrement || selection.size === 0}
            onClick={retirerExceptions}
          >
            Retirer l&apos;exception
          </button>
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
