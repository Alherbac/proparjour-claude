import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  OffresRow,
  CandidaturesRow,
  DemandesRow,
  MetierType,
} from "@/lib/supabase/database.types";

export type CandidatureAvecPrestataire = CandidaturesRow & {
  prenom: string | null;
  nom: string | null;
  photo_url: string | null;
  titre: string | null;
  statut_verification: string | null;
  specialites: string[];
  tarif_montant: number | null;
  tarif_type: string | null;
  // Mission née de cette candidature (voir retenirCandidature →
  // creer_mission_depuis_candidature) — null tant qu'elle n'a pas été
  // retenue. Permet à "en_discussion" de rouvrir la conversation
  // existante plutôt que d'en recréer une.
  missionId: string | null;
};

export type OffreAvecCandidatures = OffresRow & {
  candidatures: CandidatureAvecPrestataire[];
};

export type CandidatureAvecOffre = CandidaturesRow & { offre: OffresRow | null };

/** Offres ouvertes visibles par un prestataire — marché public, éventuellement filtré par métier/ville. */
export async function getOffresPubliees(filtres: {
  metier?: MetierType;
  ville?: string;
}): Promise<OffresRow[]> {
  const supabase = await createClient();
  let query = supabase.from("offres").select("*").eq("statut", "publiee");
  if (filtres.metier) query = query.eq("metier", filtres.metier);
  if (filtres.ville?.trim()) query = query.ilike("ville", `%${filtres.ville.trim()}%`);
  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

/** Offres publiées par un recruteur, avec les candidatures reçues sur chacune. */
export async function getOffresRecruteur(recruteurId: string): Promise<OffreAvecCandidatures[]> {
  const supabase = await createClient();
  const { data: offres } = await supabase
    .from("offres")
    .select("*")
    .eq("recruteur_id", recruteurId)
    .order("created_at", { ascending: false });

  if (!offres || offres.length === 0) return [];

  const offreIds = offres.map((o) => o.id);
  const { data: candidatures } = await supabase
    .from("candidatures")
    .select("*")
    .in("offre_id", offreIds)
    .order("created_at", { ascending: false });

  // Client admin plutôt que la vue publique prestataires_publics : un
  // candidat dont le dossier KYC n'est pas encore "valide" n'apparaît
  // pas dans cette vue (voir migration 0003) — le recruteur doit
  // pourtant voir le nom/la photo de qui a candidaté à son offre,
  // avant même la validation. Champs d'affichage uniquement, jamais
  // de donnée sensible (même principe que getProfessionnelsHistorique).
  const prestataireIds = [...new Set((candidatures ?? []).map((c) => c.prestataire_id))];
  const admin = createAdminClient();
  const { data: profils } =
    prestataireIds.length > 0
      ? await admin
          .from("prestataires_profils")
          .select("id, photo_url, user_id, titre, statut_verification, specialites, tarif_montant, tarif_type")
          .in("id", prestataireIds)
      : {
          data: [] as {
            id: string;
            photo_url: string | null;
            user_id: string;
            titre: string | null;
            statut_verification: string | null;
            specialites: string[];
            tarif_montant: number | null;
            tarif_type: string | null;
          }[],
        };
  const userIds = (profils ?? []).map((p) => p.user_id);
  const { data: usersData } =
    userIds.length > 0
      ? await admin.from("users").select("id, prenom, nom").in("id", userIds)
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const userParId = new Map((usersData ?? []).map((u) => [u.id, u]));
  const prestataires = (profils ?? []).map((p) => {
    const u = userParId.get(p.user_id);
    return {
      id: p.id,
      prenom: u?.prenom ?? null,
      nom: u?.nom ?? null,
      photo_url: p.photo_url,
      titre: p.titre,
      statut_verification: p.statut_verification,
      specialites: p.specialites,
      tarif_montant: p.tarif_montant,
      tarif_type: p.tarif_type,
    };
  });

  const candidatureIds = (candidatures ?? []).map((c) => c.id);
  const { data: missionsLiees } =
    candidatureIds.length > 0
      ? await supabase.from("missions").select("id, candidature_id").in("candidature_id", candidatureIds)
      : { data: [] as { id: string; candidature_id: string | null }[] };
  const missionIdParCandidature = new Map((missionsLiees ?? []).map((m) => [m.candidature_id, m.id]));

  const parPrestataire = new Map(prestataires.map((p) => [p.id, p]));
  const parOffre = new Map<string, CandidatureAvecPrestataire[]>();
  for (const c of candidatures ?? []) {
    const p = parPrestataire.get(c.prestataire_id);
    const enrichie: CandidatureAvecPrestataire = {
      ...c,
      prenom: p?.prenom ?? null,
      nom: p?.nom ?? null,
      photo_url: p?.photo_url ?? null,
      titre: p?.titre ?? null,
      statut_verification: p?.statut_verification ?? null,
      specialites: p?.specialites ?? [],
      tarif_montant: p?.tarif_montant ?? null,
      tarif_type: p?.tarif_type ?? null,
      missionId: missionIdParCandidature.get(c.id) ?? null,
    };
    parOffre.set(c.offre_id, [...(parOffre.get(c.offre_id) ?? []), enrichie]);
  }

  return offres.map((o) => ({ ...o, candidatures: parOffre.get(o.id) ?? [] }));
}

export type DemandeAvecOffres = DemandesRow & { offres: OffreAvecCandidatures[] };

export type MesOffresRecruteur = {
  demandes: DemandeAvecOffres[];
  offresSeules: OffreAvecCandidatures[];
};

/**
 * Offres d'un recruteur regroupées par demande globale (décomposition
 * multi-métiers, voir actions/offres.ts::publierDemandeGlobale) —
 * `offresSeules` conserve les offres publiées hors de ce parcours
 * (demande_id nul), affichées telles quelles comme avant.
 */
export async function getMesOffresRecruteur(recruteurId: string): Promise<MesOffresRecruteur> {
  const offres = await getOffresRecruteur(recruteurId);

  const demandeIds = [...new Set(offres.filter((o) => o.demande_id).map((o) => o.demande_id as string))];
  const supabase = await createClient();
  const { data: demandes } =
    demandeIds.length > 0
      ? await supabase.from("demandes").select("*").in("id", demandeIds).order("created_at", { ascending: false })
      : { data: [] as DemandesRow[] };

  const parDemande = new Map<string, OffreAvecCandidatures[]>();
  const offresSeules: OffreAvecCandidatures[] = [];
  for (const o of offres) {
    if (o.demande_id) {
      parDemande.set(o.demande_id, [...(parDemande.get(o.demande_id) ?? []), o]);
    } else {
      offresSeules.push(o);
    }
  }

  return {
    demandes: (demandes ?? []).map((d) => ({ ...d, offres: parDemande.get(d.id) ?? [] })),
    offresSeules,
  };
}

/** Candidatures d'un prestataire (via l'id de son profil), avec l'offre associée. */
export async function getCandidaturesPrestataire(prestataireProfilId: string): Promise<CandidatureAvecOffre[]> {
  const supabase = await createClient();
  const { data: candidatures } = await supabase
    .from("candidatures")
    .select("*")
    .eq("prestataire_id", prestataireProfilId)
    .order("created_at", { ascending: false });

  if (!candidatures || candidatures.length === 0) return [];

  const offreIds = [...new Set(candidatures.map((c) => c.offre_id))];
  const { data: offres } = await supabase.from("offres").select("*").in("id", offreIds);
  const parOffre = new Map((offres ?? []).map((o) => [o.id, o]));

  return candidatures.map((c) => ({ ...c, offre: parOffre.get(c.offre_id) ?? null }));
}

export type ProfilCandidat = {
  prestataireId: string;
  prenom: string | null;
  nom: string | null;
  photoUrl: string | null;
  metier: MetierType;
  titre: string | null;
  ville: string;
  bio: string | null;
  specialites: string[];
  certifications: string[];
  competences: string[];
  langues: string[];
  statutVerification: string;
  formations: { id: string; etablissement: string; diplome: string; anneeObtention: number | null }[];
  experiences: { id: string; intitule: string; employeur: string | null; periode: string; description: string | null }[];
  /** Statut courant de la candidature — permet à la page d'afficher "Écrire au candidat" seulement tant que retenirCandidature reste possible (statut "en_attente"). */
  candidatureStatut: string;
};

/**
 * Profil d'un candidat pour le recruteur qui a reçu sa candidature —
 * même principe que getOffresRecruteur : bascule sur le client admin
 * plutôt que prestataires_publics pour rester visible même avant
 * validation KYC (cf. bug 404 signalé). Vérifie que le candidat a
 * réellement postulé à une offre de ce recruteur avant de renvoyer
 * quoi que ce soit — un recruteur ne peut pas consulter n'importe
 * quel profil non vérifié par ce biais, seulement ceux qui lui ont
 * candidaté.
 */
export async function getProfilCandidat(candidatureId: string, recruteurId: string): Promise<ProfilCandidat | null> {
  const supabase = await createClient();
  const { data: candidature } = await supabase
    .from("candidatures")
    .select("prestataire_id, offre_id, statut")
    .eq("id", candidatureId)
    .maybeSingle();
  if (!candidature) return null;

  const { data: offre } = await supabase
    .from("offres")
    .select("recruteur_id")
    .eq("id", candidature.offre_id)
    .maybeSingle();
  if (!offre || offre.recruteur_id !== recruteurId) return null;

  const admin = createAdminClient();
  const { data: profil } = await admin
    .from("prestataires_profils")
    .select(
      "id, user_id, metier, titre, ville, bio, specialites, certifications, competences, langues, statut_verification, photo_url",
    )
    .eq("id", candidature.prestataire_id)
    .maybeSingle();
  if (!profil) return null;

  const [{ data: userData }, { data: formations }, { data: experiences }] = await Promise.all([
    admin.from("users").select("prenom, nom").eq("id", profil.user_id).maybeSingle(),
    admin
      .from("prestataires_formations")
      .select("id, etablissement, diplome, annee_obtention")
      .eq("prestataire_id", profil.id),
    admin.from("experiences").select("id, intitule, employeur, periode, description").eq("prestataire_id", profil.id),
  ]);

  return {
    prestataireId: profil.id,
    prenom: userData?.prenom ?? null,
    nom: userData?.nom ?? null,
    photoUrl: profil.photo_url,
    metier: profil.metier,
    titre: profil.titre,
    ville: profil.ville,
    bio: profil.bio,
    specialites: profil.specialites,
    certifications: profil.certifications,
    competences: profil.competences,
    langues: profil.langues,
    statutVerification: profil.statut_verification,
    formations: (formations ?? []).map((f) => ({
      id: f.id,
      etablissement: f.etablissement,
      diplome: f.diplome,
      anneeObtention: f.annee_obtention,
    })),
    experiences: (experiences ?? []).map((e) => ({
      id: e.id,
      intitule: e.intitule,
      employeur: e.employeur,
      periode: e.periode,
      description: e.description,
    })),
    candidatureStatut: candidature.statut,
  };
}
