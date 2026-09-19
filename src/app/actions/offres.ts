"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creerNotification } from "@/lib/notifications";
import { METIERS } from "@/config/metiers";
import type { MetierType } from "@/lib/supabase/database.types";
import { traduireErreurDb } from "@/lib/erreurs-db";
import { detecterCoordonnees, messageCoordonneesBloquees } from "@/lib/coordonnees-interdites";
import { envoyerEmailNouvelleOffre } from "@/lib/email";
import type { ContexteDetecte, ContrainteDetectee } from "@/lib/besoin";
import { type JourneeMission, validerJournees, trierJourneesParDate } from "@/lib/journees";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

export type PublierOffreInput = {
  titre: string;
  description: string;
  metier: MetierType;
  ville: string;
  dateMission: string;
  heureDebut: string;
  heureFin: string;
  tarifHoraire: number;
  /**
   * Mission multi-jours (migration 0062) — optionnel : absent ou
   * vide, l'offre reste une seule journée {dateMission, heureDebut,
   * heureFin} — cas N=1 du modèle général, comportement strictement
   * identique à avant cette migration. L'UI actuelle (besoin-
   * capture.tsx) ne construit pas encore ce tableau — Phase 2A porte
   * sur le flux de données, pas sur l'ajout de journées dans l'écran.
   */
  journees?: JourneeMission[];
};

/**
 * Publie une offre ouverte (aucun prestataire nommé — voir 0023) puis
 * notifie en tâche de fond tous les prestataires du même métier, en
 * best-effort (creerNotification avale ses propres erreurs) — un
 * échec de notification ne doit jamais faire échouer la publication.
 */
export async function publierOffre(
  input: PublierOffreInput,
): Promise<ActionResult<{ offreId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  if (!input.titre.trim() || !input.description.trim() || !input.ville.trim()) {
    return { success: false, error: "Titre, description et ville sont requis." };
  }
  if (!input.tarifHoraire || input.tarifHoraire <= 0) {
    return { success: false, error: "Indiquez un tarif horaire supérieur à 0." };
  }

  // Mission multi-jours (migration 0062) — repli sur l'unique journée
  // {dateMission, heureDebut, heureFin} quand journees est absent :
  // cas N=1 du modèle général, jamais un système séparé.
  const journeesBrutes: JourneeMission[] =
    input.journees && input.journees.length > 0
      ? input.journees
      : [{ date: input.dateMission, heureDebut: input.heureDebut, heureFin: input.heureFin }];
  const erreurJournees = validerJournees(journeesBrutes);
  if (erreurJournees) {
    return { success: false, error: erreurJournees };
  }
  const journeesTriees = trierJourneesParDate(journeesBrutes);
  const premiereJournee = journeesTriees[0];

  const { data: offre, error } = await supabase
    .from("offres")
    .insert({
      recruteur_id: user.id,
      titre: input.titre.trim(),
      description: input.description.trim(),
      metier: input.metier,
      ville: input.ville.trim(),
      // Référence de tri/affichage (offres.date_mission, contrat
      // 0062) = date/horaires de la première journée.
      date_mission: premiereJournee.date,
      heure_debut: premiereJournee.heureDebut,
      heure_fin: premiereJournee.heureFin,
      tarif_horaire: input.tarifHoraire,
    })
    .select("id")
    .single();

  if (error || !offre) {
    return { success: false, error: error ? traduireErreurDb(error, "Échec de la publication de l'offre.") : "Échec de la publication de l'offre." };
  }

  // Journées de l'offre — insert direct via le client de session (RLS
  // offres_journees_insert_proprietaire, migration 0062), une ligne
  // par journée. Échec signalé mais offre déjà créée à ce stade —
  // même compromis assumé ailleurs dans ce fichier (ex. échec de
  // création de mission après candidature retenue) plutôt qu'une
  // transaction applicative hors périmètre de cette phase.
  const { error: journeesError } = await supabase
    .from("offres_journees")
    .insert(journeesTriees.map((j) => ({ offre_id: offre.id, date: j.date, heure_debut: j.heureDebut, heure_fin: j.heureFin })));
  if (journeesError) {
    return {
      success: false,
      error: traduireErreurDb(journeesError, "Offre publiée, mais l'enregistrement des journées a échoué — contactez le support."),
    };
  }

  const admin = createAdminClient();
  const { data: correspondants } = await admin
    .from("prestataires_profils")
    .select("user_id")
    .eq("metier", input.metier);

  const cibles = (correspondants ?? []).filter((p) => p.user_id !== user.id);
  await Promise.all(
    cibles.map((p) =>
      Promise.all([
        creerNotification({
          userId: p.user_id,
          type: "offre_correspondante",
          titre: "Nouvelle offre de mission",
          contenu: `${input.titre} — ${input.ville}, le ${premiereJournee.date}`,
          lien: "/prestataire/opportunites",
        }),
        envoyerEmailNouvelleOffre(p.user_id, input.titre.trim(), `${input.ville}, le ${premiereJournee.date}`),
      ]),
    ),
  );

  revalidatePath("/client/candidatures");
  return { success: true, data: { offreId: offre.id } };
}

export type PublierDemandeInput = {
  titre: string;
  texteOriginal: string;
  // Chaque sous-besoin porte sa propre ville, date et horaire (ex.
  // sécurité dimanche 18h→00h à Paris, accueil lundi 9h→17h à Lyon) —
  // plus aucune valeur partagée par erreur entre tous les métiers au
  // niveau de la demande (cahier "Refonte compréhension du besoin" §3).
  sousBesoins: {
    metier: MetierType;
    quantite: number;
    tarifHoraire: number;
    ville: string;
    dateMission: string;
    heureDebut: string;
    heureFin: string;
    // Mission multi-jours (migration 0062) — optionnel : absent ou
    // vide, repli sur l'unique journée {dateMission, heureDebut,
    // heureFin} ci-dessus (cas N=1). Présent, prioritaire — voir
    // publierDemandeGlobale.
    journees?: JourneeMission[];
    // Lot B — propres à CE sous-besoin uniquement (voir besoin-capture.tsx,
    // extraireSousBesoins) : jamais partagés avec les autres métiers de la
    // même demande dans la description générée ci-dessous.
    contexte?: ContexteDetecte | null;
    contraintes?: ContrainteDetectee[];
  }[];
};

/**
 * Décompose une demande client en plusieurs offres indépendantes (une
 * par poste, cf. 0026_demandes_globales.sql) regroupées sous une
 * `demandes` commune pour la vue globale côté client. Chaque offre
 * reçoit une description distincte : c'est ce qui garantit, sans
 * toucher au système de paiement, que chaque prestation acceptée
 * reste sur sa propre mission/paiement une fois passée par le panier
 * (finaliserCommande groupe par date+adresse+description).
 */
export async function publierDemandeGlobale(
  input: PublierDemandeInput,
): Promise<ActionResult<{ demandeId: string; offreIds: string[] }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  if (!input.titre.trim()) {
    return { success: false, error: "Un titre est requis." };
  }
  if (input.sousBesoins.length === 0) {
    return { success: false, error: "Ajoutez au moins un besoin." };
  }
  // Mission multi-jours (migration 0062) — journées résolues et
  // validées UNE FOIS par sous-besoin (jamais un second moteur de
  // calcul, validerJournees/lib/journees.ts) ; réutilisées plus bas
  // pour construire `lignes` ET `offres_journees`, en conservant
  // exactement l'ordre de `input.sousBesoins` pour la corrélation par
  // index avec `quantite`.
  const journeesParSousBesoin: JourneeMission[][] = [];
  for (const sb of input.sousBesoins) {
    if (!Number.isInteger(sb.quantite) || sb.quantite < 1) {
      return { success: false, error: "Chaque besoin doit avoir une quantité d'au moins 1." };
    }
    if (!sb.tarifHoraire || sb.tarifHoraire <= 0) {
      return { success: false, error: "Indiquez un tarif horaire supérieur à 0 pour chaque besoin." };
    }
    if (!sb.ville.trim()) {
      return { success: false, error: "La ville est requise pour chaque besoin." };
    }
    const journeesBrutes: JourneeMission[] =
      sb.journees && sb.journees.length > 0 ? sb.journees : [{ date: sb.dateMission, heureDebut: sb.heureDebut, heureFin: sb.heureFin }];
    const erreurJournees = validerJournees(journeesBrutes);
    if (erreurJournees) {
      return { success: false, error: erreurJournees };
    }
    journeesParSousBesoin.push(trierJourneesParDate(journeesBrutes));
  }

  const { data: demande, error: demandeError } = await supabase
    .from("demandes")
    .insert({
      client_id: user.id,
      titre: input.titre.trim(),
      texte_original: input.texteOriginal.trim() || null,
    })
    .select("id")
    .single();
  if (demandeError || !demande) {
    return { success: false, error: demandeError ? traduireErreurDb(demandeError, "Échec de la création de la demande.") : "Échec de la création de la demande." };
  }

  const metierLabel = (m: MetierType) => METIERS.find((met) => met.id === m)?.label ?? m;

  // Lot B — bloc "Contexte" / "Contraintes" propre à ce sous-besoin,
  // ajouté à la description auto-générée de SA offre uniquement :
  // jamais copié sur les offres des autres métiers de la même demande.
  const blocContexteContraintes = (sb: PublierDemandeInput["sousBesoins"][number]): string => {
    const lignes: string[] = [];
    if (sb.contexte) lignes.push(`Contexte : ${sb.contexte.label}`);
    if (sb.contraintes && sb.contraintes.length > 0) {
      lignes.push(
        `Contraintes :\n${sb.contraintes.map((c) => `- ${c.label}${c.niveau === "prefere" ? " (souhaité, pas obligatoire)" : ""}`).join("\n")}`,
      );
    }
    return lignes.length > 0 ? `\n\n${lignes.join("\n\n")}` : "";
  };

  const lignes = input.sousBesoins.flatMap((sb, idxSousBesoin) => {
    const premiereJournee = journeesParSousBesoin[idxSousBesoin][0];
    return Array.from({ length: sb.quantite }, (_, i) => ({
      recruteur_id: user.id,
      demande_id: demande.id,
      titre: `${input.titre.trim()} — ${metierLabel(sb.metier)}${sb.quantite > 1 ? ` (${i + 1}/${sb.quantite})` : ""}`,
      description: `Besoin "${input.titre.trim()}" — poste ${metierLabel(sb.metier)} ${i + 1} sur ${sb.quantite}.${blocContexteContraintes(sb)}`,
      metier: sb.metier,
      ville: sb.ville.trim(),
      // Référence de tri/affichage (offres.date_mission, contrat 0062)
      // = date/horaires de la première journée.
      date_mission: premiereJournee.date,
      heure_debut: premiereJournee.heureDebut,
      heure_fin: premiereJournee.heureFin,
      tarif_horaire: sb.tarifHoraire,
    }));
  });
  // Même structure de répétition que `lignes` ci-dessus (un tableau de
  // journées par ligne créée, pas par sous-besoin) — garantit que
  // `journeesParLigne[i]` corresponde exactement à `lignes[i]`, donc à
  // `offresCreees[i]` plus bas (voir corrélation par index).
  const journeesParLigne: JourneeMission[][] = input.sousBesoins.flatMap((sb, idxSousBesoin) =>
    Array.from({ length: sb.quantite }, () => journeesParSousBesoin[idxSousBesoin]),
  );

  const { data: offresCreees, error: offresError } = await supabase.from("offres").insert(lignes).select("id, metier");
  if (offresError || !offresCreees) {
    return { success: false, error: offresError ? traduireErreurDb(offresError, "Échec de la publication des besoins.") : "Échec de la publication des besoins." };
  }

  // Mission multi-jours (migration 0062) — `offresCreees[i]` correspond
  // à `lignes[i]`/`journeesParLigne[i]` : un INSERT ... VALUES (...)
  // RETURNING conserve l'ordre des lignes fournies (Postgres), donc la
  // corrélation par index est fiable, y compris quand `quantite > 1`
  // réplique plusieurs offres identiques pour un même sous-besoin —
  // chacune reçoit alors EXACTEMENT les mêmes journées, jamais
  // `quantite × nombre_de_journées` offres.
  const journeesInsert: { offre_id: string; date: string; heure_debut: string; heure_fin: string }[] = [];
  for (const [i, offre] of offresCreees.entries()) {
    for (const j of journeesParLigne[i]) {
      journeesInsert.push({ offre_id: offre.id, date: j.date, heure_debut: j.heureDebut, heure_fin: j.heureFin });
    }
  }
  const { error: journeesError } = await supabase.from("offres_journees").insert(journeesInsert);
  if (journeesError) {
    return {
      success: false,
      error: traduireErreurDb(journeesError, "Besoins publiés, mais l'enregistrement des journées a échoué — contactez le support."),
    };
  }

  const admin = createAdminClient();
  const metiersDistincts = [...new Set(offresCreees.map((o) => o.metier))];
  const { data: correspondants } = await admin
    .from("prestataires_profils")
    .select("user_id, metier")
    .in("metier", metiersDistincts);

  const parMetier = new Map<string, string[]>();
  for (const p of correspondants ?? []) {
    if (p.user_id === user.id) continue;
    parMetier.set(p.metier, [...(parMetier.get(p.metier) ?? []), p.user_id]);
  }
  await Promise.all(
    offresCreees.flatMap((o) => {
      // Un seul sous-besoin par métier au sein d'une même demande
      // (une carte par métier côté capture) — retrouver sa propre
      // ville/date pour que la notification ne mélange jamais les
      // informations d'un autre métier de la même demande.
      const sb = input.sousBesoins.find((s) => s.metier === o.metier);
      const detail = sb ? `${sb.ville}, le ${sb.dateMission}` : "";
      return (parMetier.get(o.metier) ?? []).map((userId) =>
        Promise.all([
          creerNotification({
            userId,
            type: "offre_correspondante",
            titre: "Nouvelle offre de mission",
            contenu: sb ? `${input.titre} — ${sb.ville}, le ${sb.dateMission}` : input.titre,
            lien: "/prestataire/opportunites",
          }),
          envoyerEmailNouvelleOffre(userId, input.titre.trim(), detail),
        ]),
      );
    }),
  );

  revalidatePath("/client/candidatures");
  return { success: true, data: { demandeId: demande.id, offreIds: offresCreees.map((o) => o.id) } };
}

export async function postulerOffre(offreId: string, message?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { data: profil } = await supabase
    .from("prestataires_profils")
    .select("id, statut_verification")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profil) {
    return { success: false, error: "Profil prestataire introuvable." };
  }
  // Seul un profil vérifié devrait pouvoir candidater (audit prod I4) —
  // même règle que la visibilité en recherche (0032), revérifiée côté
  // serveur et pas seulement masquée dans l'UI.
  //
  // Désactivé temporairement (demande produit, période de préparation
  // avant lancement) : la vérification manuelle des profils par
  // l'équipe ProParJour n'est pas encore opérationnelle, donc exiger
  // "valide" bloquerait toute candidature. Reviens à `if
  // (profil.statut_verification !== "valide") { ... }` dès que la
  // vérification tourne réellement.
  // if (profil.statut_verification !== "valide") {
  //   return { success: false, error: "Votre profil doit être vérifié avant de pouvoir candidater à une offre." };
  // }

  // Anti-contournement (audit prod I4) : le message de candidature est
  // un texte libre visible du recruteur, au même titre que les messages
  // de mission ou les champs du devis — il passe donc le même filtre
  // de coordonnées interdites (voir lib/coordonnees-interdites.ts,
  // appliqué aussi dans actions/paiement-mission.ts et le profil).
  const messageNettoye = message?.trim() || null;
  if (messageNettoye) {
    const coordonnees = detecterCoordonnees(messageNettoye);
    if (coordonnees) {
      return { success: false, error: messageCoordonneesBloquees(coordonnees) };
    }
  }

  const { data: offre } = await supabase
    .from("offres")
    .select("id, recruteur_id, titre, statut")
    .eq("id", offreId)
    .maybeSingle();
  if (!offre || offre.statut !== "publiee") {
    return { success: false, error: "Cette offre n'est plus disponible." };
  }

  const { error } = await supabase.from("candidatures").insert({
    offre_id: offreId,
    prestataire_id: profil.id,
    message: messageNettoye,
  });
  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Vous avez déjà postulé à cette offre." };
    }
    return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer votre candidature pour le moment.") };
  }

  await creerNotification({
    userId: offre.recruteur_id,
    type: "candidature_recue",
    titre: "Nouvelle candidature reçue",
    contenu: offre.titre,
    lien: "/client/candidatures",
  });

  revalidatePath("/prestataire/opportunites");
  return { success: true };
}

// Le workflow "candidatures reçues" (retenir / écarter / réintégrer)
// vit entièrement dans src/app/client/actions.ts (retenirCandidature,
// refuserCandidature, reintegrerCandidature), seul appelé par
// src/app/client/candidatures/ecran.tsx. Les anciennes implémentations
// `repondreCandidature` et `reintegrerCandidature` de ce fichier
// n'avaient plus aucun appelant — supprimées (audit prod, nettoyage
// code mort).

export type ModifierOffreInput = {
  titre: string;
  description: string;
  ville: string;
  dateMission: string;
  heureDebut: string;
  heureFin: string;
  tarifHoraire: number;
  /** Mission multi-jours (migration 0062) — voir PublierOffreInput.journees ; même repli sur l'unique journée quand absent. */
  journees?: JourneeMission[];
};

async function offrePeutEtreModifiee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  offreId: string,
  userId: string,
) {
  const { data: offre } = await supabase
    .from("offres")
    .select("id, recruteur_id")
    .eq("id", offreId)
    .maybeSingle();
  if (!offre || offre.recruteur_id !== userId) {
    return { ok: false as const, error: "Offre introuvable." };
  }

  const { count } = await supabase
    .from("candidatures")
    .select("id", { count: "exact", head: true })
    .eq("offre_id", offreId)
    .eq("statut", "acceptee");
  if ((count ?? 0) > 0) {
    return { ok: false as const, error: "Cette offre a déjà une candidature acceptée — elle ne peut plus être modifiée." };
  }

  return { ok: true as const };
}

/**
 * Modifie une offre publiée — interdit dès qu'une candidature a été
 * acceptée (le prestataire a alors des attentes fixées sur ces
 * conditions). Contrairement à publierOffre, ne renotifie pas les
 * prestataires du métier : ce n'est pas une nouvelle offre.
 */
export async function modifierOffre(offreId: string, input: ModifierOffreInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  if (!input.titre.trim() || !input.description.trim() || !input.ville.trim()) {
    return { success: false, error: "Titre, description et ville sont requis." };
  }
  if (!input.tarifHoraire || input.tarifHoraire <= 0) {
    return { success: false, error: "Indiquez un tarif horaire supérieur à 0." };
  }

  const journeesBrutes: JourneeMission[] =
    input.journees && input.journees.length > 0
      ? input.journees
      : [{ date: input.dateMission, heureDebut: input.heureDebut, heureFin: input.heureFin }];
  const erreurJournees = validerJournees(journeesBrutes);
  if (erreurJournees) {
    return { success: false, error: erreurJournees };
  }
  const journeesTriees = trierJourneesParDate(journeesBrutes);
  const premiereJournee = journeesTriees[0];

  const check = await offrePeutEtreModifiee(supabase, offreId, user.id);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await supabase
    .from("offres")
    .update({
      titre: input.titre.trim(),
      description: input.description.trim(),
      ville: input.ville.trim(),
      date_mission: premiereJournee.date,
      heure_debut: premiereJournee.heureDebut,
      heure_fin: premiereJournee.heureFin,
      tarif_horaire: input.tarifHoraire,
    })
    .eq("id", offreId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de modifier cette offre pour le moment.") };
  }

  // Remplace entièrement les journées existantes par le nouveau jeu —
  // pas de diff ligne à ligne (hors périmètre Phase 2A), les policies
  // RLS offres_journees_delete_proprietaire_ou_admin/insert_proprietaire
  // (migration 0062) autorisent déjà le propriétaire à faire les deux.
  const { error: deleteError } = await supabase.from("offres_journees").delete().eq("offre_id", offreId);
  if (deleteError) {
    return { success: false, error: traduireErreurDb(deleteError, "Impossible de mettre à jour les journées de cette offre.") };
  }
  const { error: journeesError } = await supabase
    .from("offres_journees")
    .insert(journeesTriees.map((j) => ({ offre_id: offreId, date: j.date, heure_debut: j.heureDebut, heure_fin: j.heureFin })));
  if (journeesError) {
    return { success: false, error: traduireErreurDb(journeesError, "Impossible de mettre à jour les journées de cette offre.") };
  }

  revalidatePath("/client/candidatures");
  revalidatePath("/client/missions");
  return { success: true };
}

/**
 * Clôture une offre (statut "annulee") sans candidature acceptée —
 * les candidatures encore en attente sont marquées refusées et leurs
 * auteurs reçoivent une notification "offre clôturée" plutôt qu'un
 * refus personnel, pour ne pas laisser croire à un jugement sur leur
 * profil.
 */
export async function cloturerOffre(offreId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const check = await offrePeutEtreModifiee(supabase, offreId, user.id);
  if (!check.ok) return { success: false, error: check.error };

  const { data: offre } = await supabase.from("offres").select("titre").eq("id", offreId).maybeSingle();

  const { data: candidaturesEnAttente } = await supabase
    .from("candidatures")
    .select("id, prestataire_id")
    .eq("offre_id", offreId)
    .eq("statut", "en_attente");

  const { error } = await supabase.from("offres").update({ statut: "annulee" }).eq("id", offreId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de clôturer cette offre pour le moment.") };
  }

  if (candidaturesEnAttente && candidaturesEnAttente.length > 0) {
    await supabase
      .from("candidatures")
      .update({ statut: "refusee" })
      .in(
        "id",
        candidaturesEnAttente.map((c) => c.id),
      );

    const admin = createAdminClient();
    const prestataireIds = [...new Set(candidaturesEnAttente.map((c) => c.prestataire_id))];
    const { data: profils } = await admin.from("prestataires_profils").select("id, user_id").in("id", prestataireIds);
    await Promise.all(
      (profils ?? []).map((p) =>
        creerNotification({
          userId: p.user_id,
          type: "offre_cloturee",
          titre: "Offre clôturée",
          contenu: offre?.titre ?? undefined,
          lien: "/prestataire/opportunites",
        }),
      ),
    );
  }

  revalidatePath("/client/candidatures");
  revalidatePath("/client/missions");
  return { success: true };
}

/** Supprime une offre — la policy RLS "offres_delete_..." refuse déjà toute offre avec candidature acceptée. */
export async function supprimerOffre(offreId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const check = await offrePeutEtreModifiee(supabase, offreId, user.id);
  if (!check.ok) return { success: false, error: check.error };

  // .select() force la lecture des lignes réellement supprimées : sans
  // policy RLS DELETE, Supabase renvoie { error: null, data: [] } pour
  // 0 ligne affectée plutôt qu'une erreur — sans cette vérification,
  // l'action rapporterait un succès alors que rien n'a été supprimé.
  const { data, error } = await supabase.from("offres").delete().eq("id", offreId).select("id");
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de supprimer cette offre pour le moment.") };
  }
  if (!data || data.length === 0) {
    return { success: false, error: "Échec de la suppression — réessayez ou contactez le support." };
  }

  revalidatePath("/client/candidatures");
  return { success: true };
}
