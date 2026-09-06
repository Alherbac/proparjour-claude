import type { Metadata } from "next";
import Link from "next/link";
import { DashButton } from "@/app/client/_components/button";
import { Badge } from "@/app/client/_components/badge";
import { CertBadge } from "@/app/client/_components/cert-badge";
import { StatCard } from "@/app/client/_components/stat-card";
import { Panel } from "@/app/client/_components/panel";
import { AvatarPill } from "@/app/client/_components/avatar-pill";
import { Vignette } from "@/app/client/_components/vignette";
import { AFaireMaintenant, type ItemAFaire } from "@/app/client/_components/a-faire-maintenant";
import {
  getSessionClient,
  getMissionsClient,
  getOffresAvecCandidatures,
  candidaturesAExaminer,
  getProfessionnelsRetenus,
  depenseDuMois,
  classerMission,
  missionsDevisAValider,
} from "@/app/client/_data";
import { dateLongueFr, BADGE_STATUT_MISSION } from "@/app/client/_lib";

export const metadata: Metadata = { title: "Vue d'ensemble — ProParJour" };

export default async function ClientVueEnsemble() {
  const session = await getSessionClient();
  if (!session) return null; // le layout a déjà redirigé

  const [missions, offres] = await Promise.all([getMissionsClient(session.userId), getOffresAvecCandidatures(session.userId)]);

  const missionsEnCours = missions.filter((m) => classerMission(m) === "en_cours");
  const nbCandidatures = candidaturesAExaminer(offres);
  const nbProfessionnelsRetenus = getProfessionnelsRetenus(missions);
  const depense = depenseDuMois(missions);

  const devis = missionsDevisAValider(missions);
  const candidaturesEnAttente = offres.flatMap((o) => o.candidatures.filter((c) => c.statut === "en_attente").map((c) => ({ ...c, offreTitre: o.titre })));

  const itemsAFaire: ItemAFaire[] = [
    ...devis.map((m) => ({
      cle: `devis-${m.id}`,
      titre: "Devis à valider",
      badge: { label: "Devis reçu", tone: "orange" as const },
      explication: `${m.lieu} · ${dateLongueFr(m.date_mission)}`,
      depuis: m.updated_at,
      actionLabel: "Examiner",
      href: `/missions/${m.id}`,
    })),
    ...(candidaturesEnAttente.length > 0
      ? [
          {
            cle: "candidatures-en-attente",
            titre: `${candidaturesEnAttente.length} candidature${candidaturesEnAttente.length > 1 ? "s" : ""} reçue${candidaturesEnAttente.length > 1 ? "s" : ""}`,
            badge: { label: "À examiner", tone: "rouge" as const },
            explication: `Sur ${new Set(candidaturesEnAttente.map((c) => c.offreTitre)).size} offre${new Set(candidaturesEnAttente.map((c) => c.offreTitre)).size > 1 ? "s" : ""} publiée${new Set(candidaturesEnAttente.map((c) => c.offreTitre)).size > 1 ? "s" : ""}.`,
            depuis: candidaturesEnAttente.reduce((plusRecent, c) => (c.created_at > plusRecent ? c.created_at : plusRecent), candidaturesEnAttente[0].created_at),
            actionLabel: "Examiner",
            href: "/client/candidatures",
          },
        ]
      : []),
  ];

  const candidaturesRecentes = candidaturesEnAttente.slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-[36px] text-[#1A1917]"
            style={{ fontFamily: "var(--font-instrument-serif)", lineHeight: 1.06, letterSpacing: "-0.02em" }}
          >
            Bonjour, {session.profil.prenom || "vous"}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[#6B6660]">
            {dateLongueFr(new Date().toISOString().slice(0, 10))} · {missionsEnCours.length} mission{missionsEnCours.length > 1 ? "s" : ""} en cours · {nbCandidatures} candidature{nbCandidatures > 1 ? "s" : ""} à examiner
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/prestataires">
            <DashButton variant="plein">Rechercher un professionnel</DashButton>
          </Link>
          <Link href="/publier-une-offre">
            <DashButton variant="secondaire">Publier mon besoin</DashButton>
          </Link>
        </div>
      </div>

      <AFaireMaintenant items={itemsAFaire} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Missions en cours" valeur={missionsEnCours.length} aide="à suivre" />
        <StatCard label="Candidatures" valeur={nbCandidatures} aide={`sur ${offres.filter((o) => o.statut === "publiee").length} offre(s) publiée(s)`} />
        <StatCard label="Professionnels retenus" valeur={nbProfessionnelsRetenus} aide="déjà travaillé avec vous" />
        <StatCard label="Dépense du mois" valeur={`${depense.toLocaleString("fr-FR")} €`} aide={new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} />
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))" }}>
        <Panel titre="Missions en cours" lienTout="/client/missions">
          {missionsEnCours.length === 0 ? (
            <p className="text-[13px] text-[#6B6660]">Aucune mission en cours pour l&apos;instant.</p>
          ) : (
            <div className="space-y-3">
              {missionsEnCours.slice(0, 4).map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#EFEBE6] pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-semibold text-[#1A1917]">{m.lieu}</p>
                      <Badge tone={BADGE_STATUT_MISSION[m.statut].tone}>{BADGE_STATUT_MISSION[m.statut].label}</Badge>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-[#6B6660]">{dateLongueFr(m.date_mission)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.lignes.map((l) => (
                      <AvatarPill key={l.id} prenom={l.prenom || "?"} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel titre="Candidatures reçues" lienTout="/client/candidatures">
          {candidaturesRecentes.length === 0 ? (
            <p className="text-[13px] text-[#6B6660]">Aucune candidature à examiner pour l&apos;instant.</p>
          ) : (
            <div className="space-y-3">
              {candidaturesRecentes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border-b border-[#EFEBE6] pb-3 last:border-0 last:pb-0">
                  <Vignette photoUrl={c.photoUrl} nom={c.prenom || c.nom || "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[13.5px] font-semibold text-[#1A1917]">{`${c.prenom ?? ""} ${c.nom ?? ""}`.trim() || "Professionnel"}</p>
                      {c.statutVerification === "valide" && <CertBadge />}
                    </div>
                    <p className="truncate text-[12.5px] font-semibold" style={{ color: "#E21D1B" }}>
                      {c.offreTitre}
                    </p>
                    <p className="text-[12px] text-[#6B6660]">{c.tarifMontant} € / {c.tarifType === "horaire" ? "heure" : "jour"}</p>
                  </div>
                  <Link href={`/client/candidats/${c.id}`} className="shrink-0">
                    <DashButton variant="secondaire">Profil</DashButton>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
