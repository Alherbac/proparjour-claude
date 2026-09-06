import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getOffresPubliees } from "@/lib/offres";
import { OffresBrowser } from "@/components/dashboard/offres-browser";

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

  return (
    <div>
      <OffresBrowser
        offres={offres}
        postulable={false}
        titre="Marché des offres"
        sousTitre="Vue de consultation — identique à ce que voient les prestataires."
      />
    </div>
  );
}
