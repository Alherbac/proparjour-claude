import { createClient } from "@/lib/supabase/server";
import { tarifHoraireReference } from "@/lib/tarif";
import { jourDeLaSemaine } from "@/config/jours-semaine";
import { normaliserTexte } from "@/lib/similarite-texte";
import type { PrestatairesPublicsRow, OffresRow, MetierType } from "@/lib/supabase/database.types";

/**
 * Moteur de recommandation (Bloc 3, enrichi au Lot F) — remplace le
 * classement crude de lib/recherche.ts (titre/spécialité en texte
 * libre) par un score explicable par sous-besoin (métier + ville +
 * date + horaires + tarif + contraintes/contexte), sous forme de
 * checklist de critères plutôt qu'un seul pourcentage opaque.
 *
 * Chaque critère contribue tout ou rien à son poids (comme une case
 * cochée), pas de crédit partiel caché — le pourcentage affiché est
 * la somme exacte des poids des critères validés, donc toujours
 * cohérent avec la checklist montrée à côté.
 *
 * Limite assumée : aucune donnée géographique (code postal,
 * coordonnées) n'existe dans le schéma — "Zone d'intervention
 * adaptée" reste une correspondance de ville en texte normalisé, pas
 * une vraie distance.
 *
 * Lot F — trois états, jamais deux : un critère "non renseigné" (rien
 * en base pour trancher) ne doit jamais être confondu avec "ne
 * correspond pas" (une vraie donnée contraire existe). Les deux
 * contribuent 0 point au score (aucune régression du calcul existant,
 * qui traitait déjà toute donnée absente comme non valide) mais
 * s'affichent différemment (○ jamais ✗) — voir EtatCritere.
 */

export type NiveauMatch = "excellent" | "bon" | "partiel";

export type CleCritere = "disponible" | "fiabilite" | "experience" | "zone" | "tarif" | "verifie" | "contraintes";

export type EtatCritere = "correspond" | "ne_correspond_pas" | "non_renseigne";

export type CritereMatch = {
  cle: CleCritere;
  label: string;
  etat: EtatCritere;
};

/** Lot F §14/§15 — détail par contrainte (jamais un simple agrégat) : ce qui a permis d'affiner le "Pourquoi ce profil ?" sans dupliquer le calcul du score lui-même. */
export type ContrainteMatchDetail = {
  label: string;
  niveau: "requis" | "prefere";
  etat: EtatCritere;
};

export type Recommandation = {
  prestataire: PrestatairesPublicsRow;
  score: number;
  niveau: NiveauMatch;
  criteres: CritereMatch[];
  contraintesDetail: ContrainteMatchDetail[];
};

export type ContrainteBesoin = { label: string; niveau: "requis" | "prefere" };

export type BesoinMatching = {
  metier: MetierType;
  ville: string;
  date: string; // ISO yyyy-mm-dd
  heureDebut: string;
  heureFin: string;
  // Non renseigné sur le parcours de simple consultation des
  // recommandations (aucun tarif encore proposé à ce stade) — dans ce
  // cas le critère "Tarif compatible" est neutre (toujours validé),
  // il ne pénalise jamais un prestataire pour un prix que le client
  // n'a pas encore indiqué.
  tarifHoraire?: number;
  quantite: number;
  // Lot F — contraintes/contexte du sous-besoin (Lots B/C/D), utilisés
  // UNIQUEMENT quand une donnée réelle du profil permet de trancher
  // (voir VERIFICATION_CONTRAINTE/VERIFICATION_CONTEXTE) ; jamais
  // inventés pour les autres. Optionnels : un appel sans ces champs
  // (ex. la page profil sans mission précise) se comporte exactement
  // comme avant ce lot.
  contraintes?: ContrainteBesoin[];
  contexte?: string | null;
};

export type ResultatMatching = {
  recommandations: Recommandation[];
  suffisant: boolean;
};

/**
 * Lot F — poids revus une seule fois, additivement, pour faire de la
 * place au nouveau critère "contraintes" sans changer le total (100).
 * Justification du déplacement de 10 points :
 * - fiabilite 20→15 : nb_litiges vaut 0 pour la quasi-totalité du vivier
 *   actuel (aucun litige enregistré à ce jour) — ce critère différencie
 *   très rarement deux profils entre eux dans la pratique, contrairement
 *   à une contrainte explicitement demandée par le client.
 * - tarif 15→10 : la tolérance de 15% (TOLERANCE_TARIF) le rend déjà
 *   peu discriminant (la plupart des tarifs réels du vivier rentrent
 *   dedans).
 * Aucun autre poids n'a bougé. disponible reste le plus lourd (25) :
 * un profil indisponible ne doit jamais dépasser un profil disponible
 * de justesse, exactement comme avant ce lot.
 */
const POIDS: Record<CleCritere, number> = {
  disponible: 25,
  fiabilite: 15,
  experience: 15,
  zone: 15,
  tarif: 10,
  verifie: 10,
  contraintes: 10,
};

const SEUIL_EXCELLENT = 85;
const SEUIL_BON = 65;
// Tolérance sur le tarif : un prestataire jusqu'à 15% au-dessus du tarif proposé reste "compatible".
const TOLERANCE_TARIF = 1.15;

function normaliserVille(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Réimplémentation volontaire (pas un import de lib/admin/pilotage.ts)
 * : calculerScoreRisque y combine aussi statutVerification/nbAnnulations,
 * deux entrées sans signification ici (statut toujours "valide" dans ce
 * pool, annulations non calculées) — et importer ce module admin-only
 * (server-only, createAdminClient) depuis un moteur public serait un
 * mauvais couplage. Même esprit (litiges = signal fort), inputs adaptés.
 */
function fiabiliteBonne(nbLitiges: number): boolean {
  return nbLitiges === 0;
}

function niveauDe(score: number): NiveauMatch {
  if (score >= SEUIL_EXCELLENT) return "excellent";
  if (score >= SEUIL_BON) return "bon";
  return "partiel";
}

/**
 * Lot F §4/§8/§9 — associe une contrainte/un contexte détecté (Lots
 * B/D, lib/besoin.ts) à la colonne réellement exposée par
 * `prestataires_publics` qui permet de le vérifier, le cas échéant.
 * `null` = strictement aucune colonne ne permet de trancher
 * aujourd'hui : le critère reste "non_renseigne" pour TOUT le monde,
 * jamais "ne correspond pas" (cahier §8, §31 : "ne pas inventer une
 * compétence"). Documenté précisément dans le rapport de ce lot plutôt
 * que contourné par une migration non demandée.
 */
const VERIFICATION_CONTRAINTE: Record<string, { champ: "langues" | "certifications" | "specialites"; mots: string[] } | null> = {
  Anglais: { champ: "langues", mots: ["anglais", "english"] },
  "Certification SSIAP": { champ: "certifications", mots: ["ssiap"] },
  "Expérience VIP": { champ: "specialites", mots: ["vip"] },
  "Expérience événementielle": { champ: "specialites", mots: ["evenementiel", "evenement", "concert"] },
  "Expérience en magasin": { champ: "specialites", mots: ["magasin", "retail"] },
  "Expérience dans le luxe": { champ: "specialites", mots: ["luxe", "hotellerie"] },
  // Déjà couvert par le critère "experience" existant (specialites.length>0
  // ou une ligne dans `experiences`) — pas dupliqué ici pour ne pas
  // compter deux fois le même signal dans des critères différents.
  "Expérience demandée": null,
  // `tenue` existe sur prestataires_profils mais n'est PAS exposée par
  // la vue publique prestataires_publics (voir migration 0019) — la
  // rendre vérifiable exigerait d'élargir cette vue, une vraie
  // modification de schéma volontairement NON faite dans ce lot
  // (cahier §35 : "ne bricole pas, arrête-toi, explique"). Voir le
  // rapport final, section "limites restantes".
  "Tenue noire": null,
  "Tenue professionnelle": null,
  // Aucune colonne "permis"/"véhicule" n'existe nulle part dans le
  // schéma (ni même sur la table privée) — absence structurelle, pas
  // un oubli d'exposition. Même traitement : toujours non_renseigne.
  "Permis requis": null,
  Véhiculé: null,
};

/** Lot F §9 — même principe que VERIFICATION_CONTRAINTE, pour le contexte de la mission. Liste vide = aucune spécialité de la taxonomie ne correspond directement à ce contexte, jamais déduit autrement. */
const VERIFICATION_CONTEXTE: Record<string, string[]> = {
  "Soirée VIP": ["vip"],
  "Événement VIP": ["vip"],
  Concert: ["concert", "evenementiel"],
  Mariage: [],
  "Salon / Congrès": ["salon", "congres"],
  Cocktail: ["cocktail"],
  "Boîte de nuit": ["clubbing"],
  Hôtel: ["hotellerie"],
  Restaurant: ["restaurant", "bar"],
  Entreprise: [],
  "Magasin / Boutique": ["magasin", "retail"],
  "Événement sportif": [],
  Inauguration: [],
  Soirée: ["soiree"],
  Événement: ["evenementiel"],
};

/** Un champ liste vide (jamais renseigné) → non_renseigne ; une liste non vide qui ne contient aucun des mots recherchés → ne_correspond_pas (le prestataire a listé ce qu'il avait, et ce n'est pas ça) ; sinon → correspond. */
function etatDepuisListe(champ: readonly string[], mots: string[]): EtatCritere {
  if (champ.length === 0) return "non_renseigne";
  const normalise = champ.map((v) => normaliserTexte(v));
  const trouve = mots.some((mot) => normalise.some((v) => v.includes(normaliserTexte(mot))));
  return trouve ? "correspond" : "ne_correspond_pas";
}

/**
 * Lot F §8 — détail par contrainte, jamais un simple booléen agrégé :
 * chaque contrainte du besoin reçoit son propre état (correspond / ne
 * correspond pas / non renseigné) selon la colonne réellement
 * disponible pour ce prestataire (voir VERIFICATION_CONTRAINTE). Le
 * contexte, s'il est fourni, est ajouté comme ligne supplémentaire
 * purement informative (jamais "ne_correspond_pas" — l'absence d'une
 * spécialité listée n'est pas une preuve contraire, contrairement à
 * une contrainte explicitement demandée).
 */
function calculerContraintesDetail(
  prestataire: Pick<PrestatairesPublicsRow, "langues" | "certifications" | "specialites">,
  contraintes: ContrainteBesoin[],
  contexte: string | null | undefined,
): ContrainteMatchDetail[] {
  const detail: ContrainteMatchDetail[] = contraintes.map((c) => {
    const verification = VERIFICATION_CONTRAINTE[c.label];
    if (!verification) return { label: c.label, niveau: c.niveau, etat: "non_renseigne" };
    const champ = prestataire[verification.champ];
    return { label: c.label, niveau: c.niveau, etat: etatDepuisListe(champ, verification.mots) };
  });
  if (contexte) {
    const mots = VERIFICATION_CONTEXTE[contexte] ?? [];
    const etat = mots.length === 0 ? "non_renseigne" : etatDepuisListe(prestataire.specialites, mots);
    // Jamais "ne_correspond_pas" pour un simple contexte — voir doc ci-dessus.
    detail.push({ label: contexte, niveau: "prefere", etat: etat === "ne_correspond_pas" ? "non_renseigne" : etat });
  }
  return detail;
}

/** Lot F — un besoin sans aucune contrainte "requise" ne pénalise jamais personne (le critère n'est même pas inclus dans `criteres`, voir appelants). Sinon : une seule contrainte requise non satisfaite suffit à faire échouer le critère agrégé ; si aucune n'est en défaut mais qu'aucune n'a pu être vérifiée non plus, l'agrégat reste honnête ("non_renseigne", jamais un faux "correspond"). */
function etatAggregeContraintes(detail: ContrainteMatchDetail[]): EtatCritere {
  const requises = detail.filter((d) => d.niveau === "requis");
  if (requises.length === 0) return "correspond";
  if (requises.some((d) => d.etat === "ne_correspond_pas")) return "ne_correspond_pas";
  if (requises.every((d) => d.etat === "non_renseigne")) return "non_renseigne";
  return "correspond";
}

function calculerScore(criteres: CritereMatch[]): number {
  return criteres.reduce((total, c) => total + (c.etat === "correspond" ? POIDS[c.cle] : 0), 0);
}

export async function recommanderPrestataires(besoin: BesoinMatching): Promise<ResultatMatching> {
  const supabase = await createClient();

  const [{ data: pool }, { data: indisponibles }, { data: enMission }, { data: fiabiliteData }] = await Promise.all([
    supabase.from("prestataires_publics").select("*").eq("metier", besoin.metier),
    supabase.rpc("prestataires_indisponibles_le", { p_date: besoin.date }),
    supabase.rpc("prestataires_en_mission_ids"),
    supabase.rpc("prestataires_fiabilite"),
  ]);

  const candidats = pool ?? [];
  if (candidats.length === 0) return { recommandations: [], suffisant: false };

  const idsIndisponibles = new Set((indisponibles ?? []).map((r) => r.prestataire_id));
  const idsEnMission = new Set((enMission ?? []).map((r) => r.prestataire_id));
  const fiabiliteParId = new Map((fiabiliteData ?? []).map((f) => [f.prestataire_id, f]));

  const { data: experiences } = await supabase
    .from("experiences")
    .select("prestataire_id")
    .in(
      "prestataire_id",
      candidats.map((c) => c.id),
    );
  const idsAvecExperience = new Set((experiences ?? []).map((e) => e.prestataire_id));

  const jourFr = jourDeLaSemaine(besoin.date);
  const villeCible = normaliserVille(besoin.ville);
  const contraintesBesoin = besoin.contraintes ?? [];

  const recommandations: Recommandation[] = candidats.map((prestataire) => {
    // Lot F §7 — trois états, jamais deux : une vraie indisponibilité
    // (exception datée ou déjà en mission) reste "ne_correspond_pas"
    // quoi qu'il arrive ; un planning hebdomadaire jamais renseigné
    // (tableau vide) devient "non_renseigne" plutôt qu'un faux ✗ — le
    // score, lui, ne change pas (0 point dans les deux cas, comme
    // avant ce lot : aucune régression du classement).
    const indisponibiliteReelle = idsIndisponibles.has(prestataire.id) || idsEnMission.has(prestataire.id);
    const planningRenseigne = prestataire.disponibilites.length > 0;
    const dispoJourOk = prestataire.disponibilites.includes(jourFr);
    const disponibleEtat: EtatCritere = indisponibiliteReelle
      ? "ne_correspond_pas"
      : !planningRenseigne
        ? "non_renseigne"
        : dispoJourOk
          ? "correspond"
          : "ne_correspond_pas";

    const stats = fiabiliteParId.get(prestataire.id);
    const nbLitiges = stats?.nb_litiges ?? 0;
    const fiabiliteEtat: EtatCritere = fiabiliteBonne(nbLitiges) ? "correspond" : "ne_correspond_pas";

    const experienceEtat: EtatCritere =
      prestataire.specialites.length > 0 || idsAvecExperience.has(prestataire.id) ? "correspond" : "ne_correspond_pas";

    const zoneEtat: EtatCritere = normaliserVille(prestataire.ville) === villeCible ? "correspond" : "ne_correspond_pas";

    const tarifRef = tarifHoraireReference(prestataire.tarif_montant, prestataire.tarif_type);
    // Inchangé depuis avant ce lot : sans tarif cible communiqué par le
    // client, ce critère reste neutre (toujours "correspond"), jamais
    // requalifié en "non_renseigne" — cela ferait perdre 10 points à
    // CHAQUE recommandation du parcours "consultation simple" (aucun
    // tarif encore proposé), une régression de score que ce lot
    // s'interdit explicitement (cahier §10).
    const tarifEtat: EtatCritere =
      besoin.tarifHoraire === undefined || tarifRef <= besoin.tarifHoraire * TOLERANCE_TARIF ? "correspond" : "ne_correspond_pas";

    const verifieEtat: EtatCritere = prestataire.statut_verification === "valide" ? "correspond" : "ne_correspond_pas";

    const contraintesDetail = calculerContraintesDetail(prestataire, contraintesBesoin, besoin.contexte);
    const contraintesEtat = etatAggregeContraintes(contraintesDetail);

    const criteres: CritereMatch[] = [
      { cle: "disponible", label: "Disponible", etat: disponibleEtat },
      { cle: "experience", label: "Expérience correspondant à la mission", etat: experienceEtat },
      { cle: "zone", label: "Zone d'intervention adaptée", etat: zoneEtat },
      { cle: "verifie", label: "Profil vérifié", etat: verifieEtat },
      { cle: "tarif", label: "Tarif compatible", etat: tarifEtat },
      { cle: "fiabilite", label: "Très bonne fiabilité", etat: fiabiliteEtat },
    ];
    // Le critère "contraintes" n'apparaît que si la mission en a
    // réellement demandé au moins une — jamais une ligne creuse pour
    // une mission sans contrainte (cahier §4 : "ne jamais inventer une
    // donnée qui n'existe pas").
    if (contraintesBesoin.some((c) => c.niveau === "requis")) {
      criteres.push({ cle: "contraintes", label: "Contraintes de la mission", etat: contraintesEtat });
    }

    const score = calculerScore(criteres);

    return { prestataire, score, niveau: niveauDe(score), criteres, contraintesDetail };
  });

  recommandations.sort((a, b) => b.score - a.score);

  const suffisant = recommandations.filter((r) => r.niveau !== "partiel").length >= besoin.quantite;

  return { recommandations, suffisant };
}

export type MissionRecommandee = {
  offre: OffresRow;
  score: number;
  niveau: NiveauMatch;
  criteres: CritereMatch[];
};

/**
 * Sens inverse du moteur (prestataire → offres) : note les offres
 * ouvertes du métier d'un prestataire par rapport à son propre profil.
 * Mêmes poids, mêmes seuils, même moteur que recommanderPrestataires —
 * seul le sens de la comparaison change (pas un second algorithme).
 *
 * Lot F — limite assumée et documentée plutôt que contournée : les
 * contraintes/le contexte d'une offre ne sont conservés qu'en texte
 * libre dans sa description (voir app/actions/offres.ts,
 * blocContexteContraintes) — aucune colonne structurée sur `offres`
 * ne les porte. Les exploiter ici nécessiterait soit de les reparser
 * depuis ce texte (un second moteur d'extraction, explicitement
 * interdit par ce lot), soit d'ajouter de vraies colonnes structurées
 * à `offres` (une migration, volontairement NON faite ici — cahier
 * §35). Cette direction reste donc au même niveau qu'avant ce lot ;
 * seule la disponibilité gagne la même honnêteté à trois états.
 */
export async function recommanderMissionsPourPrestataire(prestataireUserId: string): Promise<MissionRecommandee[]> {
  const supabase = await createClient();

  const { data: profil } = await supabase
    .from("prestataires_profils")
    .select("id, metier, ville, tarif_montant, tarif_type, specialites, statut_verification, disponibilites")
    .eq("user_id", prestataireUserId)
    .maybeSingle();
  if (!profil) return [];

  const { data: offresPool } = await supabase
    .from("offres")
    .select("*")
    .eq("statut", "publiee")
    .eq("metier", profil.metier)
    .order("created_at", { ascending: false });

  const offres = offresPool ?? [];
  if (offres.length === 0) return [];

  const datesDistinctes = [...new Set(offres.map((o) => o.date_mission))];

  const [indisponiblesParDate, { data: enMission }, { data: fiabiliteData }, { data: experiences }] = await Promise.all([
    Promise.all(
      datesDistinctes.map(async (date) => {
        const { data } = await supabase.rpc("prestataires_indisponibles_le", { p_date: date });
        return [date, new Set((data ?? []).map((r) => r.prestataire_id))] as const;
      }),
    ),
    supabase.rpc("prestataires_en_mission_ids"),
    supabase.rpc("prestataires_fiabilite"),
    supabase.from("experiences").select("prestataire_id").eq("prestataire_id", profil.id),
  ]);

  const indisponiblesParDateMap = new Map(indisponiblesParDate);
  const enMissionSet = new Set((enMission ?? []).map((r) => r.prestataire_id));
  const statsFiabilite = (fiabiliteData ?? []).find((f) => f.prestataire_id === profil.id);
  const fiabiliteEtat: EtatCritere = fiabiliteBonne(statsFiabilite?.nb_litiges ?? 0) ? "correspond" : "ne_correspond_pas";
  const experienceEtat: EtatCritere =
    profil.specialites.length > 0 || (experiences ?? []).length > 0 ? "correspond" : "ne_correspond_pas";
  const verifieEtat: EtatCritere = profil.statut_verification === "valide" ? "correspond" : "ne_correspond_pas";
  const villePrestataire = normaliserVille(profil.ville);
  const tarifRefPrestataire = tarifHoraireReference(profil.tarif_montant, profil.tarif_type);
  const planningRenseigne = profil.disponibilites.length > 0;

  const resultats: MissionRecommandee[] = offres.map((offre) => {
    const jourFr = jourDeLaSemaine(offre.date_mission);
    const indisponiblesCeJour = indisponiblesParDateMap.get(offre.date_mission) ?? new Set<string>();
    const indisponibiliteReelle = indisponiblesCeJour.has(profil.id) || enMissionSet.has(profil.id);
    const disponibleEtat: EtatCritere = indisponibiliteReelle
      ? "ne_correspond_pas"
      : !planningRenseigne
        ? "non_renseigne"
        : profil.disponibilites.includes(jourFr)
          ? "correspond"
          : "ne_correspond_pas";

    const zoneEtat: EtatCritere = normaliserVille(offre.ville) === villePrestataire ? "correspond" : "ne_correspond_pas";

    // Symétrique de TOLERANCE_TARIF côté client : l'offre reste
    // compatible tant qu'elle ne descend pas de plus de ~13% sous le
    // tarif de référence habituel du prestataire.
    const tarifEtat: EtatCritere = offre.tarif_horaire >= tarifRefPrestataire / TOLERANCE_TARIF ? "correspond" : "ne_correspond_pas";

    const criteres: CritereMatch[] = [
      { cle: "disponible", label: "Vous êtes disponible", etat: disponibleEtat },
      { cle: "experience", label: "Votre expérience correspond", etat: experienceEtat },
      { cle: "zone", label: "Votre zone d'intervention correspond", etat: zoneEtat },
      { cle: "verifie", label: "Votre profil est vérifié", etat: verifieEtat },
      { cle: "tarif", label: "Votre tarif correspond", etat: tarifEtat },
      { cle: "fiabilite", label: "Votre fiabilité est excellente", etat: fiabiliteEtat },
    ];

    const score = calculerScore(criteres);
    return { offre, score, niveau: niveauDe(score), criteres };
  });

  resultats.sort((a, b) => b.score - a.score);
  return resultats;
}
