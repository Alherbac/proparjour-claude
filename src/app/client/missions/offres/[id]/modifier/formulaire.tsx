"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashButton } from "@/app/client/_components/button";
import { modifierOffre } from "@/app/actions/offres";
import { type JourneeMission, validerJournees, trierJourneesParDate } from "@/lib/journees";
import { EditeurJournees } from "@/components/journees/editeur-journees";
import type { OffresRow } from "@/lib/supabase/database.types";

const CHAMP = "min-h-[44px] w-full rounded-[10px] border border-[#DDD8D1] bg-white px-3.5 text-[13.5px] text-[#1A1917] outline-none focus:border-[#1A1917]";
const LABEL = "mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6B6660]";

export function FormulaireOffre({ offre, journeesInitiales }: { offre: OffresRow; journeesInitiales: JourneeMission[] }) {
  const router = useRouter();
  const [titre, setTitre] = useState(offre.titre);
  const [description, setDescription] = useState(offre.description);
  const [ville, setVille] = useState(offre.ville);
  // Mission multi-jours (migration 0062) — toutes les journées de
  // l'offre (offres_journees), jamais la seule première : sans ça,
  // "Enregistrer les modifications" écraserait silencieusement les
  // journées suivantes (bug rapporté en usage réel).
  const [journees, setJournees] = useState<JourneeMission[]>(journeesInitiales);
  const [tarifHoraire, setTarifHoraire] = useState(String(offre.tarif_horaire));
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  function enregistrer() {
    setErreur(null);
    const tarif = Number(tarifHoraire.replace(",", "."));
    if (!titre.trim() || !description.trim() || !ville.trim()) {
      setErreur("Titre, description et ville sont requis.");
      return;
    }
    const erreurJournees = validerJournees(journees);
    if (erreurJournees) {
      setErreur(erreurJournees);
      return;
    }
    if (!tarif || tarif <= 0) {
      setErreur("Indiquez un tarif horaire supérieur à 0.");
      return;
    }
    const journeesTriees = trierJourneesParDate(journees);
    const premiereJournee = journeesTriees[0];
    startTransition(async () => {
      const res = await modifierOffre(offre.id, {
        titre: titre.trim(),
        description: description.trim(),
        ville: ville.trim(),
        dateMission: premiereJournee.date,
        heureDebut: premiereJournee.heureDebut,
        heureFin: premiereJournee.heureFin,
        tarifHoraire: tarif,
        journees: journeesTriees,
      });
      if (!res.success) {
        setErreur(res.error);
        return;
      }
      toast.success("Offre mise à jour.");
      router.push("/client/missions");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-[18px] border border-[#EAE6E0] bg-white p-5">
      <div>
        <label className={LABEL} htmlFor="titre">Titre de l&apos;offre</label>
        <input id="titre" className={CHAMP} value={titre} onChange={(e) => setTitre(e.target.value)} />
      </div>

      <div>
        <label className={LABEL} htmlFor="description">Description</label>
        <textarea
          id="description"
          rows={4}
          className={`${CHAMP} min-h-[100px] py-2.5`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="ville">Ville / lieu</label>
        <input id="ville" className={CHAMP} value={ville} onChange={(e) => setVille(e.target.value)} />
      </div>

      <div>
        <label className={LABEL}>Journées de l&apos;offre</label>
        <EditeurJournees journees={journees} onChange={setJournees} />
      </div>

      <div>
        <label className={LABEL} htmlFor="tarif">Tarif horaire (€)</label>
        <input
          id="tarif"
          type="number"
          min="0"
          step="0.5"
          className={CHAMP}
          value={tarifHoraire}
          onChange={(e) => setTarifHoraire(e.target.value)}
        />
      </div>

      {erreur && <p className="text-[13px] font-medium" style={{ color: "#8E2A26" }}>{erreur}</p>}

      <div className="flex gap-2.5 pt-1">
        <DashButton variant="plein" disabled={enCours} onClick={enregistrer}>
          {enCours ? "Enregistrement..." : "Enregistrer les modifications"}
        </DashButton>
        <DashButton variant="secondaire" disabled={enCours} onClick={() => router.push("/client/missions")}>
          Annuler
        </DashButton>
      </div>
    </div>
  );
}
