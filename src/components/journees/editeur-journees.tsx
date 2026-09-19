"use client";

import { Plus, X } from "lucide-react";
import { type JourneeMission, validerJournees, trierJourneesParDate } from "@/lib/journees";

function journeeVide(): JourneeMission {
  return { date: "", heureDebut: "", heureFin: "" };
}

/**
 * Éditeur réutilisable d'une liste de journées — mission/offre
 * multi-jours (migration 0062, lib/journees.ts, un seul concept
 * `JourneeMission[]` partagé par tous les parcours). Une seule
 * journée : une ligne Date/Début/Fin, sans numérotation ni bouton de
 * suppression — visuellement identique à l'ancien champ unique de
 * chaque parcours (README "reste aussi proche que possible de
 * l'existant"). Plusieurs journées : chacune numérotée et supprimable
 * indépendamment, jamais la dernière. La validation (dates/horaires
 * manquants, doublon de date, heure de fin égale à l'heure de début)
 * réutilise `validerJournees` — jamais un second validateur.
 */
export function EditeurJournees({
  journees,
  onChange,
}: {
  journees: JourneeMission[];
  onChange: (journees: JourneeMission[]) => void;
}) {
  const plusieurs = journees.length > 1;
  const erreur = validerJournees(journees);

  function modifierJournee(index: number, patch: Partial<JourneeMission>) {
    onChange(journees.map((j, i) => (i === index ? { ...j, ...patch } : j)));
  }
  function ajouterJournee() {
    onChange([...journees, journeeVide()]);
  }
  function retirerJournee(index: number) {
    if (journees.length <= 1) return;
    onChange(journees.filter((_, i) => i !== index));
  }
  // Normalise l'AFFICHAGE dans l'ordre chronologique (pas seulement le
  // payload envoyé au serveur) — déclenché à la perte de focus du champ
  // date plutôt qu'à chaque frappe, pour ne pas faire "sauter" la ligne
  // sous le curseur pendant la saisie. Même moteur de tri que le reste
  // (trierJourneesParDate, lib/journees.ts) — jamais un second tri.
  function normaliserOrdre() {
    onChange(trierJourneesParDate(journees));
  }

  return (
    <div className="grid gap-3">
      {journees.map((j, i) => (
        <div key={i} className="grid gap-[7px]">
          {plusieurs && (
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-ppj-ink">Journée {i + 1}</span>
              <button
                type="button"
                onClick={() => retirerJournee(i)}
                aria-label={`Supprimer la journée ${i + 1}`}
                className="shrink-0 rounded-full p-1 text-ppj-text-3 transition-colors hover:bg-ppj-fill hover:text-primary"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              type="date"
              aria-label={plusieurs ? `Date de la journée ${i + 1}` : "Date de la mission"}
              value={j.date}
              onChange={(e) => modifierJournee(i, { date: e.target.value })}
              onBlur={normaliserOrdre}
              className={champJourneeClass(!j.date)}
            />
            <input
              type="time"
              aria-label={plusieurs ? `Heure de début de la journée ${i + 1}` : "Début"}
              value={j.heureDebut}
              onChange={(e) => modifierJournee(i, { heureDebut: e.target.value })}
              className={champJourneeClass(!j.heureDebut)}
            />
            <input
              type="time"
              aria-label={plusieurs ? `Heure de fin de la journée ${i + 1}` : "Fin"}
              value={j.heureFin}
              onChange={(e) => modifierJournee(i, { heureFin: e.target.value })}
              className={champJourneeClass(!j.heureFin)}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={ajouterJournee}
        className="flex items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-[#DDD8D1] px-3 py-2.5 text-[12.5px] font-semibold text-[#7A756D] transition-colors hover:border-ppj-ink hover:text-ppj-ink"
      >
        <Plus className="size-3.5" />
        Ajouter une journée
      </button>

      {erreur && <p className="text-[12.5px] font-medium text-primary">{erreur}</p>}
    </div>
  );
}

function champJourneeClass(manquant: boolean) {
  return manquant
    ? "w-full rounded-[11px] border-[1.5px] border-primary bg-white px-3 py-[10px] text-[14px] text-ppj-ink focus:outline-none"
    : "w-full rounded-[11px] border border-[#E6E2DC] bg-[#FCFBF9] px-3 py-[10px] text-[14px] text-ppj-ink focus:outline-none";
}
