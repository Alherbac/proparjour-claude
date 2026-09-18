"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdresseAutocomplete } from "@/components/adresse-autocomplete";
import { METIERS, type MetierId } from "@/config/metiers";
import { usePanier } from "@/hooks/use-panier";
import { viderPanier, retirerParPrestataire } from "@/lib/panier";
import { extraireBesoin, detecterAdresse, extraireSousBesoins } from "@/lib/besoin";
import { proposerMission, type LigneProposition } from "@/app/actions/proposition";
import { cn } from "@/lib/utils";

type ChampsMetier = {
  heureDebut: string;
  heureFin: string;
  precisions: string;
  reconnuHoraires: boolean;
  /** Uniquement pertinent pour l'accueil (dossier design, capture "plusieurs prestataires") — pas de colonne dédiée côté serveur, fondu dans `precisions` à l'envoi (voir envoyer()) plutôt qu'un nouveau champ de base de données. */
  languesExigees: string;
};

/** Seul l'accueil demande explicitement des langues à l'inscription (voir onboarding) — jamais un champ générique sans rapport avec le métier réel. */
function metierRequiertLangues(m: MetierId): boolean {
  return m === "accueil";
}

type Onglet = "commun" | MetierId;

/**
 * "proparjour 6-7" §9, refondu selon README §11 ("RÉVISÉ, remplace §9
 * et §10" — confirmé par les captures de référence du dossier
 * "Proparjour design a jour") : les métiers deviennent des ONGLETS
 * au-dessus d'un panneau de saisie unique plutôt que des blocs
 * empilés — la hauteur ne bouge plus, que le panier compte deux ou
 * six métiers. Le bloc « commun à toute la mission » n'existe QUE si
 * au moins deux métiers sont retenus (un seul, rien à mettre en
 * commun : tout tient dans un seul panneau). Écran de passage entre
 * le panier et l'envoi réel — réutilise tel quel le moteur de
 * compréhension du besoin (lib/besoin.ts) pour le pré-remplissage,
 * jamais un second moteur. Envoie une seule mission avec toutes les
 * lignes 'en_attente' (actions/proposition.ts) — rien n'est payé ici,
 * le paiement n'intervient qu'à l'acceptation d'un professionnel
 * (carte de devis existante en messagerie).
 *
 * Non fait dans ce chantier (signalé plutôt que bricolé) : l'envoi
 * individuel "Profil / Envoyer" par professionnel décrit au §11
 * suppose un appel serveur par personne — proposerMission crée
 * aujourd'hui UNE mission avec toutes les lignes en un seul appel.
 * Ajouter un envoi partiel aurait dépassé "ne touche qu'à cet écran" ;
 * le bouton "Profil" reste, "Envoyer" individuel n'a pas été ajouté.
 */
export function PropositionContent() {
  const router = useRouter();
  const panier = usePanier();
  const [isPending, startTransition] = useTransition();

  const [phrase, setPhrase] = useState("");
  const [analyse, setAnalyse] = useState(false);
  const [phraseOuverte, setPhraseOuverte] = useState(false);

  const [titre, setTitre] = useState("");
  const [date, setDate] = useState("");
  const [dateReconnue, setDateReconnue] = useState(false);
  const [adresse, setAdresse] = useState("");
  const [villeReconnue, setVilleReconnue] = useState<string | null>(null);
  const [contexte, setContexte] = useState("");
  const [contexteReconnu, setContexteReconnu] = useState(false);

  const metiersRetenus = useMemo(() => {
    const set = new Set<MetierId>();
    for (const l of panier.lignes) set.add(l.metier);
    return METIERS.filter((m) => set.has(m.id));
  }, [panier.lignes]);

  const multiMetiers = metiersRetenus.length >= 2;

  const [champsParMetier, setChampsParMetier] = useState<Partial<Record<MetierId, ChampsMetier>>>({});
  const [onglet, setOnglet] = useState<Onglet>("commun");
  const ongletActif: Onglet = multiMetiers ? onglet : (metiersRetenus[0]?.id ?? "commun");

  function champs(metier: MetierId): ChampsMetier {
    return champsParMetier[metier] ?? { heureDebut: "", heureFin: "", precisions: "", reconnuHoraires: false, languesExigees: "" };
  }

  function analyserPhrase() {
    if (!phrase.trim()) return;
    const besoin = extraireBesoin(phrase);
    const adresseDetectee = detecterAdresse(phrase);
    const sousBesoins = extraireSousBesoins(phrase);

    if (besoin.date) {
      setDate(besoin.date);
      setDateReconnue(true);
    }
    if (adresseDetectee?.villeDevinee) {
      setVilleReconnue(adresseDetectee.villeDevinee);
      if (!adresse.trim()) setAdresse(adresseDetectee.villeDevinee);
    }
    if (besoin.contexte) {
      setContexte(besoin.contexte.label);
      setContexteReconnu(true);
    }

    setChampsParMetier((prev) => {
      const next = { ...prev };
      for (const sb of sousBesoins) {
        if (!metiersRetenus.some((m) => m.id === sb.metier)) continue;
        if (sb.heureDebut && sb.heureFin) {
          next[sb.metier] = {
            heureDebut: sb.heureDebut,
            heureFin: sb.heureFin,
            precisions: next[sb.metier]?.precisions ?? "",
            reconnuHoraires: true,
            languesExigees: next[sb.metier]?.languesExigees ?? "",
          };
        }
      }
      return next;
    });

    setAnalyse(true);
  }

  const communComplet = titre.trim().length > 0 && date.length > 0 && adresse.trim().length > 0;
  const metierComplet = (m: MetierId) => {
    const c = champs(m);
    return Boolean(c.heureDebut && c.heureFin) && (!metierRequiertLangues(m) || c.languesExigees.trim().length > 0);
  };

  // Le seul métier retenu en mode "1 prestataire" (garanti non vide :
  // panier.lignes.length === 0 a déjà un retour anticipé plus haut) —
  // ses horaires/précisions rejoignent visuellement le panneau commun
  // (dossier design, capture "1 seul prestataire") plutôt que de
  // rester dans un second bloc séparé, qui n'a de sens que lorsqu'il y
  // a plusieurs métiers à distinguer.
  const seulMetier = !multiMetiers ? metiersRetenus[0] : null;

  const manques: { label: string; scope: string; onglet: Onglet }[] = [];
  if (!titre.trim()) manques.push({ label: "Titre de la mission", scope: "commun", onglet: "commun" });
  if (!date) manques.push({ label: "Date de la mission", scope: "commun", onglet: "commun" });
  if (!adresse.trim()) manques.push({ label: "Adresse exacte", scope: "commun", onglet: "commun" });
  for (const m of metiersRetenus) {
    const c = champs(m.id);
    if (metierRequiertLangues(m.id) && !c.languesExigees.trim()) manques.push({ label: "Langues exigées", scope: m.label, onglet: m.id });
    if (!c.heureDebut || !c.heureFin) manques.push({ label: "Horaires du poste", scope: m.label, onglet: m.id });
  }

  const pretAEnvoyer = communComplet && metiersRetenus.every((m) => metierComplet(m.id));

  function envoyer() {
    if (!pretAEnvoyer) return;
    const lignes: LigneProposition[] = panier.lignes.map((l) => {
      const c = champs(l.metier);
      // "Langues exigées" n'a pas de colonne dédiée côté serveur
      // (voir actions/proposition.ts) : fondu dans les précisions
      // envoyées, plutôt qu'une nouvelle action/migration pour un
      // champ propre à un seul métier.
      const precisions = c.languesExigees.trim()
        ? `Langues exigées : ${c.languesExigees.trim()}${c.precisions.trim() ? ` — ${c.precisions.trim()}` : ""}`
        : c.precisions;
      return {
        prestataireId: l.prestataireId,
        prenom: l.prenom,
        heureDebut: c.heureDebut,
        heureFin: c.heureFin,
        precisions,
      };
    });
    startTransition(async () => {
      const resultat = await proposerMission({ titre: titre.trim(), date, adresse: adresse.trim(), contexte, lignes });
      if (!resultat.success) {
        toast.error(resultat.error);
        return;
      }
      viderPanier();
      toast.success(`Mission proposée à ${lignes.length} professionnel${lignes.length > 1 ? "s" : ""}.`);
      router.push(`/missions/${resultat.data.missionId}`);
    });
  }

  if (panier.lignes.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 text-center lg:px-8">
        <p className="text-[15px] text-ppj-text-3">
          Votre panier est vide —{" "}
          <Link href="/panier" className="font-semibold text-primary hover:underline">
            retournez-y
          </Link>{" "}
          pour retenir des professionnels avant de proposer une mission.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-ppj-paper lg:h-screen">
      <div className="mx-auto w-full max-w-[1240px] shrink-0 px-4 pt-5 lg:px-6 lg:pt-[22px]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-[14px]">
            <Link href="/panier" className="text-[12.5px] text-[#6B6660] hover:text-ppj-ink">
              ← Retour au panier
            </Link>
            <h1
              className="text-ppj-ink"
              style={{ fontFamily: "var(--font-display-serif)", fontSize: "30px", lineHeight: 1.05, letterSpacing: "-0.02em" }}
            >
              Détails de la mission
            </h1>
            <span className="text-[13px] text-[#6B6660]">
              {!multiMetiers && seulMetier
                ? `${panier.lignes[0].prenom} · ${seulMetier.label} · rien n'est encore envoyé`
                : `${panier.lignes.length} professionnel${panier.lignes.length > 1 ? "s" : ""} · ${metiersRetenus.length} métier${metiersRetenus.length > 1 ? "s" : ""} · rien n'est encore envoyé`}
            </span>
          </div>

          {/* Capture en langage naturel — conservée (aucune fonctionnalité
              retirée), mais réduite à une simple bascule au lieu du bandeau
              ~130px de l'ancienne version : les valeurs reconnues vont
              directement dans les champs, le compteur vit dans la colonne
              de droite (README §11). */}
          <button
            type="button"
            onClick={() => setPhraseOuverte((v) => !v)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ppj-line px-3 text-[12.5px] font-medium text-ppj-text-3 transition-colors hover:border-ppj-ink hover:text-ppj-ink"
          >
            <Search className="size-3.5" />
            {phraseOuverte ? "Masquer" : "Décrire en une phrase"}
          </button>
        </div>

        {phraseOuverte && (
          <div className="mt-3 flex items-center gap-2 rounded-[13px] border border-ppj-red-border bg-ppj-red-bg px-3.5 py-2.5">
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              onBlur={analyserPhrase}
              placeholder="« vendredi à Paris, de 18h à minuit »…"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ppj-ink placeholder:text-ppj-text-4 focus:outline-none"
            />
            {analyse && <span className="shrink-0 text-[12px] text-ppj-red-text">Reconnu ✓</span>}
          </div>
        )}
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-[1240px] min-h-0 flex-1 flex-col gap-0 overflow-y-auto px-4 pb-6 lg:flex-row lg:gap-[18px] lg:overflow-hidden lg:px-6 lg:pb-[22px]">
        {/* Colonne gauche — onglets puis panneau de saisie. flex (pas une
            piste de grille fixe) : une piste "minmax(0,1fr) 340px" force la
            colonne voisine à absorber toute la contrainte à 390px (SPEC-
            PIXEL RÈGLE N°3) — jamais réintroduite. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden">
          {multiMetiers && (
            <div role="tablist" className="mb-3 flex shrink-0 flex-wrap gap-2">
              <Onglets
                actif={ongletActif === "commun"}
                complet={communComplet}
                onClick={() => setOnglet("commun")}
                label="Commun à tous"
              />
              {metiersRetenus.map((m) => {
                const nb = panier.lignes.filter((l) => l.metier === m.id).length;
                // Forme courte pour l'onglet — même dérivation que la
                // barre de recherche (hero-search-bar.tsx) : le premier
                // mot de la filière, jamais un libellé inventé.
                const court = m.filiere.split(" ")[0].replace("&", "").trim() || m.filiere;
                return (
                  <Onglets
                    key={m.id}
                    actif={ongletActif === m.id}
                    complet={metierComplet(m.id)}
                    onClick={() => setOnglet(m.id)}
                    label={court}
                    count={nb}
                  />
                );
              })}
            </div>
          )}

          <div className="min-h-0 rounded-[18px] border border-ppj-line bg-white px-[22px] py-5 lg:flex-1 lg:overflow-y-auto">
            {/*
              Deux mises en page distinctes (dossier design, captures
              "1 seul prestataire" / "plusieurs prestataires") — jamais
              une troisième variante bricolée entre les deux. En mode
              1 prestataire, les horaires/précisions du seul métier
              retenu rejoignent ce même panneau (pas de second bloc
              séparé, qui n'a de sens qu'à partir de 2 métiers).
            */}
            {!multiMetiers && seulMetier ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
                  <ChampSaisie label="Date de la mission" reconnu={dateReconnue} manquant={!date}>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setDateReconnue(false);
                      }}
                      className={champClass(!date)}
                    />
                  </ChampSaisie>
                  <ChampSaisie label="Début" manquant={!champs(seulMetier.id).heureDebut}>
                    <input
                      type="time"
                      value={champs(seulMetier.id).heureDebut}
                      onChange={(e) =>
                        setChampsParMetier((prev) => ({
                          ...prev,
                          [seulMetier.id]: { ...champs(seulMetier.id), heureDebut: e.target.value, reconnuHoraires: false },
                        }))
                      }
                      className={champClass(!champs(seulMetier.id).heureDebut)}
                    />
                  </ChampSaisie>
                  <ChampSaisie label="Fin" manquant={!champs(seulMetier.id).heureFin}>
                    <input
                      type="time"
                      value={champs(seulMetier.id).heureFin}
                      onChange={(e) =>
                        setChampsParMetier((prev) => ({
                          ...prev,
                          [seulMetier.id]: { ...champs(seulMetier.id), heureFin: e.target.value, reconnuHoraires: false },
                        }))
                      }
                      className={champClass(!champs(seulMetier.id).heureFin)}
                    />
                  </ChampSaisie>
                </div>

                <ChampSaisie
                  label="Adresse exacte"
                  reconnu={Boolean(villeReconnue)}
                  reconnuDetail={villeReconnue ? `« ${villeReconnue} » reconnu` : undefined}
                  manquant={!adresse.trim()}
                >
                  <AdresseAutocomplete
                    id="adresse-proposition"
                    value={adresse}
                    onChange={(v) => setAdresse(v)}
                    placeholder="Numéro, rue, code postal, ville"
                  />
                </ChampSaisie>

                <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                  <ChampSaisie label="Titre de la mission" manquant={!titre.trim()}>
                    <input
                      value={titre}
                      onChange={(e) => setTitre(e.target.value)}
                      placeholder="Ex. Soirée d'inauguration"
                      className={champClass(!titre.trim())}
                    />
                  </ChampSaisie>
                  <ChampSaisie label="Contexte" reconnu={contexteReconnu} optionnel>
                    <input
                      value={contexte}
                      onChange={(e) => {
                        setContexte(e.target.value);
                        setContexteReconnu(false);
                      }}
                      placeholder="Type de lieu, affluence…"
                      className={champClass(false)}
                    />
                  </ChampSaisie>
                </div>

                <ChampSaisie label="Précisions pour ce poste" description="tenue, qualifications, missions confiées">
                  <textarea
                    value={champs(seulMetier.id).precisions}
                    onChange={(e) =>
                      setChampsParMetier((prev) => ({ ...prev, [seulMetier.id]: { ...champs(seulMetier.id), precisions: e.target.value } }))
                    }
                    placeholder="Ex. costume sombre, contrôle d'accès, oreillette fournie…"
                    className={cn(champClass(false), "min-h-[260px] resize-none text-[15.5px] leading-[1.5]")}
                  />
                </ChampSaisie>
              </div>
            ) : (
              <>
                {ongletActif === "commun" && (
                  <div className="grid gap-4">
                    <div className="flex flex-wrap items-baseline gap-[10px]">
                      <span className="text-[15px] font-semibold text-ppj-ink">Commun à tous les métiers</span>
                      <span className="text-[12.5px] text-[#7A756D]">
                        saisi une seule fois — les horaires se règlent dans chaque onglet métier
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-[1fr_1.4fr]">
                      <ChampSaisie label="Date de la mission" reconnu={dateReconnue} manquant={!date}>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => {
                            setDate(e.target.value);
                            setDateReconnue(false);
                          }}
                          className={champClass(!date)}
                        />
                      </ChampSaisie>
                      <ChampSaisie
                        label="Adresse exacte"
                        reconnu={Boolean(villeReconnue)}
                        reconnuDetail={villeReconnue ? `« ${villeReconnue} » reconnu` : undefined}
                        manquant={!adresse.trim()}
                      >
                        <AdresseAutocomplete
                          id="adresse-proposition"
                          value={adresse}
                          onChange={(v) => setAdresse(v)}
                          placeholder="Numéro, rue, code postal, ville"
                        />
                      </ChampSaisie>
                    </div>
                    <ChampSaisie label="Titre de la mission" manquant={!titre.trim()}>
                      <input
                        value={titre}
                        onChange={(e) => setTitre(e.target.value)}
                        placeholder="Ex. Soirée d'inauguration — 29 août"
                        className={champClass(!titre.trim())}
                      />
                    </ChampSaisie>
                    <ChampSaisie label="Contexte de la mission" description="vu par tous les professionnels" reconnu={contexteReconnu}>
                      <textarea
                        value={contexte}
                        onChange={(e) => {
                          setContexte(e.target.value);
                          setContexteReconnu(false);
                        }}
                        placeholder="Type de lieu, affluence attendue, contact sur place, accès et étage…"
                        className={cn(champClass(false), "min-h-[260px] resize-none text-[15.5px] leading-[1.5]")}
                      />
                    </ChampSaisie>
                  </div>
                )}

                {metiersRetenus.map((m) => {
                  if (ongletActif !== m.id) return null;
                  const c = champs(m.id);
                  const nb = panier.lignes.filter((l) => l.metier === m.id).length;
                  const autreAvecHoraires = metiersRetenus.find(
                    (autre) => autre.id !== m.id && champs(autre.id).heureDebut && champs(autre.id).heureFin,
                  );
                  return (
                    <div key={m.id} className="grid gap-4">
                      <p className="text-[12.5px] text-[#7A756D]">
                        {nb} candidat{nb > 1 ? "s" : ""} retenu{nb > 1 ? "s" : ""} pour {m.label}.
                      </p>
                      <div>
                        <span
                          className={cn(
                            "mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold",
                            !c.reconnuHoraires && (!c.heureDebut || !c.heureFin) ? "text-[#8E2A26]" : "text-ppj-ink",
                          )}
                        >
                          Horaires de ce poste
                          {c.reconnuHoraires ? (
                            <Badge>reconnu</Badge>
                          ) : !c.heureDebut || !c.heureFin ? (
                            <BadgeManquant>requis</BadgeManquant>
                          ) : null}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={c.heureDebut}
                            onChange={(e) =>
                              setChampsParMetier((prev) => ({
                                ...prev,
                                [m.id]: { ...champs(m.id), heureDebut: e.target.value, reconnuHoraires: false },
                              }))
                            }
                            className={inputHoraireClass(!c.heureDebut)}
                          />
                          <span className="text-[13px] text-ppj-text-4">→</span>
                          <input
                            type="time"
                            value={c.heureFin}
                            onChange={(e) =>
                              setChampsParMetier((prev) => ({
                                ...prev,
                                [m.id]: { ...champs(m.id), heureFin: e.target.value, reconnuHoraires: false },
                              }))
                            }
                            className={inputHoraireClass(!c.heureFin)}
                          />
                        </div>
                        {!c.heureDebut && autreAvecHoraires && (
                          <button
                            type="button"
                            onClick={() =>
                              setChampsParMetier((prev) => ({
                                ...prev,
                                [m.id]: {
                                  ...champs(m.id),
                                  heureDebut: champs(autreAvecHoraires.id).heureDebut,
                                  heureFin: champs(autreAvecHoraires.id).heureFin,
                                  reconnuHoraires: false,
                                },
                              }))
                            }
                            className="mt-2 rounded-full border border-ppj-line bg-ppj-fill px-2.5 py-[5px] text-[12px] text-ppj-neutral-text hover:border-ppj-ink"
                          >
                            Comme {autreAvecHoraires.label} ({champs(autreAvecHoraires.id).heureDebut} → {champs(autreAvecHoraires.id).heureFin})
                          </button>
                        )}
                      </div>
                      {metierRequiertLangues(m.id) && (
                        <ChampSaisie label="Langues exigées" manquant={!c.languesExigees.trim()}>
                          <input
                            value={c.languesExigees}
                            onChange={(e) =>
                              setChampsParMetier((prev) => ({ ...prev, [m.id]: { ...champs(m.id), languesExigees: e.target.value } }))
                            }
                            placeholder="Ex. Français, Anglais"
                            className={champClass(!c.languesExigees.trim())}
                          />
                        </ChampSaisie>
                      )}
                      <ChampSaisie label="Précisions pour ce métier" optionnel>
                        <textarea
                          value={c.precisions}
                          onChange={(e) =>
                            setChampsParMetier((prev) => ({ ...prev, [m.id]: { ...champs(m.id), precisions: e.target.value } }))
                          }
                          rows={4}
                          placeholder="Ex. costume sombre, contrôle d'accès, oreillette fournie…"
                          className={cn(champClass(false), "resize-none text-[15.5px] leading-[1.5]")}
                        />
                      </ChampSaisie>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Colonne droite — 340px fixe, sticky sur desktop */}
        <div className="mt-5 flex min-w-0 flex-none flex-col gap-3.5 lg:mt-0 lg:w-[340px] lg:overflow-y-auto lg:pr-0.5">
          {!multiMetiers && seulMetier ? (
            // Capture "1 seul prestataire" — une seule grande carte,
            // jamais le regroupement par métier (qui n'a de sens qu'à
            // partir de 2 personnes) : nom, métier, tarif et
            // certifications (mêmes données que la fiche publique,
            // voir LignePanier), puis les deux actions "Revoir le
            // profil" / "Retirer" — celle-ci réutilise retirerParPrestataire
            // (lib/panier.ts), déjà utilisée par la bascule "Ajouter/
            // Retirer du panier" de la fiche prestataire.
            <div className="rounded-[18px] border border-ppj-line bg-white p-4">
              <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#98938B]">Professionnel retenu</div>
              {panier.lignes.slice(0, 1).map((l) => (
                <div key={l.prestataireId} className="flex items-center gap-3">
                  {l.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
                    <img src={l.photoUrl} alt={l.prenom} className="h-[58px] w-[46px] shrink-0 rounded-[11px] object-cover" />
                  ) : (
                    <div
                      className="h-[58px] w-[46px] shrink-0 rounded-[11px]"
                      style={{ backgroundImage: "repeating-linear-gradient(135deg, #F0ECE6 0 6px, #E4DFD7 6px 12px)" }}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[15.5px] font-semibold text-ppj-ink">{l.prenom}</span>
                      {/* Coche "profil vérifié" — jamais une donnée inventée : on ne
                          peut ajouter un prestataire au panier que depuis sa fiche
                          publique (fiche-bandeau.tsx), qui n'existe elle-même que si
                          statut_verification === "valide" (voir getParticipantsMission
                          et les vues publiques prestataires_publics). */}
                      <svg width="14" height="14" viewBox="0 0 24 24" aria-label="Profil vérifié" className="shrink-0">
                        <circle cx="12" cy="12" r="10" fill="#1D74E8" />
                        <path d="M17 9.5l-6 6-3.2-3.2" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] font-semibold text-[#E21D1B]">{seulMetier.label}</span>
                    <span className="mt-0.5 block text-[12.5px] text-[#6B6660]">
                      {l.tarifMontant} € / {l.tarifType === "horaire" ? "heure" : "jour"}
                      {l.certifications && l.certifications.length > 0 ? ` · ${l.certifications.join(" · ")}` : ""}
                    </span>
                  </span>
                </div>
              ))}
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/prestataires/${panier.lignes[0].prestataireId}`}
                  className="flex-1 rounded-[10px] border border-[#DDD8D1] bg-white px-2.5 py-[10px] text-center text-[12.5px] font-semibold text-ppj-ink transition-colors hover:border-ppj-ink"
                >
                  Revoir le profil
                </Link>
                <button
                  type="button"
                  onClick={() => retirerParPrestataire(panier.lignes[0].prestataireId)}
                  className="shrink-0 rounded-[10px] border border-[#DDD8D1] bg-white px-3 py-[10px] text-[12.5px] text-[#6B6660] transition-colors hover:border-ppj-ink"
                >
                  Retirer
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 rounded-[18px] border border-ppj-line bg-white p-4">
              <span className="flex items-baseline">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#98938B]">Professionnels retenus</span>
                <span className="ml-auto text-[13px] font-semibold text-ppj-ink">{panier.lignes.length}</span>
              </span>
              {metiersRetenus.map((m) => (
                <div key={m.id} className="grid gap-[7px]">
                  <span className="text-[12px] font-semibold text-[#E21D1B]">{m.label}</span>
                  <div className="grid gap-[7px]">
                    {panier.lignes
                      .filter((l) => l.metier === m.id)
                      .map((l, i) => {
                        const c = champs(m.id);
                        return (
                          <div
                            key={`${l.prestataireId}-${i}`}
                            className="flex items-center gap-[9px] rounded-[11px] border border-[#EFEBE6] px-[10px] py-[8px]"
                          >
                            {l.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
                              <img src={l.photoUrl} alt={l.prenom} className="size-[30px] shrink-0 rounded-full object-cover" />
                            ) : (
                              <div
                                className="size-[30px] shrink-0 rounded-full"
                                style={{ backgroundImage: "repeating-linear-gradient(135deg, #F0ECE6 0 5px, #E4DFD7 5px 10px)" }}
                              />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13.5px] font-semibold text-ppj-ink">{l.prenom}</span>
                              <span className="mt-0.5 block text-[11.5px] text-[#6B6660]">
                                {l.tarifMontant} € / {l.tarifType === "horaire" ? "heure" : "jour"}
                                {l.certifications && l.certifications.length > 0 ? ` · ${l.certifications.join(" · ")}` : ""}
                                {c.heureDebut && c.heureFin ? ` · ${c.heureDebut} → ${c.heureFin}` : ""}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-[18px] border border-[#F8D3D1] bg-white p-4">
            <div className="mb-[10px] flex items-baseline gap-2">
              <p className="text-[13px] font-semibold text-[#8E2A26]">Avant l&apos;envoi</p>
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
                      multiMetiers ? "text-[12.5px]" : "text-[13px]",
                    )}
                  >
                    <Dot /> {m.label} <span className="font-normal text-[#98938B]">— {m.scope}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/*
            Récapitulatif "Total / selon devis" — présent UNIQUEMENT en mode
            1 prestataire dans la référence (dossier design, cadre "6a") :
            le cadre "6b" (plusieurs prestataires) passe directement de
            « Avant l'envoi » au bouton d'envoi, la liste des professionnels
            y occupant déjà tout l'espace disponible. Reproduction fidèle du
            cadre, pas un oubli.
          */}
          {!multiMetiers && seulMetier && (
            <div className="rounded-[18px] border border-[#E6E2DC] bg-[#F4F1EC] p-4">
              <div className="grid gap-2 text-[13px]">
                {metiersRetenus.map((m) => {
                  const nb = panier.lignes.filter((l) => l.metier === m.id).length;
                  const c = champs(m.id);
                  return (
                    <span key={m.id} className="flex items-center justify-between gap-3">
                      <span className="text-[#6B6660]">
                        {m.filiere} · {nb} pro{nb > 1 ? "s" : ""}
                        {c.heureDebut && c.heureFin ? ` · ${heuresDuree(c.heureDebut, c.heureFin)} h` : ""}
                      </span>
                      <span>selon devis</span>
                    </span>
                  );
                })}
                <span className="block h-px bg-[#E0DBD4]" />
                <span className="flex items-center justify-between gap-3 text-[13.5px] font-semibold text-ppj-ink">
                  <span>Total</span>
                  <span>au devis de chacun</span>
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-[1.55] text-[#6B6660]">
                Aucun paiement maintenant. Le montant n&apos;est bloqué qu&apos;après acceptation.
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Button
              className="min-h-[50px] w-full rounded-[13px] bg-primary text-[15px] font-semibold text-white hover:bg-[#B8130F]"
              disabled={!pretAEnvoyer || isPending}
              onClick={envoyer}
            >
              <Send className="size-4" />
              {isPending
                ? "Envoi..."
                : panier.lignes.length === 1
                  ? "Envoyer la proposition"
                  : `Envoyer aux ${panier.lignes.length} professionnels`}
            </Button>
            <p className={cn("text-center text-[#6B6660]", multiMetiers ? "text-[11.5px] leading-[1.5]" : "text-[12px]")}>
              {panier.lignes.length === 1
                ? `${panier.lignes[0].prenom} accepte ou décline dans la messagerie.`
                : "Chaque professionnel reçoit uniquement les informations de son métier, et vous renvoie son propre devis."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Champ de saisie principal — deux variantes exactes du dossier design
 * (cadres "6a"/"6b") selon l'état requis/manquant : bordure rouge 1.5px
 * sur fond blanc quand le champ est requis et vide, bordure neutre sur
 * fond #FCFBF9 sinon. Jamais une seule variante indifférenciée.
 */
function champClass(manquant: boolean) {
  return manquant
    ? "w-full rounded-[12px] border-[1.5px] border-primary bg-white px-[14px] py-[15px] text-[16px] text-ppj-ink placeholder:text-[#98938B] focus:outline-none"
    : "w-full rounded-[12px] border border-[#E6E2DC] bg-[#FCFBF9] px-[14px] py-[15px] text-[16px] text-ppj-ink placeholder:text-[#98938B] focus:outline-none";
}

function heuresDuree(debut: string, fin: string): number {
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  let minutes = h2 * 60 + m2 - (h1 * 60 + m1);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 10) / 10;
}

function inputHoraireClass(manquant: boolean) {
  return manquant
    ? "flex-1 rounded-[11px] border-[1.5px] border-primary bg-white px-3 py-[9px] text-[14px] text-ppj-ink focus:outline-none"
    : "flex-1 rounded-[11px] border border-[#E6E2DC] bg-[#FCFBF9] px-3 py-[10px] text-[14px] text-ppj-ink focus:outline-none";
}

/**
 * Onglet métier — dossier design, cadre "6b" : actif = fond #1A1917,
 * texte #FBFAF8, pastille 6px #FF8A85 ; inactif+incomplet = fond blanc,
 * bordure #E6E2DC, pastille 6px #E21D1B ; inactif+complet = même fond
 * blanc mais la pastille devient une coche 12px #2E7D4F (jamais un
 * simple changement de couleur de la pastille — c'est une forme
 * différente dans la référence). Le compteur (ex. "2") reste plus clair
 * que le libellé, jamais la même graisse.
 */
function Onglets({
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
  count?: number;
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
      {count !== undefined && <span className={cn("font-normal", actif ? "text-[#FBFAF8]/70" : "text-[#7A756D]")}>{count}</span>}
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

function ChampSaisie({
  label,
  description,
  reconnu,
  reconnuDetail,
  manquant,
  optionnel,
  children,
}: {
  label: string;
  /** Précision courte affichée à côté du libellé (ex. « — vu par tous les professionnels »), dossier design cadres "6a"/"6b" — jamais un badge générique quand la référence porte une phrase spécifique. */
  description?: string;
  reconnu?: boolean;
  reconnuDetail?: string;
  manquant?: boolean;
  optionnel?: boolean;
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
        {!manquant && reconnu && <Badge>{reconnuDetail ?? "reconnu"}</Badge>}
        {!manquant && !reconnu && optionnel && <span className="font-normal text-[#98938B]">(optionnel)</span>}
      </span>
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-ppj-red-border bg-ppj-red-bg px-2 py-[3px] text-[12px] text-ppj-red-text">{children}</span>
  );
}

function BadgeManquant({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-primary px-[7px] py-[3px] text-[10px] text-white">{children}</span>;
}

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Dot() {
  return <span className="block size-[4px] flex-none rounded-full bg-primary" style={{ transform: "translateY(-3px)" }} />;
}
