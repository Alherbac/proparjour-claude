"use server";

import { revalidatePath } from "next/cache";
import { creerClientSession, creerClientAdmin } from "@/app/client/_supabase";
import { heuresEntre } from "@/app/client/_lib";

type Resultat = { success: true; missionId?: string | null } | { success: false; error: string };

/**
 * "Retenir" une candidature — même effet réel que le parcours
 * existant (statut → "en_discussion", jamais "acceptee" directement :
 * seul un paiement de devis confirmé engage réellement, cf. le
 * commentaire de retenirCandidature dans client/actions.ts, lu pour
 * comprendre le comportement attendu, jamais importé). Crée la
 * mission via la fonction Postgres `creer_mission_depuis_candidature`
 * (infrastructure de base de données, pas un fichier applicatif
 * réutilisé) avec le taux de commission par défaut réellement
 * appliqué par la plateforme (table `parametres_commission`, repli
 * 15 % — TAUX_COMMISSION_DEFAUT, src/lib/stripe/server.ts).
 *
 * Simplification assumée et à signaler : la hiérarchie de taux
 * individuel/segment n'est pas relue ici, seulement le taux global —
 * ce écran isolé ne doit pas dupliquer toute la logique de
 * src/lib/commission.ts.
 */
export async function retenirCandidature(candidatureId: string): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };

  const { data: candidature } = await supabase.from("candidatures").select("id, offre_id, prestataire_id, statut, profil_consulte_le").eq("id", candidatureId).maybeSingle();
  if (!candidature) return { success: false, error: "Candidature introuvable." };
  if (candidature.statut !== "en_attente") return { success: false, error: "Cette candidature a déjà reçu une réponse." };
  // Contrôle serveur du nouveau parcours obligatoire (voir §1
  // "CANDIDATURES REÇUES — WORKFLOW OBLIGATOIRE") : impossible
  // d'ouvrir la conversation (donc de "retenir") sans être passé par
  // la fiche privée du candidat au moins une fois — jamais seulement
  // un bouton caché côté interface, revérifié ici depuis la colonne
  // écrite par marquerProfilConsulte.
  if (!candidature.profil_consulte_le) {
    return { success: false, error: "Consultez le profil du candidat avant de le retenir." };
  }

  const { error: updateError } = await supabase.from("candidatures").update({ statut: "en_discussion" }).eq("id", candidatureId);
  if (updateError) return { success: false, error: "Impossible d'enregistrer votre réponse pour le moment." };

  const admin = creerClientAdmin();
  const [{ data: offre }, { data: profil }, { data: parametresCommission }] = await Promise.all([
    supabase.from("offres").select("titre, description, metier, ville, date_mission, heure_debut, heure_fin, tarif_horaire").eq("id", candidature.offre_id).maybeSingle(),
    admin.from("prestataires_profils").select("id, user_id").eq("id", candidature.prestataire_id).maybeSingle(),
    admin.from("parametres_commission").select("taux").eq("id", true).maybeSingle(),
  ]);

  if (!offre || !profil) {
    revalidatePath("/client/candidatures");
    return { success: true, missionId: null };
  }

  await supabase.from("offres").update({ statut: "pourvue" }).eq("id", candidature.offre_id);
  // Une offre ne porte qu'un seul poste dans ce schéma : retenir un
  // candidat écarte automatiquement les autres candidatures encore en
  // attente sur la même offre (elles restent réintégrables).
  await supabase.from("candidatures").update({ statut: "refusee" }).eq("offre_id", candidature.offre_id).eq("statut", "en_attente");

  const heures = heuresEntre(offre.heure_debut, offre.heure_fin);
  const montantTotal = Math.round(heures * offre.tarif_horaire * 100) / 100;
  const tauxCommission = parametresCommission?.taux ?? 15;
  const montantCommission = Math.round(montantTotal * (tauxCommission / 100) * 100) / 100;

  const { data: missionId, error: missionError } = await admin.rpc("creer_mission_depuis_candidature", {
    p_recruteur_id: user.id,
    p_offre_id: candidature.offre_id,
    p_candidature_id: candidature.id,
    p_prestataire_id: profil.id,
    p_metier: offre.metier,
    p_lieu: offre.ville,
    p_date_mission: offre.date_mission,
    p_heure_debut: offre.heure_debut,
    p_heure_fin: offre.heure_fin,
    p_tarif_applique: montantTotal,
    p_montant_total: montantTotal,
    p_taux_commission: tauxCommission,
    p_montant_commission: montantCommission,
    p_description: offre.description || null,
  });
  if (missionError || !missionId) {
    return { success: false, error: "Candidature retenue, mais la création de la mission a échoué — contactez le support." };
  }

  // Un message de type "systeme" ne passe pas la policy RLS d'un
  // utilisateur normal (constaté en vérification live : l'insert
  // échouait silencieusement via le client de session) — le
  // comportement réel du site les insère via le client admin (voir
  // creerMessageSysteme, lib/messages.ts, lu pour comprendre l'écart,
  // jamais importé : Règle N°0).
  await admin.from("messages").insert({
    mission_id: missionId,
    expediteur_id: user.id,
    destinataire_id: profil.user_id,
    contenu: "✅ Votre candidature a été retenue — vous pouvez échanger, puis envoyer votre devis.",
    type: "systeme",
    lu: false,
  });
  await admin.from("notifications").insert({
    user_id: profil.user_id,
    type: "candidature_retenue",
    titre: "Candidature retenue",
    contenu: offre.titre,
    lien: `/missions/${missionId}`,
    mission_id: missionId,
    lu: false,
  });

  revalidatePath("/client/candidatures");
  revalidatePath("/client");
  return { success: true, missionId };
}

export async function reintegrerCandidature(candidatureId: string): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };

  const { error } = await supabase.from("candidatures").update({ statut: "en_attente" }).eq("id", candidatureId);
  if (error) return { success: false, error: "Impossible de réintégrer cette candidature pour le moment." };

  revalidatePath("/client/candidatures");
  revalidatePath("/client");
  return { success: true };
}

/**
 * "Ne pas retenir" (icône poubelle, §1) — reste disponible directement
 * depuis la liste, sans passer par le profil ni la conversation :
 * seul "retenir" (voir retenirCandidature) exige ces deux étapes. Même
 * garde de statut que le reste du fichier : une candidature déjà
 * répondue (en_discussion/acceptee/refusee) ne peut plus être écartée
 * par ce chemin. Ne supprime ni la candidature ni ses données — elle
 * reste consultable via le filtre "Écartées" et réintégrable
 * (reintegrerCandidature).
 */
export async function refuserCandidature(candidatureId: string): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };

  const { data: candidature } = await supabase.from("candidatures").select("id, statut").eq("id", candidatureId).maybeSingle();
  if (!candidature) return { success: false, error: "Candidature introuvable." };
  if (candidature.statut !== "en_attente") return { success: false, error: "Cette candidature a déjà reçu une réponse." };

  const { error } = await supabase.from("candidatures").update({ statut: "refusee" }).eq("id", candidatureId);
  if (error) return { success: false, error: "Impossible d'écarter cette candidature pour le moment." };

  revalidatePath("/client/candidatures");
  revalidatePath("/client");
  return { success: true };
}

/**
 * Marque la fiche privée d'un candidat comme consultée (icône œil,
 * §1) — première étape obligatoire avant "retenir" (voir
 * retenirCandidature). Appelée depuis /client/candidats/[id] à chaque
 * chargement ; n'écrit qu'une fois (le premier appel fixe
 * définitivement la date, les suivants ne changent rien) et ne fait
 * jamais échouer l'affichage de la fiche si l'écriture échoue —
 * cohérent avec le reste du site (creerNotification, etc., best-effort).
 */
export async function marquerProfilConsulte(candidatureId: string): Promise<void> {
  try {
    const supabase = await creerClientSession();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: candidature } = await supabase
      .from("candidatures")
      .select("id, profil_consulte_le")
      .eq("id", candidatureId)
      .maybeSingle();
    if (!candidature || candidature.profil_consulte_le) return;

    await supabase.from("candidatures").update({ profil_consulte_le: new Date().toISOString() }).eq("id", candidatureId);
    revalidatePath("/client/candidatures");
  } catch {
    // Volontairement ignoré — voir commentaire ci-dessus.
  }
}

// La suppression de compte (RGPD) est désormais centralisée dans
// src/app/actions/suppression-compte.ts::demanderSuppressionCompte,
// appelée directement par l'UI /client et /prestataire (audit prod —
// déduplication des 3 implémentations).
