import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipantsMission, getMessagesEntre } from "@/lib/messages";
import { getStatutPaiementMission, getComplementPaiementMission } from "@/lib/missions";
import { heuresEntre } from "@/lib/duree";
import { METIERS } from "@/config/metiers";
import { refCourteMission } from "@/lib/mission-ref";
import { dateCourteFr } from "@/lib/date-fr";
import { MessageThread, type DevisPrefill, type LigneExecution } from "@/components/missions/message-thread";
import { AnnulerMissionButton } from "@/components/missions/annuler-mission-button";

export const metadata: Metadata = {
  title: "Détail de la mission — ProParJour",
};

const STATUT_LABEL: Record<string, string> = {
  en_attente: "🟡 En attente de paiement",
  confirmee: "🟢 Mission confirmée",
  en_cours: "🔵 Mission en cours",
  terminee: "✅ Mission réalisée",
  annulee: "❌ Mission annulée",
  litige: "⚠️ Mission en litige",
};

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/connexion?next=/missions/${id}`);
  }

  const participants = await getParticipantsMission(id);
  if (!participants) notFound();

  const estRecruteur = participants.recruteur.userId === user.id;
  const estPrestataire = participants.prestataires.some((p) => p.userId === user.id);
  if (!estRecruteur && !estPrestataire) notFound();

  const [{ data: mission }, paiementStatut, complementPaiement] = await Promise.all([
    supabase.from("missions").select("*").eq("id", id).maybeSingle(),
    getStatutPaiementMission(id),
    getComplementPaiementMission(id),
  ]);
  if (!mission) notFound();

  // Taux de commission uniquement (jamais le montant total de la
  // mission, confidentiel pour un prestataire — voir
  // getLignePourFacturePrestataire, lib/missions.ts) : via le client
  // admin, nécessaire pour les deux rôles puisque `paiements` n'a pas
  // de policy SELECT pour un prestataire.
  const { data: paiementTaux } = await createAdminClient().from("paiements").select("taux_commission").eq("mission_id", id).maybeSingle();
  const tauxCommission = paiementTaux?.taux_commission ?? 0;

  const COLONNES_LIGNE_EXECUTION =
    "id, statut_acceptation, service_fait, heure_debut, heure_fin, tarif_applique, tarif_final, heure_debut_reelle, heure_debut_statut, heure_fin_reelle, heure_fin_statut";

  let maLigne: {
    id: string;
    statut_acceptation: string;
    service_fait: boolean;
    heure_debut: string;
    heure_fin: string;
    tarif_applique: number;
    tarif_final: number | null;
    heure_debut_reelle: string | null;
    heure_debut_statut: string | null;
    heure_fin_reelle: string | null;
    heure_fin_statut: string | null;
  } | null = null;
  if (estPrestataire) {
    const { data: profil } = await supabase.from("prestataires_profils").select("id").eq("user_id", user.id).maybeSingle();
    if (profil) {
      const { data: ligne } = await supabase
        .from("mission_lignes")
        .select(COLONNES_LIGNE_EXECUTION)
        .eq("mission_id", id)
        .eq("prestataire_id", profil.id)
        .maybeSingle();
      maLigne = ligne ?? null;
    }
  }

  function versLigneExecution(l: {
    id: string;
    statut_acceptation: string;
    service_fait: boolean;
    heure_debut: string;
    heure_fin: string;
    tarif_applique: number;
    tarif_final: number | null;
    heure_debut_reelle: string | null;
    heure_debut_statut: string | null;
    heure_fin_reelle: string | null;
    heure_fin_statut: string | null;
  } | null | undefined): LigneExecution | null {
    if (!l) return null;
    return {
      id: l.id,
      statutAcceptation: l.statut_acceptation,
      serviceFait: l.service_fait,
      heureDebutPrevue: l.heure_debut,
      heureFinPrevue: l.heure_fin,
      tarifApplique: l.tarif_applique,
      tarifFinal: l.tarif_final,
      heureDebutReelle: l.heure_debut_reelle,
      heureDebutStatut: (l.heure_debut_statut as "declaree" | "confirmee" | "contestee" | null) ?? null,
      heureFinReelle: l.heure_fin_reelle,
      heureFinStatut: (l.heure_fin_statut as "declaree" | "confirmee" | "contestee" | null) ?? null,
      tauxCommission,
    };
  }

  const missionActive = mission.statut === "confirmee" || mission.statut === "en_cours";
  const peutFacturer = estRecruteur && paiementStatut !== null && paiementStatut !== "en_attente" && paiementStatut !== "echec";

  const contacts = estRecruteur
    ? participants.prestataires
    : [participants.recruteur];

  // Ligne de mission par contact — nécessaire pour attacher un avis
  // (table `avis`, clé sur mission_ligne_id) à la bonne personne :
  // le recruteur note chaque prestataire séparément (une ligne
  // chacun), le prestataire note le recruteur sur sa propre ligne.
  let ligneIdParContact = new Map<string, string>();
  let ligneExecutionParContact = new Map<string, LigneExecution | null>();
  /** Métier du contact, pour la sous-ligne du header de conversation (dossier design §5) — recruteur uniquement, un prestataire n'a qu'un seul métier par mission. */
  let metierParContact = new Map<string, string>();
  let lignesDetail: {
    id: string;
    metier: string;
    heure_debut: string;
    heure_fin: string;
    tarif_applique: number;
    statut_acceptation: string;
    prestataireId: string;
    prenom: string | null;
    nom: string | null;
    profilVisible: boolean;
  }[] = [];
  if (estRecruteur) {
    const { data: lignes } = await supabase.from("mission_lignes").select(`prestataire_id, metier, ${COLONNES_LIGNE_EXECUTION}`).eq("mission_id", id);
    const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
    // Client admin plutôt que la vue publique prestataires_publics (qui
    // n'expose pas user_id, et masque un profil pas encore "valide") :
    // même raisonnement que getOffresRecruteur — le recruteur doit voir
    // qui travaille sur sa mission quel que soit l'état de vérification.
    const admin = createAdminClient();
    const { data: profils } =
      prestataireIds.length > 0
        ? await admin.from("prestataires_profils").select("id, user_id, statut_verification, visible").in("id", prestataireIds)
        : { data: [] as { id: string; user_id: string; statut_verification: string; visible: boolean }[] };
    const userIdParProfilId = new Map((profils ?? []).map((p) => [p.id, p.user_id]));
    // Un profil pas encore "valide"/visible n'a pas de fiche publique
    // (voir vue prestataires_publics) : le lien "Consulter le profil"
    // n'est proposé que si la fiche existe vraiment, pour ne jamais
    // renvoyer vers une page 404.
    const profilVisibleParId = new Map(
      (profils ?? []).map((p) => [p.id, p.statut_verification === "valide" && p.visible]),
    );
    const userIds = (profils ?? []).map((p) => p.user_id);
    const { data: usersData } =
      userIds.length > 0
        ? await admin.from("users").select("id, prenom, nom").in("id", userIds)
        : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
    const userParId = new Map((usersData ?? []).map((u) => [u.id, u]));
    ligneIdParContact = new Map(
      (lignes ?? [])
        .map((l) => [userIdParProfilId.get(l.prestataire_id), l.id] as const)
        .filter((entry): entry is [string, string] => Boolean(entry[0])),
    );
    ligneExecutionParContact = new Map(
      (lignes ?? [])
        .map((l) => [userIdParProfilId.get(l.prestataire_id), versLigneExecution(l)] as const)
        .filter((entry): entry is [string, LigneExecution] => Boolean(entry[0])),
    );
    metierParContact = new Map(
      (lignes ?? [])
        .map((l) => {
          const uid = userIdParProfilId.get(l.prestataire_id);
          const metierInfo = METIERS.find((m) => m.id === l.metier);
          return uid ? ([uid, String(metierInfo?.label ?? l.metier)] as const) : null;
        })
        .filter((entry): entry is [string, string] => entry !== null),
    );
    lignesDetail = (lignes ?? []).map((l) => {
      const uid = userIdParProfilId.get(l.prestataire_id);
      const u = uid ? userParId.get(uid) : undefined;
      return {
        ...l,
        prestataireId: l.prestataire_id,
        prenom: u?.prenom ?? null,
        nom: u?.nom ?? null,
        profilVisible: profilVisibleParId.get(l.prestataire_id) ?? false,
      };
    });
  } else if (maLigne) {
    ligneIdParContact = new Map([[participants.recruteur.userId, maLigne.id]]);
    ligneExecutionParContact = new Map([[participants.recruteur.userId, versLigneExecution(maLigne)]]);
  }

  const missionTerminee = mission.statut === "terminee";
  const ligneIdsAvis = [...ligneIdParContact.values()];
  const { data: avisExistants } =
    missionTerminee && ligneIdsAvis.length > 0
      ? await supabase.from("avis").select("mission_ligne_id").eq("auteur_id", user.id).in("mission_ligne_id", ligneIdsAvis)
      : { data: [] as { mission_ligne_id: string }[] };
  const ligneIdsDejaNotees = new Set((avisExistants ?? []).map((a) => a.mission_ligne_id));

  const threads = await Promise.all(
    contacts.map(async (contact) => ({
      autreId: contact.userId,
      autreNom: `${contact.prenom ?? ""} ${contact.nom ?? ""}`.trim() || "Utilisateur ProParJour",
      messages: await getMessagesEntre(id, user.id, contact.userId),
      ligneId: ligneIdParContact.get(contact.userId) ?? null,
    })),
  );

  // Prérempli pour le formulaire d'envoi de devis (prestataire
  // uniquement — voir EnvoyerDevisForm, message-thread.tsx).
  const devisPrefill: DevisPrefill | null =
    estPrestataire && maLigne
      ? {
          prestation: mission.description || "Mission proposée",
          date: mission.date_mission,
          heureDebut: maLigne.heure_debut,
          heureFin: maLigne.heure_fin,
          lieu: mission.lieu,
          tarifHoraire:
            heuresEntre(maLigne.heure_debut, maLigne.heure_fin) > 0
              ? Math.round((maLigne.tarif_applique / heuresEntre(maLigne.heure_debut, maLigne.heure_fin)) * 100) / 100
              : maLigne.tarif_applique,
        }
      : null;

  // "Vendredi 28 août" — dossier design, en-tête "Détail mission".
  // Capitalisation manuelle (une seule majuscule, sur "Vendredi") :
  // la classe Tailwind "capitalize" mettrait aussi "Août" en majuscule.
  const dateMissionBrute = new Date(`${mission.date_mission}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const dateMissionFormatee = dateMissionBrute.charAt(0).toUpperCase() + dateMissionBrute.slice(1);
  // "18h → 00h" dans l'en-tête, dossier design "Détail mission" (§
  // isMission) — uniquement quand un seul créneau est sans ambiguïté
  // (le cas courant, un seul poste ou plusieurs postes aux mêmes
  // horaires) : une mission multi-métiers à horaires différents par
  // poste n'a pas de "l'horaire" unique à afficher ici, voir "Postes
  // demandés" plus bas pour le détail par poste dans ce cas.
  const creneauxDistincts = new Set(lignesDetail.map((l) => `${l.heure_debut}-${l.heure_fin}`));
  const heuresLabel =
    creneauxDistincts.size === 1 && lignesDetail[0]
      ? `${lignesDetail[0].heure_debut.slice(0, 5).replace(":", "h")}–${lignesDetail[0].heure_fin.slice(0, 5).replace(":", "h")}`
      : null;

  // Identification légère en haut de page (correction produit
  // 2026-09-19, §3) : un seul métier sur la mission → son libellé,
  // sinon la description de la mission.
  const metiersGroupes = [...new Set(lignesDetail.map((l) => l.metier))];
  const metierPage =
    metiersGroupes.length === 1 ? METIERS.find((m) => m.id === metiersGroupes[0])?.label ?? mission.description : mission.description || "Mission";

  // Prestataire : page laissée strictement inchangée (voir consigne —
  // ne jamais transposer le design client à l'espace prestataire, qui
  // n'a pas d'écran "Détail mission" équivalent dans le dossier design).
  if (!estRecruteur) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/prestataire"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Retour à votre activité
          </Link>
          <span className="text-xs text-muted-foreground">
            {mission.lieu} — {dateCourteFr(mission.date_mission)} · {STATUT_LABEL[mission.statut] ?? mission.statut}
          </span>
        </div>

        <div className="mt-5 space-y-6">
          {threads.map((thread) => (
            <MessageThread
              key={thread.autreId}
              missionId={id}
              moiId={user.id}
              autreId={thread.autreId}
              autreNom={thread.autreNom}
              messagesInitiaux={thread.messages}
              estRecruteur={estRecruteur}
              paiementStatut={paiementStatut}
              devisPrefill={devisPrefill}
              ligne={ligneExecutionParContact.get(thread.autreId) ?? null}
              complement={complementPaiement}
              avisDejaEnvoye={thread.ligneId ? ligneIdsDejaNotees.has(thread.ligneId) : false}
              sousLigne={`Client · Mission #${refCourteMission(id)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Recruteur (client) — la messagerie est désormais le fil principal
  // de la mission (correction produit 2026-09-19) : ce n'est plus "la
  // fiche détaillée puis la messagerie en dessous", mais l'inverse.
  // La fiche détaillée (postes, professionnels, facturation…) reste
  // disponible via l'ancre #detail, atteignable par le bouton "La
  // mission" du header de chaque conversation (message-thread.tsx).
  const refMission = refCourteMission(id);
  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/client/missions" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← Vos missions
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {peutFacturer && (
            <a
              href={`/api/factures/${id}`}
              className="inline-flex min-h-9 items-center rounded-xl border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:border-foreground"
            >
              Facture
            </a>
          )}
          {/* "Confirmer le service fait / Contester les horaires" a été
              retiré d'ici (règle produit 2026-09-17, §6) — vit
              maintenant dans la messagerie, au moment où la fin de
              mission est réellement déclarée (ReponseFinCard,
              message-thread.tsx). L'annulation reste ici : geste
              distinct, disponible à tout moment tant que la mission
              est active, pas lié à une étape d'exécution précise. */}
          {missionActive && <AnnulerMissionButton missionId={id} />}
        </div>
      </div>
      <p className="mt-2 text-[15px] text-foreground">
        {metierPage}
        {" · "}
        {dateMissionFormatee}
        {heuresLabel && <> · {heuresLabel}</>} · {mission.lieu}
        <span className="ml-1.5 font-mono text-xs normal-case text-muted-foreground">Mission #{refMission}</span>
      </p>

      <div className="mt-5 space-y-6">
        {threads.map((thread) => (
          <MessageThread
            key={thread.autreId}
            missionId={id}
            moiId={user.id}
            autreId={thread.autreId}
            autreNom={thread.autreNom}
            messagesInitiaux={thread.messages}
            estRecruteur={estRecruteur}
            paiementStatut={paiementStatut}
            devisPrefill={devisPrefill}
            ligne={ligneExecutionParContact.get(thread.autreId) ?? null}
            complement={complementPaiement}
            avisDejaEnvoye={thread.ligneId ? ligneIdsDejaNotees.has(thread.ligneId) : false}
            sousLigne={`${metierParContact.get(thread.autreId) ?? "Prestataire"} · Mission #${refMission}`}
          />
        ))}
      </div>
    </div>
  );
}
