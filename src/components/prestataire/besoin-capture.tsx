"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, MapPin, CalendarDays, Clock, ArrowRight, ArrowLeft, Send, Plus, X, Minus, Check, AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Chip = {
  metier: MetierId;
  quantite: number;
  manuel: boolean;
  // Chaque carte porte ses propres date/horaires/lieu quand le texte
  // les précise séparément pour ce métier — null tant que non
  // détectés/édités, l'affichage retombe alors sur la valeur globale
  // de la demande (jamais sur une valeur inventée).
  date: string | null;
  heureDebut: string | null;
  heureFin: string | null;
  moment: MomentJournee | null;
  ville: string | null;
  // Jamais extrait du texte — le tarif n'est fiable que saisi par le
  // client ; c'est la seule information "manquante" quasi certaine.
  tarifHoraire: number | null;
  // Lot B — résolus une fois à la détection (contexte : local au
  // segment ou repli sur le contexte "de tête" de toute la demande ;
  // contraintes : strictement locales, jamais de repli — voir
  // lib/besoin.ts, SousBesoin). Librement modifiables/supprimables
  // ensuite dans la carte, comme n'importe quel autre champ du chip.
  contexte: ContexteDetecte | null;
  contraintes: ContrainteDetectee[];
  // Lot C — date/heureDebut/heureFin ci-dessus restent préremplis
  // normalement (jamais bloquant, cahier §11) ; ambiguites porte les
  // confirmations "certain mais pas garanti" encore en attente pour
  // CETTE carte (rejetée = null-e, confirmée = simplement retirée de
  // la liste). quantiteIncertaine : la quantité affichée est un repli
  // (1) le temps que le client confirme un vrai chiffre, jamais un
  // choix arbitraire présenté comme sûr (cahier §4).
  ambiguites: Ambiguite[];
  quantiteIncertaine: boolean;
  // Lot D §7 — plusieurs jours cités explicitement pour ce métier
  // ("lundi, mardi et mercredi") : strictement informatif, jamais
  // publié comme une série (le système de missions récurrentes reste
  // séparé) — `date` ci-dessus reste la seule valeur réellement utilisée.
  datesMultiples: string[] | null;
};

/** Ce que le matching (Bloc 3) vérifiera réellement pour chaque famille — les mêmes 6 critères partout, seule la mise en avant change. */
const CE_QUI_SERA_VERIFIE: Record<MetierId, string> = {
  securite: "Disponibilité, zone d'intervention, vérification CNAPS",
  accueil: "Disponibilité, expérience accueil, présentation",
  vente: "Disponibilité, expérience commerciale, zone",
};

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

/** Composants locaux (jamais toISOString — voir lib/besoin.ts) : la seule vraie date "aujourd'hui" utilisée pour "Dès que possible". */
function aujourdhuiIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function creerChip(d: {
  metier: MetierId;
  quantite: number;
  heureDebut: string | null;
  heureFin: string | null;
  date?: string | null;
  moment?: MomentJournee | null;
  ville?: string | null;
  tarifHoraire?: number | null;
  contexte?: ContexteDetecte | null;
  contraintes?: ContrainteDetectee[];
  ambiguites?: Ambiguite[];
  quantiteIncertaine?: boolean;
  datesMultiples?: string[] | null;
}): Chip {
  return {
    metier: d.metier,
    quantite: d.quantite,
    manuel: false,
    date: d.date ?? null,
    heureDebut: d.heureDebut,
    heureFin: d.heureFin,
    moment: d.moment ?? null,
    ville: d.ville ?? null,
    tarifHoraire: d.tarifHoraire ?? null,
    contexte: d.contexte ?? null,
    contraintes: d.contraintes ?? [],
    datesMultiples: d.datesMultiples ?? null,
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
      heureDebut: sb.heureDebut,
      heureFin: sb.heureFin,
      date: sb.date || null,
      ville: sb.ville,
      tarifHoraire: sb.tarifHoraire,
      // Brouillon antérieur au Lot B : ces clés sont absentes, jamais inventées ici (?? null / ?? []).
      contexte: sb.contexte ?? null,
      contraintes: sb.contraintes ?? [],
    }),
  );
}

/** Reprend un besoin mono-métier sauvegardé — null si aucun. */
function chipsDepuisBesoinSauve(): Chip[] | null {
  const besoin = lireBesoin();
  if (!besoin?.metier) return null;
  return [
    creerChip({
      metier: besoin.metier,
      quantite: besoin.quantite ?? 1,
      heureDebut: besoin.heureDebut,
      heureFin: besoin.heureFin,
      date: besoin.date,
      ville: besoin.ville,
      contexte: besoin.contexte ?? null,
      contraintes: besoin.contraintes ?? [],
    }),
  ];
}

/**
 * Capture en langage naturel pour le parcours "Publier un besoin" —
 * distinct de RechercheBar (parcours "Trouver un professionnel") :
 * ici on décrit un besoin qui devient une ou plusieurs offres
 * publiées, on ne consulte pas un catalogue. Fonctionne comme un
 * assistant en une page : détection → vérification des critères →
 * complément des informations manquantes → publication directe ou
 * consultation des profils — jamais de redirection vers un formulaire
 * vierge qui referait saisir ce que le texte a déjà donné.
 */
export function BesoinCapture({ texteInitial }: { texteInitial?: string }) {
  const router = useRouter();
  const [texte, setTexte] = useState(() => {
    if (texteInitial) return texteInitial;
    return lireDemande()?.texteOriginal ?? lireBesoin()?.texte ?? "";
  });
  const [chips, setChips] = useState<Chip[]>(() => {
    if (texteInitial) {
      const decomposition = extraireSousBesoins(texteInitial);
      if (decomposition.length > 0) return decomposition.map((d) => creerChip(d));
      const extrait = extraireBesoin(texteInitial);
      return extrait.metier
        ? [
            creerChip({
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
            }),
          ]
        : [];
    }
    // Pas de texte dans l'URL : reprise d'un brouillon (ex. retour après connexion pour publier).
    return chipsDepuisDemandeSauvee() ?? chipsDepuisBesoinSauve() ?? [];
  });
  // Deux écrans distincts, jamais tout empilé sur une seule page qui
  // défile : la barre de saisie d'abord, puis — seulement après un
  // "Continuer" explicite — l'écran "Vérifiez vos critères" avec les
  // cartes, les prérequis et les informations manquantes (comme Malt).
  // Un texte déjà fourni (lien depuis le hero) ou un brouillon repris
  // après connexion sautent directement au second écran.
  const [etape, setEtape] = useState<"saisie" | "details">(() => {
    if (texteInitial) return "details";
    return (chipsDepuisDemandeSauvee() ?? chipsDepuisBesoinSauve() ?? []).length > 0 ? "details" : "saisie";
  });
  const [supprimes, setSupprimes] = useState<Set<MetierId>>(new Set());
  const demandeSauvee = texteInitial ? null : lireDemande();
  const [ville, setVille] = useState<string | null>(demandeSauvee?.ville || null);
  // Lot C §1 — ville devinée seulement par une préposition ("... à
  // Paris", sans code postal) : reste préremplie (voir analyser, plus
  // bas) mais accompagnée de cette confirmation globale tant qu'elle
  // n'a pas été validée ou corrigée. Jamais persistée (voir creerChip) :
  // une reprise de brouillon repart sans confirmation en attente.
  const [ambiguiteVille, setAmbiguiteVille] = useState<{ ville: string } | null>(null);
  const [date, setDate] = useState<string | null>(demandeSauvee?.date || chips[0]?.date || null);
  const [heureDebut, setHeureDebut] = useState<string | null>(demandeSauvee?.heureDebut || null);
  const [heureFin, setHeureFin] = useState<string | null>(demandeSauvee?.heureFin || null);
  const [adresseTexte, setAdresseTexte] = useState<string | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [titre, setTitre] = useState(demandeSauvee?.titre ?? "");
  const [prerequis, setPrerequis] = useState<string[]>([]);
  // null = message auto-composé (texte + prérequis + adresse) affiché
  // tel quel ; une valeur = le client l'a personnalisé à la main et
  // celle-ci prévaut jusqu'à un retour explicite à la version générée.
  const [messagePersonnalise, setMessagePersonnalise] = useState<string | null>(null);
  const [envoiRecherche, setEnvoiRecherche] = useState(false);
  const [envoiPublication, setEnvoiPublication] = useState(false);
  const [erreurPublication, setErreurPublication] = useState<string | null>(null);
  const zoneSaisieRef = useRef<HTMLTextAreaElement>(null);

  const modeMulti = chips.length >= 2;
  const chipUnique = chips.length === 1 ? chips[0] : null;
  const dateApercu = date ?? chips.find((c) => c.date)?.date ?? null;
  const titreParDefaut = dateApercu ? `Événement du ${formatDateFr(dateApercu)}` : "Ma demande";

  // Une carte "prête pour la recherche" a un horaire et un lieu résolus
  // (propres ou hérités des valeurs globales de la demande) — jamais une
  // valeur par défaut inventée. La date, elle, n'est PAS bloquante pour
  // la recherche : si elle manque, elle vaut implicitement "Je ne sais
  // pas encore" (le client parcourt les profils sans filtre de date).
  // "Prête pour la publication" est plus stricte : exige une vraie date
  // (offres.date_mission est NOT NULL) et un tarif — les deux seules
  // informations qu'un "Je ne sais pas encore" ne peut jamais remplacer.
  function champsResolus(c: Chip) {
    return {
      date: c.date ?? date,
      heureDebut: c.heureDebut ?? heureDebut,
      heureFin: c.heureFin ?? heureFin,
      ville: c.ville ?? ville,
    };
  }
  function carteResoluePourRecherche(c: Chip): boolean {
    const r = champsResolus(c);
    return Boolean(r.heureDebut && r.heureFin && r.ville);
  }
  function carteResoluePourPublication(c: Chip): boolean {
    const r = champsResolus(c);
    return Boolean(r.date && r.heureDebut && r.heureFin && r.ville && c.tarifHoraire && c.tarifHoraire > 0);
  }
  const pretPourRecherche = chips.length > 0 && chips.every(carteResoluePourRecherche);
  const pretPourPublication = chips.length > 0 && chips.every(carteResoluePourPublication);
  // Toute carte à laquelle il manque quoi que ce soit (lieu/horaire —
  // bloquants pour tout — ou date/tarif — bloquants seulement pour
  // publier) apparaît dans le même panneau rouge unique, jamais éclatée
  // entre un panneau structuré et une phrase générique selon ce qui manque.
  const cartesIncompletes = chips.filter((c) => !carteResoluePourPublication(c));
  const totalProfessionnels = chips.reduce((somme, c) => somme + c.quantite, 0);

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
      // (bouton, édition) les modifie.
      const nouveaux = detectes.filter((d) => !idsPresents.has(d.metier) && !supprimes.has(d.metier)).map((d) => creerChip(d));
      return [...prev, ...nouveaux];
    });

    setDate((prev) => prev ?? extrait.date);
    setHeureDebut((prev) => prev ?? extrait.heureDebut);
    setHeureFin((prev) => prev ?? extrait.heureFin);

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
   * Le repli global (`date`/`heureDebut`/`heureFin`, préempli une
   * seule fois à la frappe — voir analyser()) est aussi réinitialisé :
   * sinon la carte réafficherait aussitôt la même valeur rejetée via
   * champsResolus(), qui retombe dessus dès que le champ du chip est vide.
   */
  function modifierAmbiguite(metier: MetierId, champ: Ambiguite["champ"]) {
    setChips((prev) =>
      prev.map((c) => {
        if (c.metier !== metier) return c;
        const patch: Partial<Chip> = champ === "date" ? { date: null } : { heureDebut: null, heureFin: null };
        return { ...c, ...patch, ambiguites: c.ambiguites.filter((a) => a.champ !== champ) };
      }),
    );
    if (champ === "date") setDate(null);
    else {
      setHeureDebut(null);
      setHeureFin(null);
    }
  }
  /** Lot C §4 — "Combien de personnes souhaitez-vous ?" : la quantité affichée (repli 1) reste, seul le rappel disparaît ; ajusterQuantite() fait déjà de même dès que le client touche +/-. */
  function confirmerQuantite(metier: MetierId) {
    setChips((prev) => prev.map((c) => (c.metier === metier ? { ...c, quantiteIncertaine: false } : c)));
  }

  function ajouterChip(metier: MetierId) {
    setChips((prev) =>
      prev.some((c) => c.metier === metier)
        ? prev
        : [...prev, creerChip({ metier, quantite: 1, heureDebut: null, heureFin: null })].map((c) =>
            c.metier === metier ? { ...c, manuel: true } : c,
          ),
    );
    setSupprimes((prev) => {
      const next = new Set(prev);
      next.delete(metier);
      return next;
    });
    setAjoutOuvert(false);
    zoneSaisieRef.current?.focus();
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
   * dans messageFinal()/la zone "Votre message", commune à toute la
   * demande en mode multi — ce serait précisément le mélange entre
   * métiers que le cahier interdit, §4/§8).
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
    if (modeMulti) {
      sauvegarderDemande({
        titre: titreFinal,
        texteOriginal: texte,
        ville: ville ?? "",
        date: date ?? "",
        heureDebut: heureDebut ?? "",
        heureFin: heureFin ?? "",
        sousBesoins: chips.map((c) => {
          const r = champsResolus(c);
          return {
            metier: c.metier,
            quantite: c.quantite,
            tarifHoraire: c.tarifHoraire,
            ville: r.ville ?? "",
            date: r.date ?? "",
            heureDebut: r.heureDebut ?? "",
            heureFin: r.heureFin ?? "",
            contexte: c.contexte,
            contraintes: c.contraintes,
          };
        }),
      });
    } else if (chipUnique) {
      const r = champsResolus(chipUnique);
      sauvegarderBesoin({
        texte,
        metier: chipUnique.metier,
        ville: r.ville,
        quantite: chipUnique.quantite,
        date: r.date,
        heureDebut: r.heureDebut,
        heureFin: r.heureFin,
        contexte: chipUnique.contexte,
        contraintes: chipUnique.contraintes,
      });
    }
  }

  async function estConnecte(): Promise<boolean> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  }

  async function voirLesProfils() {
    if (!pretPourRecherche) return;
    setEnvoiRecherche(true);
    if (modeMulti) {
      // Le repli global (pastilles "par défaut") a été retiré — chaque
      // carte résout maintenant sa propre ville/date directement dans
      // le panneau rouge. La page de résultats, elle, n'a qu'une seule
      // ville/date de recherche pour l'ensemble des sous-besoins ;  on
      // dérive donc ces deux paramètres de la première carte résolue
      // plutôt que de renvoyer un état global qui n'est plus jamais
      // renseigné par aucune UI.
      const premiereCarteResolue = champsResolus(chips[0]);
      const villeRecherche = ville ?? premiereCarteResolue.ville ?? "";
      const dateRecherche = date ?? premiereCarteResolue.date ?? "";
      sauvegarderDemande({
        titre: (titre || titreParDefaut).trim(),
        texteOriginal: texte,
        ville: villeRecherche,
        date: dateRecherche,
        heureDebut: heureDebut ?? "",
        heureFin: heureFin ?? "",
        sousBesoins: chips.map((c) => {
          const r = champsResolus(c);
          return {
            metier: c.metier,
            quantite: c.quantite,
            tarifHoraire: c.tarifHoraire,
            ville: r.ville!,
            date: r.date ?? "",
            heureDebut: r.heureDebut!,
            heureFin: r.heureFin!,
          };
        }),
      });
      const params = new URLSearchParams({
        besoin: "1",
        multi: "1",
        ville: villeRecherche,
        date: dateRecherche,
        sousBesoins: JSON.stringify(
          chips.map((c) => {
            const r = champsResolus(c);
            return {
              metier: c.metier,
              quantite: c.quantite,
              ville: r.ville,
              date: r.date,
              heureDebut: r.heureDebut,
              heureFin: r.heureFin,
              // Lot F — transmis pour que le matching de la page de
              // résultats exploite les mêmes contraintes/contexte que
              // ceux vérifiés par le client sur cette carte, jamais
              // perdus entre la capture du besoin et la recherche.
              contraintes: c.contraintes,
              contexte: c.contexte?.label ?? null,
            };
          }),
        ),
      });
      router.push(`/prestataires?${params.toString()}`);
    } else if (chipUnique) {
      const r = champsResolus(chipUnique);
      if (!r.ville) {
        setEnvoiRecherche(false);
        return;
      }
      sauvegarderBesoin({
        texte,
        metier: chipUnique.metier,
        ville: r.ville,
        quantite: chipUnique.quantite,
        date: r.date,
        heureDebut: r.heureDebut,
        heureFin: r.heureFin,
      });
      const params = new URLSearchParams({ besoin: "1", metier: chipUnique.metier, ville: r.ville });
      if (r.date) params.set("date", r.date);
      if (r.heureDebut) params.set("heureDebut", r.heureDebut);
      if (r.heureFin) params.set("heureFin", r.heureFin);
      if (chipUnique.quantite > 1) params.set("quantite", String(chipUnique.quantite));
      // Lot F — mêmes contraintes/contexte que ceux vérifiés sur la
      // carte, transmis pour que le matching en tienne compte.
      if (chipUnique.contraintes.length > 0) params.set("contraintes", JSON.stringify(chipUnique.contraintes));
      if (chipUnique.contexte) params.set("contexte", chipUnique.contexte.label);
      router.push(`/prestataires?${params.toString()}`);
    }
  }

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
      router.push(`/connexion?next=${encodeURIComponent("/prestataires?mode=publier")}`);
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
          return {
            metier: c.metier,
            quantite: c.quantite,
            tarifHoraire: c.tarifHoraire!,
            ville: r.ville!,
            dateMission: r.date!,
            heureDebut: r.heureDebut!,
            heureFin: r.heureFin!,
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
      // Mono-métier : un seul chip, aucune ambiguïté d'attribution —
      // le bloc contexte/contraintes peut rejoindre la description déjà composée.
      const descriptionAvecContraintes = [descriptionFinale, blocContexteContraintes(chipUnique)].filter(Boolean).join("\n\n");
      const result = await publierOffre({
        titre: titreFinal,
        description: descriptionAvecContraintes,
        metier: chipUnique.metier,
        ville: r.ville!,
        dateMission: r.date!,
        heureDebut: r.heureDebut!,
        heureFin: r.heureFin!,
        tarifHoraire: chipUnique.tarifHoraire!,
      });
      setEnvoiPublication(false);
      if (!result.success) {
        setErreurPublication(result.error);
        return;
      }
      toast.success("Votre offre a été publiée et les prestataires correspondants ont été notifiés.");
    }

    router.push("/tableau-de-bord/mes-offres");
  }

  const metiersDisponiblesAjout = METIERS.filter((m) => !chips.some((c) => c.metier === m.id));
  const ambigu = texte.trim().length > 0 && chips.length === 0;

  /**
   * Lot E §3 — résumé en une phrase de ce qui a été compris, affiché
   * en tête de l'écran de vérification ("Pour vendredi soir à Paris —
   * 3 professionnels · 2 métiers"). Purement de la mise en forme :
   * aucune nouvelle détection, seulement les mêmes champs déjà résolus
   * par champsResolus() pour chaque carte. N'affirme une date/ville
   * commune que si elle l'est réellement pour toutes les cartes —
   * jamais une généralisation à partir d'une seule d'entre elles.
   */
  function syntheseNaturelle(): string {
    const premiere = champsResolus(chips[0]);
    const datesUniques = new Set(chips.map((c) => champsResolus(c).date));
    const villesUniques = new Set(chips.map((c) => champsResolus(c).ville));
    const dateTexte = datesUniques.size === 1 && premiere.date ? formatDateFr(premiere.date) : null;
    const villeTexte = villesUniques.size === 1 && premiere.ville ? `à ${premiere.ville}` : null;
    const lieuDate = [dateTexte, villeTexte].filter(Boolean).join(" ");
    const metierTexte = chips.length === 1 ? "1 métier" : `${chips.length} métiers`;
    const proTexte = `${totalProfessionnels} professionnel${totalProfessionnels > 1 ? "s" : ""}`;
    return [lieuDate ? `Pour ${lieuDate}` : null, `${proTexte} · ${metierTexte}`].filter(Boolean).join(" — ");
  }

  return (
    <div>
      {etape === "saisie" && (
        <>
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

          {/* Aperçu compact des métiers détectés — le détail complet (cartes, prérequis, informations manquantes) n'apparaît qu'après "Continuer", sur son propre écran, jamais empilé sous la barre. */}
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
        <div className="mx-auto mt-2 max-w-2xl">
          <button
            type="button"
            onClick={() => setEtape("saisie")}
            className="mb-5 inline-flex items-center gap-1.5 text-sm text-ppj-text-3 transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            Revenir à votre phrase
          </button>

          {/* Lot E §3 — la confiance se construit ici : le client doit
              comprendre en un regard ce que ProParJour a compris, avant
              même de lire le détail des cartes. Jamais de jargon
              ("analyse", "extraction") — juste ce qui a été compris,
              en français courant. */}
          <p className="font-mono text-[11px] uppercase tracking-[.14em] text-primary">Voici ce que nous avons compris</p>
          <p
            className="mt-2 text-ppj-ink"
            style={{ fontFamily: "var(--font-display-serif)", fontSize: "clamp(26px,4vw,32px)", lineHeight: 1.15, letterSpacing: "-0.01em", textWrap: "balance" }}
          >
            {syntheseNaturelle()}
          </p>

          {/* Intitulé — toujours visible, préempli, éditable */}
          <div className="mt-6 max-w-md">
            <label htmlFor="besoin-titre" className="text-xs font-medium text-ppj-text-3">
              Titre de la demande
            </label>
            <input
              id="besoin-titre"
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder={titreParDefaut}
              className="mt-1.5 w-full rounded-[14px] border border-ppj-line-field bg-ppj-field px-4 py-2.5 text-sm text-ppj-ink outline-none focus:border-primary"
            />
          </div>

          {/* Lot C §1 — ville devinée seulement par une préposition ("à
              Paris", sans code postal) : déjà préremplie dans les cartes
              ci-dessous (jamais bloquant), mais confirmée ici en un geste
              plutôt qu'appliquée en silence comme une certitude. */}
          {ambiguiteVille && (
            <div className="mt-4 max-w-md rounded-[16px] border border-ppj-line bg-ppj-fill px-4 py-3.5">
              <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ppj-ink">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>
                  Nous pensons que c&apos;est à <strong className="font-semibold">{ambiguiteVille.ville}</strong>. C&apos;est bien ça&nbsp;?
                </span>
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3 pl-[22px]">
                <button
                  type="button"
                  onClick={() => setAmbiguiteVille(null)}
                  className="rounded-full bg-ppj-ink px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary"
                >
                  Oui, {ambiguiteVille.ville}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVille(null);
                    setAmbiguiteVille(null);
                  }}
                  className="text-xs font-medium text-ppj-text-3 underline underline-offset-2 hover:text-ppj-ink"
                >
                  Modifier
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {chips.map((chip) => (
              <CarteEquipe
                key={chip.metier}
                chip={chip}
                valeursGlobales={{ date, heureDebut, heureFin, ville }}
                onRetirer={() => retirerChip(chip.metier)}
                onAjusterQuantite={(delta) => ajusterQuantite(chip.metier, delta)}
                onModifier={(patch) => mettreAJourChip(chip.metier, patch)}
                onRetirerContrainte={(contrainte) => retirerContrainte(chip.metier, contrainte)}
                onConfirmerAmbiguite={(champ) => confirmerAmbiguite(chip.metier, champ)}
                onModifierAmbiguite={(champ) => modifierAmbiguite(chip.metier, champ)}
                onConfirmerQuantite={() => confirmerQuantite(chip.metier)}
              />
            ))}
            {metiersDisponiblesAjout.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {ajoutOuvert ? (
                  metiersDisponiblesAjout.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => ajouterChip(m.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ppj-line bg-white px-3 py-1 text-sm text-ppj-ink hover:border-primary"
                    >
                      {infosFamille(m.id).emoji} {m.filiere}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => setAjoutOuvert(true)}
                    className="inline-flex items-center gap-1 text-sm text-ppj-text-3 underline underline-offset-2 hover:text-ppj-ink"
                  >
                    <Plus className="size-3.5" />
                    Ajouter un besoin
                  </button>
                )}
              </div>
            )}
          </div>


          {/* Prérequis supplémentaires — libres, optionnels, extensibles */}
          <div className="mx-auto mt-6 max-w-lg">
            <p className="text-sm font-medium text-ppj-ink">Prérequis supplémentaires</p>
            <p className="text-xs text-ppj-text-3">Indiquez toute expérience ou attente à laquelle vous tenez particulièrement.</p>
            <div className="mt-2 space-y-2">
              {prerequis.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => modifierPrerequis(i, e.target.value)}
                    placeholder={SUGGESTIONS_PREREQUIS[i % SUGGESTIONS_PREREQUIS.length]}
                    className="w-full rounded-[14px] border border-ppj-line-field bg-ppj-field px-4 py-2 text-sm text-ppj-ink outline-none focus:border-primary"
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
                className="inline-flex items-center gap-1 text-sm text-ppj-text-3 underline underline-offset-2 hover:text-ppj-ink"
              >
                <Plus className="size-3.5" />
                Ajouter
              </button>
            </div>
          </div>

          {/* Votre message — le texte réellement envoyé/publié, composé automatiquement à partir de la description et des prérequis, mais entièrement modifiable à la main (comme le "Votre message" de Malt) ; un retour à la version générée reste possible tant que rien d'autre n'a changé la composition. */}
          <div className="mx-auto mt-6 max-w-lg">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="besoin-message" className="text-sm font-medium text-ppj-ink">
                Votre message
              </label>
              {messagePersonnalise !== null && (
                <button
                  type="button"
                  onClick={() => setMessagePersonnalise(null)}
                  className="text-xs text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Revenir à la description générée
                </button>
              )}
            </div>
            <textarea
              id="besoin-message"
              value={messageFinal()}
              onChange={(e) => setMessagePersonnalise(e.target.value)}
              rows={6}
              className="mt-1.5 w-full resize-y rounded-[18px] border border-ppj-line-field bg-ppj-field px-4 py-3 text-sm leading-relaxed text-ppj-ink outline-none focus:border-primary"
            />
            <p className="mt-1 text-right text-xs text-ppj-text-4">{messageFinal().length} caractères</p>
          </div>

          {/* Complétez les informations manquantes — TOUT ce qui manque encore pour une carte, dans un panneau unique et cohérent : lieu/horaire (bloquants pour tout) et date/tarif (bloquants seulement pour publier). Jamais éclaté entre ce panneau et une phrase générique selon ce qui manque. */}
          {cartesIncompletes.length > 0 && (
            <div className="mx-auto mt-6 max-w-lg rounded-[18px] border border-ppj-red-border bg-ppj-red-bg p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ppj-red-text">
                <AlertCircle className="size-4" />
                Complétez les informations manquantes
              </p>
              <p className="mt-1 text-xs text-ppj-red-text/80">
                {pretPourRecherche
                  ? "Nécessaire uniquement pour publier directement l'offre — \"Voir les profils disponibles\" fonctionne déjà."
                  : "Nécessaire pour publier l'offre ou consulter les profils disponibles."}
              </p>
              <div className="mt-4 space-y-5">
                {cartesIncompletes.map((chip) => {
                  const info = infosFamille(chip.metier);
                  const r = champsResolus(chip);
                  return (
                    <div key={chip.metier} className="space-y-3">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-ppj-ink">
                        <span aria-hidden>{info.emoji}</span>
                        {info.filiere}
                      </span>
                      {!r.ville && (
                        <div>
                          <p className="text-xs font-medium text-ppj-ink">Lieu de la mission</p>
                          <div className="mt-1.5 max-w-xs">
                            <VilleAutocompleteIdf
                              value={chip.ville ?? ""}
                              onChange={(v) => mettreAJourChip(chip.metier, { ville: v })}
                              className="[&_input]:rounded-[14px] [&_input]:border-ppj-red-border"
                            />
                          </div>
                        </div>
                      )}
                      {!(r.heureDebut && r.heureFin) && (
                        <div>
                          <p className="text-xs font-medium text-ppj-ink">Horaire</p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <input
                              type="time"
                              value={chip.heureDebut ?? ""}
                              onChange={(e) => mettreAJourChip(chip.metier, { heureDebut: e.target.value || null })}
                              className="rounded-[14px] border border-ppj-red-border bg-white px-2.5 py-1.5 text-sm text-ppj-ink"
                            />
                            <span className="text-sm text-ppj-text-3">→</span>
                            <input
                              type="time"
                              value={chip.heureFin ?? ""}
                              onChange={(e) => mettreAJourChip(chip.metier, { heureFin: e.target.value || null })}
                              className="rounded-[14px] border border-ppj-red-border bg-white px-2.5 py-1.5 text-sm text-ppj-ink"
                            />
                          </div>
                        </div>
                      )}
                      {!r.date && (
                        <div>
                          <p className="text-xs font-medium text-ppj-ink">Date de la mission</p>
                          <EditeurDate
                            value={r.date}
                            onChange={(d) => mettreAJourChip(chip.metier, { date: d })}
                            onValider={() => {}}
                            nomGroupe={`date-manquante-${chip.metier}`}
                          />
                        </div>
                      )}
                      {!(chip.tarifHoraire && chip.tarifHoraire > 0) && (
                        <div>
                          <p className="text-xs font-medium text-ppj-ink">Tarif horaire</p>
                          <span className="mt-1.5 flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              value={chip.tarifHoraire ?? ""}
                              onChange={(e) => mettreAJourChip(chip.metier, { tarifHoraire: Number(e.target.value) || null })}
                              placeholder="Ex. 15"
                              aria-label={`Tarif horaire pour ${info.filiere}`}
                              className="w-28 rounded-[14px] border border-ppj-red-border bg-white px-2.5 py-1.5 text-sm text-ppj-ink"
                            />
                            <span className="text-sm text-ppj-text-3">€/h</span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lot E §16 — bande de clôture : un récapitulatif complet
              avant toute action (aucune publication silencieuse), puis
              les deux intentions strictement distinctes, jamais l'une
              cachée derrière l'autre (cahier §10). */}
          {pretPourRecherche && (
            <div className="mx-auto mt-8 max-w-lg rounded-[20px] border border-ppj-line bg-ppj-fill px-6 py-6 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[.14em] text-ppj-text-3">Récapitulatif</p>
              <p className="mt-1.5 text-ppj-ink" style={{ fontFamily: "var(--font-display-serif)", fontSize: "20px", letterSpacing: "-0.01em" }}>
                {syntheseNaturelle()}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  onClick={voirLesProfils}
                  disabled={envoiRecherche}
                  className="rounded-[13px] bg-ppj-ink text-white hover:bg-primary"
                >
                  Voir les professionnels
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={publierDirectement}
                  disabled={!pretPourPublication || envoiPublication}
                  className="rounded-[13px] border-ppj-line-button bg-white text-ppj-ink hover:border-ppj-ink"
                >
                  <Send className="size-3.5" />
                  {envoiPublication ? "Publication..." : "Publier le besoin"}
                </Button>
              </div>
              {!pretPourPublication && (
                <p className="mt-3 text-xs text-ppj-text-3">
                  &quot;Voir les professionnels&quot; ne publie rien. &quot;Publier le besoin&quot; attend encore le tarif ci-dessus.
                </p>
              )}
              {erreurPublication && <p className="mt-2 text-sm font-medium text-destructive">{erreurPublication}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Choix de date à 3 options mutuellement exclusives — jamais un simple
 * calendrier vide. "Dès que possible" résout tout de suite une vraie
 * date (aujourd'hui, la plus proche possible) ; "Je ne sais pas encore"
 * est le repli explicite quand rien n'est décidé. L'option active se
 * déduit de la valeur courante (précise / aujourd'hui / vide) plutôt
 * que d'un champ dédié — pas de concept persistant supplémentaire.
 */
function EditeurDate({
  value,
  onChange,
  onValider,
  nomGroupe,
}: {
  value: string | null;
  onChange: (d: string | null) => void;
  onValider: () => void;
  nomGroupe: string;
}) {
  const aujourdhui = aujourdhuiIso();
  const [choix, setChoix] = useState<"asap" | "precise" | "inconnue">(
    value === null ? "inconnue" : value === aujourdhui ? "asap" : "precise",
  );

  function optionClass(actif: boolean) {
    return cn(
      "flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-sm transition-colors",
      actif ? "border-primary bg-ppj-red-bg text-ppj-ink" : "border-ppj-line text-ppj-text-3 hover:border-primary/40",
    );
  }

  return (
    <div className="mt-2.5 flex w-full max-w-xs flex-col gap-1.5">
      <label className={optionClass(choix === "asap")}>
        <input
          type="radio"
          name={nomGroupe}
          checked={choix === "asap"}
          onChange={() => {
            setChoix("asap");
            onChange(aujourdhui);
            onValider();
          }}
        />
        Dès que possible
      </label>
      <label className={optionClass(choix === "precise")}>
        <input type="radio" name={nomGroupe} checked={choix === "precise"} onChange={() => setChoix("precise")} />
        À une date précise
      </label>
      {choix === "precise" && (
        <input
          type="date"
          autoFocus
          value={value && value !== aujourdhui ? value : ""}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
              onValider();
            }
          }}
          className="ml-6 rounded-[14px] border border-ppj-line-field bg-ppj-field px-3 py-2 text-sm text-ppj-ink"
        />
      )}
      <label className={optionClass(choix === "inconnue")}>
        <input
          type="radio"
          name={nomGroupe}
          checked={choix === "inconnue"}
          onChange={() => {
            setChoix("inconnue");
            onChange(null);
            onValider();
          }}
        />
        Je ne sais pas encore
      </label>
    </div>
  );
}

type ChampCarte = "date" | "heure" | "lieu";

function CarteEquipe({
  chip,
  valeursGlobales,
  onRetirer,
  onAjusterQuantite,
  onModifier,
  onRetirerContrainte,
  onConfirmerAmbiguite,
  onModifierAmbiguite,
  onConfirmerQuantite,
}: {
  chip: Chip;
  valeursGlobales: { date: string | null; heureDebut: string | null; heureFin: string | null; ville: string | null };
  onRetirer: () => void;
  onAjusterQuantite: (delta: number) => void;
  onModifier: (patch: Partial<Chip>) => void;
  onRetirerContrainte: (label: string) => void;
  onConfirmerAmbiguite: (champ: Ambiguite["champ"]) => void;
  onModifierAmbiguite: (champ: Ambiguite["champ"]) => void;
  onConfirmerQuantite: () => void;
}) {
  const [edition, setEdition] = useState<ChampCarte | null>(null);
  const info = infosFamille(chip.metier);

  const dateEffective = chip.date ?? valeursGlobales.date;
  const heureDebutEffective = chip.heureDebut ?? valeursGlobales.heureDebut;
  const heureFinEffective = chip.heureFin ?? valeursGlobales.heureFin;
  const villeEffective = chip.ville ?? valeursGlobales.ville;

  return (
    <div className={cn("rounded-[20px] border border-l-[3px] border-ppj-line bg-white p-5 sm:p-6", info.accent.border)}>
      <div className="flex items-start gap-4">
        <div
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-lg", info.accent.bgSoft)}
          aria-hidden
        >
          {info.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[21px] leading-tight text-ppj-ink"
            style={{ fontFamily: "var(--font-display-serif)", letterSpacing: "-0.01em" }}
          >
            {info.filiere}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-full border border-ppj-line-field bg-ppj-field px-1 py-1">
              <button
                type="button"
                onClick={() => onAjusterQuantite(-1)}
                aria-label="Réduire le nombre de postes"
                className="flex size-6 items-center justify-center rounded-full text-ppj-ink transition-colors hover:bg-white"
              >
                <Minus className="size-3" />
              </button>
              <span className="min-w-[1.5em] text-center text-sm font-semibold tabular-nums text-ppj-ink">{chip.quantite}</span>
              <button
                type="button"
                onClick={() => onAjusterQuantite(1)}
                aria-label="Augmenter le nombre de postes"
                className="flex size-6 items-center justify-center rounded-full text-ppj-ink transition-colors hover:bg-white"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <span className="text-sm text-ppj-text-3">
              professionnel{chip.quantite > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetirer}
          aria-label={`Retirer ${info.filiere} de l'équipe`}
          className="shrink-0 rounded-full p-1 text-ppj-text-3 transition-colors hover:bg-ppj-fill hover:text-primary"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-ppj-line-2 pt-4">
        <ChampMini
          icone={<CalendarDays className="size-3 shrink-0" />}
          rempli
          label={dateEffective ? formatDateFr(dateEffective) : "Je ne sais pas encore"}
          actif={edition === "date"}
          onClick={() => setEdition(edition === "date" ? null : "date")}
        />
        <ChampMini
          icone={<Clock className="size-3 shrink-0" />}
          rempli={Boolean(heureDebutEffective && heureFinEffective)}
          label={
            heureDebutEffective && heureFinEffective
              ? `${heureDebutEffective} → ${heureFinEffective}`
              : chip.moment
                ? `${LABEL_MOMENT[chip.moment]} — horaires à préciser`
                : "Horaires à préciser"
          }
          actif={edition === "heure"}
          onClick={() => setEdition(edition === "heure" ? null : "heure")}
        />
        <ChampMini
          icone={<MapPin className="size-3 shrink-0" />}
          rempli={Boolean(villeEffective)}
          label={villeEffective ?? "Lieu à préciser"}
          actif={edition === "lieu"}
          onClick={() => setEdition(edition === "lieu" ? null : "lieu")}
        />
      </div>
      <p className="mt-2 text-xs text-ppj-text-4">Vérifié : {CE_QUI_SERA_VERIFIE[chip.metier]}</p>

      {/* Lot D §7 — plusieurs jours cités pour ce métier : strictement
          informatif, une seule offre sera publiée (à la date ci-dessus) —
          jamais une série construite ici. */}
      {chip.datesMultiples && chip.datesMultiples.length > 1 && (
        <p className="mt-2 text-xs text-ppj-text-3">
          Plusieurs jours mentionnés : {chip.datesMultiples.map((d) => formatDateFr(d)).join(", ")}. Une offre sera publiée pour le premier ; les autres jours restent à publier séparément si besoin.
        </p>
      )}

      {edition === "date" && (
        <EditeurDate
          value={dateEffective}
          onChange={(d) => onModifier({ date: d })}
          onValider={() => setEdition(null)}
          nomGroupe={`date-carte-choix-${chip.metier}`}
        />
      )}
      {edition === "heure" && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <input
            type="time"
            autoFocus
            value={chip.heureDebut ?? valeursGlobales.heureDebut ?? ""}
            onChange={(e) => onModifier({ heureDebut: e.target.value || null })}
            className="rounded-[10px] border border-ppj-line-field bg-ppj-field px-2 py-1 text-xs text-ppj-ink"
          />
          <span className="text-xs text-ppj-text-3">→</span>
          <input
            type="time"
            value={chip.heureFin ?? valeursGlobales.heureFin ?? ""}
            onChange={(e) => onModifier({ heureFin: e.target.value || null })}
            className="rounded-[10px] border border-ppj-line-field bg-ppj-field px-2 py-1 text-xs text-ppj-ink"
          />
          <button type="button" onClick={() => setEdition(null)} aria-label="Valider l'horaire" className="text-ppj-ink hover:opacity-70">
            <Check className="size-4" />
          </button>
        </div>
      )}
      {edition === "lieu" && (
        <div className="mt-2.5 flex max-w-[220px] items-center gap-1.5">
          <VilleAutocompleteIdf
            value={chip.ville ?? valeursGlobales.ville ?? ""}
            onChange={(v) => onModifier({ ville: v })}
            className="[&_input]:h-8 [&_input]:text-xs"
          />
          <button
            type="button"
            onClick={() => setEdition(null)}
            aria-label="Valider la ville"
            className="shrink-0 text-ppj-ink hover:opacity-70"
          >
            <Check className="size-4" />
          </button>
        </div>
      )}

      {/* Lot B — contexte (un seul, partagé) et contraintes (plusieurs,
          strictement propres à ce métier) : n'apparaît que si le texte
          en a réellement fourni, jamais une section vide ; chaque
          élément reste modifiable/supprimable individuellement (cahier §7).
          Lot C — un contexte "probable" (pas certain) porte en plus un
          court "Correct ?" ; une contrainte "préférée" (pas requise)
          porte la mention "souhaité", jamais présentée comme une obligation. */}
      {(chip.contexte || chip.contraintes.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-ppj-line-2 pt-4">
          {chip.contexte && (
            <span className={cn("inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-xs font-medium text-ppj-ink", info.accent.bgSoft)}>
              {chip.contexte.label}
              {!chip.contexte.certain && <span className="text-ppj-text-3">correct&nbsp;?</span>}
              <button
                type="button"
                onClick={() => onModifier({ contexte: null })}
                aria-label="Retirer le contexte"
                className="text-ppj-text-3/70 hover:text-primary"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {chip.contraintes.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1.5 rounded-[8px] bg-ppj-fill px-2.5 py-1 text-xs font-medium text-ppj-ink">
              {c.label}
              {c.niveau === "prefere" && <span className="text-ppj-text-3">souhaité</span>}
              <button
                type="button"
                onClick={() => onRetirerContrainte(c.label)}
                aria-label={`Retirer la contrainte ${c.label}`}
                className="text-ppj-text-3/70 hover:text-primary"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Lot C §1/§9, redessiné au Lot E — informations déjà préremplies
          mais pas certaines : jamais bloquantes (la carte reste
          utilisable telle quelle), toujours confirmables en un geste.
          Même langage visuel calme que la bannière ville globale —
          jamais un ton d'alerte pour une simple vérification. */}
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
      {chip.quantiteIncertaine && (
        <div className="mt-4 rounded-[14px] bg-ppj-fill px-3.5 py-3">
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
    </div>
  );
}

/** Lot C — met en forme la valeur brute d'une Ambiguite ("date" en ISO, "horaires" en HH:mm ou HH:mm-HH:mm) pour l'afficher dans le bouton de confirmation, sans dupliquer la logique de formatage déjà utilisée pour l'affichage normal des cartes. */
function formatPropositionAmbiguite(a: Ambiguite): string {
  if (a.champ === "date") return formatDateFr(a.propose);
  return a.propose.includes("-") ? a.propose.replace("-", " → ") : a.propose;
}

function ChampMini({
  icone,
  label,
  rempli,
  actif,
  onClick,
}: {
  icone: React.ReactNode;
  label: string;
  rempli: boolean;
  actif: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[13px] font-medium transition-colors",
        actif
          ? "bg-ppj-ink text-white"
          : rempli
            ? "bg-ppj-fill text-ppj-ink hover:bg-ppj-line-2"
            : "text-primary underline decoration-primary/40 decoration-dotted underline-offset-4 hover:decoration-primary",
      )}
    >
      {icone}
      {label}
    </button>
  );
}
