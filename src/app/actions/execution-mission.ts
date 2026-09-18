"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creerNotification } from "@/lib/notifications";
import { confirmerServiceFait } from "@/app/actions/missions";
import { creerMessageExecution, type ExecutionPayload } from "@/lib/messages";
import { calculerMontantFinal } from "@/lib/duree";
import { montantDuLigne, repartitionLigne } from "@/lib/facturation";
import { detecterCoordonnees, messageCoordonneesBloquees } from "@/lib/coordonnees-interdites";
import { traduireErreurDb } from "@/lib/erreurs-db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MissionLignesRow } from "@/lib/supabase/database.types";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

const REGEX_HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Ligne + mission + paiement, avec vérification d'appartenance —
 * commune aux six actions ci-dessous pour ne pas répéter six fois la
 * même chaîne de vérifications (existence, appartenance, mission
 * encore active).
 */
async function chargerLignePourExecution(
  admin: SupabaseClient<Database>,
  ligneId: string,
): Promise<{
  ligne: MissionLignesRow;
  mission: { id: string; recruteur_id: string; statut: string };
  taux_commission: number;
} | null> {
  const { data: ligne } = await admin.from("mission_lignes").select("*").eq("id", ligneId).maybeSingle();
  if (!ligne) return null;
  const { data: mission } = await admin
    .from("missions")
    .select("id, recruteur_id, statut")
    .eq("id", ligne.mission_id)
    .maybeSingle();
  if (!mission) return null;
  const { data: paiement } = await admin.from("paiements").select("taux_commission").eq("mission_id", mission.id).maybeSingle();
  if (!paiement) return null;
  return { ligne, mission, taux_commission: paiement.taux_commission };
}

/**
 * Recalcule `paiements.montant`/`montant_commission` à partir de
 * TOUTES les lignes acceptées de la mission (montant final si posé,
 * sinon montant convenu au devis) — même principe que la mise à jour
 * déjà faite par accepterDevis (actions/missions.ts) après une
 * négociation, généralisé pour rester correct sur une mission à
 * plusieurs prestataires où une seule ligne est recalculée au prorata.
 * Met aussi à jour `missions.montant_total` : la fonction Postgres
 * confirmer_paiement_mission (0041) garde déjà ces deux montants
 * strictement synchronisés au moment du paiement — ce suivi
 * d'exécution est le seul autre endroit qui les modifie après coup,
 * donc il doit préserver la même invariance pour que la facture
 * existante (FacturePDF, qui lit mission.montant_total) reste exacte
 * sans avoir besoin d'être réécrite.
 */
async function resynchroniserMontantPaiement(admin: SupabaseClient<Database>, missionId: string): Promise<number | null> {
  const [{ data: lignes }, { data: paiement }] = await Promise.all([
    admin.from("mission_lignes").select("tarif_applique, tarif_final").eq("mission_id", missionId).eq("statut_acceptation", "acceptee"),
    admin.from("paiements").select("taux_commission").eq("mission_id", missionId).maybeSingle(),
  ]);
  if (!paiement) return null;
  const total = (lignes ?? []).reduce((somme, l) => somme + montantDuLigne(l), 0);
  const montant = Math.round(total * 100) / 100;
  const montantCommission = Math.round(montant * (paiement.taux_commission / 100) * 100) / 100;
  await Promise.all([
    admin.from("paiements").update({ montant, montant_commission: montantCommission }).eq("mission_id", missionId),
    admin.from("missions").update({ montant_total: montant }).eq("id", missionId),
  ]);
  return montant;
}

// ============================================================
// 1. Début de mission — déclaration précoce et optionnelle,
//    purement informative : ne conditionne jamais la libération
//    des fonds (qui suit exclusivement la déclaration de FIN,
//    voir plus bas).
// ============================================================

/** Seul le prestataire concerné peut déclarer le début de SA ligne. */
export async function declarerDebutMission(ligneId: string, heureReelle: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  if (!REGEX_HEURE.test(heureReelle)) return { success: false, error: "Heure invalide." };

  const admin = createAdminClient();
  const contexte = await chargerLignePourExecution(admin, ligneId);
  if (!contexte) return { success: false, error: "Ligne de mission introuvable." };
  const { ligne, mission } = contexte;

  const { data: profil } = await admin.from("prestataires_profils").select("id").eq("id", ligne.prestataire_id).eq("user_id", user.id).maybeSingle();
  if (!profil) return { success: false, error: "Cette mission ne vous concerne pas." };
  if (ligne.statut_acceptation !== "acceptee") return { success: false, error: "Vous devez d'abord accepter cette mission." };
  if (mission.statut !== "confirmee" && mission.statut !== "en_cours") {
    return { success: false, error: "Cette mission n'est pas dans un état permettant cette déclaration." };
  }
  if (ligne.heure_debut_statut === "confirmee") {
    return { success: false, error: "Le début de cette mission a déjà été confirmé par le client." };
  }

  const { error } = await admin
    .from("mission_lignes")
    .update({
      heure_debut_reelle: heureReelle,
      heure_debut_declaree_le: new Date().toISOString(),
      heure_debut_declaree_par: user.id,
      heure_debut_statut: "declaree",
    })
    .eq("id", ligneId);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer le début de mission pour le moment.") };

  // Même transition que declarerServiceFaitLigne (actions/missions.ts) —
  // une mission confirmée dont le service a commencé passe "en cours",
  // jamais un nouveau statut inventé.
  await admin.from("missions").update({ statut: "en_cours" }).eq("id", mission.id).eq("statut", "confirmee");

  const payload: ExecutionPayload = {
    evenement: "debut_declare",
    ligneId,
    heureDebutPrevue: ligne.heure_debut,
    heureFinPrevue: ligne.heure_fin,
    heureDebutReelle: heureReelle,
  };
  await creerMessageExecution({
    missionId: mission.id,
    expediteurId: user.id,
    destinataireId: mission.recruteur_id,
    contenu: `🟢 Mission commencée à ${heureReelle}.`,
    execution: payload,
  });
  await creerNotification({
    userId: mission.recruteur_id,
    type: "mission_debut_declare",
    titre: "Mission commencée",
    contenu: `Le prestataire indique avoir commencé la mission à ${heureReelle}.`,
    lien: `/missions/${mission.id}`,
    missionId: mission.id,
  });

  revalidatePath(`/missions/${mission.id}`);
  return { success: true };
}

/** Le client confirme le début déclaré — jamais une transformation automatique de la déclaration en validation (voir contexte §3 de la demande). */
export async function confirmerDebutMission(ligneId: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };

  const admin = createAdminClient();
  const contexte = await chargerLignePourExecution(admin, ligneId);
  if (!contexte) return { success: false, error: "Ligne de mission introuvable." };
  const { ligne, mission } = contexte;
  if (mission.recruteur_id !== user.id) return { success: false, error: "Cette mission ne vous concerne pas." };
  if (ligne.heure_debut_statut !== "declaree") {
    return { success: false, error: "Aucun début de mission à confirmer pour le moment." };
  }

  const { error } = await admin.from("mission_lignes").update({ heure_debut_statut: "confirmee" }).eq("id", ligneId);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible de confirmer pour le moment.") };

  const { data: profilPrestataire } = await admin.from("prestataires_profils").select("user_id").eq("id", ligne.prestataire_id).maybeSingle();
  if (profilPrestataire) {
    await creerMessageExecution({
      missionId: mission.id,
      expediteurId: user.id,
      destinataireId: profilPrestataire.user_id,
      contenu: "✅ Le client a confirmé le début de la mission.",
      execution: {
        evenement: "debut_confirme",
        ligneId,
        heureDebutPrevue: ligne.heure_debut,
        heureFinPrevue: ligne.heure_fin,
        heureDebutReelle: ligne.heure_debut_reelle,
      },
    });
    await creerNotification({
      userId: profilPrestataire.user_id,
      type: "mission_debut_confirme",
      titre: "Début confirmé",
      contenu: "Le client a confirmé le début de la mission.",
      lien: `/missions/${mission.id}`,
      missionId: mission.id,
    });
  }

  revalidatePath(`/missions/${mission.id}`);
  return { success: true };
}

/**
 * Contestation légère du début — purement informative (n'importe
 * quel désaccord réel se règle de toute façon à la déclaration de FIN,
 * qui redemande les deux heures et peut donc corriger celle-ci) :
 * ne bloque jamais la libération des fonds, contrairement à une
 * contestation de FIN.
 */
export async function contesterDebutMission(ligneId: string, motif: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  const motifTrimmed = motif.trim().slice(0, 500);
  if (motifTrimmed) {
    const coordonnees = detecterCoordonnees(motifTrimmed);
    if (coordonnees) return { success: false, error: messageCoordonneesBloquees(coordonnees) };
  }

  const admin = createAdminClient();
  const contexte = await chargerLignePourExecution(admin, ligneId);
  if (!contexte) return { success: false, error: "Ligne de mission introuvable." };
  const { ligne, mission } = contexte;
  if (mission.recruteur_id !== user.id) return { success: false, error: "Cette mission ne vous concerne pas." };
  if (ligne.heure_debut_statut !== "declaree") {
    return { success: false, error: "Aucun début de mission à contester pour le moment." };
  }

  const { error } = await admin
    .from("mission_lignes")
    .update({ heure_debut_statut: "contestee", motif_contestation_debut: motifTrimmed || null })
    .eq("id", ligneId);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer votre signalement pour le moment.") };

  const { data: profilPrestataire } = await admin.from("prestataires_profils").select("user_id").eq("id", ligne.prestataire_id).maybeSingle();
  if (profilPrestataire) {
    await creerMessageExecution({
      missionId: mission.id,
      expediteurId: user.id,
      destinataireId: profilPrestataire.user_id,
      contenu: motifTrimmed ? `⚠️ Le client conteste l'heure de début déclarée : « ${motifTrimmed} »` : "⚠️ Le client conteste l'heure de début déclarée.",
      execution: {
        evenement: "debut_conteste",
        ligneId,
        heureDebutPrevue: ligne.heure_debut,
        heureFinPrevue: ligne.heure_fin,
        heureDebutReelle: ligne.heure_debut_reelle,
        motif: motifTrimmed || undefined,
      },
    });
    await creerNotification({
      userId: profilPrestataire.user_id,
      type: "mission_debut_conteste",
      titre: "Début contesté",
      contenu: "Le client conteste l'heure de début déclarée.",
      lien: `/missions/${mission.id}`,
      missionId: mission.id,
    });
  }

  revalidatePath(`/missions/${mission.id}`);
  return { success: true };
}

// ============================================================
// 2. Fin de mission — "Éditer la facture" : déclaration
//    AUTORITAIRE des deux heures réelles, calcul du montant final
//    au prorata, puis confirmation/contestation par le client.
//    C'est cette étape, jamais le début, qui conditionne la
//    libération des fonds (voir le garde ajouté à
//    confirmerServiceFait, actions/missions.ts).
// ============================================================

export type RecapitulatifFinMission = {
  heureDebutReelle: string;
  heureFinReelle: string;
  dureeHeures: number;
  tarifHoraire: number;
  totalClient: number;
  commission: number;
  netPrestataire: number;
  tauxCommission: number;
  montantInitialDevis: number;
};

/**
 * Le prestataire renseigne le début et la fin réellement effectués —
 * réutilisable tant que la fin n'a pas été confirmée par le client
 * (y compris après une contestation : redéclarer équivaut à proposer
 * une nouvelle version, exactement comme un nouveau devis après une
 * demande d'ajustement). Le calcul est fait ici, côté serveur, à
 * partir de calculerMontantFinal (lib/duree.ts) — jamais un montant
 * transmis par le navigateur.
 */
export async function declarerFinMission(
  ligneId: string,
  heureDebutReelle: string,
  heureFinReelle: string,
): Promise<ActionResult<RecapitulatifFinMission>> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  if (!REGEX_HEURE.test(heureDebutReelle) || !REGEX_HEURE.test(heureFinReelle)) {
    return { success: false, error: "Heures invalides." };
  }
  if (heureDebutReelle === heureFinReelle) {
    return { success: false, error: "L'heure de début et l'heure de fin ne peuvent pas être identiques." };
  }

  const admin = createAdminClient();
  const contexte = await chargerLignePourExecution(admin, ligneId);
  if (!contexte) return { success: false, error: "Ligne de mission introuvable." };
  const { ligne, mission, taux_commission } = contexte;

  const { data: profil } = await admin.from("prestataires_profils").select("id").eq("id", ligne.prestataire_id).eq("user_id", user.id).maybeSingle();
  if (!profil) return { success: false, error: "Cette mission ne vous concerne pas." };
  if (ligne.statut_acceptation !== "acceptee") return { success: false, error: "Vous devez d'abord accepter cette mission." };
  if (mission.statut !== "confirmee" && mission.statut !== "en_cours") {
    return { success: false, error: "Cette mission n'est pas dans un état permettant cette déclaration." };
  }
  if (ligne.heure_fin_statut === "confirmee") {
    return { success: false, error: "Les horaires de fin ont déjà été confirmés par le client." };
  }

  const { dureeHeures, tarifHoraire, montant } = calculerMontantFinal({
    heureDebutPrevue: ligne.heure_debut,
    heureFinPrevue: ligne.heure_fin,
    tarifApplique: ligne.tarif_applique,
    heureDebutReelle,
    heureFinReelle,
  });

  // Si le début avait déjà été confirmé par le client mais que cette
  // déclaration de fin change la valeur, on redemande confirmation
  // (§ "ne jamais permettre de modifier artificiellement le montant
  // après validation") — jamais silencieusement conservé "confirmé"
  // sur une valeur qui vient de changer.
  const debutInchange = ligne.heure_debut_reelle === heureDebutReelle;
  const heureDebutStatut = debutInchange && ligne.heure_debut_statut === "confirmee" ? "confirmee" : "declaree";

  const { error } = await admin
    .from("mission_lignes")
    .update({
      heure_debut_reelle: heureDebutReelle,
      heure_debut_declaree_le: debutInchange ? ligne.heure_debut_declaree_le : new Date().toISOString(),
      heure_debut_declaree_par: debutInchange ? ligne.heure_debut_declaree_par : user.id,
      heure_debut_statut: heureDebutStatut,
      heure_fin_reelle: heureFinReelle,
      heure_fin_declaree_le: new Date().toISOString(),
      heure_fin_declaree_par: user.id,
      heure_fin_statut: "declaree",
      motif_contestation_fin: null,
      tarif_final: montant,
      // Même effet que declarerServiceFaitLigne (actions/missions.ts,
      // réutilisé plutôt que dupliqué) : "Fin de la mission" EST la
      // déclaration de service fait, avec en plus les heures réelles
      // et le montant recalculé.
      service_fait: true,
    })
    .eq("id", ligneId);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer la fin de mission pour le moment.") };

  const { commission, netPrestataire } = repartitionLigne({ tarif_applique: ligne.tarif_applique, tarif_final: montant }, taux_commission);

  const payload: ExecutionPayload = {
    evenement: "fin_declaree",
    ligneId,
    heureDebutPrevue: ligne.heure_debut,
    heureFinPrevue: ligne.heure_fin,
    heureDebutReelle,
    heureFinReelle,
    dureeHeures,
    tarifHoraire,
    totalClient: montant,
    commission,
    netPrestataire,
    tauxCommission: taux_commission,
    montantInitialDevis: ligne.tarif_applique,
  };
  await creerMessageExecution({
    missionId: mission.id,
    expediteurId: user.id,
    destinataireId: mission.recruteur_id,
    contenu: `🟢 Mission terminée à ${heureFinReelle} — ${montant.toFixed(2)} €.`,
    execution: payload,
  });
  await creerNotification({
    userId: mission.recruteur_id,
    type: "mission_fin_declaree",
    titre: "Fin de mission déclarée",
    contenu: `Le prestataire indique avoir terminé à ${heureFinReelle} — ${montant.toFixed(2)} €.`,
    lien: `/missions/${mission.id}`,
    missionId: mission.id,
  });

  revalidatePath(`/missions/${mission.id}`);
  return {
    success: true,
    data: {
      heureDebutReelle,
      heureFinReelle,
      dureeHeures,
      tarifHoraire,
      totalClient: montant,
      commission,
      netPrestataire,
      tauxCommission: taux_commission,
      montantInitialDevis: ligne.tarif_applique,
    },
  };
}

/**
 * Le client confirme les horaires ET le montant déclarés — recalculé
 * ici une seconde fois côté serveur (jamais relu depuis le message,
 * qui n'est qu'un affichage) avant de mettre à jour `paiements`, sur
 * le même principe que accepterDevis (actions/missions.ts).
 *
 * Cas des heures supplémentaires (règle produit 2026-09-17, §5/§10/§25) :
 * si le nouveau total dépasse le montant déjà séquestré, il n'existe
 * aujourd'hui AUCUN mécanisme de paiement complémentaire réutilisable
 * (audité : creerIntentionPaiementMission ne sert qu'au premier
 * paiement d'une mission encore "en_attente") — en créer un
 * improviserait "un deuxième système Stripe", explicitement interdit.
 * Les horaires et le nouveau montant sont donc bien enregistrés et
 * tracés (jamais perdus), mais la libération automatique est
 * volontairement SUSPENDUE dans ce cas précis : mieux vaut un virement
 * en attente qu'un virement incomplet. Un complément réel nécessite
 * une décision produit explicite avant d'être automatisé.
 */
export async function confirmerHorairesFinMission(ligneId: string): Promise<ActionResult<{ complementNecessaire: boolean }>> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };

  const admin = createAdminClient();
  const contexte = await chargerLignePourExecution(admin, ligneId);
  if (!contexte) return { success: false, error: "Ligne de mission introuvable." };
  const { ligne, mission, taux_commission } = contexte;
  if (mission.recruteur_id !== user.id) return { success: false, error: "Cette mission ne vous concerne pas." };
  if (ligne.heure_fin_statut !== "declaree") {
    return { success: false, error: "Aucune fin de mission à confirmer pour le moment." };
  }
  if (!ligne.heure_fin_reelle || !ligne.heure_debut_reelle) {
    return { success: false, error: "Données de déclaration incomplètes." };
  }

  const { montant } = calculerMontantFinal({
    heureDebutPrevue: ligne.heure_debut,
    heureFinPrevue: ligne.heure_fin,
    tarifApplique: ligne.tarif_applique,
    heureDebutReelle: ligne.heure_debut_reelle,
    heureFinReelle: ligne.heure_fin_reelle,
  });

  // Montant déjà séquestré AVANT recalcul — lu ici, jamais après
  // resynchroniserMontantPaiement (qui l'écraserait).
  const { data: paiementAvant } = await admin.from("paiements").select("montant").eq("mission_id", mission.id).maybeSingle();
  const montantDejaSequestre = paiementAvant?.montant ?? 0;

  const { error } = await admin
    .from("mission_lignes")
    .update({ heure_fin_statut: "confirmee", heure_debut_statut: "confirmee", tarif_final: montant })
    .eq("id", ligneId);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible de confirmer pour le moment.") };

  const nouveauTotal = await resynchroniserMontantPaiement(admin, mission.id);
  const complementNecessaire = nouveauTotal !== null && nouveauTotal > montantDejaSequestre + 0.005;
  const complementMontant = complementNecessaire && nouveauTotal !== null ? Math.round((nouveauTotal - montantDejaSequestre) * 100) / 100 : null;

  // Complément pour heures supplémentaires (migration 0060) : tracé
  // ici, réglé séparément par le client via
  // creerIntentionPaiementComplement (actions/paiement-complement.ts,
  // même pipeline Stripe que le paiement initial) — jamais un montant
  // fourni par le navigateur, jamais libéré tant que non réglé (voir
  // le garde ajouté à confirmerServiceFait, actions/missions.ts).
  await admin
    .from("paiements")
    .update({ complement_montant_du: complementMontant, complement_paye: !complementNecessaire })
    .eq("mission_id", mission.id);

  const { commission, netPrestataire } = repartitionLigne({ tarif_applique: ligne.tarif_applique, tarif_final: montant }, taux_commission);
  const { data: profilPrestataire } = await admin.from("prestataires_profils").select("user_id").eq("id", ligne.prestataire_id).maybeSingle();
  const suffixeComplement = complementNecessaire ? " (complément de paiement à traiter avant libération)" : "";
  if (profilPrestataire) {
    await creerMessageExecution({
      missionId: mission.id,
      expediteurId: user.id,
      destinataireId: profilPrestataire.user_id,
      contenu: `✅ Le client a confirmé les horaires — ${montant.toFixed(2)} €.${suffixeComplement}`,
      execution: {
        evenement: "fin_confirmee",
        ligneId,
        heureDebutPrevue: ligne.heure_debut,
        heureFinPrevue: ligne.heure_fin,
        heureDebutReelle: ligne.heure_debut_reelle,
        heureFinReelle: ligne.heure_fin_reelle,
        totalClient: montant,
        commission,
        netPrestataire,
        tauxCommission: taux_commission,
      },
    });
    await creerNotification({
      userId: profilPrestataire.user_id,
      type: "mission_horaires_confirmes",
      titre: "Horaires confirmés",
      contenu: `Le client a confirmé les horaires — ${montant.toFixed(2)} €.${suffixeComplement}`,
      lien: `/missions/${mission.id}`,
      missionId: mission.id,
    });
  }

  // Règle produit 2026-09-17 (§12/§13) : confirmer les horaires ET
  // valider le service fait sont la MÊME action côté client — jamais
  // un bouton séparé ensuite. Réutilise confirmerServiceFait telle
  // quelle (actions/missions.ts, même session utilisateur) : sur une
  // mission à plusieurs prestataires où d'autres lignes restent à
  // confirmer, sa garde existante refuse encore — ignoré ici, ce n'est
  // pas un échec de LA confirmation d'horaires qui vient de réussir ;
  // la libération se fera d'elle-même dès la dernière ligne confirmée.
  //
  // Sauf ici : un complément de paiement nécessaire (heures
  // supplémentaires, voir plus haut) suspend volontairement la
  // libération automatique — aucun mécanisme existant ne permet de
  // collecter ce complément, la libérer maintenant paierait le
  // prestataire au-delà de ce qui a réellement été encaissé.
  if (!complementNecessaire) {
    await confirmerServiceFait(mission.id);
  }

  revalidatePath(`/missions/${mission.id}`);
  return { success: true, data: { complementNecessaire } };
}

/**
 * Contestation légère des horaires de fin — bloque la libération des
 * fonds (voir confirmerServiceFait) tant qu'elle n'est pas résolue.
 * Résolution : le prestataire redéclare (declarerFinMission), qui
 * accepte explicitement un statut "contestee" en entrée — jamais
 * besoin d'un outil d'arbitrage séparé pour ce niveau de désaccord.
 * Un désaccord plus lourd reste le rôle de contesterMission (litige),
 * inchangée, toujours disponible séparément côté client.
 */
export async function contesterHorairesFinMission(ligneId: string, motif: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  const motifTrimmed = motif.trim().slice(0, 500);
  if (motifTrimmed) {
    const coordonnees = detecterCoordonnees(motifTrimmed);
    if (coordonnees) return { success: false, error: messageCoordonneesBloquees(coordonnees) };
  }

  const admin = createAdminClient();
  const contexte = await chargerLignePourExecution(admin, ligneId);
  if (!contexte) return { success: false, error: "Ligne de mission introuvable." };
  const { ligne, mission } = contexte;
  if (mission.recruteur_id !== user.id) return { success: false, error: "Cette mission ne vous concerne pas." };
  if (ligne.heure_fin_statut !== "declaree") {
    return { success: false, error: "Aucune fin de mission à contester pour le moment." };
  }

  const { error } = await admin
    .from("mission_lignes")
    .update({ heure_fin_statut: "contestee", motif_contestation_fin: motifTrimmed || null })
    .eq("id", ligneId);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer votre signalement pour le moment.") };

  const { data: profilPrestataire } = await admin.from("prestataires_profils").select("user_id").eq("id", ligne.prestataire_id).maybeSingle();
  if (profilPrestataire) {
    await creerMessageExecution({
      missionId: mission.id,
      expediteurId: user.id,
      destinataireId: profilPrestataire.user_id,
      contenu: motifTrimmed
        ? `⚠️ Un désaccord a été signalé sur les horaires de fin : « ${motifTrimmed} ». Le paiement reste en attente de résolution.`
        : "⚠️ Un désaccord a été signalé sur les horaires de fin. Le paiement reste en attente de résolution.",
      execution: {
        evenement: "fin_contestee",
        ligneId,
        heureDebutPrevue: ligne.heure_debut,
        heureFinPrevue: ligne.heure_fin,
        heureDebutReelle: ligne.heure_debut_reelle,
        heureFinReelle: ligne.heure_fin_reelle,
        motif: motifTrimmed || undefined,
      },
    });
    await creerNotification({
      userId: profilPrestataire.user_id,
      type: "mission_horaires_contestes",
      titre: "Horaires contestés",
      contenu: "Le client conteste les horaires de fin déclarés. Merci de redéclarer les horaires réels.",
      lien: `/missions/${mission.id}`,
      missionId: mission.id,
    });
  }

  revalidatePath(`/missions/${mission.id}`);
  return { success: true };
}
