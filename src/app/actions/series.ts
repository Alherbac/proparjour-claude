"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recommanderPrestataires } from "@/lib/matching";
import { calculerOccurrences, type Frequence } from "@/lib/recurrence";
import { descriptionSerie } from "@/lib/serie-description";
import type { JourSemaine } from "@/config/jours-semaine";
import type { MetierType, TarifType } from "@/lib/supabase/database.types";
import { traduireErreurDb } from "@/lib/erreurs-db";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

export type SousBesoinInput = {
  metier: MetierType;
  prestataireId: string;
  heureDebut: string;
  heureFin: string;
  tarifHoraire: number;
};

export async function creerSerie(input: {
  titre: string;
  lieu: string;
  description?: string;
  frequence: Frequence;
  joursSemaine: JourSemaine[];
  dateDebut: string;
  dateFin: string;
  sousBesoins: SousBesoinInput[];
}): Promise<ActionResult<{ serieId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté pour créer une série." };
  }

  if (!input.titre.trim() || !input.lieu.trim()) {
    return { success: false, error: "Titre et lieu sont requis." };
  }
  if (input.sousBesoins.length === 0) {
    return { success: false, error: "Ajoutez au moins un professionnel à la série." };
  }
  for (const sb of input.sousBesoins) {
    if (!sb.heureDebut || !sb.heureFin || sb.heureDebut === sb.heureFin) {
      return { success: false, error: "Horaires invalides pour un des postes de la série." };
    }
    if (!sb.tarifHoraire || sb.tarifHoraire <= 0) {
      return { success: false, error: "Indiquez un tarif horaire supérieur à 0 pour chaque poste." };
    }
  }

  const occurrences = calculerOccurrences({
    frequence: input.frequence,
    joursSemaine: input.joursSemaine,
    dateDebut: input.dateDebut,
    dateFin: input.dateFin,
  });
  if ("erreur" in occurrences) {
    return { success: false, error: occurrences.erreur };
  }

  const { data: serie, error: serieError } = await supabase
    .from("series_missions")
    .insert({
      recruteur_id: user.id,
      titre: input.titre.trim(),
      lieu: input.lieu.trim(),
      description: input.description?.trim() || null,
      frequence: input.frequence,
      jours_semaine: input.joursSemaine,
      date_debut: input.dateDebut,
      date_fin: input.dateFin,
    })
    .select("id")
    .single();

  if (serieError || !serie) {
    return { success: false, error: serieError ? traduireErreurDb(serieError, "Échec de la création de la série.") : "Échec de la création de la série." };
  }

  const { error: sousBesoinsError } = await supabase.from("series_sous_besoins").insert(
    input.sousBesoins.map((sb) => ({
      serie_id: serie.id,
      metier: sb.metier,
      prestataire_id: sb.prestataireId,
      heure_debut: sb.heureDebut,
      heure_fin: sb.heureFin,
      tarif_horaire: sb.tarifHoraire,
    })),
  );

  if (sousBesoinsError) {
    await supabase.from("series_missions").delete().eq("id", serie.id);
    return { success: false, error: traduireErreurDb(sousBesoinsError, "Échec de la création de la série.") };
  }

  return { success: true, data: { serieId: serie.id } };
}

export type RemplacantPropose = {
  prestataireId: string;
  prenom: string | null;
  photoUrl: string | null;
  ville: string;
  score: number;
  tarifMontant: number;
  tarifType: TarifType;
};

export type VerificationOccurrence = {
  date: string;
  disponible: boolean;
  remplacements: RemplacantPropose[];
};

export type VerificationSousBesoin = {
  prestataireId: string;
  metier: MetierType;
  occurrences: VerificationOccurrence[];
};

/**
 * Généralisation de verifierEquipePourNouvelleDate (Bloc 6, "refaire
 * la mission") à plusieurs dates : un appel recommanderPrestataires
 * par couple (métier, date) distinct — mémoïsé, jamais un par
 * personne — puis lecture du critère "disponible" pour chaque
 * professionnel habituel choisi sur chaque occurrence.
 */
export async function verifierDisponibiliteSerie(
  sousBesoins: { prestataireId: string; metier: MetierType; heureDebut: string; heureFin: string }[],
  ville: string,
  dates: string[],
): Promise<VerificationSousBesoin[]> {
  const clesDistinctes = new Map<string, { metier: MetierType; heureDebut: string; heureFin: string; date: string }>();
  for (const sb of sousBesoins) {
    for (const date of dates) {
      const cle = `${sb.metier}|${sb.heureDebut}|${sb.heureFin}|${date}`;
      clesDistinctes.set(cle, { metier: sb.metier, heureDebut: sb.heureDebut, heureFin: sb.heureFin, date });
    }
  }

  const entrees = await Promise.all(
    [...clesDistinctes.entries()].map(async ([cle, params]) => {
      const resultat = await recommanderPrestataires({
        metier: params.metier,
        ville,
        date: params.date,
        heureDebut: params.heureDebut,
        heureFin: params.heureFin,
        quantite: 1,
      });
      return [cle, resultat.recommandations] as const;
    }),
  );
  const resultatsParCle = new Map(entrees);
  const idsEquipe = new Set(sousBesoins.map((sb) => sb.prestataireId));

  return sousBesoins.map((sb) => ({
    prestataireId: sb.prestataireId,
    metier: sb.metier,
    occurrences: dates.map((date) => {
      const cle = `${sb.metier}|${sb.heureDebut}|${sb.heureFin}|${date}`;
      const pool = resultatsParCle.get(cle) ?? [];
      const recommandation = pool.find((r) => r.prestataire.id === sb.prestataireId);
      const disponible = recommandation?.criteres.find((c) => c.cle === "disponible")?.etat === "correspond";

      const remplacements: RemplacantPropose[] = disponible
        ? []
        : pool
            .filter((r) => r.prestataire.id !== sb.prestataireId && !idsEquipe.has(r.prestataire.id))
            .filter((r) => r.criteres.find((c) => c.cle === "disponible")?.etat === "correspond")
            .slice(0, 3)
            .map((r) => ({
              prestataireId: r.prestataire.id,
              prenom: r.prestataire.prenom,
              photoUrl: r.prestataire.photo_url,
              ville: r.prestataire.ville,
              score: r.score,
              tarifMontant: r.prestataire.tarif_montant,
              tarifType: r.prestataire.tarif_type,
            }));

      return { date, disponible, remplacements };
    }),
  }));
}

/**
 * Cœur du rattachement, indépendant de toute session navigateur — pour
 * pouvoir être rejoué aussi bien depuis rattacherMissionsASerie
 * (déclenché par le navigateur juste après le paiement) que depuis
 * finaliserCommandeAvecLignes/le webhook Stripe (actions/commande.ts),
 * qui n'ont pas de cookie de session et reçoivent recruteurId
 * directement (même partage que finaliserCommandeAvecLignes lui-même
 * avec finaliserCommande). Filtre par description en plus de
 * missionIds : si le panier envoyé au paiement contenait aussi des
 * lignes sans rapport avec cette série, seules celles portant le
 * marqueur de la série sont rattachées.
 */
export async function rattacherMissionsASerieAvecAdmin(
  admin: ReturnType<typeof createAdminClient>,
  serieId: string,
  missionIds: string[],
  recruteurId: string,
): Promise<ActionResult> {
  if (missionIds.length === 0) {
    return { success: true };
  }

  const { data: serie } = await admin
    .from("series_missions")
    .select("id, recruteur_id, titre")
    .eq("id", serieId)
    .maybeSingle();
  if (!serie || serie.recruteur_id !== recruteurId) {
    return { success: false, error: "Série introuvable." };
  }

  const { error } = await admin
    .from("missions")
    .update({ serie_id: serieId })
    .in("id", missionIds)
    .eq("recruteur_id", recruteurId)
    .eq("description", descriptionSerie(serie.titre));

  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de rattacher cette mission à la série pour le moment.") };
  }
  return { success: true };
}

/**
 * Rattache après-coup les missions réellement créées par le paiement
 * panier (finaliserCommande) à leur série — jamais l'inverse (aucune
 * mission n'est créée par ce module, le paiement reste le seul point
 * de création, voir migration 0028). Point d'entrée navigateur :
 * vérifie la session puis délègue à rattacherMissionsASerieAvecAdmin.
 * Depuis la migration 0041, ce même rattachement est aussi rejoué de
 * façon fiable côté serveur (voir finaliserCommandeAvecLignes) si cet
 * appel n'a jamais lieu (onglet fermé juste après le paiement) — cet
 * appel-ci reste donc idempotent avec ce filet de sécurité, jamais en
 * conflit avec lui.
 */
export async function rattacherMissionsASerie(serieId: string, missionIds: string[]): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();
  return rattacherMissionsASerieAvecAdmin(admin, serieId, missionIds, user.id);
}

export type OccurrenceSerie = {
  date: string;
  missionId: string | null;
  statut: string | null;
};

export type SerieAvecOccurrences = {
  id: string;
  titre: string;
  lieu: string;
  frequence: Frequence;
  dateDebut: string;
  dateFin: string;
  statut: "active" | "annulee";
  sousBesoins: {
    id: string;
    metier: MetierType;
    prestataireId: string;
    prenom: string | null;
    heureDebut: string;
    heureFin: string;
    tarifHoraire: number;
  }[];
  missions: {
    id: string;
    dateMission: string;
    statut: string;
    montantTotal: number;
  }[];
};

/**
 * Vue de détail d'une série (page "Mes missions récurrentes") —
 * l'état de chaque occurrence est lu directement depuis les missions
 * réellement créées (serie_id), jamais recalculé ou stocké à part.
 */
export async function getSerieAvecOccurrences(serieId: string): Promise<SerieAvecOccurrences | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: serie } = await supabase
    .from("series_missions")
    .select("id, titre, lieu, frequence, date_debut, date_fin, statut, recruteur_id")
    .eq("id", serieId)
    .maybeSingle();
  if (!serie || serie.recruteur_id !== user.id) return null;

  const { data: sousBesoins } = await supabase
    .from("series_sous_besoins")
    .select("id, metier, prestataire_id, heure_debut, heure_fin, tarif_horaire")
    .eq("serie_id", serieId);

  const admin = createAdminClient();
  const prestataireIds = [...new Set((sousBesoins ?? []).map((sb) => sb.prestataire_id))];
  const { data: profils } =
    prestataireIds.length > 0
      ? await admin.from("prestataires_profils").select("id, user_id").in("id", prestataireIds)
      : { data: [] as { id: string; user_id: string }[] };
  const userIds = (profils ?? []).map((p) => p.user_id);
  const { data: usersData } =
    userIds.length > 0
      ? await admin.from("users").select("id, prenom").in("id", userIds)
      : { data: [] as { id: string; prenom: string | null }[] };
  const userParId = new Map((usersData ?? []).map((u) => [u.id, u]));
  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));

  const { data: missions } = await supabase
    .from("missions")
    .select("id, date_mission, statut, montant_total")
    .eq("serie_id", serieId)
    .order("date_mission", { ascending: true });

  return {
    id: serie.id,
    titre: serie.titre,
    lieu: serie.lieu,
    frequence: serie.frequence,
    dateDebut: serie.date_debut,
    dateFin: serie.date_fin,
    statut: serie.statut,
    sousBesoins: (sousBesoins ?? []).map((sb) => {
      const profil = profilParId.get(sb.prestataire_id);
      const u = profil ? userParId.get(profil.user_id) : undefined;
      return {
        id: sb.id,
        metier: sb.metier,
        prestataireId: sb.prestataire_id,
        prenom: u?.prenom ?? null,
        heureDebut: sb.heure_debut,
        heureFin: sb.heure_fin,
        tarifHoraire: sb.tarif_horaire,
      };
    }),
    missions: (missions ?? []).map((m) => ({
      id: m.id,
      dateMission: m.date_mission,
      statut: m.statut,
      montantTotal: m.montant_total,
    })),
  };
}

export async function listerSeries(): Promise<
  { id: string; titre: string; lieu: string; statut: "active" | "annulee"; nbOccurrences: number; prochaineOccurrence: string | null }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: series } = await supabase
    .from("series_missions")
    .select("id, titre, lieu, statut")
    .eq("recruteur_id", user.id)
    .order("created_at", { ascending: false });
  if (!series || series.length === 0) return [];

  const { data: missions } = await supabase
    .from("missions")
    .select("serie_id, date_mission")
    .eq("recruteur_id", user.id)
    .not("serie_id", "is", null);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const parSerie = new Map<string, string[]>();
  for (const m of missions ?? []) {
    if (!m.serie_id) continue;
    const liste = parSerie.get(m.serie_id) ?? [];
    liste.push(m.date_mission);
    parSerie.set(m.serie_id, liste);
  }

  return series.map((s) => {
    const dates = (parSerie.get(s.id) ?? []).sort();
    return {
      id: s.id,
      titre: s.titre,
      lieu: s.lieu,
      statut: s.statut,
      nbOccurrences: dates.length,
      prochaineOccurrence: dates.find((d) => d >= aujourdhui) ?? null,
    };
  });
}

/** Annule la série (aucune nouvelle occurrence à ajouter) — n'annule pas les missions déjà créées, qui suivent leurs propres règles (annulerMission). */
export async function annulerSerie(serieId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { error } = await supabase
    .from("series_missions")
    .update({ statut: "annulee" })
    .eq("id", serieId)
    .eq("recruteur_id", user.id);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'annuler cette série pour le moment.") };
  }
  return { success: true };
}
