import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/app/prestataire/_components/badge";
import { DashButton } from "@/app/prestataire/_components/button";
import { StatCard } from "@/app/prestataire/_components/stat-card";
import { getSessionPrestataire, getLignesPrestataire, statutReelPaiement, encaisseDuMois } from "@/app/prestataire/_data";
import { dateCourteFr, referenceMissionPrestataire } from "@/app/prestataire/_lib";
import { repartitionLigne } from "@/lib/facturation";

export const metadata: Metadata = { title: "Revenus — ProParJour" };

const STATUT_INFO: Record<"en_attente" | "debloque" | "verse", { label: string; tone: "vert" | "orange" | "rouge" | "bleu" | "gris" }> = {
  en_attente: { label: "À venir", tone: "orange" },
  debloque: { label: "Débloqué", tone: "bleu" },
  verse: { label: "Versé", tone: "vert" },
};

export default async function PageRevenus() {
  const session = await getSessionPrestataire();
  if (!session) return null;

  const lignes = await getLignesPrestataire(session.profilId);
  const avecPaiement = lignes
    .filter((l) => l.paiement !== null)
    .sort((a, b) => b.mission.date_mission.localeCompare(a.mission.date_mission));

  const encaisse = encaisseDuMois(lignes);
  const enAttente = avecPaiement
    .filter((l) => statutReelPaiement(l) !== "verse")
    .reduce((s, l) => s + repartitionLigne(l, l.paiement!.tauxCommission).netPrestataire, 0);
  const affichees = avecPaiement.slice(0, 20);
  const totalAffiche = affichees.reduce((s, l) => s + repartitionLigne(l, l.paiement!.tauxCommission).netPrestataire, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Revenus
        </h1>
        {/*
          Corrigé (validation produit 2026-09-17) : cette page affichait
          `tarif_applique` — le montant BRUT de la ligne, ce que paie le
          client pour cette prestation — en le libellant "net", ce qui
          ne l'était pas (la commission n'était jamais soustraite). Le
          taux de commission (jamais le montant total de la mission,
          qui resterait confidentiel — voir getLignesPrestataire,
          prestataire/_data.ts) est maintenant relu pour calculer le
          vrai net via repartitionLigne (lib/facturation.ts), seule
          source de calcul, la même que la facture prestataire.
        */}
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Vos versements, mission par mission. Le montant net est celui qui vous est réellement versé, après commission ProParJour.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label={`Encaissé en ${new Date().toLocaleDateString("fr-FR", { month: "long" })}`} valeur={`${encaisse.toLocaleString("fr-FR")} €`} />
        <StatCard label="En attente" valeur={`${enAttente.toLocaleString("fr-FR")} €`} />
        <StatCard label="Total ci-dessous" valeur={`${totalAffiche.toLocaleString("fr-FR")} €`} aide={`${affichees.length} mouvement${affichees.length > 1 ? "s" : ""}`} />
      </div>

      {affichees.length === 0 ? (
        <p className="py-10 text-center text-[13.5px] text-[#6B6660]">Rien à afficher pour l&apos;instant.</p>
      ) : (
        <div className="space-y-2.5">
          {affichees.map((l) => {
            const statut = statutReelPaiement(l);
            const info = STATUT_INFO[statut];
            const { totalClient, commission, netPrestataire } = repartitionLigne(l, l.paiement!.tauxCommission);
            return (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-[#1A1917]">{referenceMissionPrestataire(l.mission)}</p>
                    <Badge tone={info.tone}>{info.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[#6B6660]">{dateCourteFr(l.mission.date_mission)} · {l.mission.lieu}</p>
                  <p className="mt-0.5 text-[11.5px]" style={{ color: "#98938B", fontFamily: "var(--font-ibm-plex-mono)" }}>
                    Mission {totalClient.toFixed(2)} € · Commission {commission.toFixed(2)} €
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-[16px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                      {netPrestataire.toFixed(2)} € <span className="text-[11px] font-sans" style={{ color: "#98938B" }}>net</span>
                    </p>
                    <p className="text-[11px] text-[#98938B]">{statut === "verse" ? "versé" : statut === "debloque" ? "virement à venir" : "après mission"}</p>
                  </div>
                  {statut === "verse" ? (
                    <Link href={`/api/factures/${l.mission_id}/prestataire`}>
                      <DashButton variant="secondaire">Facture</DashButton>
                    </Link>
                  ) : (
                    <Link href={`/missions/${l.mission_id}`}>
                      <DashButton variant="secondaire">Détail</DashButton>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {avecPaiement.length > 20 && <p className="text-[12.5px] text-[#6B6660]">Ces 20 mouvements sont les plus récents.</p>}
    </div>
  );
}
