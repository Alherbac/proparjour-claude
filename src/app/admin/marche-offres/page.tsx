import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getOffresPubliees } from "@/lib/offres";
import { createClient } from "@/lib/supabase/server";
import { OffresBrowser } from "@/components/dashboard/offres-browser";
import type { JourneeMission } from "@/lib/journees";

export const metadata: Metadata = { title: "Marché des offres — Admin ProParJour" };

/**
 * Vue de consultation pour l'admin — même composant OffresBrowser que
 * l'espace prestataire (src/components/dashboard/offres-browser.tsx),
 * en lecture seule (postulable=false, pas de métier par défaut donc
 * tous les métiers affichés d'emblée).
 */
export default async function AdminMarcheOffresPage() {
  await requireAdminSession();
  const offres = await getOffresPubliees({});

  // Mission multi-jours (migration 0062) — journées réelles par
  // offre ; OffresBrowser retombe sur l'unique journée de l'offre
  // quand une offre n'en a pas encore.
  const journeesParOffre: Record<string, JourneeMission[]> = {};
  if (offres.length > 0) {
    const supabase = await createClient();
    const { data: journeesRows } = await supabase
      .from("offres_journees")
      .select("offre_id, date, heure_debut, heure_fin")
      .in("offre_id", offres.map((o) => o.id))
      .order("date", { ascending: true });
    for (const j of journeesRows ?? []) {
      const liste = journeesParOffre[j.offre_id] ?? [];
      liste.push({ date: j.date, heureDebut: j.heure_debut.slice(0, 5), heureFin: j.heure_fin.slice(0, 5) });
      journeesParOffre[j.offre_id] = liste;
    }
  }

  return (
    <div>
      <OffresBrowser
        offres={offres}
        journeesParOffre={journeesParOffre}
        postulable={false}
        titre="Marché des offres"
        sousTitre="Vue de consultation — identique à ce que voient les prestataires."
      />
    </div>
  );
}
