"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  prestataireSchema,
  type PrestataireFormValues,
} from "@/components/onboarding/prestataire/schema";
import {
  recruteurSchema,
  type RecruteurFormValues,
} from "@/components/onboarding/recruteur/schema";
import { traduireErreurDb } from "@/lib/erreurs-db";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

/**
 * Écrit le profil prestataire (type + prestataires_profils) via le
 * client admin — nécessaire car `users.type` ne peut pas être
 * modifié par l'utilisateur lui-même (voir trigger
 * prevent_self_type_change). L'identité vient de la session cookie
 * vérifiée côté serveur, jamais d'un id transmis par le client.
 */
export async function completerProfilPrestataire(
  values: PrestataireFormValues,
): Promise<ActionResult<{ profilId: string }>> {
  const parsed = prestataireSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "Données de profil invalides." };
  }
  const data = parsed.data;

  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { error: userError } = await admin
    .from("users")
    .update({
      type: "prestataire",
      prenom: data.prenom,
      nom: data.nom,
      telephone: data.telephone,
    })
    .eq("id", user.id);

  if (userError) {
    return { success: false, error: traduireErreurDb(userError, "Impossible d'enregistrer votre profil pour le moment.") };
  }

  const { data: profil, error: profilError } = await admin
    .from("prestataires_profils")
    .insert({
      user_id: user.id,
      metier: data.metier,
      titre: data.titre,
      statut_independant: data.statutIndependant,
      numero_carte_cnaps: data.numeroCarteCnaps || null,
      certifications: data.certifications,
      langues: data.langues,
      tenue: data.tenue || null,
      secteur_experience: data.secteurExperience || null,
      remuneration_commission: data.remunerationCommission,
      specialites: data.specialites,
      ville: data.ville,
      tarif_type: data.tarifType,
      tarif_montant: data.tarifMontant,
      disponibilites: data.disponibilites,
    })
    .select("id")
    .single();

  if (profilError || !profil) {
    return { success: false, error: profilError ? traduireErreurDb(profilError, "Échec de la création du profil.") : "Échec de la création du profil." };
  }

  return { success: true, data: { profilId: profil.id } };
}

/**
 * Écrit le profil recruteur (type + entreprises éventuellement) via
 * le client admin, pour la même raison que ci-dessus.
 */
export async function completerProfilRecruteur(
  values: RecruteurFormValues,
): Promise<ActionResult> {
  const parsed = recruteurSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "Données de profil invalides." };
  }
  const data = parsed.data;

  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();
  const type =
    data.typeCompte === "entreprise" ? "recruteur_entreprise" : "recruteur_particulier";

  const { error: userError } = await admin
    .from("users")
    .update({
      type,
      prenom: data.prenom,
      nom: data.nom,
      telephone: data.telephone,
      ville: data.ville,
    })
    .eq("id", user.id);

  if (userError) {
    return { success: false, error: traduireErreurDb(userError, "Impossible d'enregistrer votre profil pour le moment.") };
  }

  if (data.typeCompte === "entreprise") {
    if (!data.raisonSociale?.trim() || !data.siret?.trim() || !data.secteurActivite?.trim()) {
      return { success: false, error: "Informations entreprise incomplètes." };
    }
    const { error: entrepriseError } = await admin.from("entreprises").insert({
      user_id: user.id,
      raison_sociale: data.raisonSociale,
      siret: data.siret,
      secteur_activite: data.secteurActivite,
    });
    if (entrepriseError) {
      return {
        success: false,
        error: entrepriseError.code === "23514" ? "Le SIRET doit contenir exactement 14 chiffres." : traduireErreurDb(entrepriseError, "Impossible d'enregistrer les informations de l'entreprise."),
      };
    }
  }

  return { success: true };
}
