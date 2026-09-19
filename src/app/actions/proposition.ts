"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTauxCommission } from "@/lib/commission";
import { creerNotification } from "@/lib/notifications";
import { creerMessageSysteme } from "@/lib/messages";
import { traduireErreurDb } from "@/lib/erreurs-db";
import { METIERS } from "@/config/metiers";
import type { MetierType } from "@/lib/supabase/database.types";
import {
  type JourneeMission,
  validerJournees,
  trierJourneesParDate,
  montantTotalJournees,
  versJourneesRpc,
} from "@/lib/journees";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

export type LigneProposition = {
  prestataireId: string;
  prenom: string;
  heureDebut: string;
  heureFin: string;
  /** Libre, propre à ce professionnel (qualifications, missions confiées, tenue...) — README §9, "chaque professionnel ne reçoit que les informations de son métier". */
  precisions: string;
  /**
   * Mission multi-jours (migration 0062) — optionnel, propre à CE
   * professionnel (deux prestataires de la même mission peuvent avoir
   * des jeux de journées différents). Absent ou vide : repli sur
   * l'unique journée {date de la mission, heureDebut, heureFin}
   * ci-dessus — cas N=1 du modèle général, comportement strictement
   * identique à avant cette migration. L'UI actuelle (proposition-
   * content.tsx) ne construit pas encore ce tableau — Phase 2A porte
   * sur le flux de données, pas sur l'ajout de journées dans l'écran.
   */
  journees?: JourneeMission[];
};

export type PropositionInput = {
  titre: string;
  date: string;
  adresse: string;
  contexte: string;
  lignes: LigneProposition[];
};

/**
 * Troisième chemin de création de mission — "proparjour 6-7" §8/§9
 * (RÉVISÉ). Contrairement à commande.ts (paiement avant la mission),
 * personne n'a encore consenti à rien ici : la mission naît avec
 * toutes ses lignes 'en_attente' (RPC creer_mission_proposee,
 * migration 0040) et aucun paiement n'est déclenché — chaque
 * professionnel retenu reçoit uniquement les informations de son
 * propre poste (message + notification), et accepte ou décline via
 * repondreMissionLigne (actions/missions.ts, inchangé). Le paiement,
 * lui, n'intervient qu'à la première acceptation, via la carte de
 * devis déjà existante en messagerie (voir missions.ts et
 * paiement-mission.ts, tous deux étendus pour ce nouveau chemin sans
 * rien changer à leur usage pré-existant).
 */
export async function proposerMission(input: PropositionInput): Promise<ActionResult<{ missionId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté pour proposer cette mission." };
  }

  const titre = input.titre.trim();
  const adresse = input.adresse.trim();
  const contexte = input.contexte.trim();

  if (!titre || !input.date || !adresse) {
    return { success: false, error: "Titre, date et adresse sont requis." };
  }
  if (input.lignes.length === 0) {
    return { success: false, error: "Ajoutez au moins un professionnel avant d'envoyer." };
  }

  // Mission multi-jours (migration 0062) — chaque ligne a son propre
  // jeu de journées, optionnel : absent, on retombe sur l'unique
  // journée {date de la mission, heureDebut, heureFin} de la ligne —
  // cas N=1 du modèle général, jamais un système séparé. Triées par
  // date croissante ici : la RPC ne peut pas déduire seule "la date la
  // plus ancienne tous prestataires confondus" (elle traite plusieurs
  // lignes), c'est donc à cet appelant de le faire.
  const journeesParLigne = new Map<string, JourneeMission[]>();
  for (const ligne of input.lignes) {
    const brut: JourneeMission[] =
      ligne.journees && ligne.journees.length > 0
        ? ligne.journees
        : [{ date: input.date, heureDebut: ligne.heureDebut, heureFin: ligne.heureFin }];
    const erreur = validerJournees(brut);
    if (erreur) {
      return { success: false, error: `${ligne.prenom} : ${erreur}` };
    }
    journeesParLigne.set(ligne.prestataireId, trierJourneesParDate(brut));
  }

  const admin = createAdminClient();

  // Revalide chaque professionnel contre la base (métier non
  // falsifiable par le client) — même principe que revaliderLignes
  // dans commande.ts, jamais une confiance aveugle dans ce que le
  // navigateur a envoyé. commande.ts lit prestataires_publics (la vue
  // ne montre que statut_verification = 'valide') ; ici on doit lire
  // prestataires_profils via le client admin pour récupérer user_id
  // (absent de la vue, nécessaire pour message/notification), donc le
  // filtre de validation que la vue appliquait gratuitement doit être
  // reproduit explicitement — sinon un appel direct de cette action
  // (hors UI, qui ne propose jamais que des profils déjà validés)
  // pourrait proposer une mission à un profil non vérifié ou refusé.
  const ids = input.lignes.map((l) => l.prestataireId);
  const { data: prestataires, error: prestatairesError } = await admin
    .from("prestataires_profils")
    .select("id, metier, user_id, tarif_montant, statut_verification")
    .in("id", ids)
    .eq("statut_verification", "valide");
  if (prestatairesError || !prestataires) {
    return { success: false, error: "Impossible de vérifier les professionnels retenus." };
  }
  const parId = new Map(prestataires.map((p) => [p.id, p]));

  const lignesRpc: {
    prestataire_id: string;
    metier: MetierType;
    heure_debut: string;
    heure_fin: string;
    tarif_applique: number;
    journees: { date: string; heure_debut: string; heure_fin: string; tarif_applique: number }[];
  }[] = [];
  // Le total mission = somme des montants de TOUTES les journées de
  // TOUTES les lignes — jamais une commission ou un paiement calculé
  // par journée (règle produit, "mission multi-jours") : la commission
  // n'intervient qu'une seule fois plus bas, sur ce total unique.
  let montantTotal = 0;
  let premiereDate: string | null = null;

  for (const ligne of input.lignes) {
    const reel = parId.get(ligne.prestataireId);
    if (!reel) {
      return { success: false, error: `${ligne.prenom} n'est plus disponible à la réservation.` };
    }
    const journeesTriees = journeesParLigne.get(ligne.prestataireId) ?? [];
    const tarifHoraire = reel.tarif_montant ?? 0;
    const journeesRpc = versJourneesRpc(journeesTriees.map((j) => ({ ...j, tarifHoraire })));
    const montantLigne = montantTotalJournees(journeesTriees.map((j) => ({ ...j, tarifHoraire })));
    montantTotal += montantLigne;
    if (premiereDate === null || journeesRpc[0].date < premiereDate) {
      premiereDate = journeesRpc[0].date;
    }
    lignesRpc.push({
      prestataire_id: reel.id,
      metier: reel.metier,
      heure_debut: journeesRpc[0].heure_debut,
      heure_fin: journeesRpc[0].heure_fin,
      tarif_applique: montantLigne,
      journees: journeesRpc,
    });
  }
  montantTotal = Math.round(montantTotal * 100) / 100;

  const tauxCommission = await getTauxCommission();
  const montantCommission = Math.round(montantTotal * (tauxCommission / 100) * 100) / 100;

  const { data: missionId, error: missionError } = await admin.rpc("creer_mission_proposee", {
    p_recruteur_id: user.id,
    p_lieu: adresse,
    // Référence de tri/affichage (missions.date_mission, contrat 0062)
    // = la date la plus ancienne parmi TOUTES les journées de TOUTES
    // les lignes. Repli sur input.date si, par construction, aucune
    // journée n'a pu être déterminée (ne devrait jamais arriver : le
    // tableau lignesRpc est non vide à ce stade).
    p_date_mission: premiereDate ?? input.date,
    p_lignes: lignesRpc,
    p_montant_total: montantTotal,
    p_taux_commission: tauxCommission,
    p_montant_commission: montantCommission,
    p_description: titre,
  });
  if (missionError || !missionId) {
    return {
      success: false,
      error: missionError ? traduireErreurDb(missionError, "Échec de la création de la mission.") : "Échec de la création de la mission.",
    };
  }

  await Promise.all(
    input.lignes.map((ligne) => {
      const reel = parId.get(ligne.prestataireId);
      if (!reel) return Promise.resolve();
      const metierLabel = METIERS.find((m) => m.id === reel.metier)?.label ?? reel.metier;
      // Une seule journée (cas N=1, immense majorité aujourd'hui) :
      // ligne identique à avant cette migration. Plusieurs journées :
      // chacune listée avec sa propre date/horaires — jamais un seul
      // horaire affiché pour une mission qui en couvre plusieurs.
      const journeesTriees = journeesParLigne.get(ligne.prestataireId) ?? [];
      const ligneHoraires =
        journeesTriees.length > 1
          ? journeesTriees.map((j) => `${j.date} · ${j.heureDebut} → ${j.heureFin}`).join("\n")
          : `${ligne.heureDebut} → ${ligne.heureFin}`;
      const lignesMessage = [
        `📋 Nouvelle mission proposée : ${titre}`,
        `${adresse} — ${input.date}`,
        `${metierLabel} · ${ligneHoraires}`,
        ...(contexte ? [contexte] : []),
        ...(ligne.precisions.trim() ? [ligne.precisions.trim()] : []),
      ];
      return Promise.all([
        creerMessageSysteme({
          missionId,
          expediteurId: user.id,
          destinataireId: reel.user_id,
          contenu: lignesMessage.join("\n"),
        }),
        creerNotification({
          userId: reel.user_id,
          type: "mission_proposee",
          titre: "Nouvelle mission proposée",
          contenu: `${adresse} — ${input.date}`,
          lien: `/missions/${missionId}`,
          missionId,
        }),
      ]);
    }),
  );

  return { success: true, data: { missionId } };
}
