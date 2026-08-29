"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTauxCommission } from "@/lib/commission";
import { montantMission } from "@/lib/duree";
import { creerNotification } from "@/lib/notifications";
import { creerMessageSysteme } from "@/lib/messages";
import { traduireErreurDb } from "@/lib/erreurs-db";
import { METIERS } from "@/config/metiers";
import type { MetierType } from "@/lib/supabase/database.types";

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
  for (const ligne of input.lignes) {
    if (!ligne.heureDebut || !ligne.heureFin || ligne.heureDebut === ligne.heureFin) {
      return { success: false, error: `Horaires requis pour ${ligne.prenom}.` };
    }
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
  }[] = [];
  let montantTotal = 0;

  for (const ligne of input.lignes) {
    const reel = parId.get(ligne.prestataireId);
    if (!reel) {
      return { success: false, error: `${ligne.prenom} n'est plus disponible à la réservation.` };
    }
    const montant = montantMission(ligne.heureDebut, ligne.heureFin, reel.tarif_montant ?? 0);
    montantTotal += montant;
    lignesRpc.push({
      prestataire_id: reel.id,
      metier: reel.metier,
      heure_debut: ligne.heureDebut,
      heure_fin: ligne.heureFin,
      tarif_applique: montant,
    });
  }
  montantTotal = Math.round(montantTotal * 100) / 100;

  const tauxCommission = await getTauxCommission();
  const montantCommission = Math.round(montantTotal * (tauxCommission / 100) * 100) / 100;

  const { data: missionId, error: missionError } = await admin.rpc("creer_mission_proposee", {
    p_recruteur_id: user.id,
    p_lieu: adresse,
    p_date_mission: input.date,
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
      const lignesMessage = [
        `📋 Nouvelle mission proposée : ${titre}`,
        `${adresse} — ${input.date}`,
        `${metierLabel} · ${ligne.heureDebut} → ${ligne.heureFin}`,
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
