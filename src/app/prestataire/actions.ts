"use server";

import { revalidatePath } from "next/cache";
import { creerClientSession, creerClientAdmin } from "@/app/prestataire/_supabase";
import { detecterCoordonnees, messageCoordonneesBloquees } from "@/lib/coordonnees-interdites";
import type { LigneStatutType } from "@/lib/supabase/database.types";

type Resultat = { success: true } | { success: false; error: string };

async function verifierProfil(userId: string) {
  const supabase = await creerClientSession();
  const { data } = await supabase.from("prestataires_profils").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

/**
 * `mission_lignes` n'a aucune policy RLS UPDATE pour un utilisateur
 * normal (constaté en vérification live : l'update rendait 0 ligne
 * affectée, sans erreur) — le comportement réel du site l'écrit via
 * le client admin (voir actions/missions.ts, lu pour comprendre
 * l'écart, jamais importé : Règle N°0), après avoir vérifié que la
 * ligne appartient bien à l'appelant. Accepter la dernière ligne en
 * attente d'une mission la fait passer à "confirmee" — même règle
 * que le comportement réel.
 */
async function repondreLigne(ligneId: string, reponse: "acceptee" | "refusee"): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  const profilId = await verifierProfil(user.id);
  if (!profilId) return { success: false, error: "Profil introuvable." };

  const { data: ligne } = await supabase.from("mission_lignes").select("id, mission_id, statut_acceptation").eq("id", ligneId).eq("prestataire_id", profilId).maybeSingle();
  if (!ligne) return { success: false, error: "Cette mission ne vous concerne pas." };
  if (ligne.statut_acceptation !== "en_attente") return { success: false, error: "Cette proposition a déjà reçu une réponse." };

  const admin = creerClientAdmin();
  const { error } = await admin.from("mission_lignes").update({ statut_acceptation: reponse }).eq("id", ligneId);
  if (error) return { success: false, error: "Impossible d'enregistrer votre réponse pour le moment." };

  if (reponse === "acceptee") {
    const { data: toutesLesLignes } = await admin.from("mission_lignes").select("statut_acceptation").eq("mission_id", ligne.mission_id);
    const toutesAcceptees = (toutesLesLignes ?? []).every((l) => l.statut_acceptation === "acceptee");
    if (toutesAcceptees) await admin.from("missions").update({ statut: "confirmee" }).eq("id", ligne.mission_id);
  }

  revalidatePath("/prestataire/missions");
  revalidatePath("/prestataire");
  return { success: true };
}

export async function accepterMission(ligneId: string): Promise<Resultat> {
  return repondreLigne(ligneId, "acceptee");
}

export async function declinerMission(ligneId: string): Promise<Resultat> {
  return repondreLigne(ligneId, "refusee");
  return { success: true };
}

/** Un jour marqué indisponible/disponible en exception ponctuelle — jamais sur un jour de mission confirmée (§5 "cursor: not-allowed"), revérifié côté serveur. */
export async function basculerJourDisponibilite(date: string, disponible: boolean): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  const profilId = await verifierProfil(user.id);
  if (!profilId) return { success: false, error: "Profil introuvable." };

  const { data: lignesAcceptees } = await supabase.from("mission_lignes").select("mission_id").eq("prestataire_id", profilId).eq("statut_acceptation", "acceptee");
  const missionIds = (lignesAcceptees ?? []).map((l) => l.mission_id);
  const { data: missionCeJour } =
    missionIds.length > 0
      ? await supabase.from("missions").select("id").eq("date_mission", date).in("id", missionIds).not("statut", "in", "(annulee,terminee)").limit(1).maybeSingle()
      : { data: null };
  if (missionCeJour) return { success: false, error: "Ce jour porte une mission confirmée — non modifiable ici." };

  const { data: existante } = await supabase
    .from("prestataires_disponibilites_exceptions")
    .select("id")
    .eq("prestataire_id", profilId)
    .eq("date", date)
    .maybeSingle();

  const { error } = existante
    ? await supabase.from("prestataires_disponibilites_exceptions").update({ disponible }).eq("id", existante.id)
    : await supabase.from("prestataires_disponibilites_exceptions").insert({ prestataire_id: profilId, date, disponible, heure_debut: null, heure_fin: null });
  if (error) return { success: false, error: "Impossible d'enregistrer pour le moment." };

  revalidatePath("/prestataire/disponibilites");
  revalidatePath("/prestataire");
  return { success: true };
}

/** Retire une exception (redevient le jour "habituel" déterminé par les disponibilités hebdomadaires). */
export async function retirerExceptionDisponibilite(date: string): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  const profilId = await verifierProfil(user.id);
  if (!profilId) return { success: false, error: "Profil introuvable." };

  const { error } = await supabase.from("prestataires_disponibilites_exceptions").delete().eq("prestataire_id", profilId).eq("date", date);
  if (error) return { success: false, error: "Impossible de retirer cette exception pour le moment." };

  revalidatePath("/prestataire/disponibilites");
  return { success: true };
}

export async function enregistrerPhotoProfil(url: string): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };

  const { error } = await supabase.from("prestataires_profils").update({ photo_url: url }).eq("user_id", user.id);
  if (error) return { success: false, error: "Impossible d'enregistrer la photo pour le moment." };

  revalidatePath("/prestataire/profil");
  revalidatePath("/prestataire");
  return { success: true };
}

export async function supprimerPhotoProfil(): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };

  const { error } = await supabase.from("prestataires_profils").update({ photo_url: null }).eq("user_id", user.id);
  if (error) return { success: false, error: "Impossible de supprimer la photo pour le moment." };

  revalidatePath("/prestataire/profil");
  revalidatePath("/prestataire");
  return { success: true };
}

export type ExperienceInput = { intitule: string; employeur: string; periode: string; lieu: string; description: string };

export async function ajouterExperience(input: ExperienceInput): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  const profilId = await verifierProfil(user.id);
  if (!profilId) return { success: false, error: "Profil introuvable." };
  if (!input.intitule.trim() || !input.periode.trim()) return { success: false, error: "L'intitulé et la période sont requis." };
  // Même contrôle que le reste du profil (voir mettreAJourProfilPrestataire,
  // actions/compte.ts) : une expérience s'affiche aussi sur la fiche
  // candidat/publique, un vecteur de contournement au même titre que
  // le titre ou la bio.
  for (const champ of [input.intitule, input.employeur, input.lieu, input.description]) {
    const coordonnees = detecterCoordonnees(champ);
    if (coordonnees) {
      return { success: false, error: messageCoordonneesBloquees(coordonnees) };
    }
  }

  const { error } = await supabase.from("experiences").insert({
    prestataire_id: profilId,
    intitule: input.intitule.trim(),
    employeur: input.employeur.trim() || null,
    periode: input.periode.trim(),
    lieu: input.lieu.trim() || null,
    description: input.description.trim() || null,
  });
  if (error) return { success: false, error: "Impossible d'enregistrer cette expérience pour le moment." };

  revalidatePath("/prestataire/profil");
  return { success: true };
}

export async function supprimerExperience(experienceId: string): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  const profilId = await verifierProfil(user.id);
  if (!profilId) return { success: false, error: "Profil introuvable." };

  const { error } = await supabase.from("experiences").delete().eq("id", experienceId).eq("prestataire_id", profilId);
  if (error) return { success: false, error: "Impossible de retirer cette expérience pour le moment." };

  revalidatePath("/prestataire/profil");
  return { success: true };
}

const TYPES_DOCUMENT_LABEL: Record<string, string> = {
  carte_cnaps: "Carte professionnelle CNAPS",
  carte_pro: "Carte professionnelle",
  urssaf: "Attestation URSSAF",
  identite: "Pièce d'identité",
  kbis: "Extrait Kbis",
};

export async function enregistrerJustificatif(typeDocument: string, storagePath: string): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  const profilId = await verifierProfil(user.id);
  if (!profilId) return { success: false, error: "Profil introuvable." };
  if (!(typeDocument in TYPES_DOCUMENT_LABEL)) return { success: false, error: "Type de document inconnu." };

  const { error } = await supabase
    .from("justificatifs")
    .insert({ prestataire_id: profilId, type_document: typeDocument, storage_path: storagePath, statut: "en_attente" });
  if (error) return { success: false, error: "Impossible d'enregistrer ce document pour le moment." };

  revalidatePath("/prestataire/profil");
  revalidatePath("/prestataire");
  return { success: true };
}

const STATUTS_LIGNE_BLOQUANTS: LigneStatutType[] = ["acceptee"];

/** Suppression de compte prestataire — motif obligatoire, bloquée si une mission acceptée n'est pas encore terminée/annulée. */
export async function demanderSuppressionComptePrestataire(motif: string): Promise<Resultat> {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };
  if (!motif.trim()) return { success: false, error: "Un motif est requis." };
  const profilId = await verifierProfil(user.id);
  if (!profilId) return { success: false, error: "Profil introuvable." };

  const { data: lignesAcceptees } = await supabase.from("mission_lignes").select("mission_id").eq("prestataire_id", profilId).in("statut_acceptation", STATUTS_LIGNE_BLOQUANTS);
  const missionIds = (lignesAcceptees ?? []).map((l) => l.mission_id);
  const { data: missionBloquante } =
    missionIds.length > 0
      ? await supabase.from("missions").select("id, lieu").in("id", missionIds).not("statut", "in", "(annulee,terminee)").limit(1).maybeSingle()
      : { data: null };
  if (missionBloquante) {
    return { success: false, error: `Une mission en cours (${missionBloquante.lieu}) doit d'abord être terminée.` };
  }

  const { error } = await supabase.from("demandes_suppression_compte").insert({ user_id: user.id, motif, statut: "en_attente" });
  if (error) return { success: false, error: "Impossible d'enregistrer votre demande pour le moment." };

  revalidatePath("/prestataire/profil");
  return { success: true };
}
