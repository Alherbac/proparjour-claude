import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfessionnelsHistorique } from "@/lib/professionnels-habituels";
import { getMissionPourRefaire } from "@/lib/refaire-mission";
import { CreerSerieForm } from "@/components/dashboard/creer-serie-form";

export const metadata: Metadata = { title: "Créer une série récurrente — ProParJour" };

/**
 * Migré depuis l'ancien /tableau-de-bord/serie-recurrente/nouvelle —
 * même logique et données (getProfessionnelsHistorique,
 * getMissionPourRefaire, CreerSerieForm), habillage refait dans le
 * système visuel /client.
 */
export default async function PageNouvelleSerie({ searchParams }: { searchParams: Promise<{ missionId?: string }> }) {
  const { missionId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/client/series/nouvelle");

  const { habituels, recents } = await getProfessionnelsHistorique(user.id);
  const idsHabituels = new Set(habituels.map((h) => h.prestataireId));
  const candidats = [...habituels, ...recents.filter((r) => !idsHabituels.has(r.prestataireId))];

  const missionPrefill = missionId ? await getMissionPourRefaire(missionId, user.id) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-1">
      <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
        Créer une mission récurrente
      </h1>
      <p className="mt-1 text-[13.5px] text-[#6B6660]">
        Un besoin qui revient chaque semaine ou chaque mois ? Planifiez-le une fois, ProParJour vérifie la disponibilité de vos professionnels habituels sur chaque date.
      </p>

      <div className="mt-6">
        <CreerSerieForm
          candidats={candidats.map((c) => ({
            prestataireId: c.prestataireId,
            prenom: c.prenom,
            metier: c.metier,
            ville: c.ville,
            photoUrl: c.photoUrl,
            nbMissions: c.nbMissions,
          }))}
          prefill={
            missionPrefill
              ? {
                  lieu: missionPrefill.lieu,
                  titre: missionPrefill.description ?? "",
                  sousBesoins: missionPrefill.lignes.map((l) => ({
                    prestataireId: l.prestataireId,
                    prenom: l.prenom,
                    photoUrl: l.photoUrl,
                    metier: l.metier,
                    heureDebut: l.heureDebut,
                    heureFin: l.heureFin,
                    tarifHoraire: l.tarifHoraireEstime,
                  })),
                }
              : null
          }
        />
      </div>
    </div>
  );
}
