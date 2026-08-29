"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creerNotification } from "@/lib/notifications";
import { creerMessageDevis } from "@/lib/messages";
import { montantMission } from "@/lib/duree";
import { getTauxCommission } from "@/lib/commission";
import { METIERS } from "@/config/metiers";
import type { MetierType } from "@/lib/supabase/database.types";
import { traduireErreurDb } from "@/lib/erreurs-db";
import { envoyerEmailNouvelleOffre } from "@/lib/email";
import type { ContexteDetecte, ContrainteDetectee } from "@/lib/besoin";

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

  if (!input.titre.trim() || !input.description.trim() || !input.ville.trim() || !input.dateMission) {
    return { success: false, error: "Titre, description, ville et date sont requis." };
  }
  if (!input.tarifHoraire || input.tarifHoraire <= 0) {
    return { success: false, error: "Indiquez un tarif horaire supérieur à 0." };
  }
  if (input.heureDebut === input.heureFin) {
    return { success: false, error: "L'heure de fin doit être différente de l'heure de début." };
  }

  const { data: offre, error } = await supabase
    .from("offres")
    .insert({
      recruteur_id: user.id,
      titre: input.titre.trim(),
      description: input.description.trim(),
      metier: input.metier,
      ville: input.ville.trim(),
      date_mission: input.dateMission,
      heure_debut: input.heureDebut,
      heure_fin: input.heureFin,
      tarif_horaire: input.tarifHoraire,
    })
    .select("id")
    .single();

  if (error || !offre) {
    return { success: false, error: error ? traduireErreurDb(error, "Échec de la publication de l'offre.") : "Échec de la publication de l'offre." };
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
          contenu: `${input.titre} — ${input.ville}, le ${input.dateMission}`,
          lien: "/tableau-de-bord/offres",
        }),
        envoyerEmailNouvelleOffre(p.user_id, input.titre.trim(), `${input.ville}, le ${input.dateMission}`),
      ]),
    ),
  );

  revalidatePath("/tableau-de-bord/mes-offres");
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
  for (const sb of input.sousBesoins) {
    if (!Number.isInteger(sb.quantite) || sb.quantite < 1) {
      return { success: false, error: "Chaque besoin doit avoir une quantité d'au moins 1." };
    }
    if (!sb.tarifHoraire || sb.tarifHoraire <= 0) {
      return { success: false, error: "Indiquez un tarif horaire supérieur à 0 pour chaque besoin." };
    }
    if (!sb.ville.trim() || !sb.dateMission) {
      return { success: false, error: "Ville et date sont requises pour chaque besoin." };
    }
    if (sb.heureDebut === sb.heureFin) {
      return { success: false, error: "L'heure de fin doit être différente de l'heure de début pour chaque besoin." };
    }
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

  const lignes = input.sousBesoins.flatMap((sb) =>
    Array.from({ length: sb.quantite }, (_, i) => ({
      recruteur_id: user.id,
      demande_id: demande.id,
      titre: `${input.titre.trim()} — ${metierLabel(sb.metier)}${sb.quantite > 1 ? ` (${i + 1}/${sb.quantite})` : ""}`,
      description: `Besoin "${input.titre.trim()}" — poste ${metierLabel(sb.metier)} ${i + 1} sur ${sb.quantite}.${blocContexteContraintes(sb)}`,
      metier: sb.metier,
      ville: sb.ville.trim(),
      date_mission: sb.dateMission,
      heure_debut: sb.heureDebut,
      heure_fin: sb.heureFin,
      tarif_horaire: sb.tarifHoraire,
    })),
  );

  const { data: offresCreees, error: offresError } = await supabase.from("offres").insert(lignes).select("id, metier");
  if (offresError || !offresCreees) {
    return { success: false, error: offresError ? traduireErreurDb(offresError, "Échec de la publication des besoins.") : "Échec de la publication des besoins." };
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
            lien: "/tableau-de-bord/offres",
          }),
          envoyerEmailNouvelleOffre(userId, input.titre.trim(), detail),
        ]),
      );
    }),
  );

  revalidatePath("/tableau-de-bord/mes-offres");
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
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profil) {
    return { success: false, error: "Profil prestataire introuvable." };
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
    message: message?.trim() || null,
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
    lien: "/tableau-de-bord/mes-offres",
  });

  revalidatePath("/tableau-de-bord/offres");
  return { success: true };
}

/**
 * Accepter une candidature crée immédiatement la mission (statut
 * `en_attente`, paiement `en_attente`) — c'est ce qui ouvre la
 * conversation (messages.mission_id est NOT NULL, voir 0010) et permet
 * d'y déposer tout de suite un devis pré-rempli. Le paiement se fait
 * ensuite dans cette même conversation (voir actions/paiement-mission.ts)
 * plutôt que via le panier localStorage comme pour le flux "booking
 * direct" existant (actions/commande.ts) — le prestataire a déjà
 * candidaté, son consentement est acquis, sa ligne est donc créée
 * `acceptee` d'emblée (voir creer_mission_depuis_candidature, 0031).
 */
export async function repondreCandidature(
  candidatureId: string,
  reponse: "acceptee" | "refusee",
): Promise<ActionResult<{ missionId: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { data: candidature } = await supabase
    .from("candidatures")
    .select("id, offre_id, prestataire_id, statut")
    .eq("id", candidatureId)
    .maybeSingle();
  if (!candidature) {
    return { success: false, error: "Candidature introuvable." };
  }
  if (candidature.statut !== "en_attente") {
    return { success: false, error: "Cette candidature a déjà reçu une réponse." };
  }

  const { error } = await supabase
    .from("candidatures")
    .update({ statut: reponse })
    .eq("id", candidatureId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer votre réponse pour le moment.") };
  }

  // Client admin pour le profil : un candidat dont le dossier KYC
  // n'est pas encore "valide" est invisible du client session (RLS,
  // voir 0001_init.sql), ce qui faisait échouer silencieusement la
  // notification d'acceptation/refus pour ces candidats.
  const admin = createAdminClient();
  const [{ data: offre }, { data: profil }] = await Promise.all([
    supabase
      .from("offres")
      .select("titre, description, metier, ville, date_mission, heure_debut, heure_fin, tarif_horaire")
      .eq("id", candidature.offre_id)
      .maybeSingle(),
    admin.from("prestataires_profils").select("id, user_id").eq("id", candidature.prestataire_id).maybeSingle(),
  ]);

  if (reponse === "refusee") {
    if (profil) {
      await creerNotification({
        userId: profil.user_id,
        type: "candidature_refusee",
        titre: "Candidature déclinée",
        contenu: offre?.titre ?? undefined,
        lien: "/tableau-de-bord/offres",
      });
    }
    revalidatePath("/tableau-de-bord/mes-offres");
    return { success: true, data: { missionId: null } };
  }

  await supabase.from("offres").update({ statut: "pourvue" }).eq("id", candidature.offre_id);

  let missionId: string | null = null;
  if (offre && profil) {
    const montantTotal = montantMission(offre.heure_debut, offre.heure_fin, offre.tarif_horaire);
    const tauxCommission = await getTauxCommission();
    const montantCommission = Math.round(montantTotal * (tauxCommission / 100) * 100) / 100;

    const { data: missionIdCreee, error: missionError } = await admin.rpc("creer_mission_depuis_candidature", {
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

    if (missionError || !missionIdCreee) {
      return { success: false, error: missionError ? traduireErreurDb(missionError, "Échec de la création de la mission.") : "Échec de la création de la mission." };
    }
    missionId = missionIdCreee;

    await creerMessageDevis({
      missionId,
      expediteurId: user.id,
      destinataireId: profil.user_id,
      devis: {
        prestation: offre.titre,
        date: offre.date_mission,
        heureDebut: offre.heure_debut,
        heureFin: offre.heure_fin,
        lieu: offre.ville,
        tarifHoraire: offre.tarif_horaire,
        montantTotal,
      },
    });

    await creerNotification({
      userId: profil.user_id,
      type: "candidature_acceptee",
      titre: "Candidature acceptée",
      contenu: offre.titre,
      lien: `/missions/${missionId}`,
      missionId,
    });
  }

  revalidatePath("/tableau-de-bord/mes-offres");
  return { success: true, data: { missionId } };
}

export type ModifierOffreInput = {
  titre: string;
  description: string;
  ville: string;
  dateMission: string;
  heureDebut: string;
  heureFin: string;
  tarifHoraire: number;
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

  if (!input.titre.trim() || !input.description.trim() || !input.ville.trim() || !input.dateMission) {
    return { success: false, error: "Titre, description, ville et date sont requis." };
  }
  if (!input.tarifHoraire || input.tarifHoraire <= 0) {
    return { success: false, error: "Indiquez un tarif horaire supérieur à 0." };
  }
  if (input.heureDebut === input.heureFin) {
    return { success: false, error: "L'heure de fin doit être différente de l'heure de début." };
  }

  const check = await offrePeutEtreModifiee(supabase, offreId, user.id);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await supabase
    .from("offres")
    .update({
      titre: input.titre.trim(),
      description: input.description.trim(),
      ville: input.ville.trim(),
      date_mission: input.dateMission,
      heure_debut: input.heureDebut,
      heure_fin: input.heureFin,
      tarif_horaire: input.tarifHoraire,
    })
    .eq("id", offreId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de modifier cette offre pour le moment.") };
  }

  revalidatePath("/tableau-de-bord/mes-offres");
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
          lien: "/tableau-de-bord/offres",
        }),
      ),
    );
  }

  revalidatePath("/tableau-de-bord/mes-offres");
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

  revalidatePath("/tableau-de-bord/mes-offres");
  return { success: true };
}
