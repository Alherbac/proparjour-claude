"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  prestataireSubmitSchema,
  type PrestataireSubmitPayload,
} from "@/components/onboarding/prestataire/schema";
import {
  recruteurSchema,
  type RecruteurFormValues,
} from "@/components/onboarding/recruteur/schema";
import { traduireErreurDb } from "@/lib/erreurs-db";
import { detecterCoordonnees, messageCoordonneesBloquees } from "@/lib/coordonnees-interdites";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

/**
 * Écrit le profil prestataire (type + prestataires_profils) via le
 * client admin — nécessaire car `users.type` ne peut pas être
 * modifié par l'utilisateur lui-même (voir trigger
 * prevent_self_type_change). L'identité vient de la session cookie
 * vérifiée côté serveur, jamais d'un id transmis par le client.
 *
 * Depuis la refonte de l'inscription en trois temps
 * (PROMPT-INSCRIPTION.txt), plusieurs champs auparavant demandés ici
 * (statut indépendant, n° de carte CNAPS, langues, tenue, secteur
 * d'expérience, commission) ne sont plus collectés à l'inscription —
 * ils gardent une valeur par défaut sûre et restent modifiables
 * ensuite depuis "Mon compte" (mettreAJourProfilPrestataire,
 * actions/compte.ts), qui écrit ces mêmes colonnes.
 */
export async function completerProfilPrestataire(
  values: PrestataireSubmitPayload,
): Promise<ActionResult<{ profilId: string }>> {
  const parsed = prestataireSubmitSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "Données de profil invalides." };
  }
  const data = parsed.data;

  // Même contrôle que le reste du site (voir mettreAJourProfilPrestataire,
  // actions/compte.ts) : le titre est visible de tout client dès la
  // création du profil, jamais seulement au moment d'une modification
  // ultérieure.
  const coordonneesTitre = detecterCoordonnees(data.titre);
  if (coordonneesTitre) {
    return { success: false, error: messageCoordonneesBloquees(coordonneesTitre) };
  }

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
      // Non collecté au temps 1/2/3 de la nouvelle inscription — la
      // valeur la plus courante par défaut, modifiable ensuite.
      statut_independant: "auto_entrepreneur",
      numero_carte_cnaps: null,
      certifications: [],
      langues: [],
      tenue: null,
      secteur_experience: null,
      remuneration_commission: false,
      specialites: data.specialites,
      annees_experience: data.anneesExperience,
      ville: data.ville,
      zones_deplacement: data.zonesDeplacement,
      // Tarif horaire uniquement à l'inscription (voir schema.ts) —
      // le tarif journalier affiché publiquement en est dérivé
      // (lib/tarif.ts), jamais saisi séparément ici.
      tarif_type: "horaire",
      tarif_montant: data.tarifMontant,
      disponibilites: data.disponibilites,
      visible: data.visible,
      // SKIP_KYC_VALIDATION n'est défini que sur l'environnement de test
      // (jamais en production) — permet d'y exercer tout le parcours
      // (recherche, proposition, candidature) sans validation manuelle
      // par un admin. Absent/faux partout ailleurs : la colonne garde
      // alors son défaut `en_attente`, la vraie vérification KYC reste
      // requise (voir lib/admin/kyc.ts, validerDossier).
      ...(process.env.SKIP_KYC_VALIDATION === "true" ? { statut_verification: "valide" as const } : {}),
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
