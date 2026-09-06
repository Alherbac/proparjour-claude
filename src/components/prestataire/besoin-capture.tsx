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
  contexte: ContexteDetecte | null;
  contraintes: ContrainteDetectee[];
  ambiguites: Ambiguite[];
  quantiteIncertaine: boolean;
  datesMultiples: string[] | null;
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

/** Reprend un besoin mono-métier sauvegardé — null si aucune. */
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
  const [date, setDate] = useState<string | null>(demandeSauvee?.date || chips[0]?.date || null);
  const [heureDebut, setHeureDebut] = useState<string | null>(demandeSauvee?.heureDebut || null);
  const [heureFin, setHeureFin] = useState<string | null>(demandeSauvee?.heureFin || null);
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
  const dateApercu = date ?? chips.find((c) => c.date)?.date ?? null;
  const titreParDefaut = dateApercu ? `Événement du ${formatDateFr(dateApercu)}` : "Ma demande";

  // "Prête pour la publication" exige une vraie date (offres.date_mission
  // est NOT NULL), un lieu, un horaire et un tarif — ce dernier n'est
  // jamais extrait du texte, c'est la seule information que le client
  // doit obligatoirement saisir lui-même (règle de parcours B : une
  // offre publiée sans rémunération fait candidater les professionnels
  // à l'aveugle).
  function champsResolus(c: Chip) {
    return {
      date: c.date ?? date,
      heureDebut: c.heureDebut ?? heureDebut,
      heureFin: c.heureFin ?? heureFin,
      ville: c.ville ?? ville,
    };
  }
  function carteResoluePourPublication(c: Chip): boolean {
    const r = champsResolus(c);
    return Boolean(r.date && r.heureDebut && r.heureFin && r.ville && c.tarifHoraire && c.tarifHoraire > 0);
  }
  const communComplet = titre.trim().length > 0 && Boolean(date) && Boolean(ville);
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
  if (!date) manques.push({ label: "Date de l'offre", scope: "commun", onglet: "commun" });
  if (!ville) manques.push({ label: "Adresse exacte", scope: "commun", onglet: "commun" });
  for (const c of chips) {
    const info = infosFamille(c.metier);
    const court = METIERS.find((m) => m.id === c.metier)?.filiere.split(" ")[0].replace("&", "").trim() || info.filiere;
    const r = champsResolus(c);
    if (!(r.heureDebut && r.heureFin)) manques.push({ label: "Horaires du poste", scope: court, onglet: c.metier });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sauvegarderPourReprise lit déjà tout l'état pertinent (chips, titre, date, ville...) via fermeture ; le lister en plus de ces dépendances redéclencherait l'effet en boucle sans rien y ajouter.
  }, [etape, chips, titre, date, ville, heureDebut, heureFin, texte, prerequis, messagePersonnalise]);

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
        <div className="mx-auto max-w-[1180px]">
          <button
            type="button"
            onClick={() => setEtape("saisie")}
            className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] text-ppj-text-3 transition-colors hover:text-ppj-ink"
          >
            <ArrowLeft className="size-3.5" />
            Revenir à votre phrase
          </button>
          <h1
            className="text-ppj-ink"
            style={{ fontFamily: "var(--font-display-serif)", fontSize: "26px", lineHeight: 1.1, letterSpacing: "-0.018em" }}
          >
            Publier une offre
          </h1>
          <p className="mb-5 mt-1.5 max-w-[62ch] text-[15px] text-ppj-text-3">
            Vous ne choisissez personne — les professionnels candidatent un par un.
          </p>

          {/* Onglets — un par métier retenu, "+ Ajouter un métier" dans
              le même groupe. N'apparaissent qu'à partir de deux métiers
              (README §11) : avec un seul, tout tient dans un panneau. */}
          {modeMulti && (
            <div role="tablist" className="mb-3 flex flex-wrap gap-1.5">
              <OngletBouton actif={ongletActif === "commun"} complet={communComplet} onClick={() => setOnglet("commun")} label="Commun à tous" />
              {chips.map((c) => {
                const court = METIERS.find((m) => m.id === c.metier)?.filiere.split(" ")[0].replace("&", "").trim() || c.metier;
                return (
                  <OngletBouton
                    key={c.metier}
                    actif={ongletActif === c.metier}
                    complet={carteResoluePourPublication(c)}
                    onClick={() => setOnglet(c.metier)}
                    label={`${court} ${c.quantite} poste${c.quantite > 1 ? "s" : ""}`}
                  />
                );
              })}
              {metiersDisponiblesAjout.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => ajouterChip(m.id)}
                  className="flex min-h-11 items-center gap-1.5 rounded-[11px] border border-dashed border-ppj-line-button px-3 text-[13px] font-medium text-ppj-text-3 transition-colors hover:border-ppj-ink hover:text-ppj-ink"
                >
                  <Plus className="size-3.5" />
                  {infosFamille(m.id).emoji} {m.filiere}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Colonne gauche — panneau de saisie */}
            <div className="min-w-0 rounded-[18px] border border-ppj-line bg-white p-5">
              {(!modeMulti || ongletActif === "commun") && (
                <div className={cn(modeMulti ? "" : "mb-5 border-b border-ppj-line-2 pb-5")}>
                  <p className="mb-1 text-[15px] font-semibold text-ppj-ink">Commun à toute l&apos;offre</p>
                  <p className="mb-3.5 text-[12px] text-ppj-text-3">
                    Saisi une seule fois — les horaires et la rémunération se règlent dans chaque onglet métier.
                  </p>
                  <div className="grid gap-[13px]">
                    <ChampCommun label="Date de l'offre" manquant={!date}>
                      <EditeurDate value={date} onChange={setDate} onValider={() => {}} nomGroupe="date-commune" compact />
                    </ChampCommun>
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
                    <ChampCommun label="Titre de l'offre">
                      <input
                        value={titre}
                        onChange={(e) => setTitre(e.target.value)}
                        placeholder={titreParDefaut}
                        className={champInputClass}
                      />
                    </ChampCommun>
                    <ChampCommun label="Contexte" hint="vu par tous les candidats">
                      <textarea
                        value={messageFinal()}
                        onChange={(e) => setMessagePersonnalise(e.target.value)}
                        rows={3}
                        placeholder="Type de lieu, affluence attendue, contact sur place, accès et étage…"
                        className={cn(champInputClass, "resize-none leading-[1.5]")}
                      />
                    </ChampCommun>

                    <div>
                      <p className="mb-1.5 text-[12.5px] font-semibold text-ppj-ink">Prérequis supplémentaires</p>
                      <div className="grid gap-1.5">
                        {prerequis.map((p, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={p}
                              onChange={(e) => modifierPrerequis(i, e.target.value)}
                              placeholder={SUGGESTIONS_PREREQUIS[i % SUGGESTIONS_PREREQUIS.length]}
                              className="w-full rounded-[13px] border border-ppj-line-field bg-ppj-field px-3.5 py-2.5 text-[13.5px] text-ppj-ink outline-none focus:border-primary"
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
            <div className="flex min-w-0 flex-col gap-3.5">
              <div className="rounded-[18px] border border-ppj-line bg-white p-[18px]">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-ppj-text-5">Votre offre</span>
                <div className="mt-3 grid gap-2 text-[13.5px]">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-ppj-ink">{date ? formatDateFr(date) : "Date à préciser"}</span>
                    <span className="text-ppj-text-3">{ville ?? "Adresse à préciser"}</span>
                  </span>
                  <span className="my-0.5 block h-px bg-ppj-line-2" />
                  {chips.map((c) => {
                    const info = infosFamille(c.metier);
                    return (
                      <span key={c.metier} className="flex items-center justify-between gap-3">
                        <span className="text-ppj-text-2">{info.filiere}</span>
                        <span className="font-medium text-ppj-ink">
                          {c.quantite} poste{c.quantite > 1 ? "s" : ""}
                        </span>
                      </span>
                    );
                  })}
                  <span className="my-0.5 block h-px bg-ppj-line-2" />
                  <span className="flex items-center justify-between gap-3 font-semibold text-ppj-ink">
                    <span>Postes à pourvoir</span>
                    <span>{totalPostes}</span>
                  </span>
                </div>
              </div>

              <div className="rounded-[18px] border border-ppj-line bg-white p-[18px]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-ppj-ink">Avant de publier</p>
                  {manques.length > 0 && <span className="text-[12px] text-ppj-red-text">{manques.length} à compléter</span>}
                </div>
                {manques.length === 0 ? (
                  <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "#2E7D4F" }}>
                    <Check /> Tout est renseigné.
                  </p>
                ) : (
                  <div className="grid gap-1.5">
                    {manques.map((m, i) => (
                      <button
                        key={`${m.label}-${m.scope}-${i}`}
                        type="button"
                        onClick={() => setOnglet(m.onglet)}
                        className="flex min-h-11 items-center gap-2.5 rounded-lg px-1.5 text-left text-[13px] font-semibold text-ppj-red-text transition-colors hover:bg-ppj-red-bg"
                      >
                        <Dot /> {m.label} — {m.scope}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[18px] border border-ppj-line bg-ppj-fill p-[18px]">
                <p className="text-[13.5px] font-semibold text-ppj-ink">Ce qui se passe ensuite</p>
                <p className="mt-2 text-[12.5px] leading-[1.6] text-ppj-text-2">
                  L&apos;offre devient visible par les professionnels de ces métiers. Ils candidatent un par un ;
                  vous consultez chaque profil, puis vous retenez ou vous écartez.
                </p>
                <p className="mt-2 text-[12.5px] leading-[1.6] text-ppj-text-2">Aucun panier, aucun paiement à ce stade.</p>
              </div>

              <Button
                className="min-h-[50px] w-full rounded-[13px] bg-primary text-[15px] font-semibold text-white hover:bg-[#B8130F]"
                disabled={!pretPourPublication || envoiPublication}
                onClick={publierDirectement}
              >
                <Send className="size-3.5" />
                {envoiPublication ? "Publication..." : "Publier l'offre"}
              </Button>
              {!pretPourPublication && (
                <p className="-mt-2 text-center text-[12px] text-ppj-text-3">Complétez les informations manquantes ci-dessus pour publier.</p>
              )}
              {erreurPublication && <p className="-mt-2 text-center text-[13px] font-medium text-destructive">{erreurPublication}</p>}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={enregistrerBrouillon}
                  className="min-h-11 rounded-[13px] border border-ppj-line-button bg-white text-[13.5px] font-semibold text-ppj-ink transition-colors hover:border-ppj-ink"
                >
                  Enregistrer le brouillon
                </button>
                <Link
                  href="/client/candidatures"
                  className="flex min-h-11 items-center justify-center rounded-[13px] border border-ppj-line-button bg-white text-[13.5px] font-semibold text-ppj-ink transition-colors hover:border-ppj-ink"
                >
                  Candidatures
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const champInputClass =
  "w-full rounded-[13px] border border-ppj-line-field bg-ppj-field px-3.5 py-3 text-[14.5px] text-ppj-ink placeholder:text-ppj-text-4 focus:outline-none";

/**
 * Onglet du groupe "Commun / métiers" — même pastille de complétude
 * que "Proposer la mission" (README §11) : rouge si incomplet, vert
 * si prêt, rouge clair quand l'onglet est actif (lisibilité sur fond
 * noir).
 */
function OngletBouton({ actif, complet, onClick, label }: { actif: boolean; complet: boolean; onClick: () => void; label: string }) {
  const couleurPastille = actif ? "#FF8A85" : complet ? "#2E7D4F" : "#E21D1B";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={actif}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-[11px] px-3 text-[13px] font-medium transition-colors",
        actif ? "bg-[#1A1917] text-[#FBFAF8]" : "border border-ppj-line bg-white text-ppj-ink hover:border-ppj-ink",
      )}
    >
      <span className="block size-[6px] shrink-0 rounded-full" style={{ backgroundColor: couleurPastille }} />
      {label}
    </button>
  );
}

function ChampCommun({
  label,
  hint,
  manquant,
  children,
}: {
  label: string;
  hint?: string;
  manquant?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-ppj-ink">
        {label}
        {manquant && <BadgeManquant>requis</BadgeManquant>}
        {!manquant && hint && <span className="font-normal text-ppj-text-4">— {hint}</span>}
      </span>
      {children}
    </div>
  );
}

function Dot() {
  return <span className="block size-[15px] flex-none rounded-full border-[1.5px] border-primary" />;
}

function BadgeManquant({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-primary px-2 py-[3px] text-[12px] text-white">{children}</span>;
}

/**
 * Choix de date à 3 options mutuellement exclusives — jamais un simple
 * calendrier vide. "Dès que possible" résout tout de suite une vraie
 * date (aujourd'hui, la plus proche possible) ; "Je ne sais pas encore"
 * est le repli explicite quand rien n'est décidé.
 */
function EditeurDate({
  value,
  onChange,
  onValider,
  nomGroupe,
  compact,
}: {
  value: string | null;
  onChange: (d: string | null) => void;
  onValider: () => void;
  nomGroupe: string;
  compact?: boolean;
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
    <div className={cn("flex w-full flex-col gap-1.5", compact ? "max-w-full" : "mt-2.5 max-w-xs")}>
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

/**
 * Contenu de l'onglet d'un métier — reprend telle quelle la logique
 * de CarteEquipe (Lots A-F), mais sans son propre bloc date/heure/lieu
 * empilé : ces trois champs vivent maintenant dans l'onglet "Commun"
 * (partagés) sauf horaires, qui restent propres à CE métier (jamais
 * globaux, README §11) et s'affichent donc ici, toujours visibles.
 * Nouveau : Rémunération (tarif horaire), obligatoire, absente du
 * parcours "Proposer la mission" — c'est le professionnel qui y
 * renvoie son propre devis, alors qu'ici personne n'a encore répondu.
 */
function PanneauMetier({
  chip,
  onRetirer,
  onAjusterQuantite,
  onModifier,
  onRetirerContrainte,
  onConfirmerAmbiguite,
  onModifierAmbiguite,
  onConfirmerQuantite,
}: {
  chip: Chip;
  onRetirer: () => void;
  onAjusterQuantite: (delta: number) => void;
  onModifier: (patch: Partial<Chip>) => void;
  onRetirerContrainte: (label: string) => void;
  onConfirmerAmbiguite: (champ: Ambiguite["champ"]) => void;
  onModifierAmbiguite: (champ: Ambiguite["champ"]) => void;
  onConfirmerQuantite: () => void;
}) {
  const [editionDate, setEditionDate] = useState(false);
  const info = infosFamille(chip.metier);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-ppj-text-3">Vérifié : disponibilité, expérience, présentation.</p>
        </div>
        <button
          type="button"
          onClick={onRetirer}
          aria-label={`Retirer ${info.filiere} de l'offre`}
          className="shrink-0 rounded-full p-1 text-ppj-text-3 transition-colors hover:bg-ppj-fill hover:text-primary"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <span className="text-[12.5px] font-semibold text-ppj-ink">Postes à pourvoir</span>
        <div className="flex items-center gap-1.5 rounded-full border border-ppj-line-field bg-ppj-field px-1 py-1">
          <button
            type="button"
            onClick={() => onAjusterQuantite(-1)}
            aria-label="Réduire le nombre de postes"
            className="flex size-7 items-center justify-center rounded-full text-ppj-ink transition-colors hover:bg-white"
          >
            −
          </button>
          <span className="min-w-[1.5em] text-center text-sm font-semibold tabular-nums text-ppj-ink">{chip.quantite}</span>
          <button
            type="button"
            onClick={() => onAjusterQuantite(1)}
            aria-label="Augmenter le nombre de postes"
            className="flex size-7 items-center justify-center rounded-full text-ppj-ink transition-colors hover:bg-white"
          >
            +
          </button>
        </div>
      </div>

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

      <div className="mt-4 grid gap-[13px] border-t border-ppj-line-2 pt-4">
        <ChampCommun label="Horaires du poste" manquant={!(chip.heureDebut && chip.heureFin)}>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={chip.heureDebut ?? ""}
              onChange={(e) => onModifier({ heureDebut: e.target.value || null })}
              className={inputHoraireClass(!chip.heureDebut)}
            />
            <span className="text-[13px] text-ppj-text-4">→</span>
            <input
              type="time"
              value={chip.heureFin ?? ""}
              onChange={(e) => onModifier({ heureFin: e.target.value || null })}
              className={inputHoraireClass(!chip.heureFin)}
            />
          </div>
          {chip.moment && !chip.heureDebut && (
            <p className="mt-1.5 text-[12px] text-ppj-text-3">{LABEL_MOMENT[chip.moment]} — horaires à préciser</p>
          )}
        </ChampCommun>

        <ChampCommun label="Rémunération proposée" manquant={!(chip.tarifHoraire && chip.tarifHoraire > 0)}>
          <span className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              step="0.5"
              value={chip.tarifHoraire ?? ""}
              onChange={(e) => onModifier({ tarifHoraire: Number(e.target.value) || null })}
              placeholder="Ex. 15"
              aria-label={`Tarif horaire pour ${info.filiere}`}
              className={cn(champInputClass, "w-32")}
            />
            <span className="text-[13.5px] text-ppj-text-3">€/h</span>
          </span>
        </ChampCommun>

        {chip.date && (
          <ChampCommun label="Date propre à ce métier" hint="différente de la date commune">
            <button
              type="button"
              onClick={() => setEditionDate((v) => !v)}
              className="rounded-[13px] border border-ppj-line-field bg-ppj-field px-3.5 py-3 text-left text-[14px] text-ppj-ink"
            >
              {formatDateFr(chip.date)}
            </button>
            {editionDate && (
              <EditeurDate value={chip.date} onChange={(d) => onModifier({ date: d })} onValider={() => setEditionDate(false)} nomGroupe={`date-${chip.metier}`} compact />
            )}
          </ChampCommun>
        )}

        {chip.datesMultiples && chip.datesMultiples.length > 1 && (
          <p className="text-[12px] text-ppj-text-3">
            Plusieurs jours mentionnés : {chip.datesMultiples.map((d) => formatDateFr(d)).join(", ")}. Une offre sera
            publiée pour le premier ; les autres jours restent à publier séparément si besoin.
          </p>
        )}
      </div>

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

function inputHoraireClass(manquant: boolean) {
  return manquant
    ? "flex-1 rounded-[11px] border-[1.5px] border-primary bg-white px-3 py-[9px] text-[14px] text-ppj-ink focus:outline-none"
    : "flex-1 rounded-[11px] border border-ppj-line-field bg-ppj-field px-3 py-[10px] text-[14px] text-ppj-ink focus:outline-none";
}

/** Lot C — met en forme la valeur brute d'une Ambiguite ("date" en ISO, "horaires" en HH:mm ou HH:mm-HH:mm) pour l'afficher dans le bouton de confirmation, sans dupliquer la logique de formatage déjà utilisée pour l'affichage normal des cartes. */
function formatPropositionAmbiguite(a: Ambiguite): string {
  if (a.champ === "date") return formatDateFr(a.propose);
  return a.propose.includes("-") ? a.propose.replace("-", " → ") : a.propose;
}
