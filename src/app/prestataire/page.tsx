import type { Metadata } from "next";
import Link from "next/link";
import { DashButton } from "@/app/prestataire/_components/button";
import { Badge } from "@/app/prestataire/_components/badge";
import { StatCard } from "@/app/prestataire/_components/stat-card";
import { Panel } from "@/app/prestataire/_components/panel";
import { ProgressBar } from "@/app/prestataire/_components/progress-bar";
import { Calendrier } from "@/app/prestataire/_components/calendrier";
import { AFaireMaintenant, type ItemAFaire } from "@/app/prestataire/_components/a-faire-maintenant";
import {
  getSessionPrestataire,
  getLignesPrestataire,
  getProfilComplet,
  getFiabiliteBrute,
  getCandidaturesEnvoyees,
  getJustificatifsRefuses,
  getJustificatifsTous,
  getExceptionsDisponibilites,
  getExperiences,
  getOffresCorrespondantes,
  missionsAVenir,
  encaisseDuMois,
  scoreFiabilite,
  tauxReponse,
} from "@/app/prestataire/_data";
import { dateLongueFr, correspondDisponibilite, heuresEntre } from "@/app/prestataire/_lib";

export const metadata: Metadata = { title: "Votre activité — ProParJour" };

export default async function PrestataireVotreActivite() {
  const session = await getSessionPrestataire();
  if (!session) return null;

  const [lignes, profil, fiabiliteBrute, candidatures, justificatifsRefuses, justificatifs, exceptions, experiences] = await Promise.all([
    getLignesPrestataire(session.profilId),
    getProfilComplet(session.userId),
    getFiabiliteBrute(session.profilId),
    getCandidaturesEnvoyees(session.profilId),
    getJustificatifsRefuses(session.profilId),
    getJustificatifsTous(session.profilId),
    getExceptionsDisponibilites(session.profilId),
    getExperiences(session.profilId),
  ]);
  if (!profil) return null;

  const { offres: offresMetier, idsCandidates } = await getOffresCorrespondantes(session.metier, session.profilId);
  const offresRecommandees = offresMetier.filter((o) => !idsCandidates.has(o.id)).slice(0, 6);

  const avenir = missionsAVenir(lignes);
  const encaisse = encaisseDuMois(lignes);
  const fiabilite = scoreFiabilite(fiabiliteBrute.missionsTerminees, fiabiliteBrute.nbLitiges);
  const reponse = tauxReponse(candidatures);

  const etapes = [
    { cle: "photo", label: "Photo de profil", ok: Boolean(profil.photo_url), href: "/prestataire/profil" },
    { cle: "titre", label: "Titre professionnel", ok: Boolean(profil.titre), href: "/prestataire/profil" },
    { cle: "bio", label: "Présentation", ok: Boolean(profil.bio), href: "/prestataire/profil" },
    { cle: "specialites", label: "Au moins une spécialité", ok: profil.specialites.length > 0, href: "/prestataire/profil" },
    { cle: "dispo", label: "Disponibilités renseignées", ok: profil.disponibilites.length > 0, href: "/prestataire/disponibilites" },
    { cle: "experience", label: "Au moins une expérience", ok: experiences.length > 0, href: "/prestataire/profil" },
    { cle: "documents", label: "Documents requis fournis", ok: justificatifs.some((j) => j.statut === "valide"), href: "/prestataire/profil" },
  ];
  const pourcentage = Math.round((etapes.filter((e) => e.ok).length / etapes.length) * 100);

  const itemsAFaire: ItemAFaire[] = [
    ...justificatifsRefuses.map((j) => ({
      cle: `document-${j.id}`,
      titre: "Document refusé",
      badge: { label: "Bloquant", tone: "rouge" as const },
      explication: j.motif_refus || "Sans un document valide, votre profil sort de la recherche.",
      depuis: j.reviewed_at ?? j.created_at,
      actionLabel: "Déposer",
      href: "/prestataire/profil",
    })),
    ...lignes
      .filter((l) => l.statut_acceptation === "en_attente")
      .slice(0, 3)
      .map((l) => ({
        cle: `proposition-${l.id}`,
        titre: `Proposition reçue — ${l.mission.lieu}`,
        badge: { label: "Réponse attendue", tone: "orange" as const },
        explication: `${dateLongueFr(l.mission.date_mission)} · ${l.heure_debut.slice(0, 5)} → ${l.heure_fin.slice(0, 5)}`,
        depuis: l.created_at,
        actionLabel: "Répondre",
        href: `/missions/${l.mission_id}`,
      })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-[36px] text-[#1A1917]"
            style={{ fontFamily: "var(--font-instrument-serif)", lineHeight: 1.06, letterSpacing: "-0.02em" }}
          >
            Bonjour, {session.prenom || "vous"}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[#6B6660]">
            {dateLongueFr(new Date().toISOString().slice(0, 10))} · {avenir.length} mission{avenir.length > 1 ? "s" : ""} à venir · {justificatifsRefuses.length} pièce{justificatifsRefuses.length > 1 ? "s" : ""} à mettre à jour
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/prestataire/profil">
            <DashButton variant="plein">Compléter mon profil</DashButton>
          </Link>
          <Link href="/prestataire/disponibilites">
            <DashButton variant="secondaire">Mes disponibilités</DashButton>
          </Link>
        </div>
      </div>

      <AFaireMaintenant items={itemsAFaire} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Missions à venir" valeur={avenir.length} aide={avenir[0] ? `la prochaine le ${dateLongueFr(avenir[0].mission.date_mission).split(" ").slice(0, 2).join(" ")}` : "aucune pour l'instant"} />
        <StatCard label="Encaissé ce mois" valeur={`${encaisse.toLocaleString("fr-FR")} €`} aide="net, après commission" />
        <StatCard label="Fiabilité" valeur={fiabilite === null ? "—" : fiabilite} aide="sur 100" />
        <StatCard label="Taux de réponse" valeur={reponse === null ? "—" : `${reponse} %`} aide="propositions traitées" />
      </div>

      <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[#1A1917]">Complétion du profil</h2>
          <span className="text-[22px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
            {pourcentage}%
          </span>
        </div>
        <ProgressBar pourcentage={pourcentage} />
        <div className="mt-4 divide-y divide-[#EFEBE6]">
          {etapes.map((e) => (
            <div key={e.cle} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: e.ok ? "#3DB87A" : "#E09A3A" }} />
              <span className="flex-1 text-[13px] text-[#1A1917]">{e.label}</span>
              {e.ok ? (
                <span className="text-[12px] text-[#6B6660]">Renseignée</span>
              ) : (
                <Link href={e.href}>
                  <DashButton variant="secondaire">Renseigner</DashButton>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))" }}>
        <Panel titre="Prochaines missions" lienTout="/prestataire/missions">
          {avenir.length === 0 ? (
            <p className="text-[13px] text-[#6B6660]">Aucune mission à venir pour l&apos;instant.</p>
          ) : (
            <div className="space-y-3">
              {avenir.slice(0, 4).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2.5 border-b border-[#EFEBE6] pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-[#1A1917]">{l.mission.lieu}</p>
                    <p className="text-[12.5px] text-[#6B6660]">{dateLongueFr(l.mission.date_mission)}</p>
                  </div>
                  <span className="shrink-0 text-[15px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                    {l.tarif_applique} € <span className="text-[11px] font-sans" style={{ color: "#98938B" }}>net</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel titre="Disponibilités" lienTout="/prestataire/disponibilites">
          <Calendrier
            annee={new Date().getFullYear()}
            mois={new Date().getMonth() + 1}
            joursMission={new Set(avenir.map((l) => l.mission.date_mission))}
            joursIndisponibles={new Set(exceptions.filter((e) => !e.disponible).map((e) => e.date))}
          />
        </Panel>
      </div>

      <Panel titre="Opportunités pour vous" lienTout="/prestataire/opportunites">
        {offresRecommandees.length === 0 ? (
          <p className="text-[13px] text-[#6B6660]">Aucune offre correspondant à votre métier pour l&apos;instant.</p>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
            {offresRecommandees.map((o) => {
              const correspond = correspondDisponibilite(o.date_mission, profil.disponibilites, exceptions);
              const heures = heuresEntre(o.heure_debut, o.heure_fin);
              const remuneration = Math.round(heures * o.tarif_horaire * 100) / 100;
              return (
                <div key={o.id} className="rounded-[14px] border border-[#EAE6E0] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13.5px] font-semibold text-[#1A1917]">{o.titre}</p>
                    <Badge tone={correspond ? "vert" : "gris"}>{correspond ? "Métier + dispo." : "Métier"}</Badge>
                  </div>
                  <p className="mt-1 text-[12.5px] text-[#6B6660]">
                    {dateLongueFr(o.date_mission)} · {o.ville}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[15px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                      {remuneration} €
                    </span>
                    <Link href={`/prestataire/opportunites/${o.id}`}>
                      <DashButton variant="sombre">Candidater</DashButton>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
