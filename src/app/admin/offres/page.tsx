import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getToutesOffresAdmin } from "@/lib/admin/offres";
import { METIERS } from "@/config/metiers";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminKpiCard } from "@/components/admin/ui/kpi-card";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/ui/badge";
import { AdminTableShell, AdminTh, AdminTr, AdminTd } from "@/components/admin/ui/table-shell";

export const metadata: Metadata = { title: "Offres — Admin ProParJour" };

const STATUT_INFO: Record<string, { label: string; tone: AdminBadgeTone }> = {
  publiee: { label: "Publiée", tone: "green" },
  pourvue: { label: "Pourvue", tone: "blue" },
  annulee: { label: "Annulée", tone: "grey" },
  expiree: { label: "Clôturée", tone: "grey" },
};

export default async function AdminOffresPage() {
  await requireAdminSession();
  const offres = await getToutesOffresAdmin();

  const publiees = offres.filter((o) => o.statut === "publiee").length;
  const moyenneCandidatures = offres.length > 0 ? Math.round((offres.reduce((s, o) => s + o.nombre_candidatures, 0) / offres.length) * 10) / 10 : 0;
  const sansCandidature = offres.filter((o) => o.statut === "publiee" && o.nombre_candidatures === 0).length;

  return (
    <div className="space-y-5">
      <div>
        <AdminH1>Offres</AdminH1>
        <p className="mt-1 text-[13px] text-[var(--a-text-2)]">{offres.length} offre{offres.length !== 1 ? "s" : ""} au total</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminKpiCard label="Offres publiées" valeur={String(publiees)} aide="actuellement ouvertes" />
        <AdminKpiCard label="Candidatures reçues" valeur={String(moyenneCandidatures)} aide="moyenne par offre" />
        <AdminKpiCard label="Sans candidature" valeur={String(sansCandidature)} aide="publiées, à relancer" deltaTone={sansCandidature > 0 ? "down" : "neutral"} />
      </div>

      {offres.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--a-border-strong)] py-10 text-center text-[13px] text-[var(--a-text-3)]">
          Aucune offre publiée pour l&apos;instant.
        </p>
      ) : (
        <AdminTableShell minWidth={1040}>
          <table className="w-full">
            <thead>
              <tr>
                <AdminTh>Intitulé</AdminTh>
                <AdminTh>Métier</AdminTh>
                <AdminTh>Entreprise</AdminTh>
                <AdminTh>Rémunération</AdminTh>
                <AdminTh>Ville</AdminTh>
                <AdminTh>Candidatures</AdminTh>
                <AdminTh>Statut</AdminTh>
              </tr>
            </thead>
            <tbody>
              {offres.map((offre) => {
                const metier = METIERS.find((m) => m.id === offre.metier);
                return (
                  <AdminTr key={offre.id}>
                    <AdminTd truncate>
                      <p className="font-bold text-[var(--a-ink)]">{offre.titre}</p>
                      <p className="text-[11.5px] text-[var(--a-text-3)]">
                        {offre.demande_id ? "ciblée" : "publique"}
                        {offre.nombre_journees > 1 ? ` · ${offre.nombre_journees} journées` : ""}
                      </p>
                    </AdminTd>
                    <AdminTd truncate>{metier?.filiere ?? offre.metier}</AdminTd>
                    <AdminTd truncate>{offre.recruteur_nom}</AdminTd>
                    <AdminTd className="a-tabular" truncate>{offre.montant_total} € ({offre.tarif_horaire} €/h)</AdminTd>
                    <AdminTd truncate>{offre.ville}</AdminTd>
                    <AdminTd className="a-tabular">{offre.nombre_candidatures}</AdminTd>
                    <AdminTd>
                      <AdminBadge tone={STATUT_INFO[offre.statut]?.tone ?? "grey"}>{STATUT_INFO[offre.statut]?.label ?? offre.statut}</AdminBadge>
                    </AdminTd>
                  </AdminTr>
                );
              })}
            </tbody>
          </table>
        </AdminTableShell>
      )}
    </div>
  );
}
