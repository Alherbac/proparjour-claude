"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Search, ArrowRight, ArrowLeft, Send, Plus, X, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VilleAutocompleteIdf } from "@/components/ville-autocomplete-idf";
import { createClient } from "@/lib/supabase/client";
import { METIERS, type MetierId } from "@/config/metiers";
import { infosFamille } from "@/config/famille-metiers";
import { publierOffre, publierDemandeGlobale } from "@/app/actions/offres";
import {
  extraireBesoin,
  extraireSousBesoins,
  detecterAdresse,
  detecterArrondissement,
  sauvegarderBesoin,
  lireBesoin,
  sauvegarderDemande,
  lireDemande,
  type MomentJournee,
  type ContexteDetecte,
  type ContrainteDetectee,
  type Ambiguite,
} from "@/lib/besoin";
import { type JourneeMission, validerJournees, trierJourneesParDate, premiereDateJournees } from "@/lib/journees";
import { EditeurJournees } from "@/components/journees/editeur-journees";
import { cn } from "@/lib/utils";

type Chip = {
  metier: MetierId;
  quantite: number;
  manuel: boolean;
  // Mission multi-jours (migration 0062) — null : ce métier hérite de
  // `journeesCommunes` (voir journeesResolues plus bas) ; un tableau :
  // override complet propre à ce métier (généralise l'ancien override
  // "date propre à ce métier" à date+horaires ensemble). Jamais imposé
  // aux autres métiers, jamais une valeur inventée.
  journees: JourneeMission[] | null;
  moment: MomentJournee | null;
  ville: string | null;
  // Jamais extrait du texte — le tarif n'est fiable que saisi par le
  // client ; c'est la seule information "manquante" quasi certaine.
  tarifHoraire: number | null;
  contexte: ContexteDetecte | null;
  contraintes: ContrainteDetectee[];
  ambiguites: Ambiguite[];
  quantiteIncertaine: boolean;
};

type Onglet = "commun" | MetierId;

const LABEL_MOMENT: Record<MomentJournee, string> = {
  matin: "Matin",
  "apres-midi": "Après-midi",
  soir: "Soir",
  nuit: "Nuit",
};

const SUGGESTIONS_PREREQUIS = [
  "Expérience ou qualification requise",
  "Précisions sur la mission",
  "Tenue ou matériel attendu",
];

function formatDateFr(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Reconstruit une liste de journées à partir d'un ancien brouillon
 * mono-date (`date`/`heureDebut`/`heureFin` scalaires, éventuellement
 * absents) — utilisé UNIQUEMENT en repli quand `journees` n'existe pas
 * ou est vide (compatibilité ascendante, lib/besoin.ts::BesoinEnCours/
 * SousBesoinEnCours). Jamais utilisé quand `journees` est déjà présent.
 */
function journeesDepuisChampsScalaires(date: string | null | undefined, heureDebut: string | null | undefined, heureFin: string | null | undefined): JourneeMission[] {
  return [{ date: date ?? "", heureDebut: heureDebut ?? "", heureFin: heureFin ?? "" }];
}

/**
 * Transforme la sortie NLP (une date/heure "de segment" + les dates
 * additionnelles de `detecterDatesMultiples`, lib/besoin.ts) en
 * override de journées pour un chip — "lundi, mercredi et vendredi de
 * 9h à 17h" devient 3 journées, chacune avec les mêmes horaires
 * (extraits une seule fois par segment, jamais recalculés par jour).
 * Retourne `null` (hérite de journeesCommunes) quand RIEN n'a été
 * détecté pour ce métier — jamais une journée vide inventée.
 */
function construireJourneesDetectees(d: {
  date: string | null;
  heureDebut: string | null;
  heureFin: string | null;
  datesMultiples?: string[] | null;
}): JourneeMission[] | null {
  if (!d.date && !d.heureDebut && !d.heureFin) return null;
  const heureDebut = d.heureDebut ?? "";
  const heureFin = d.heureFin ?? "";
  if (d.datesMultiples && d.datesMultiples.length > 1) {
    return d.datesMultiples.map((date) => ({ date, heureDebut, heureFin }));
  }
  return [{ date: d.date ?? "", heureDebut, heureFin }];
}

function creerChip(d: {
  metier: MetierId;
  quantite: number;
  journees: JourneeMission[] | null;
  moment?: MomentJournee | null;
  ville?: string | null;
  tarifHoraire?: number | null;
  contexte?: ContexteDetecte | null;
  contraintes?: ContrainteDetectee[];
  ambiguites?: Ambiguite[];
  quantiteIncertaine?: boolean;
}): Chip {
  return {
    metier: d.metier,
    quantite: d.quantite,
    manuel: false,
    journees: d.journees,
    moment: d.moment ?? null,
    ville: d.ville ?? null,
    tarifHoraire: d.tarifHoraire ?? null,
    contexte: d.contexte ?? null,
    contraintes: d.contraintes ?? [],
    // Un brouillon repris après connexion (chipsDepuis*) ne porte
    // jamais de confirmation en attente — voir SousBesoinEnCours,
    // lib/besoin.ts : ambiguites/quantiteIncertaine n'y sont pas
    // persistées, la reprise part toujours d'un état "rien à confirmer".
    ambiguites: d.ambiguites ?? [],
    quantiteIncertaine: d.quantiteIncertaine ?? false,
  };
}

/** Reprend une demande multi-métiers sauvegardée (ex. après un aller-retour par la connexion) — null si aucune. */
function chipsDepuisDemandeSauvee(): Chip[] | null {
  const demande = lireDemande();
  if (!demande || demande.sousBesoins.length === 0) return null;
  return demande.sousBesoins.map((sb) =>
    creerChip({
      metier: sb.metier,
      quantite: sb.quantite,
      // Compatibilité ascendante (§6/§10) : `journees` prioritaire s'il
      // existe et n'est pas vide, sinon reconstruction depuis les
      // anciens champs scalaires — jamais une erreur sur un vieux brouillon.
      journees: sb.journees && sb.journees.length > 0 ? sb.journees : journeesDepuisChampsScalaires(sb.date, sb.heureDebut, sb.heureFin),
      ville: sb.ville,
      tarifHoraire: sb.tarifHoraire,
      // Brouillon antérieur au Lot B : ces clés sont absentes, jamais inventées ici (?? null / ?? []).
      contexte: sb.contexte ?? null,
      contraintes: sb.contraintes ?? [],
    }),
  );
}

/** Reprend un besoin mono-métier sauvegardé — null si aucune. */
function chipsDepuisBesoinSauve(): Chip[] | null {
  const besoin = lireBesoin();
  if (!besoin?.metier) return null;
  return [
    creerChip({
      metier: besoin.metier,
      quantite: besoin.quantite ?? 1,
      journees: besoin.journees && besoin.journees.length > 0 ? besoin.journees : journeesDepuisChampsScalaires(besoin.date, besoin.heureDebut, besoin.heureFin),
      ville: besoin.ville,
      tarifHoraire: besoin.tarifHoraire ?? null,
      contexte: besoin.contexte ?? null,
      contraintes: besoin.contraintes ?? [],
    }),
  ];
}

/**
 * Écran "Publier une offre" (parcours B, route dédiée /publier-une-offre
 * — jamais partagée avec /prestataires) — distinct et strictement
 * séparé de RechercheBar (parcours A "Rechercher un professionnel").
 * Le client ne choisit jamais personne et ne voit jamais de vignette
 * de prestataire (README §8/§11, ÉCLAIRCISSEMENT-DEUX-PARCOURS.txt).
 *
 * Étape "détails" alignée sur la même grammaire que "Proposer la
 * mission" (README §11, captures du dossier "Proparjour design a
 * jour") : métiers en onglets, bloc "Commun à toute l'offre" saisi une
 * seule fois, colonne de droite "Votre offre" / "Avant de publier" /
 * "Ce qui se passe ensuite" / actions. Toute la logique de détection,
 * d'édition et de publication ci-dessous est inchangée — seule la
 * mise en forme change.
 */
export function BesoinCapture({ texteInitial }: { texteInitial?: string }) {
  const router = useRouter();
  // Priorité : un brouillon déjà en cours (localStorage, lib/besoin.ts)
  // gagne TOUJOURS sur `texteInitial` (le paramètre ?q= de l'URL) — pas
  // seulement en l'absence de `texteInitial`. Sans cette priorité, une
  // simple actualisation de page en cours de saisie — l'URL ?q=... ne
  // change jamais pendant l'édition — ré-extrayait la phrase d'origine
  // à chaque fois et effaçait toute modification manuelle (titre,
  // adresse, tarifs...) déjà auto-sauvegardée. Le TTL d'une heure
  // (DUREE_VIE_BROUILLON_MS) borne déjà le risque qu'un très ancien
  // brouillon abandonné revienne masquer une nouvelle phrase.
  const chipsSauveesInitiales = chipsDepuisDemandeSauvee() ?? chipsDepuisBesoinSauve();
  const [texte, setTexte] = useState(() => {
    if (chipsSauveesInitiales) return lireDemande()?.texteOriginal ?? lireBesoin()?.texte ?? texteInitial ?? "";
    return texteInitial ?? "";
  });
  const [chips, setChips] = useState<Chip[]>(() => {
    if (chipsSauveesInitiales) return chipsSauveesInitiales;
    if (texteInitial) {
      const decomposition = extraireSousBesoins(texteInitial);
      if (decomposition.length > 0)
        return decomposition.map((d) =>
          creerChip({
            metier: d.metier,
            quantite: d.quantite,
            journees: construireJourneesDetectees(d),
            moment: d.moment,
            contexte: d.contexte,
            contraintes: d.contraintes,
            ambiguites: d.ambiguites,
            quantiteIncertaine: d.quantiteIncertaine,
          }),
        );
      const extrait = extraireBesoin(texteInitial);
      return extrait.metier
        ? [
            creerChip({
              metier: extrait.metier,
              quantite: extrait.quantite ?? 1,
              journees: construireJourneesDetectees(extrait),
              moment: extrait.moment,
              contexte: extrait.contexte,
              contraintes: extrait.contraintes,
              ambiguites: extrait.ambiguites,
              quantiteIncertaine: extrait.quantiteIncertaine,
            }),
          ]
        : [];
    }
    return [];
  });
  // Deux écrans distincts, jamais tout empilé sur une seule page qui
  // défile : la barre de saisie d'abord, puis — seulement après un
  // "Continuer" explicite — l'écran "Publier une offre" avec ses
  // onglets. Un brouillon repris (refresh, retour post-connexion) ou
  // un texte déjà fourni (lien depuis le hero) sautent directement au
  // second écran.
  const [etape, setEtape] = useState<"saisie" | "details">(() => {
    if (chipsSauveesInitiales && chipsSauveesInitiales.length > 0) return "details";
    return texteInitial ? "details" : "saisie";
  });
  const [supprimes, setSupprimes] = useState<Set<MetierId>>(new Set());
  const demandeSauvee = chipsSauveesInitiales ? lireDemande() : null;
  // "|| chips[0]?.ville" comble le cas mono-métier : BesoinEnCours (la
  // sauvegarde d'un seul métier, lib/besoin.ts) n'a pas de champ
  // "ville" de demande séparé — la ville vit uniquement sur le chip
  // restauré, déjà présente dans `chips` à ce stade.
  const [ville, setVille] = useState<string | null>(demandeSauvee?.ville || chips[0]?.ville || null);
  // Lot C §1 — ville devinée seulement par une préposition ("... à
  // Paris", sans code postal) : reste préremplie (voir analyser, plus
  // bas) mais accompagnée de cette confirmation globale tant qu'elle
  // n'a pas été validée ou corrigée. Jamais persistée (voir creerChip) :
  // une reprise de brouillon repart sans confirmation en attente.
  const [ambiguiteVille, setAmbiguiteVille] = useState<{ ville: string } | null>(null);
  // Mission multi-jours (migration 0062) — journées PAR DÉFAUT de la
  // demande, utilisées par tout métier dont `journees` est null (voir
  // Chip.journees). Compatibilité ascendante (§6/§10) : `journees` du
  // brouillon prioritaire, sinon reconstruction depuis les anciens
  // champs scalaires date/heureDebut/heureFin, sinon (cas mono-métier
  // repris via chipsDepuisBesoinSauve, sans DemandeEnCours propre) les
  // journées déjà résolues du chip unique, sinon une journée vide.
  const [journeesCommunes, setJourneesCommunes] = useState<JourneeMission[]>(() => {
    if (demandeSauvee?.journees && demandeSauvee.journees.length > 0) return demandeSauvee.journees;
    if (demandeSauvee) return journeesDepuisChampsScalaires(demandeSauvee.date, demandeSauvee.heureDebut, demandeSauvee.heureFin);
    if (chips[0]?.journees && chips[0].journees.length > 0) return chips[0].journees;
    return [{ date: "", heureDebut: "", heureFin: "" }];
  });
  const [adresseTexte, setAdresseTexte] = useState<string | null>(null);
  // "?? lireBesoin()?.titre" comble le cas mono-métier (demandeSauvee
  // vient de lireDemande(), toujours null hors du cas multi).
  const [titre, setTitre] = useState(demandeSauvee?.titre ?? (chipsSauveesInitiales ? lireBesoin()?.titre : undefined) ?? "");
  const [prerequis, setPrerequis] = useState<string[]>([]);
  // null = message auto-composé (texte + prérequis + adresse) affiché
  // tel quel ; une valeur = le client l'a personnalisé à la main et
  // celle-ci prévaut jusqu'à un retour explicite à la version générée.
  const [messagePersonnalise, setMessagePersonnalise] = useState<string | null>(null);
  const [envoiPublication, setEnvoiPublication] = useState(false);
  const [erreurPublication, setErreurPublication] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<Onglet>("commun");
  const zoneSaisieRef = useRef<HTMLTextAreaElement>(null);

  const modeMulti = chips.length >= 2;
  const chipUnique = chips.length === 1 ? chips[0] : null;
  const ongletActif: Onglet = modeMulti ? onglet : (chips[0]?.metier ?? "commun");
  // Journées effectivement utilisées par ce métier — override propre
  // s'il existe, sinon repli sur les journées communes de la demande
  // (architecture validée : jamais un troisième concept multi-jours).
  function journeesResolues(c: Chip): JourneeMission[] {
    return c.journees ?? journeesCommunes;
  }
  const dateApercu = premiereDateJournees(journeesCommunes) ?? (chipUnique ? premiereDateJournees(journeesResolues(chipUnique)) : null);
  const titreParDefaut = dateApercu ? `Événement du ${formatDateFr(dateApercu)}` : "Ma demande";

  // "Prête pour la publication" exige une vraie date (offres.date_mission
  // est NOT NULL), un lieu, un horaire et un tarif — ce dernier n'est
  // jamais extrait du texte, c'est la seule information que le client
  // doit obligatoirement saisir lui-même (règle de parcours B : une
  // offre publiée sans rémunération fait candidater les professionnels
  // à l'aveugle).
  function champsResolus(c: Chip) {
    return { ville: c.ville ?? ville };
  }
  function carteResoluePourPublication(c: Chip): boolean {
    const r = champsResolus(c);
    return Boolean(validerJournees(journeesResolues(c)) === null && r.ville && c.tarifHoraire && c.tarifHoraire > 0);
  }
  const communComplet = titre.trim().length > 0 && validerJournees(journeesCommunes) === null && Boolean(ville);
  const pretPourPublication = chips.length > 0 && chips.every(carteResoluePourPublication);
  // Toute carte à laquelle il manque quoi que ce soit (lieu/horaire —
  // bloquants pour tout — ou date/tarif — bloquants seulement pour
  // publier) apparaît dans le même panneau rouge unique, jamais éclatée
  // entre un panneau structuré et une phrase générique selon ce qui manque.
  const cartesIncompletes = chips.filter((c) => !carteResoluePourPublication(c));
  const totalPostes = chips.reduce((somme, c) => somme + c.quantite, 0);

  // "Avant de publier" — même grammaire que "Proposer la mission" :
  // une ligne cliquable par élément manquant, "commun" ou nom court du
  // métier, qui bascule directement sur l'onglet concerné.
  const manques: { label: string; scope: string; onglet: Onglet }[] = [];
  if (!titre.trim()) manques.push({ label: "Titre de l'offre", scope: "commun", onglet: "commun" });
  const erreurJourneesCommunes = validerJournees(journeesCommunes);
  if (erreurJourneesCommunes) manques.push({ label: erreurJourneesCommunes, scope: "commun", onglet: "commun" });
  if (!ville) manques.push({ label: "Adresse exacte", scope: "commun", onglet: "commun" });
  for (const c of chips) {
    const info = infosFamille(c.metier);
    const court = METIERS.find((m) => m.id === c.metier)?.filiere.split(" ")[0].replace("&", "").trim() || info.filiere;
    const erreurJourneesChip = validerJournees(journeesResolues(c));
    if (erreurJourneesChip) manques.push({ label: erreurJourneesChip, scope: court, onglet: c.metier });
    if (!(c.tarifHoraire && c.tarifHoraire > 0)) manques.push({ label: "Rémunération", scope: court, onglet: c.metier });
  }

  function analyser(nouveauTexte: string) {
    setTexte(nouveauTexte);
    if (!nouveauTexte.trim()) {
      setChips([]);
      setSupprimes(new Set());
      setAdresseTexte(null);
      return;
    }

    const decomposition = extraireSousBesoins(nouveauTexte);
    const extrait = extraireBesoin(nouveauTexte);
    const detectes: {
      metier: MetierId;
      quantite: number;
      heureDebut: string | null;
      heureFin: string | null;
      date: string | null;
      datesMultiples?: string[] | null;
      moment: MomentJournee | null;
      contexte: ContexteDetecte | null;
      contraintes: ContrainteDetectee[];
      ambiguites: Ambiguite[];
      quantiteIncertaine: boolean;
    }[] =
      decomposition.length > 0
        ? decomposition
        : extrait.metier
          ? [
              {
                metier: extrait.metier,
                quantite: extrait.quantite ?? 1,
                heureDebut: extrait.heureDebut,
                heureFin: extrait.heureFin,
                date: extrait.date,
                moment: extrait.moment,
                contexte: extrait.contexte,
                contraintes: extrait.contraintes,
                ambiguites: extrait.ambiguites,
                quantiteIncertaine: extrait.quantiteIncertaine,
              },
            ]
          : [];

    setChips((prev) => {
      const idsPresents = new Set(prev.map((c) => c.metier));
      // Un besoin détecté qui n'est pas déjà une carte, et que
      // l'utilisateur n'a pas explicitement retiré, devient une
      // nouvelle carte — les valeurs des cartes existantes ne sont
      // jamais réécrasées par la frappe, seule une action explicite
      // (bouton, édition) les modifie. `datesMultiples` ("lundi,
      // mercredi et vendredi de 9h à 17h") devient directement autant
      // de journées avec les mêmes horaires — plus de message "seul le
      // premier jour sera publié" (voir construireJourneesDetectees).
      const nouveaux = detectes
        .filter((d) => !idsPresents.has(d.metier) && !supprimes.has(d.metier))
        .map((d) =>
          creerChip({
            metier: d.metier,
            quantite: d.quantite,
            journees: construireJourneesDetectees(d),
            moment: d.moment,
            contexte: d.contexte,
            contraintes: d.contraintes,
            ambiguites: d.ambiguites,
            quantiteIncertaine: d.quantiteIncertaine,
          }),
        );
      return [...prev, ...nouveaux];
    });

    // Journées communes — seulement préremplies tant qu'aucune saisie
    // (manuelle ou déjà détectée) n'existe encore, jamais écrasées une
    // fois renseignées (même garde que l'ancien setDate/setHeureDebut/
    // setHeureFin "prev ?? ...").
    setJourneesCommunes((prev) => {
      const vierge = prev.length === 1 && !prev[0].date && !prev[0].heureDebut && !prev[0].heureFin;
      if (!vierge) return prev;
      return construireJourneesDetectees(extrait) ?? prev;
    });

    const adresse = detecterAdresse(nouveauTexte);
    setAdresseTexte((prev) => (prev === null ? adresse?.texte ?? null : prev));
    if (adresse?.villeDevinee) {
      // Lot C §1 — même préremplissage non bloquant qu'avant, mais une
      // ville seulement "probable" (pas de code postal, juste "à
      // Paris") déclenche en plus la confirmation globale ; "certaine"
      // (code postal + ville) reste strictement le même comportement
      // silencieux qu'avant ce lot.
      setVille((prev) => prev ?? adresse.villeDevinee);
      if (adresse.villeCertitude === "probable") {
        setAmbiguiteVille((prev) => prev ?? { ville: adresse.villeDevinee! });
      }
    } else {
      // Lot D §9 — pas d'adresse de rue, mais un arrondissement cité
      // seul ("dans le 8e") reste un vrai indice de ville, toujours
      // proposé à confirmation (jamais aussi certain qu'un code postal).
      const arrondissement = detecterArrondissement(nouveauTexte);
      if (arrondissement) {
        setVille((prev) => prev ?? arrondissement);
        setAmbiguiteVille((prev) => prev ?? { ville: arrondissement });
      }
    }
  }

  function retirerChip(metier: MetierId) {
    setChips((prev) => prev.filter((c) => c.metier !== metier));
    setSupprimes((prev) => new Set(prev).add(metier));
    if (onglet === metier) setOnglet("commun");
  }

  function ajusterQuantite(metier: MetierId, delta: number) {
    setChips((prev) =>
      prev.map((c) =>
        c.metier === metier ? { ...c, quantite: Math.max(1, c.quantite + delta), quantiteIncertaine: false } : c,
      ),
    );
  }

  function mettreAJourChip(metier: MetierId, patch: Partial<Chip>) {
    setChips((prev) => prev.map((c) => (c.metier === metier ? { ...c, ...patch } : c)));
  }

  /** Lot B — le client garde la main : une contrainte mal détectée reste supprimable, une par une, sans perdre les autres. */
  function retirerContrainte(metier: MetierId, label: string) {
    setChips((prev) =>
      prev.map((c) => (c.metier === metier ? { ...c, contraintes: c.contraintes.filter((x) => x.label !== label) } : c)),
    );
  }

  /** Lot C — "Oui, c'est correct" : la valeur déjà préremplie est confirmée, on retire simplement le rappel. */
  function confirmerAmbiguite(metier: MetierId, champ: Ambiguite["champ"]) {
    setChips((prev) => prev.map((c) => (c.metier === metier ? { ...c, ambiguites: c.ambiguites.filter((a) => a.champ !== champ) } : c)));
  }
  /**
   * Lot C — "Modifier" : on efface la proposition (jamais gardée "au
   * cas où") et le client retape via l'éditeur habituel de la carte.
   * Mission multi-jours (migration 0062) — une ambiguïté de DATE porte
   * toujours sur la PREMIÈRE journée : c'est elle l'ancrage dont
   * dérivent les journées suivantes de `datesMultiples`
   * (detecterDatesMultiples, lib/besoin.ts), jamais une journée
   * quelconque du tableau. Une ambiguïté d'HORAIRES, elle, porte sur
   * un horaire unique extrait une seule fois par segment et partagé
   * par toutes les journées de ce métier — les effacer toutes pour
   * re-saisie, jamais une seule (elles ne peuvent pas être
   * individuellement "approximatives" indépendamment les unes des
   * autres, puisqu'elles viennent de la même extraction).
   */
  function effacerChampAmbigu(champ: Ambiguite["champ"], journees: JourneeMission[]): JourneeMission[] {
    return champ === "date"
      ? journees.map((j, i) => (i === 0 ? { ...j, date: "" } : j))
      : journees.map((j) => ({ ...j, heureDebut: "", heureFin: "" }));
  }
  function modifierAmbiguite(metier: MetierId, champ: Ambiguite["champ"]) {
    setChips((prev) =>
      prev.map((c) => {
        if (c.metier !== metier) return c;
        const base = c.journees ?? journeesCommunes;
        return { ...c, journees: effacerChampAmbigu(champ, base), ambiguites: c.ambiguites.filter((a) => a.champ !== champ) };
      }),
    );
    setJourneesCommunes((prev) => effacerChampAmbigu(champ, prev));
  }
  /** Lot C §4 — "Combien de personnes souhaitez-vous ?" : la quantité affichée (repli 1) reste, seul le rappel disparaît ; ajusterQuantite() fait déjà de même dès que le client touche +/-. */
  function confirmerQuantite(metier: MetierId) {
    setChips((prev) => prev.map((c) => (c.metier === metier ? { ...c, quantiteIncertaine: false } : c)));
  }

  function ajouterChip(metier: MetierId) {
    setChips((prev) =>
      // Rien de détecté pour ce nouveau métier : hérite des journées
      // communes (journees: null) plutôt qu'une journée vide — voir
      // l'architecture validée, "A) utiliser les journées communes".
      prev.some((c) => c.metier === metier)
        ? prev
        : [...prev, creerChip({ metier, quantite: 1, journees: null })].map((c) =>
            c.metier === metier ? { ...c, manuel: true } : c,
          ),
    );
    setSupprimes((prev) => {
      const next = new Set(prev);
      next.delete(metier);
      return next;
    });
    setOnglet(metier);
  }

  function ajouterPrerequis(suggestion?: string) {
    setPrerequis((prev) => [...prev, suggestion ?? ""]);
  }
  function modifierPrerequis(index: number, valeur: string) {
    setPrerequis((prev) => prev.map((p, i) => (i === index ? valeur : p)));
  }
  function retirerPrerequis(index: number) {
    setPrerequis((prev) => prev.filter((_, i) => i !== index));
  }

  function description(): string {
    const morceaux = [texte.trim(), ...prerequis.map((p) => p.trim()).filter(Boolean)];
    const corps = morceaux.join("\n\n");
    return adresseTexte ? `Adresse précise : ${adresseTexte}\n\n${corps}` : corps;
  }

  /** Le message effectivement envoyé — la version personnalisée par le client si elle existe, sinon la version auto-composée. */
  function messageFinal(): string {
    return messagePersonnalise ?? description();
  }

  /**
   * Lot B — bloc "Contexte" / "Contraintes" propre à UN chip, ajouté à
   * la description de SON offre au moment de la publication (jamais
   * dans messageFinal()/"Contexte", commun à toute la demande en mode
   * multi — ce serait précisément le mélange entre métiers que le
   * cahier interdit, §4/§8).
   */
  function blocContexteContraintes(chip: Chip): string {
    const lignes: string[] = [];
    if (chip.contexte) lignes.push(`Contexte : ${chip.contexte.label}`);
    if (chip.contraintes.length > 0) {
      lignes.push(
        `Contraintes :\n${chip.contraintes.map((c) => `- ${c.label}${c.niveau === "prefere" ? " (souhaité, pas obligatoire)" : ""}`).join("\n")}`,
      );
    }
    return lignes.join("\n\n");
  }

  function sauvegarderPourReprise() {
    const titreFinal = (titre || titreParDefaut).trim();
    // Mission multi-jours (migration 0062) — le tableau complet est
    // TOUJOURS persisté (jamais seulement la première date, §7), trié
    // chronologiquement. Les anciens champs scalaires sont conservés en
    // parallèle (= première journée) uniquement pour qu'un retour à une
    // version antérieure du code garde un brouillon exploitable.
    if (modeMulti) {
      const journeesCommunesTriees = trierJourneesParDate(journeesCommunes);
      const premiereCommune = journeesCommunesTriees[0];
      sauvegarderDemande({
        titre: titreFinal,
        texteOriginal: texte,
        ville: ville ?? "",
        date: premiereCommune?.date ?? "",
        heureDebut: premiereCommune?.heureDebut ?? "",
        heureFin: premiereCommune?.heureFin ?? "",
        journees: journeesCommunesTriees,
        sousBesoins: chips.map((c) => {
          const r = champsResolus(c);
          const journeesChip = trierJourneesParDate(journeesResolues(c));
          const premiereJournee = journeesChip[0];
          return {
            metier: c.metier,
            quantite: c.quantite,
            tarifHoraire: c.tarifHoraire,
            ville: r.ville ?? "",
            date: premiereJournee?.date ?? "",
            heureDebut: premiereJournee?.heureDebut ?? "",
            heureFin: premiereJournee?.heureFin ?? "",
            journees: journeesChip,
            contexte: c.contexte,
            contraintes: c.contraintes,
          };
        }),
      });
    } else if (chipUnique) {
      const r = champsResolus(chipUnique);
      const journeesChip = trierJourneesParDate(journeesResolues(chipUnique));
      const premiereJournee = journeesChip[0];
      sauvegarderBesoin({
        texte,
        metier: chipUnique.metier,
        ville: r.ville,
        quantite: chipUnique.quantite,
        date: premiereJournee?.date ?? null,
        heureDebut: premiereJournee?.heureDebut ?? null,
        heureFin: premiereJournee?.heureFin ?? null,
        journees: journeesChip,
        tarifHoraire: chipUnique.tarifHoraire,
        titre: titre.trim() || undefined,
        contexte: chipUnique.contexte,
        contraintes: chipUnique.contraintes,
      });
    }
  }

  // Sauvegarde automatique et discrète du brouillon, réutilisant tel
  // quel sauvegarderPourReprise (jamais un second système de
  // brouillon) : sans elle, une simple actualisation de page en cours
  // de saisie perdait toute modification manuelle (titre, adresse,
  // tarifs...) — seule la phrase d'origine, ré-extraite depuis l'URL,
  // survivait. Légèrement débattue pour ne pas écrire à chaque frappe.
  useEffect(() => {
    if (etape !== "details" || chips.length === 0) return;
    const id = setTimeout(() => sauvegarderPourReprise(), 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sauvegarderPourReprise lit déjà tout l'état pertinent (chips, titre, journeesCommunes, ville...) via fermeture ; le lister en plus de ces dépendances redéclencherait l'effet en boucle sans rien y ajouter.
  }, [etape, chips, titre, journeesCommunes, ville, texte, prerequis, messagePersonnalise]);

  /** Bouton "Enregistrer le brouillon" — même sauvegarde que celle déjà
   * déclenchée silencieusement avant un renvoi vers /connexion, mais ici
   * appelée explicitement par le client, sans navigation. */
  function enregistrerBrouillon() {
    sauvegarderPourReprise();
    toast.success("Brouillon enregistré sur cet appareil.");
  }

  async function estConnecte(): Promise<boolean> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  }

  // Pas de "voir les professionnels" ici — règle de parcours B : le
  // client ne choisit personne à ce stade (README §8/§11, ÉCLAIRCISSEMENT-
  // DEUX-PARCOURS.txt). Chercher/choisir soi-même est l'onglet "Rechercher
  // un professionnel" de la landing, un parcours entièrement séparé.

  /**
   * Publication directe : appelle l'action de publication tout de
   * suite, sans passer par un formulaire séparé — tout ce que le texte
   * a déjà donné (ville/date/horaire) est déjà dans les cartes, seul
   * le tarif (jamais extrait du texte) a pu être demandé juste avant.
   * Si l'utilisateur n'est pas connecté, le brouillon est sauvegardé
   * et repris automatiquement au retour de la connexion (même
   * composant, hydraté par chipsDepuisDemandeSauvee/BesoinSauve).
   */
  async function publierDirectement() {
    if (!pretPourPublication) return;
    setEnvoiPublication(true);
    setErreurPublication(null);

    const connecte = await estConnecte();
    if (!connecte) {
      sauvegarderPourReprise();
      router.push(`/connexion?next=${encodeURIComponent("/publier-une-offre")}`);
      return;
    }

    const titreFinal = (titre || titreParDefaut).trim();
    const descriptionFinale = messageFinal();

    if (modeMulti) {
      const result = await publierDemandeGlobale({
        titre: titreFinal,
        texteOriginal: descriptionFinale,
        sousBesoins: chips.map((c) => {
          const r = champsResolus(c);
          // journeesResolues(c) — override propre au métier, ou repli
          // sur journeesCommunes (architecture validée). Triées avant
          // envoi ; dateMission/heureDebut/heureFin (première journée)
          // restent transmis pour compatibilité, mais `journees` prime
          // côté serveur (publierDemandeGlobale, §9).
          const journees = trierJourneesParDate(journeesResolues(c));
          const premiereJournee = journees[0];
          return {
            metier: c.metier,
            quantite: c.quantite,
            tarifHoraire: c.tarifHoraire!,
            ville: r.ville!,
            dateMission: premiereJournee.date,
            heureDebut: premiereJournee.heureDebut,
            heureFin: premiereJournee.heureFin,
            journees,
            // Chaque offre reçoit UNIQUEMENT le contexte/les contraintes
            // de SON métier — jamais ceux des métiers voisins (§4/§8).
            contexte: c.contexte,
            contraintes: c.contraintes,
          };
        }),
      });
      setEnvoiPublication(false);
      if (!result.success) {
        setErreurPublication(result.error);
        return;
      }
      toast.success(`Demande publiée — ${chips.length} besoins envoyés indépendamment.`);
    } else if (chipUnique) {
      const r = champsResolus(chipUnique);
      const journees = trierJourneesParDate(journeesResolues(chipUnique));
      const premiereJournee = journees[0];
      // Mono-métier : un seul chip, aucune ambiguïté d'attribution —
      // le bloc contexte/contraintes peut rejoindre la description déjà composée.
      const descriptionAvecContraintes = [descriptionFinale, blocContexteContraintes(chipUnique)].filter(Boolean).join("\n\n");
      const result = await publierOffre({
        titre: titreFinal,
        description: descriptionAvecContraintes,
        metier: chipUnique.metier,
        ville: r.ville!,
        dateMission: premiereJournee.date,
        heureDebut: premiereJournee.heureDebut,
        heureFin: premiereJournee.heureFin,
        tarifHoraire: chipUnique.tarifHoraire!,
        journees,
      });
      setEnvoiPublication(false);
      if (!result.success) {
        setErreurPublication(result.error);
        return;
      }
      toast.success("Votre offre a été publiée et les prestataires correspondants ont été notifiés.");
    }

    router.push("/client/candidatures");
  }

  const metiersDisponiblesAjout = METIERS.filter((m) => !chips.some((c) => c.metier === m.id));
  const ambigu = texte.trim().length > 0 && chips.length === 0;

  return (
    <div>
      {etape === "saisie" && (
        <>
          <div className="mx-auto mb-6 max-w-2xl text-center">
            <p className="mb-2 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-primary">
              Parcours « Publier mon besoin »
            </p>
            <h1
              className="text-ppj-ink"
              style={{ fontFamily: "var(--font-display-serif)", fontSize: "clamp(30px,3.4vw,44px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
            >
              Publier une offre
            </h1>
            <p className="mt-2.5 text-[15.5px] text-ppj-text-3">
              Vous ne choisissez personne à ce stade : vous décrivez le besoin, et les professionnels se portent
              candidats un par un. Aucun panier dans ce parcours.
            </p>
          </div>

          {/* Zone de saisie — le cœur visuel du parcours */}
          <div
            className="mx-auto max-w-2xl rounded-[22px] border border-ppj-line bg-white p-2 transition-[border-color] focus-within:border-primary"
            style={{ boxShadow: "var(--shadow-ppj-bar)" }}
          >
            <div className="flex items-start gap-3 px-3.5 py-3">
              <Search className="mt-1 size-5 shrink-0 text-ppj-text-4" />
              <textarea
                ref={zoneSaisieRef}
                value={texte}
                onChange={(e) => analyser(e.target.value)}
                placeholder="Ex. Pour vendredi soir, j'ai besoin de 2 agents de sécurité et d'une hôtesse pour accueillir les invités à Paris."
                rows={texte.length > 60 ? 3 : 1}
                className="min-h-0 w-full resize-none bg-transparent text-base leading-relaxed text-ppj-ink outline-none placeholder:text-ppj-text-4"
              />
            </div>
          </div>

          {chips.length === 0 && (
            <div className="mt-4 flex flex-col items-center gap-2">
              {ambigu && <p className="text-sm font-medium text-ppj-ink">Quel type de professionnel recherchez-vous ?</p>}
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-sm text-ppj-text-3">
                {METIERS.map((m, i) => (
                  <span key={m.id} className="flex items-center gap-2">
                    {i > 0 && <span className="text-ppj-line-button">·</span>}
                    <button
                      type="button"
                      onClick={() => ajouterChip(m.id)}
                      className="underline-offset-2 hover:text-ppj-ink hover:underline"
                    >
                      {infosFamille(m.id).emoji} {m.filiere.split(" ")[0].replace("&", "").trim() || m.filiere}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Aperçu compact des métiers détectés — le détail complet
              (onglets, cartes, informations manquantes) n'apparaît
              qu'après "Continuer", sur son propre écran. */}
          {chips.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-ppj-ink">
                {chips.map((chip, i) => {
                  const info = infosFamille(chip.metier);
                  return (
                    <span key={chip.metier} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-ppj-line-button">·</span>}
                      <span aria-hidden>{info.emoji}</span>
                      {chip.quantite > 1 ? `${chip.quantite} ` : ""}
                      {info.filiere}
                    </span>
                  );
                })}
              </p>
              <Button
                type="button"
                onClick={() => setEtape("details")}
                className="rounded-[13px] bg-primary text-white hover:bg-[#B8130F]"
              >
                Continuer
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {etape === "details" && chips.length > 0 && (
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-wrap items-baseline gap-[14px]">
            <button
              type="button"
              onClick={() => setEtape("saisie")}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-[#6B6660] transition-colors hover:text-ppj-ink"
            >
              <ArrowLeft className="size-3.5" />
              Revenir à votre phrase
            </button>
            <h1
              className="text-ppj-ink"
              style={{ fontFamily: "var(--font-display-serif)", fontSize: "30px", lineHeight: 1.05, letterSpacing: "-0.02em" }}
            >
              Publier une offre
            </h1>
            <span className="text-[13px] text-[#6B6660]">vous ne choisissez personne — les professionnels candidatent un par un</span>
          </div>

          {/* Onglets — un par métier retenu, "+ Ajouter un métier" dans
              le même groupe. N'apparaissent qu'à partir de deux métiers
              (README §11) : avec un seul, tout tient dans un panneau. */}
          {modeMulti && (
            <div role="tablist" className="mb-3 mt-4 flex flex-wrap gap-2">
              <OngletBouton actif={ongletActif === "commun"} complet={communComplet} onClick={() => setOnglet("commun")} label="Commun à tous" />
              {chips.map((c) => {
                const court = METIERS.find((m) => m.id === c.metier)?.filiere.split(" ")[0].replace("&", "").trim() || c.metier;
                return (
                  <OngletBouton
                    key={c.metier}
                    actif={ongletActif === c.metier}
                    complet={carteResoluePourPublication(c)}
                    onClick={() => setOnglet(c.metier)}
                    label={court}
                    count={`${c.quantite} poste${c.quantite > 1 ? "s" : ""}`}
                  />
                );
              })}
              {metiersDisponiblesAjout.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => ajouterChip(m.id)}
                  className="flex items-center gap-[7px] rounded-[11px] border border-dashed border-[#DDD8D1] px-[15px] py-[11px] text-[13.5px] text-[#7A756D] transition-colors hover:border-ppj-ink hover:text-ppj-ink"
                >
                  <Plus className="size-3.5" />
                  {infosFamille(m.id).emoji} {m.filiere}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-[18px] lg:flex-row">
            {/* Colonne gauche — panneau de saisie. flex (pas une piste de
                grille fixe) : une piste "minmax(0,1fr) 340px" force la
                colonne voisine à absorber toute la contrainte à 390px
                (SPEC-PIXEL RÈGLE N°3) — jamais réintroduite. */}
            <div className="min-w-0 flex-1 rounded-[18px] border border-ppj-line bg-white px-[22px] py-5">
              {(!modeMulti || ongletActif === "commun") && (
                <div className={cn(modeMulti ? "" : "mb-4 border-b border-ppj-line-2 pb-4")}>
                  <div className="mb-4 flex flex-wrap items-baseline gap-[10px]">
                    <span className="text-[15px] font-semibold text-ppj-ink">Commun à toute l&apos;offre</span>
                    <span className="text-[12.5px] text-[#7A756D]">
                      saisi une seule fois — les horaires et la rémunération se règlent dans chaque onglet métier
                    </span>
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <ChampCommun label="Journées de l'offre" manquant={validerJournees(journeesCommunes) !== null}>
                        <EditeurJournees journees={journeesCommunes} onChange={setJourneesCommunes} />
                      </ChampCommun>
                    </div>
                    <div>
                      <ChampCommun label="Adresse exacte" manquant={!ville}>
                        <VilleAutocompleteIdf value={ville ?? ""} onChange={setVille} className={cn(!ville && "[&_input]:border-primary [&_input]:border-[1.5px]")} />
                      </ChampCommun>
                      {ambiguiteVille && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[12px] bg-ppj-fill px-3 py-2.5 text-[12.5px] text-ppj-ink">
                          <MapPin className="size-3.5 shrink-0 text-primary" />
                          <span>
                            Nous pensons que c&apos;est à <strong className="font-semibold">{ambiguiteVille.ville}</strong>.
                          </span>
                          <button
                            type="button"
                            onClick={() => setAmbiguiteVille(null)}
                            className="font-semibold text-primary underline underline-offset-2"
                          >
                            Confirmer
                          </button>
                        </div>
                      )}
                    </div>
                    <ChampCommun label="Titre de l'offre" manquant={!titre.trim()}>
                      <input
                        value={titre}
                        onChange={(e) => setTitre(e.target.value)}
                        placeholder={titreParDefaut}
                        className={champClass(!titre.trim())}
                      />
                    </ChampCommun>
                    <ChampCommun label="Contexte" description="vu par tous les candidats">
                      <textarea
                        value={messageFinal()}
                        onChange={(e) => setMessagePersonnalise(e.target.value)}
                        rows={3}
                        placeholder="Type de lieu, affluence attendue, contact sur place, accès et étage…"
                        className={cn(champClass(false), "resize-none text-[15.5px] leading-[1.5]")}
                      />
                    </ChampCommun>

                    <div>
                      <p className="mb-[7px] text-[13px] font-semibold text-ppj-ink">Prérequis supplémentaires</p>
                      <div className="grid gap-1.5">
                        {prerequis.map((p, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={p}
                              onChange={(e) => modifierPrerequis(i, e.target.value)}
                              placeholder={SUGGESTIONS_PREREQUIS[i % SUGGESTIONS_PREREQUIS.length]}
                              className="w-full rounded-[12px] border border-[#E6E2DC] bg-[#FCFBF9] px-3.5 py-2.5 text-[13.5px] text-ppj-ink outline-none focus:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => retirerPrerequis(i)}
                              aria-label="Retirer ce prérequis"
                              className="shrink-0 text-ppj-text-3 hover:text-primary"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => ajouterPrerequis()}
                          className="inline-flex min-h-11 w-fit items-center gap-1 text-[13px] text-ppj-text-3 underline underline-offset-2 hover:text-ppj-ink"
                        >
                          <Plus className="size-3.5" />
                          Ajouter un prérequis
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {chips.map((chip) => {
                if (modeMulti && ongletActif !== chip.metier) return null;
                return (
                  <PanneauMetier
                    key={chip.metier}
                    chip={chip}
                    journeesCommunes={journeesCommunes}
                    onRetirer={() => retirerChip(chip.metier)}
                    onAjusterQuantite={(delta) => ajusterQuantite(chip.metier, delta)}
                    onModifier={(patch) => mettreAJourChip(chip.metier, patch)}
                    onRetirerContrainte={(contrainte) => retirerContrainte(chip.metier, contrainte)}
                    onConfirmerAmbiguite={(champ) => confirmerAmbiguite(chip.metier, champ)}
                    onModifierAmbiguite={(champ) => modifierAmbiguite(chip.metier, champ)}
                    onConfirmerQuantite={() => confirmerQuantite(chip.metier)}
                  />
                );
              })}

              {!modeMulti && metiersDisponiblesAjout.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-ppj-line-2 pt-4">
                  {metiersDisponiblesAjout.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => ajouterChip(m.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ppj-line bg-white px-3 py-1.5 text-[13px] text-ppj-ink hover:border-primary"
                    >
                      <Plus className="size-3.5" />
                      {infosFamille(m.id).emoji} {m.filiere}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Colonne droite — récapitulatif de l'offre et publication */}
            <div className="flex min-w-0 flex-none flex-col gap-[14px] lg:w-[340px]">
              <div className="rounded-[18px] border border-ppj-line bg-white p-4">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#98938B]">Votre offre</span>
                <div className="mt-3 grid gap-[9px] text-[13.5px]">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-[#6B6660]">
                      {(() => {
                        const premiere = premiereDateJournees(journeesCommunes);
                        const nbJournees = journeesCommunes.filter((j) => j.date).length;
                        if (!premiere) return "Date à préciser";
                        return nbJournees > 1 ? `${formatDateFr(premiere)} (+${nbJournees - 1})` : formatDateFr(premiere);
                      })()}
                    </span>
                    <span className="text-ppj-ink">{ville ?? "Adresse à préciser"}</span>
                  </span>
                  <span className="block h-px bg-[#EFEBE6]" />
                  {chips.map((c) => {
                    const info = infosFamille(c.metier);
                    return (
                      <span key={c.metier} className="flex items-center justify-between gap-3">
                        <span className="text-[#6B6660]">{info.filiere}</span>
                        <span className="text-ppj-ink">
                          {c.quantite} poste{c.quantite > 1 ? "s" : ""}
                        </span>
                      </span>
                    );
                  })}
                  <span className="block h-px bg-[#EFEBE6]" />
                  <span className="flex items-center justify-between gap-3 font-semibold text-ppj-ink">
                    <span>Postes à pourvoir</span>
                    <span>{totalPostes}</span>
                  </span>
                </div>
              </div>

              <div className="rounded-[18px] border border-[#F8D3D1] bg-white p-4">
                <div className="mb-[10px] flex items-baseline gap-2">
                  <p className="text-[13px] font-semibold text-[#8E2A26]">Avant de publier</p>
                  {manques.length > 0 && (
                    <span className="ml-auto font-mono text-[11px] text-[#6B6660]">{manques.length} à compléter</span>
                  )}
                </div>
                {manques.length === 0 ? (
                  <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "#2E7D4F" }}>
                    <Check /> Tout est renseigné.
                  </p>
                ) : (
                  <div className="grid gap-[7px]">
                    {manques.map((m, i) => (
                      <button
                        key={`${m.label}-${m.scope}-${i}`}
                        type="button"
                        onClick={() => setOnglet(m.onglet)}
                        className={cn(
                          "flex items-baseline gap-2 text-left font-semibold text-[#8E2A26] transition-colors hover:underline",
                          modeMulti ? "text-[12.5px]" : "text-[13px]",
                        )}
                      >
                        <Dot /> {m.label} <span className="font-normal text-[#98938B]">— {m.scope}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[18px] border border-[#E6E2DC] bg-[#F4F1EC] p-4">
                <p className="text-[13px] font-semibold text-ppj-ink">Ce qui se passe ensuite</p>
                <p className="mt-2 text-[12.5px] leading-[1.55] text-[#6B6660]">
                  L&apos;offre devient visible par les professionnels de ces métiers. Ils candidatent un par un ;
                  vous consultez chaque profil, puis vous retenez ou vous écartez.
                </p>
                <p className="mt-2 text-[12.5px] leading-[1.55] text-[#6B6660]">Aucun panier, aucun paiement à ce stade.</p>
              </div>

              <div className="grid gap-2">
                <Button
                  className="min-h-[50px] w-full rounded-[13px] bg-primary text-[15px] font-semibold text-white hover:bg-[#B8130F]"
                  disabled={!pretPourPublication || envoiPublication}
                  onClick={publierDirectement}
                >
                  <Send className="size-3.5" />
                  {envoiPublication ? "Publication..." : "Publier l'offre"}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={enregistrerBrouillon}
                    className="min-h-[42px] rounded-[12px] border border-[#DDD8D1] bg-white text-[13.5px] font-semibold text-ppj-ink transition-colors hover:border-ppj-ink"
                  >
                    Enregistrer le brouillon
                  </button>
                  <Link
                    href="/client/candidatures"
                    className="flex min-h-[42px] items-center justify-center rounded-[12px] border border-[#DDD8D1] bg-white text-[13.5px] font-semibold text-ppj-ink transition-colors hover:border-ppj-ink"
                  >
                    Candidatures
                  </Link>
                </div>
              </div>
              {!pretPourPublication && (
                <p className="-mt-2 text-center text-[12px] text-ppj-text-3">Complétez les informations manquantes ci-dessus pour publier.</p>
              )}
              {erreurPublication && <p className="-mt-2 text-center text-[13px] font-medium text-destructive">{erreurPublication}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Champ de saisie principal — même grammaire visuelle que "Proposer la
 * mission" (dossier design, cadres "6a"/"6b"/"6c") : bordure rouge
 * 1.5px sur fond blanc quand le champ est requis et vide, bordure
 * neutre sur fond #FCFBF9 sinon.
 */
function champClass(manquant: boolean) {
  return manquant
    ? "w-full rounded-[12px] border-[1.5px] border-primary bg-white px-[14px] py-[15px] text-[16px] text-ppj-ink placeholder:text-[#98938B] focus:outline-none"
    : "w-full rounded-[12px] border border-[#E6E2DC] bg-[#FCFBF9] px-[14px] py-[15px] text-[16px] text-ppj-ink placeholder:text-[#98938B] focus:outline-none";
}

/**
 * Onglet du groupe "Commun / métiers" — même forme que "Proposer la
 * mission" (dossier design, cadre "6c") : rouge si incomplet, coche
 * verte si prêt (jamais un simple changement de couleur — c'est une
 * forme différente dans la référence), rouge clair quand l'onglet est
 * actif.
 */
function OngletBouton({
  actif,
  complet,
  onClick,
  label,
  count,
}: {
  actif: boolean;
  complet: boolean;
  onClick: () => void;
  label: string;
  count?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={actif}
      onClick={onClick}
      className={cn(
        "flex items-center gap-[7px] rounded-[11px] px-[15px] py-[11px] text-[13.5px] font-semibold transition-colors",
        actif ? "bg-[#1A1917] text-[#FBFAF8]" : "border border-[#E6E2DC] bg-white text-ppj-ink hover:border-ppj-ink",
      )}
    >
      {label}
      {count !== undefined && <span className={cn("font-normal", actif ? "text-[#B5B0A8]" : "text-[#7A756D]")}>{count}</span>}
      {actif ? (
        <span className="block size-[6px] shrink-0 rounded-full" style={{ backgroundColor: "#FF8A85" }} />
      ) : complet ? (
        <CheckMini />
      ) : (
        <span className="block size-[6px] shrink-0 rounded-full" style={{ backgroundColor: "#E21D1B" }} />
      )}
    </button>
  );
}

function CheckMini() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2E7D4F"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ChampCommun({
  label,
  description,
  hint,
  manquant,
  children,
}: {
  label: string;
  /** Précision courte à côté du libellé (dossier design, cadres "6a"/"6b"/"6c") — jamais un badge générique quand la référence porte une phrase spécifique. */
  description?: string;
  hint?: string;
  manquant?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span
        className={cn(
          "mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold",
          manquant ? "text-[#8E2A26]" : "text-ppj-ink",
        )}
      >
        {label}
        {description && <span className="font-normal text-[#98938B]">— {description}</span>}
        {manquant && <BadgeManquant>requis</BadgeManquant>}
        {!manquant && hint && <span className="font-normal text-[#98938B]">— {hint}</span>}
      </span>
      {children}
    </div>
  );
}

function Dot() {
  return <span className="block size-[4px] flex-none rounded-full bg-primary" style={{ transform: "translateY(-3px)" }} />;
}

function BadgeManquant({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-primary px-[7px] py-[3px] text-[10px] text-white">{children}</span>;
}

/**
 * Contenu de l'onglet d'un métier — reprend telle quelle la logique
 * de CarteEquipe (Lots A-F), mais sans son propre bloc date/heure/lieu
 * empilé : l'adresse/le titre/le contexte vivent dans l'onglet
 * "Commun" (partagés) ; les journées (date+horaires, migration 0062)
 * héritent des journées communes par défaut mais peuvent devenir
 * propres à ce métier (jamais globaux, README §11) et s'affichent
 * donc ici, toujours visibles.
 * Nouveau : Rémunération (tarif horaire), obligatoire, absente du
 * parcours "Proposer la mission" — c'est le professionnel qui y
 * renvoie son propre devis, alors qu'ici personne n'a encore répondu.
 */
function PanneauMetier({
  chip,
  journeesCommunes,
  onRetirer,
  onAjusterQuantite,
  onModifier,
  onRetirerContrainte,
  onConfirmerAmbiguite,
  onModifierAmbiguite,
  onConfirmerQuantite,
}: {
  chip: Chip;
  journeesCommunes: JourneeMission[];
  onRetirer: () => void;
  onAjusterQuantite: (delta: number) => void;
  onModifier: (patch: Partial<Chip>) => void;
  onRetirerContrainte: (label: string) => void;
  onConfirmerAmbiguite: (champ: Ambiguite["champ"]) => void;
  onModifierAmbiguite: (champ: Ambiguite["champ"]) => void;
  onConfirmerQuantite: () => void;
}) {
  const info = infosFamille(chip.metier);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "grid size-[30px] flex-none place-items-center rounded-[9px] border text-[14px]",
            info.accent.bgSoft,
            info.accent.border,
            info.accent.text,
          )}
          style={{ fontFamily: "var(--font-display-serif)" }}
        >
          {info.filiere.charAt(0)}
        </span>
        <span className="text-[15px] font-semibold text-ppj-ink">{info.filiere}</span>

        <span className="ml-auto flex flex-none items-center gap-[9px]">
          <span className="text-[12.5px] text-[#6B6660]">Postes à pourvoir</span>
          <button
            type="button"
            onClick={() => onAjusterQuantite(-1)}
            aria-label="Réduire le nombre de postes"
            className="grid size-[32px] place-items-center rounded-[9px] border border-[#E6E2DC] text-[15px] text-ppj-ink transition-colors hover:border-ppj-ink"
          >
            −
          </button>
          <span className="min-w-[16px] text-center text-[15.5px] font-semibold tabular-nums text-ppj-ink">{chip.quantite}</span>
          <button
            type="button"
            onClick={() => onAjusterQuantite(1)}
            aria-label="Augmenter le nombre de postes"
            className="grid size-[32px] place-items-center rounded-[9px] border border-[#E6E2DC] text-[15px] text-ppj-ink transition-colors hover:border-ppj-ink"
          >
            +
          </button>
        </span>

        <button
          type="button"
          onClick={onRetirer}
          aria-label={`Retirer ${info.filiere} de l'offre`}
          className="shrink-0 rounded-full p-1 text-ppj-text-3 transition-colors hover:bg-ppj-fill hover:text-primary"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-2 text-[12.5px] text-[#7A756D]">Vérifié : disponibilité, expérience, présentation.</p>

      {chip.quantiteIncertaine && (
        <div className="mt-3 rounded-[14px] bg-ppj-fill px-3.5 py-3">
          <p className="text-[13px] leading-relaxed text-ppj-ink">Combien de personnes souhaitez-vous ? Nous avons mis {chip.quantite} par défaut.</p>
          <button
            type="button"
            onClick={onConfirmerQuantite}
            className="mt-1.5 rounded-full bg-ppj-ink px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary"
          >
            {chip.quantite} suffit{chip.quantite > 1 ? "sent" : ""}
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-4 border-t border-ppj-line-2 pt-4">
        <ChampCommun label="Rémunération proposée" manquant={!(chip.tarifHoraire && chip.tarifHoraire > 0)}>
          <span className="flex max-w-[220px] items-center gap-1.5">
            <input
              type="number"
              min={0}
              step="0.5"
              value={chip.tarifHoraire ?? ""}
              onChange={(e) => onModifier({ tarifHoraire: Number(e.target.value) || null })}
              placeholder="Ex. 15"
              aria-label={`Tarif horaire pour ${info.filiere}`}
              className={champClass(!(chip.tarifHoraire && chip.tarifHoraire > 0))}
            />
            <span className="shrink-0 text-[13.5px] text-[#6B6660]">€/h</span>
          </span>
        </ChampCommun>

        {/*
          Mission multi-jours (migration 0062) — un métier hérite des
          journées communes par défaut (journees: null) ou porte son
          propre jeu, généralisation de l'ancien override "Date propre
          à ce métier". Passer à un override copie les journées
          communes ACTUELLES (jamais une journée vide) — voir
          l'architecture validée.
        */}
        <div>
          <span
            className={cn(
              "mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold",
              chip.journees !== null && validerJournees(chip.journees) ? "text-[#8E2A26]" : "text-ppj-ink",
            )}
          >
            Journées de ce poste
            {chip.journees !== null && validerJournees(chip.journees) && <BadgeManquant>requis</BadgeManquant>}
          </span>
          {chip.journees === null ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[12.5px] text-[#7A756D]">Utilise les journées communes de l&apos;offre.</p>
              <button
                type="button"
                onClick={() => onModifier({ journees: journeesCommunes.map((j) => ({ ...j })) })}
                className="rounded-full border border-ppj-line bg-ppj-fill px-2.5 py-[5px] text-[12px] text-ppj-neutral-text hover:border-ppj-ink"
              >
                Journées propres à ce poste
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              <EditeurJournees journees={chip.journees} onChange={(journees) => onModifier({ journees })} />
              {/* Plusieurs journées détectées depuis le texte libre
                  ("lundi, mercredi et vendredi de 9h à 17h") : confirmation
                  positive — jamais "un seul jour sera publié". */}
              {chip.journees.length > 1 && (
                <p className="text-[12px] text-ppj-text-3">{chip.journees.length} journées détectées et ajoutées.</p>
              )}
              <button
                type="button"
                onClick={() => onModifier({ journees: null })}
                className="justify-self-start rounded-full border border-ppj-line bg-ppj-fill px-2.5 py-[5px] text-[12px] text-ppj-neutral-text hover:border-ppj-ink"
              >
                Revenir aux journées communes
              </button>
            </div>
          )}
        </div>
        {chip.moment && chip.journees === null && !journeesCommunes[0]?.heureDebut && (
          <p className="-mt-2 text-[12px] text-ppj-text-3">{LABEL_MOMENT[chip.moment]} — horaires à préciser</p>
        )}
      </div>

      {(chip.contexte || chip.contraintes.length > 0) && (
        <div className="mt-4 border-t border-ppj-line-2 pt-4">
          <p className="mb-2 text-[13px] font-semibold text-ppj-ink">Contraintes détectées</p>
          <div className="flex flex-wrap gap-[7px]">
            {chip.contexte && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-[13px] py-[8px] text-[12.5px] font-medium",
                  chip.contexte.certain ? "bg-[#1A1917] text-[#FBFAF8]" : "border border-[#EAE6E0] bg-white text-[#5F5B54]",
                )}
              >
                {chip.contexte.label}
                {!chip.contexte.certain && <span className="text-[#98938B]">correct&nbsp;?</span>}
                <button
                  type="button"
                  onClick={() => onModifier({ contexte: null })}
                  aria-label="Retirer le contexte"
                  className="opacity-70 hover:text-primary"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {chip.contraintes.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1917] px-[13px] py-[8px] text-[12.5px] font-medium text-[#FBFAF8]"
              >
                {c.label}
                {c.niveau === "prefere" && <span className="text-[#B5B0A8]">souhaité</span>}
                <button
                  type="button"
                  onClick={() => onRetirerContrainte(c.label)}
                  aria-label={`Retirer la contrainte ${c.label}`}
                  className="opacity-70 hover:text-primary"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {chip.ambiguites.length > 0 && (
        <div className="mt-4 space-y-2">
          {chip.ambiguites.map((a) => (
            <div key={a.champ} className="rounded-[14px] bg-ppj-fill px-3.5 py-3">
              <p className="text-[13px] leading-relaxed text-ppj-ink">{a.question}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onConfirmerAmbiguite(a.champ)}
                  className="rounded-full bg-ppj-ink px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary"
                >
                  Oui, {formatPropositionAmbiguite(a)}
                </button>
                <button
                  type="button"
                  onClick={() => onModifierAmbiguite(a.champ)}
                  className="text-xs font-medium text-ppj-text-3 underline underline-offset-2 hover:text-ppj-ink"
                >
                  Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Lot C — met en forme la valeur brute d'une Ambiguite ("date" en ISO, "horaires" en HH:mm ou HH:mm-HH:mm) pour l'afficher dans le bouton de confirmation, sans dupliquer la logique de formatage déjà utilisée pour l'affichage normal des cartes. */
function formatPropositionAmbiguite(a: Ambiguite): string {
  if (a.champ === "date") return formatDateFr(a.propose);
  return a.propose.includes("-") ? a.propose.replace("-", " → ") : a.propose;
}
