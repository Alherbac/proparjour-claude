"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";

type ActionResult = { success: true } | { success: false; error: string };

const DELAI_ANNULATION_HEURES = 48;

export async function repondreMissionLigne(
  ligneId: string,
  reponse: "acceptee" | "refusee",
): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { data: ligne, error: ligneError } = await admin
    .from("mission_lignes")
    .select("id, mission_id, prestataire_id")
    .eq("id", ligneId)
    .maybeSingle();

  if (ligneError || !ligne) {
    return { success: false, error: "Ligne de mission introuvable." };
  }

  const { data: profil } = await admin
    .from("prestataires_profils")
    .select("id")
    .eq("id", ligne.prestataire_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profil) {
    return { success: false, error: "Cette mission ne vous concerne pas." };
  }

  const { error: updateError } = await admin
    .from("mission_lignes")
    .update({ statut_acceptation: reponse })
    .eq("id", ligneId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (reponse === "acceptee") {
    const { data: toutesLesLignes } = await admin
      .from("mission_lignes")
      .select("statut_acceptation")
      .eq("mission_id", ligne.mission_id);

    const toutesAcceptees = (toutesLesLignes ?? []).every(
      (l) => l.statut_acceptation === "acceptee",
    );

    if (toutesAcceptees) {
      await admin.from("missions").update({ statut: "confirmee" }).eq("id", ligne.mission_id);
    }
  }

  return { success: true };
}

/**
 * Politique d'annulation fixe (cahier des charges 3.5) : annulation
 * possible jusqu'à 48h avant le début réel de la mission (date +
 * heure de début la plus tôt parmi ses lignes). Passé ce délai, la
 * mission est considérée comme effectuée — le recruteur est facturé
 * en totalité, le prestataire payé comme si la mission avait eu lieu.
 */
export async function annulerMission(missionId: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { data: mission } = await admin
    .from("missions")
    .select("id, recruteur_id, statut, date_mission")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission || mission.recruteur_id !== user.id) {
    return { success: false, error: "Mission introuvable." };
  }
  if (mission.statut === "annulee" || mission.statut === "terminee" || mission.statut === "litige") {
    return { success: false, error: "Cette mission ne peut plus être annulée." };
  }

  const { data: lignes } = await admin
    .from("mission_lignes")
    .select("heure_debut")
    .eq("mission_id", missionId);

  const heureDebutMin = [...(lignes ?? [])].map((l) => l.heure_debut).sort()[0] ?? "00:00:00";
  const debutMission = new Date(`${mission.date_mission}T${heureDebutMin}`);
  const heuresRestantes = (debutMission.getTime() - Date.now()) / 3_600_000;

  if (heuresRestantes < DELAI_ANNULATION_HEURES) {
    return {
      success: false,
      error: `Annulation impossible : la mission a lieu dans moins de ${DELAI_ANNULATION_HEURES}h. Elle est considérée comme effectuée.`,
    };
  }

  const { error: updateError } = await admin
    .from("missions")
    .update({ statut: "annulee" })
    .eq("id", missionId);
  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { data: paiement } = await admin
    .from("paiements")
    .select("stripe_payment_intent_id")
    .eq("mission_id", missionId)
    .maybeSingle();

  await admin
    .from("paiements")
    .update({ statut: "rembourse", date_deblocage: new Date().toISOString() })
    .eq("mission_id", missionId);

  // Remboursement Stripe réel, best-effort : si Stripe n'est pas
  // encore configuré, le statut DB reflète déjà l'annulation — le
  // remboursement effectif sera à réconcilier manuellement une fois
  // les clés en place.
  if (paiement?.stripe_payment_intent_id) {
    try {
      const stripe = getStripeClient();
      await stripe.refunds.create({ payment_intent: paiement.stripe_payment_intent_id });
    } catch {
      // Ignoré volontairement — voir commentaire ci-dessus.
    }
  }

  return { success: true };
}

/**
 * Le prestataire déclare le service fait sur sa propre ligne de
 * mission (cahier des charges 3.9, étape 4) — pas avant le jour de la
 * mission, pas avant d'avoir accepté sa ligne.
 */
export async function declarerServiceFaitLigne(ligneId: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { data: ligne } = await admin
    .from("mission_lignes")
    .select("id, mission_id, prestataire_id, statut_acceptation, service_fait")
    .eq("id", ligneId)
    .maybeSingle();

  if (!ligne) {
    return { success: false, error: "Ligne de mission introuvable." };
  }

  const { data: profil } = await admin
    .from("prestataires_profils")
    .select("id")
    .eq("id", ligne.prestataire_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profil) {
    return { success: false, error: "Cette mission ne vous concerne pas." };
  }

  if (ligne.statut_acceptation !== "acceptee") {
    return { success: false, error: "Vous devez d'abord accepter cette mission." };
  }
  if (ligne.service_fait) {
    return { success: true };
  }

  const { data: mission } = await admin
    .from("missions")
    .select("statut, date_mission")
    .eq("id", ligne.mission_id)
    .maybeSingle();
  if (!mission) {
    return { success: false, error: "Mission introuvable." };
  }
  if (mission.statut !== "confirmee" && mission.statut !== "en_cours") {
    return { success: false, error: "Cette mission n'est pas dans un état permettant cette déclaration." };
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (mission.date_mission > aujourdhui) {
    return { success: false, error: "Vous ne pouvez déclarer le service fait qu'à partir du jour de la mission." };
  }

  const { error } = await admin
    .from("mission_lignes")
    .update({ service_fait: true })
    .eq("id", ligneId);
  if (error) {
    return { success: false, error: error.message };
  }

  await admin.from("missions").update({ statut: "en_cours" }).eq("id", ligne.mission_id).eq("statut", "confirmee");

  return { success: true };
}

/**
 * Le recruteur confirme que le service a bien été rendu (cahier des
 * charges 3.9, étape 5) — débloque le paiement séquestré, commission
 * déduite. Le recruteur peut confirmer même si un prestataire n'a pas
 * lui-même déclaré sa ligne (cahier : "le prestataire et/ou le
 * recruteur"), sa confirmation fait foi.
 */
export async function confirmerServiceFait(missionId: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { data: mission } = await admin
    .from("missions")
    .select("id, recruteur_id, statut")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission || mission.recruteur_id !== user.id) {
    return { success: false, error: "Mission introuvable." };
  }
  if (mission.statut !== "confirmee" && mission.statut !== "en_cours") {
    return { success: false, error: "Cette mission n'est pas dans un état permettant cette confirmation." };
  }

  await admin.from("mission_lignes").update({ service_fait: true }).eq("mission_id", missionId);

  const { error: missionError } = await admin
    .from("missions")
    .update({ statut: "terminee", service_fait: true })
    .eq("id", missionId);
  if (missionError) {
    return { success: false, error: missionError.message };
  }

  const { error: paiementError } = await admin
    .from("paiements")
    .update({ statut: "libere", date_deblocage: new Date().toISOString() })
    .eq("mission_id", missionId);
  if (paiementError) {
    return { success: false, error: paiementError.message };
  }

  return { success: true };
}

/**
 * Le recruteur conteste la réalisation du service : la mission
 * bascule en litige, arbitrable depuis le tableau de bord admin
 * (Étape 9, pas encore construit — la contestation est capturée dès
 * maintenant pour ne pas perdre l'information).
 */
export async function contesterMission(missionId: string, motif: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }
  if (!motif.trim()) {
    return { success: false, error: "Merci de préciser le motif de la contestation." };
  }

  const admin = createAdminClient();

  const { data: mission } = await admin
    .from("missions")
    .select("id, recruteur_id, statut")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission || mission.recruteur_id !== user.id) {
    return { success: false, error: "Mission introuvable." };
  }
  if (mission.statut !== "confirmee" && mission.statut !== "en_cours") {
    return { success: false, error: "Cette mission n'est pas dans un état permettant une contestation." };
  }

  const { error } = await admin
    .from("missions")
    .update({ statut: "litige", motif_litige: motif.trim() })
    .eq("id", missionId);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
