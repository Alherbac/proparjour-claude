"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Minus, Plus, X } from "lucide-react";
import { VilleAutocompleteIdf } from "@/components/ville-autocomplete-idf";
import {
  extraireBesoin,
  extraireSousBesoins,
  sauvegarderBesoin,
  lireBesoin,
  effacerBesoin,
  type SousBesoin,
} from "@/lib/besoin";
import type { MetierId } from "@/config/metiers";
import { cn } from "@/lib/utils";

/**
 * Barre recherche/publication de la landing — refonte Claude Istanbul
 * 1, §5. Réutilise telles quelles les fonctions de lib/besoin.ts
 * (aucun second moteur de décomposition ici) et la persistance de
 * brouillon existante (sauvegarderBesoin/lireBesoin), partagée avec
 * BesoinCapture sur /publier-une-offre — un brouillon commencé ici est
 * retrouvé là-bas.
 *
 * Deux parcours strictement séparés (README §8/§11,
 * ÉCLAIRCISSEMENT-DEUX-PARCOURS.txt) : l'onglet "Rechercher un
 * professionnel" mène aux résultats de recherche (/prestataires,
 * parcours A) ; l'onglet "Publier mon besoin" mène uniquement à
 * /publier-une-offre (parcours B) — jamais l'inverse, et jamais les
 * deux depuis le même écran. Le CTA de l'étape "Voici ce que nous
 * avons compris", côté "Publier mon besoin", ne propose donc aucune
 * bascule vers un catalogue de prestataires.
 */

const FAMILLES = [
  { metier: "securite" as MetierId, label: "Sécurité & Protection", initiale: "S" },
  { metier: "accueil" as MetierId, label: "Accueil & Réception", initiale: "A" },
  { metier: "vente" as MetierId, label: "Commerce, Retail & Distribution", initiale: "C" },
];

const EXEMPLE =
  "Pour vendredi à Paris, j'ai besoin de 2 agents de sécurité de 18h à minuit et d'une hôtesse de 18h à 23h.";

type LigneComprise = {
  key: string;
  metier: MetierId;
  label: string;
  initiale: string;
  qty: number;
  jour: string | null;
  horaires: string | null;
  ville: string | null;
};

function detailFamille(f: (typeof FAMILLES)[number], ville: string, jour: string | null) {
  const bits: string[] = [];
  if (ville) bits.push(ville);
  if (jour) bits.push(jour);
  return bits.length ? bits.join(" — ") : "date et horaires à préciser";
}

export function HeroSearchBar() {
  const router = useRouter();
  const [tab, setTab] = useState<"recherche" | "publier">("recherche");
  const [query, setQuery] = useState("");
  const [ville, setVille] = useState("");
  const [besoin, setBesoin] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [searchResults, setSearchResults] = useState<{ metier: MetierId; label: string; initiale: string; detail: string }[] | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const [understood, setUnderstood] = useState<LigneComprise[] | null>(null);
  const uidRef = useRef(0);

  useEffect(() => {
    // Restauration après montage, jamais dans l'initialiseur de
    // useState : localStorage n'existe pas côté serveur, donc lire le
    // brouillon pendant le rendu (SSR ou prembattre client) produirait
    // un contenu différent de celui envoyé par le serveur — c'est
    // exactement le défaut d'hydratation déjà trouvé et documenté sur
    // BesoinCapture (Bloc 10). Les trois mises à jour ci-dessous ne se
    // déclenchent qu'une fois, uniquement si un brouillon existe.
    /* eslint-disable react-hooks/set-state-in-effect */
    const draft = lireBesoin();
    if (draft?.texte?.trim()) {
      setBesoin(draft.texte);
      setDraftRestored(true);
      setTab("publier");
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    // Déclenché par le bouton "Voir sur un exemple" de la section
    // Multi-métiers, plus bas sur la même page — relit le brouillon
    // qu'il vient d'enregistrer, sans recharger la page.
    function onExemple() {
      const d = lireBesoin();
      if (d?.texte) {
        setBesoin(d.texte);
        setDraftRestored(false);
        setTab("publier");
      }
    }
    window.addEventListener("proparjour:besoin-exemple", onExemple);

    // Déclenché par les deux boutons du CTA final (FinalCta) — bascule
    // simplement l'onglet actif, sans toucher au contenu des champs.
    function onSwitchTab(e: Event) {
      const detail = (e as CustomEvent<{ tab: "recherche" | "publier" }>).detail;
      if (detail?.tab) setTab(detail.tab);
    }
    window.addEventListener("proparjour:switch-tab", onSwitchTab);

    return () => {
      window.removeEventListener("proparjour:besoin-exemple", onExemple);
      window.removeEventListener("proparjour:switch-tab", onSwitchTab);
    };
  }, []);

  function onBesoinChange(v: string) {
    setBesoin(v);
    setDraftRestored(false);
    sauvegarderBesoin({ texte: v, metier: null, ville: null, quantite: null, date: null, heureDebut: null, heureFin: null });
  }

  function effacerBrouillon() {
    effacerBesoin();
    setBesoin("");
    setDraftRestored(false);
    setUnderstood(null);
  }

  function runSearch(e?: FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    // detecterMetier attend un texte déjà normalisé (accents/casse) —
    // extraireBesoin s'en charge en interne. L'appeler directement sur
    // la saisie brute faisait échouer la détection dès qu'un accent
    // apparaissait ("hôtesse" non reconnu).
    const extrait = extraireBesoin(query);
    const metier = extrait.metier;
    if (!metier) {
      setSearchResults(null);
      setNoMatch(true);
      return;
    }
    const famille = FAMILLES.find((f) => f.metier === metier)!;
    setSearchResults([{ metier, label: famille.label, initiale: famille.initiale, detail: detailFamille(famille, ville, extrait.date) }]);
    setNoMatch(false);
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") runSearch();
  }

  function runPublish() {
    if (!besoin.trim()) return;
    const decomposition = extraireSousBesoins(besoin);
    const source: SousBesoin[] =
      decomposition.length > 0
        ? decomposition
        : (() => {
            const extrait = extraireBesoin(besoin);
            return extrait.metier
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
                    dateIncertaine: extrait.dateIncertaine,
                    datesMultiples: null,
                  },
                ]
              : [];
          })();
    if (!source.length) {
      setUnderstood(null);
      setNoMatch(true);
      return;
    }
    const lignes: LigneComprise[] = source.map((s) => {
      const famille = FAMILLES.find((f) => f.metier === s.metier)!;
      return {
        key: `u${uidRef.current++}`,
        metier: s.metier,
        label: famille.label,
        initiale: famille.initiale,
        qty: s.quantite,
        jour: s.date,
        horaires: s.heureDebut ? `${s.heureDebut} → ${s.heureFin ?? "?"}` : null,
        ville: null,
      };
    });
    setUnderstood(lignes);
    setNoMatch(false);
  }

  function updateQty(key: string, delta: number) {
    setUnderstood((prev) => (prev ?? []).map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(30, l.qty + delta)) } : l)));
  }

  function removeLigne(key: string) {
    setUnderstood((prev) => {
      const next = (prev ?? []).filter((l) => l.key !== key);
      return next.length ? next : null;
    });
  }

  // Route dédiée du parcours B (README §8/§11) — jamais /prestataires,
  // qui n'héberge que les résultats de recherche du parcours A. Ce
  // bouton est le seul CTA du bloc "Voici ce que nous avons compris"
  // lorsqu'on vient de l'onglet "Publier mon besoin" : aucune bascule
  // vers un catalogue de prestataires n'est proposée ici.
  function allerVersPublication() {
    const params = new URLSearchParams({ q: besoin.trim() });
    router.push(`/publier-une-offre?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <div
        className="overflow-hidden rounded-[22px] border border-ppj-line bg-white"
        style={{ boxShadow: "0 24px 48px -32px rgba(26,25,23,0.34)" }}
      >
        <div className="flex border-b border-ppj-line-2 px-2">
          <button
            type="button"
            onClick={() => {
              setTab("recherche");
              setUnderstood(null);
              setNoMatch(false);
            }}
            className={cn(
              "relative px-4 py-[17px] pb-[15px] text-[14.5px] font-medium transition-colors",
              tab === "recherche" ? "text-ppj-ink" : "text-ppj-text-3 hover:text-ppj-ink",
            )}
          >
            Rechercher un professionnel
            {tab === "recherche" && (
              <span className="absolute inset-x-4 bottom-[-1px] h-0.5 rounded-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("publier");
              setSearchResults(null);
              setNoMatch(false);
            }}
            className={cn(
              "relative px-4 py-[17px] pb-[15px] text-[14.5px] font-medium transition-colors",
              tab === "publier" ? "text-ppj-ink" : "text-ppj-text-3 hover:text-ppj-ink",
            )}
          >
            Publier mon besoin
            {tab === "publier" && (
              <span className="absolute inset-x-4 bottom-[-1px] h-0.5 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {tab === "recherche" ? (
          <form onSubmit={runSearch} className="animate-[ppjUp_280ms_cubic-bezier(.2,.8,.2,1)_both] p-[18px]">
            <div className="flex flex-wrap items-stretch gap-2.5">
              <label className="flex min-w-0 flex-[2_1_220px] items-center gap-2.5 rounded-[14px] border border-ppj-line-field bg-ppj-field px-3.5 focus-within:border-primary">
                <Search className="size-4 shrink-0 text-ppj-text-4" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onSearchKey}
                  placeholder="Que recherchez-vous ? vendeuse, hôtesse, SSIAP…"
                  aria-label="Métier recherché"
                  className="min-w-0 flex-1 bg-transparent py-4 text-base text-ppj-ink outline-none placeholder:text-ppj-text-4"
                />
              </label>
              <div className="flex min-w-0 flex-[1_1_150px] items-center rounded-[14px] border border-ppj-line-field bg-ppj-field focus-within:border-primary">
                {/* VilleAutocompleteIdf porte déjà sa propre icône MapPin
                    interne (positionnée par rapport à son propre input) —
                    ne pas en ajouter une seconde par-dessus, ça superposait
                    les deux sur le texte. On garde son pl-9 d'origine pour
                    que le texte ne passe pas sous cette icône. */}
                <VilleAutocompleteIdf
                  value={ville}
                  onChange={setVille}
                  className="min-w-0 flex-1 [&_input]:h-auto [&_input]:border-0 [&_input]:bg-transparent [&_input]:py-4 [&_input]:pl-9 [&_input]:pr-3.5 [&_input]:text-base [&_input]:shadow-none [&_input]:outline-none [&_input]:focus-visible:ring-0 [&_svg]:text-ppj-text-4"
                />
              </div>
              <button
                type="submit"
                className="flex min-h-13 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-primary px-[26px] text-[15.5px] font-semibold text-white transition-[background-color,transform] hover:-translate-y-px hover:bg-[#B8130F]"
              >
                Rechercher
              </button>
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="mr-0.5 text-[12.5px] text-ppj-text-4">Essayez</span>
              {["vendeuse", "hôtesse", "agent de sécurité", "vigile", "Je cherche une vendeuse à Paris"].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setQuery(ex);
                    const metier = extraireBesoin(ex).metier;
                    if (metier) {
                      const famille = FAMILLES.find((f) => f.metier === metier)!;
                      setSearchResults([{ metier, label: famille.label, initiale: famille.initiale, detail: detailFamille(famille, ville, null) }]);
                      setNoMatch(false);
                    }
                  }}
                  className="rounded-full border border-ppj-line px-[13px] py-[7px] text-[13px] text-ppj-text-2 transition-colors hover:border-ppj-ink hover:text-ppj-ink"
                >
                  {ex}
                </button>
              ))}
            </div>
          </form>
        ) : (
          <div className="animate-[ppjUp_280ms_cubic-bezier(.2,.8,.2,1)_both] p-[18px]">
            {draftRestored && (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-ppj-red-border bg-ppj-red-bg px-3 py-2.5 text-[13px] text-ppj-red-text">
                <span>Votre brouillon a été restauré.</span>
                <button type="button" onClick={effacerBrouillon} className="font-semibold text-primary underline underline-offset-[3px]">
                  Effacer
                </button>
              </div>
            )}
            <textarea
              value={besoin}
              onChange={(e) => onBesoinChange(e.target.value)}
              placeholder="Décrivez simplement ce dont vous avez besoin…"
              rows={4}
              className="w-full resize-y rounded-[18px] border border-ppj-line-field bg-ppj-field p-4 text-base leading-[1.5] text-ppj-ink outline-none placeholder:text-ppj-text-4 focus:border-primary focus:bg-white"
            />
            <p className="mt-2.5 px-0.5 text-[13px] leading-[1.5] text-ppj-text-4">
              Par exemple : « {EXEMPLE} »
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runPublish}
                className="flex min-h-13 items-center justify-center gap-2 rounded-[14px] bg-primary px-[26px] text-[15.5px] font-semibold text-white transition-[background-color,transform] hover:-translate-y-px hover:bg-[#B8130F]"
              >
                Continuer
              </button>
              <button
                type="button"
                onClick={() => onBesoinChange(EXEMPLE)}
                className="text-[14px] text-ppj-text-2 underline underline-offset-[3px] hover:text-ppj-ink"
              >
                Utiliser l&apos;exemple
              </button>
            </div>
          </div>
        )}
      </div>

      {searchResults && searchResults.length > 0 && (
        <div className="animate-[ppjUp_320ms_cubic-bezier(.2,.8,.2,1)_both] mt-4 rounded-[18px] border border-ppj-line bg-white p-[18px]">
          <p className="mb-3.5 text-[12.5px] uppercase tracking-[0.1em] text-ppj-text-4">
            {searchResults.length > 1 ? "Familles de métiers identifiées" : "Famille de métiers identifiée"}
          </p>
          <div className="grid gap-2.5">
            {searchResults.map((r) => (
              <a
                key={r.metier}
                href={`/prestataires?metier=${r.metier}`}
                className="flex items-center gap-3.5 rounded-[14px] border border-ppj-line-2 p-3.5 transition-[border-color,transform] hover:-translate-y-px hover:border-ppj-ink"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-[11px] border border-ppj-red-border bg-ppj-red-bg text-[19px] text-primary"
                  style={{ fontFamily: "var(--font-display-serif)" }}
                >
                  {r.initiale}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-ppj-ink">{r.label}</span>
                  <span className="mt-0.5 block text-[13.5px] text-ppj-text-3">{r.detail}</span>
                </span>
                <span className="shrink-0 text-[13.5px] font-semibold text-primary">Voir les profils</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {noMatch && (
        <div className="animate-[ppjUp_320ms_cubic-bezier(.2,.8,.2,1)_both] mt-4 rounded-[18px] border border-ppj-line bg-white p-[18px]">
          <p className="mb-3 text-[15px] text-ppj-ink">Nous n&apos;avons pas reconnu ce métier. Choisissez une famille :</p>
          <div className="flex flex-wrap gap-2">
            {FAMILLES.map((f) => (
              <a
                key={f.metier}
                href={`/prestataires?metier=${f.metier}`}
                className="rounded-full border border-ppj-line bg-ppj-field px-3.5 py-2 text-[13.5px] text-ppj-ink transition-colors hover:border-primary"
              >
                {f.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {understood && understood.length > 0 && (
        <div className="animate-[ppjUp_320ms_cubic-bezier(.2,.8,.2,1)_both] mt-4 rounded-[18px] border border-ppj-line bg-white p-[18px]">
          <p className="mb-1 text-[25px] tracking-[-0.01em] text-ppj-ink" style={{ fontFamily: "var(--font-display-serif)" }}>
            Voici ce que nous avons compris
          </p>
          <p className="mb-4 text-[13.5px] text-ppj-text-3">Ajustez chaque ligne si besoin.</p>
          <div className="grid gap-3">
            {understood.map((l) => (
              <div key={l.key} className="flex flex-wrap items-start gap-3.5 rounded-[14px] border border-ppj-line-2 p-3.5">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-[11px] border border-ppj-red-border bg-ppj-red-bg text-[19px] text-primary"
                  style={{ fontFamily: "var(--font-display-serif)" }}
                >
                  {l.initiale}
                </span>
                <span className="min-w-0 flex-1 basis-40">
                  <span className="block text-base font-semibold text-ppj-ink">{l.label}</span>
                  <span className="mt-[3px] block text-[13.5px] text-ppj-text-3">
                    {[l.jour, l.horaires, l.ville].filter(Boolean).join(" · ") || "date et horaires à préciser"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(l.key, -1)}
                    aria-label="Retirer un professionnel"
                    className="flex size-8 items-center justify-center rounded-[9px] border border-ppj-line-field text-ppj-ink hover:border-ppj-ink"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="min-w-[74px] text-center text-sm tabular-nums">
                    {l.qty} {l.qty > 1 ? "pros" : "pro"}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(l.key, 1)}
                    aria-label="Ajouter un professionnel"
                    className="flex size-8 items-center justify-center rounded-[9px] border border-ppj-line-field text-ppj-ink hover:border-ppj-ink"
                  >
                    <Plus className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLigne(l.key)}
                    aria-label="Supprimer cette ligne"
                    className="flex size-8 items-center justify-center rounded-[9px] border border-ppj-line-field text-ppj-text-3 hover:border-primary hover:text-primary"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={allerVersPublication}
              className="flex min-h-12 items-center justify-center gap-2 rounded-[13px] bg-primary px-[22px] text-[15px] font-semibold text-white hover:bg-[#B8130F]"
            >
              Publier l&apos;offre et recevoir des candidatures
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setUnderstood(null)}
              className="text-[14px] text-ppj-text-2 underline underline-offset-[3px] hover:text-ppj-ink"
            >
              Modifier ma description
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
