import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getToutesOffresAdmin } from "@/lib/admin/offres";
import { METIERS } from "@/config/metiers";
import { montantMission } from "@/lib/duree";

export const metadata: Metadata = { title: "Offres — Admin ProParJour" };

const STATUT_LABEL: Record<string, string> = {
  publiee: "Publiée",
  pourvue: "Pourvue",
  annulee: "Annulée",
  expiree: "Expirée",
};

export default async function AdminOffresPage() {
  await requireAdminSession();
  const offres = await getToutesOffresAdmin();

  return (
    <div>
      <h1 className="font-display-serif text-2xl text-foreground">Offres</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {offres.length} offre{offres.length > 1 ? "s" : ""} publiée{offres.length > 1 ? "s" : ""} sur le marché ouvert.
      </p>

      {offres.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Aucune offre publiée pour l&apos;instant.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Titre</th>
                <th className="px-4 py-3 font-medium">Recruteur</th>
                <th className="px-4 py-3 font-medium">Métier</th>
                <th className="px-4 py-3 font-medium">Ville</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Candidatures</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {offres.map((offre) => {
                const metier = METIERS.find((m) => m.id === offre.metier);
                const total = montantMission(offre.heure_debut, offre.heure_fin, offre.tarif_horaire);
                return (
                  <tr key={offre.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{offre.titre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{offre.recruteur_nom}</td>
                    <td className="px-4 py-3 text-muted-foreground">{metier?.filiere ?? offre.metier}</td>
                    <td className="px-4 py-3 text-muted-foreground">{offre.ville}</td>
                    <td className="px-4 py-3 text-muted-foreground">{offre.date_mission}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {total} € ({offre.tarif_horaire} €/h)
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{offre.nombre_candidatures}</td>
                    <td className="px-4 py-3 text-muted-foreground">{STATUT_LABEL[offre.statut]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
