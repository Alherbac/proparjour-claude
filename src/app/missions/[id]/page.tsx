import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipantsMission, getMessagesEntre } from "@/lib/messages";
import { getStatutPaiementMission } from "@/lib/missions";
import { heuresEntre } from "@/lib/duree";
import { METIERS } from "@/config/metiers";
import { refCourteMission } from "@/lib/mission-ref";
import { dateCourteFr } from "@/lib/date-fr";
import { cn } from "@/lib/utils";
import { MessageThread, type DevisPrefill } from "@/components/missions/message-thread";
import { DetailMissionTabs, type PosteRow, type SuiviEtape, type ProfessionnelRow } from "@/components/missions/detail-mission-tabs";
import { InformationsManquantes } from "@/components/missions/informations-manquantes";
import { DeclarerServiceFaitButton } from "@/components/missions/declarer-service-fait-button";
import { ConfirmerOuContester } from "@/components/missions/confirmer-ou-contester";
import { AnnulerMissionButton } from "@/components/missions/annuler-mission-button";
import { AvisForm } from "@/components/missions/avis-form";

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

// Reprend le même langage visuel que les statuts de "Vos missions"
// (accueil/page.tsx) — voir dossier design, captures/ "Détail mission".
const PILL_STATUT: Record<string, { label: string; classes: string }> = {
  en_attente: { label: "Devis à valider", classes: "bg-primary/10 text-primary border-primary/25" },
  confirmee: { label: "Confirmée", classes: "bg-secondary text-foreground border-border" },
  en_cours: { label: "En cours", classes: "bg-primary/10 text-primary border-primary/25" },
  terminee: { label: "Réalisée", classes: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25" },
  annulee: { label: "Annulée", classes: "bg-secondary text-muted-foreground border-border" },
  litige: { label: "Litige", classes: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25" },
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

  const [{ data: mission }, paiementStatut] = await Promise.all([
    supabase.from("missions").select("*").eq("id", id).maybeSingle(),
    getStatutPaiementMission(id),
  ]);
  if (!mission) notFound();

  let maLigne: {
    id: string;
    statut_acceptation: string;
    service_fait: boolean;
    heure_debut: string;
    heure_fin: string;
    tarif_applique: number;
  } | null = null;
  if (estPrestataire) {
    const { data: profil } = await supabase.from("prestataires_profils").select("id").eq("user_id", user.id).maybeSingle();
    if (profil) {
      const { data: ligne } = await supabase
        .from("mission_lignes")
        .select("id, statut_acceptation, service_fait, heure_debut, heure_fin, tarif_applique")
        .eq("mission_id", id)
        .eq("prestataire_id", profil.id)
        .maybeSingle();
      maLigne = ligne ?? null;
    }
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const missionActive = mission.statut === "confirmee" || mission.statut === "en_cours";
  const peutDeclarerServiceFait =
    estPrestataire && maLigne && maLigne.statut_acceptation === "acceptee" && !maLigne.service_fait && missionActive && mission.date_mission <= aujourdhui;
  const peutFacturer = estRecruteur && paiementStatut !== null && paiementStatut !== "en_attente" && paiementStatut !== "echec";

  const contacts = estRecruteur
    ? participants.prestataires
    : [participants.recruteur];

  // Ligne de mission par contact — nécessaire pour attacher un avis
  // (table `avis`, clé sur mission_ligne_id) à la bonne personne :
  // le recruteur note chaque prestataire séparément (une ligne
  // chacun), le prestataire note le recruteur sur sa propre ligne.
  // Sert aussi à construire "Postes demandés" / "Professionnels" de
  // l'onglet Détail (voir DetailMissionTabs) — recruteur uniquement.
  let ligneIdParContact = new Map<string, string>();
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
  let paiement: { montant: number; montant_commission: number } | null = null;
  if (estRecruteur) {
    const [{ data: lignes }, { data: paiementRow }] = await Promise.all([
      supabase
        .from("mission_lignes")
        .select("id, prestataire_id, metier, heure_debut, heure_fin, tarif_applique, statut_acceptation")
        .eq("mission_id", id),
      supabase.from("paiements").select("montant, montant_commission").eq("mission_id", id).maybeSingle(),
    ]);
    paiement = paiementRow ?? null;
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

  // Un devis "accepté" (statut explicite, ou absent = créé avant ce
  // chantier — voir DevisPayload, lib/messages.ts) est la seule chose
  // qui rend le paiement réel possible : un devis simplement envoyé
  // et pas encore accepté par le client ne compte pas ("Correction UX
  // critique" du parcours candidature — CANDIDATURE ACCEPTÉE ≠ DEVIS
  // ACCEPTÉ). Tant qu'aucun devis accepté n'existe, le paiement réel
  // (dans DevisCard, à l'intérieur du fil concerné) n'a nulle part où
  // s'afficher : ce bouton désactivé, au niveau de la mission, comble
  // ce vide plutôt que de ne rien montrer (README §8 complément — "un
  // état, pas un bouton permanent").
  const aUnDevisAccepte = threads.some((t) =>
    t.messages.some((m) => {
      if (m.type !== "devis") return false;
      const statut = (m.metadata as { statut?: string } | null)?.statut;
      return statut === undefined || statut === "acceptee";
    }),
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

  // Contenu de l'onglet "Détail" (recruteur uniquement) — voir
  // DetailMissionTabs. Construit uniquement à partir de données déjà
  // réelles (aucune fonctionnalité inventée) : pas de champ "Informations
  // manquantes" ni de "Documents" par mission, absents du modèle de
  // données actuel — l'onglet Documents assume honnêtement ce vide
  // plutôt que de simuler une fonctionnalité qui n'existe pas.
  const titre = mission.description || "Mission";
  const pill = PILL_STATUT[mission.statut] ?? { label: mission.statut, classes: "bg-secondary text-muted-foreground border-border" };

  const tousLesMessages = threads.flatMap((t) => t.messages);
  const premierDevis = tousLesMessages
    .filter((m) => m.type === "devis")
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const messageAcceptation = tousLesMessages
    .filter((m) => m.type === "systeme" && m.contenu.includes("accepté le devis"))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const devisEstAccepte = aUnDevisAccepte && Boolean(premierDevis);
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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
      ? `${lignesDetail[0].heure_debut.slice(0, 5)} → ${lignesDetail[0].heure_fin.slice(0, 5)}`
      : null;

  // "Besoin publié" retrace la date de l'offre d'origine (parcours A) ;
  // le parcours B (panier → proposition) n'a pas d'offre séparée, la
  // création de la mission fait alors foi pour cette étape aussi —
  // aucune donnée inventée dans les deux cas.
  const { data: offreOrigine } = mission.offre_id
    ? await supabase.from("offres").select("created_at").eq("id", mission.offre_id).maybeSingle()
    : { data: null };

  const suivi: SuiviEtape[] = [
    { cle: "besoin", label: "Besoin publié", meta: formatDate(offreOrigine?.created_at ?? mission.created_at), fait: true },
    { cle: "identifies", label: "Professionnels identifiés", meta: formatDate(mission.created_at), fait: true },
    {
      cle: "devis-recu",
      label: "Devis reçu",
      meta: premierDevis ? formatDate(premierDevis.created_at) : "en attente",
      fait: Boolean(premierDevis),
    },
    {
      cle: "validation",
      label: "Validation du devis",
      meta: devisEstAccepte ? formatDate(messageAcceptation?.created_at ?? premierDevis!.created_at) : "en attente de votre réponse",
      fait: devisEstAccepte,
    },
    {
      cle: "realisation",
      label: "Mission réalisée",
      meta: missionTerminee ? formatDate(mission.updated_at) : mission.date_mission,
      fait: missionTerminee,
    },
  ];

  // "Postes demandés" — un bloc par MÉTIER (pas par ligne), dossier
  // design "Détail mission" : "1 retenu sur 2" / "Pourvu" / "En
  // recherche". Chaque ligne représente un poste (un prestataire) ;
  // un métier à plusieurs postes a donc plusieurs lignes du même
  // metier, regroupées ici.
  const metiersGroupes = [...new Set(lignesDetail.map((l) => l.metier))];
  const postes: PosteRow[] = metiersGroupes.map((metierId) => {
    const lignesMetier = lignesDetail.filter((l) => l.metier === metierId);
    const metierInfo = METIERS.find((m) => m.id === metierId);
    const retenus = lignesMetier.filter((l) => l.statut_acceptation === "acceptee").length;
    const total = lignesMetier.length;
    const etat =
      retenus === total
        ? { label: "Pourvu", classes: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25" }
        : retenus === 0
          ? { label: "En recherche", classes: "bg-secondary text-muted-foreground border-border" }
          : { label: `${retenus} retenu sur ${total}`, classes: "bg-primary/10 text-primary border-primary/25" };
    const premiere = lignesMetier[0];
    return {
      cle: metierId,
      initiale: metierInfo?.label.charAt(0) ?? "?",
      metierLabel: metierInfo?.label ?? metierId,
      meta: `${total} professionnel${total > 1 ? "s" : ""} · ${premiere.heure_debut.slice(0, 5)} → ${premiere.heure_fin.slice(0, 5)}`,
      pillLabel: etat.label,
      pillClasses: etat.classes,
    };
  });

  const professionnels: ProfessionnelRow[] = lignesDetail.map((l) => {
    const metierInfo = METIERS.find((m) => m.id === l.metier);
    const nom = `${l.prenom ?? "Prestataire"} ${l.nom?.charAt(0) ?? ""}`.trim();
    return {
      cle: l.id,
      nom,
      metierLabel: metierInfo?.label ?? l.metier,
      meta: `${l.tarif_applique} €`,
      href: l.profilVisible ? `/prestataires/${l.prestataireId}` : null,
    };
  });

  const montantTabCard = {
    prestations: paiement ? `${paiement.montant} €` : "au devis",
    fraisService: paiement ? `${paiement.montant_commission} €` : "au devis",
    total: paiement ? `${paiement.montant + paiement.montant_commission} €` : "à confirmer",
    payable: devisEstAccepte && paiementStatut === "en_attente",
    legende:
      paiementStatut !== null && paiementStatut !== "en_attente"
        ? "Paiement déjà confirmé — voir l'onglet Facturation."
        : devisEstAccepte
          ? "Le paiement se fait juste en dessous, dans la messagerie."
          : "Disponible une fois qu'un devis aura été envoyé et accepté. Les fonds sont ensuite séquestrés et versés après le service fait.",
  };

  const facturationTab = {
    disponible: peutFacturer,
    href: peutFacturer ? `/api/factures/${id}` : null,
    explication: "La facture sera disponible une fois le paiement confirmé.",
  };

  // Prestataire : page laissée strictement inchangée (voir consigne —
  // ne jamais transposer le design client à l'espace prestataire, qui
  // n'a pas d'écran "Détail mission" équivalent dans le dossier design).
  if (!estRecruteur) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 lg:px-8">
        <Link
          href="/prestataire"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Retour à votre activité
        </Link>
        <h1 className="mt-4 font-display-serif text-2xl text-foreground">
          Messages de la mission
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mission.lieu} — {dateCourteFr(mission.date_mission)}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3">
          <span className="text-sm font-medium text-foreground">{STATUT_LABEL[mission.statut] ?? mission.statut}</span>
          <div className="flex flex-wrap items-center gap-2">
            {peutDeclarerServiceFait && maLigne && <DeclarerServiceFaitButton ligneId={maLigne.id} />}
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {threads.map((thread) => (
            <div key={thread.autreId} className="space-y-3">
              <MessageThread
                missionId={id}
                moiId={user.id}
                autreId={thread.autreId}
                autreNom={thread.autreNom}
                messagesInitiaux={thread.messages}
                estRecruteur={estRecruteur}
                paiementStatut={paiementStatut}
                devisPrefill={devisPrefill}
              />
              {missionTerminee && thread.ligneId && (
                ligneIdsDejaNotees.has(thread.ligneId) ? (
                  <p className="text-xs text-muted-foreground">Vous avez déjà laissé un avis à {thread.autreNom}.</p>
                ) : (
                  <AvisForm missionLigneId={thread.ligneId} autreNom={thread.autreNom} />
                )
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Recruteur (client) : "Détail mission" — reconstruction fidèle du
  // dossier design (captures/, "Détail mission"). La messagerie reste
  // sur cette même page, sous les onglets (ancre #messagerie) : tous
  // les liens existants du produit (notifications, e-mails, boutons
  // "Retenir"/devis) pointent vers /missions/[id] en s'attendant à y
  // trouver la conversation — la retirer d'ici casserait ces parcours.
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      <Link href="/client/missions" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
        ← Vos missions
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display-serif text-2xl text-foreground sm:text-3xl">{titre}</h1>
            <span className={cn("rounded-full border px-2.5 py-1 text-[11.5px] font-medium", pill.classes)}>{pill.label}</span>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {dateMissionFormatee}
            {heuresLabel && <> · {heuresLabel}</>} · {mission.lieu} ·{" "}
            <span className="font-mono text-xs normal-case text-muted-foreground/70">{refCourteMission(id)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {peutDeclarerServiceFait && maLigne && <DeclarerServiceFaitButton ligneId={maLigne.id} />}
          {missionActive && (
            <>
              <ConfirmerOuContester missionId={id} />
              <AnnulerMissionButton missionId={id} />
            </>
          )}
          <a
            href="#messagerie"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Messagerie
          </a>
        </div>
      </div>

      <div className="mt-6">
        <DetailMissionTabs
          postes={postes}
          suivi={suivi}
          montant={montantTabCard}
          professionnels={professionnels}
          facturation={facturationTab}
          informationsManquantes={
            <InformationsManquantes
              missionId={id}
              valeurs={{
                modalites_acces: mission.modalites_acces,
                contact_sur_place: mission.contact_sur_place,
                consignes_particulieres: mission.consignes_particulieres,
              }}
            />
          }
        />
      </div>

      <div id="messagerie" className="mt-10 scroll-mt-6 space-y-6">
        <h2 className="font-heading text-lg font-semibold text-foreground">Messagerie</h2>
        {threads.map((thread) => (
          <div key={thread.autreId} className="space-y-3">
            <MessageThread
              missionId={id}
              moiId={user.id}
              autreId={thread.autreId}
              autreNom={thread.autreNom}
              messagesInitiaux={thread.messages}
              estRecruteur={estRecruteur}
              paiementStatut={paiementStatut}
              devisPrefill={devisPrefill}
            />
            {missionTerminee && thread.ligneId && (
              ligneIdsDejaNotees.has(thread.ligneId) ? (
                <p className="text-xs text-muted-foreground">Vous avez déjà laissé un avis à {thread.autreNom}.</p>
              ) : (
                <AvisForm missionLigneId={thread.ligneId} autreNom={thread.autreNom} />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
