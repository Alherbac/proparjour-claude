import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, SearchX, Send, ArrowLeft } from "lucide-react";
import { METIERS, type MetierId } from "@/config/metiers";
import { SPECIALTY_CATEGORIES } from "@/config/specialtyCategories";
import { rechercherPrestataires } from "@/lib/recherche";
import { recommanderPrestataires } from "@/lib/matching";
import { ResultatsPrestataires } from "@/components/prestataire/resultats-prestataires";
import { RecommandationsBoard, type GroupeRecommandation } from "@/components/prestataire/recommandations-board";
import { BesoinCapture } from "@/components/prestataire/besoin-capture";
import { ChoixParcours } from "@/components/prestataire/choix-parcours";
import { RechercheBar } from "@/components/prestataire/recherche-bar";
import { SectorCard } from "@/components/marketing/sector-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTEURS_TITRES: Record<MetierId, string> = {
  securite: "Sécurité & Protection",
  accueil: "Accueil & Réception",
  vente: "Commerce & Retail",
};

export const metadata: Metadata = {
  title: "Trouver un prestataire — ProParJour",
  description:
    "Dites-nous ce dont vous avez besoin, ProParJour vous aide à trouver les bons professionnels en Île-de-France.",
};

type Params = Record<string, string | undefined>;

function buildHref(current: Params, overrides: Params) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return `/prestataires${qs ? `?${qs}` : ""}`;
}

function metierValide(valeur: string | undefined): MetierId | null {
  return METIERS.some((m) => m.id === valeur) ? (valeur as MetierId) : null;
}

export default async function RecherchePrestatairesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const metierParam = get("metier");
  const metier = metierValide(metierParam) ?? undefined;
  const ville = get("ville");
  const q = get("q");
  const modeBesoin = get("besoin") === "1";
  const modeMulti = modeBesoin && get("multi") === "1";
  const dateBesoin = get("date");
  const heureDebutBesoin = get("heureDebut") || "09:00";
  const heureFinBesoin = get("heureFin") || "17:00";
  const quantiteBesoin = Number(get("quantite") ?? "1") || 1;
  const sousBesoinsParam = get("sousBesoins");
  const page = Number(get("page") ?? "1") || 1;

  const catalogueExplicite = get("catalogue") === "1";
  const modeParam = get("mode");

  // Entrée nue (aucun paramètre) : l'utilisateur n'a pas encore choisi
  // entre chercher lui-même ou publier un besoin — voir ChoixParcours.
  // Tout lien existant qui porte déjà un paramètre (métier, recherche,
  // catalogue, mode=...) continue tout droit vers le comportement
  // habituel, inchangé.
  const entreeBare = !metier && !ville && !q && !modeBesoin && !catalogueExplicite && !modeParam;
  if (entreeBare) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 lg:px-8 lg:py-14">
        <ChoixParcours />
      </div>
    );
  }

  const modePublier = modeParam === "publier";
  const venuDuChoix = modeParam === "recherche" || modeParam === "publier";

  const { resultats, total, totalPages, enMissionIds, missionsTermineesParId, avisParId, metierActif } = await rechercherPrestataires({
    metier,
    ville,
    q,
    page,
  });

  let groupes: GroupeRecommandation[] = [];

  if (modeMulti && sousBesoinsParam && ville && dateBesoin) {
    let sousBesoinsBruts: {
      metier?: string;
      quantite?: number;
      heureDebut?: string;
      heureFin?: string;
      contraintes?: { label: string; niveau: "requis" | "prefere" }[];
      contexte?: string | null;
    }[] = [];
    try {
      sousBesoinsBruts = JSON.parse(sousBesoinsParam);
    } catch {
      sousBesoinsBruts = [];
    }
    // Chaque sous-besoin peut porter son propre horaire (ex. sécurité
    // 18h→00h, accueil 18h→23h) — repli sur l'horaire global de la
    // demande pour les anciens liens qui n'en portaient pas encore.
    // Lot F — contraintes/contexte transmis tels quels (Lots B/C/D) :
    // le matching ne les exploite que si une donnée réelle du profil
    // permet de trancher, jamais inventés (voir lib/matching.ts).
    const sousBesoins = sousBesoinsBruts
      .map((sb) => ({
        metier: metierValide(sb.metier),
        quantite: Math.max(1, Number(sb.quantite) || 1),
        heureDebut: sb.heureDebut || heureDebutBesoin,
        heureFin: sb.heureFin || heureFinBesoin,
        contraintes: sb.contraintes ?? [],
        contexte: sb.contexte ?? null,
      }))
      .filter(
        (sb): sb is { metier: MetierId; quantite: number; heureDebut: string; heureFin: string; contraintes: { label: string; niveau: "requis" | "prefere" }[]; contexte: string | null } =>
          sb.metier !== null,
      );

    if (sousBesoins.length > 0) {
      const resultatsMatching = await Promise.all(
        sousBesoins.map((sb) =>
          recommanderPrestataires({
            metier: sb.metier,
            ville,
            date: dateBesoin,
            heureDebut: sb.heureDebut,
            heureFin: sb.heureFin,
            quantite: sb.quantite,
            contraintes: sb.contraintes,
            contexte: sb.contexte,
          }),
        ),
      );
      groupes = sousBesoins.map((sb, i) => ({
        metier: sb.metier,
        quantite: sb.quantite,
        heureDebut: sb.heureDebut,
        heureFin: sb.heureFin,
        contraintes: sb.contraintes,
        contexte: sb.contexte,
        resultat: resultatsMatching[i],
      }));
    }
  } else if (modeBesoin && metier && ville && dateBesoin) {
    const contraintesParam = get("contraintes");
    let contraintesBesoin: { label: string; niveau: "requis" | "prefere" }[] = [];
    if (contraintesParam) {
      try {
        contraintesBesoin = JSON.parse(contraintesParam);
      } catch {
        contraintesBesoin = [];
      }
    }
    const contexteBesoin = get("contexte") || null;
    const resultat = await recommanderPrestataires({
      metier,
      ville,
      date: dateBesoin,
      heureDebut: heureDebutBesoin,
      heureFin: heureFinBesoin,
      quantite: quantiteBesoin,
      contraintes: contraintesBesoin,
      contexte: contexteBesoin,
    });
    groupes = [
      {
        metier,
        quantite: quantiteBesoin,
        heureDebut: heureDebutBesoin,
        heureFin: heureFinBesoin,
        contraintes: contraintesBesoin,
        contexte: contexteBesoin,
        resultat,
      },
    ];
  }

  const modeRecommandation = groupes.length > 0;
  const currentParams: Params = { metier, ville, q };
  const filtresActifs = Boolean(metier || ville || q);
  // Le catalogue (filtré ou complet) ne s'affiche que sur une action
  // volontaire — une recherche, un filtre, ou le lien "Voir tout le
  // catalogue" — jamais par défaut à l'arrivée sur la page.
  const afficherCatalogue = modeRecommandation || filtresActifs || catalogueExplicite;

  const filiereActive = metierActif ? METIERS.find((m) => m.id === metierActif)?.filiere : undefined;
  const titreCatalogue = modeRecommandation
    ? "Explorer les professionnels"
    : filiereActive
      ? filiereActive
      : q
        ? `Résultats pour « ${q} »`
        : "Tous les professionnels";
  const sousTitreCatalogue = modeRecommandation
    ? "Vous préférez choisir vous-même ? Explorez tous les profils disponibles."
    : filiereActive || q
      ? `${total} professionnel${total !== 1 ? "s" : ""} correspondant${total !== 1 ? "s" : ""} à votre recherche`
      : `${total} professionnel${total !== 1 ? "s" : ""} vérifié${total !== 1 ? "s" : ""} en Île-de-France`;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 lg:px-8 lg:py-14">
      {venuDuChoix && (
        <Link
          href="/prestataires"
          className="mx-auto mb-4 flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Choisir autrement
        </Link>
      )}

      {/* A. Recherche — le point d'entrée unique, avant tout le reste */}
      <div className="mx-auto mb-3 max-w-2xl text-center">
        <h1
          className="text-ppj-ink"
          style={{ fontFamily: "var(--font-display-serif)", fontSize: "clamp(30px,3.4vw,44px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          {modePublier ? "Décrivez votre besoin en une phrase" : "De quoi avez-vous besoin aujourd’hui ?"}
        </h1>
        <p className="mt-2.5 text-[15.5px] text-ppj-text-3">
          {modePublier
            ? "ProParJour identifie les métiers concernés, prépare les offres et les envoie aux bons professionnels."
            : "Décrivez simplement votre besoin. Pas besoin de choisir un métier ou de remplir un formulaire."}
        </p>
      </div>

      {modePublier ? <BesoinCapture texteInitial={q} /> : <RechercheBar texteInitial={q} villeInitial={ville} />}

      {/* B. Meilleures recommandations (besoin structuré : Bloc 2 → matching Bloc 3) */}
      {modeRecommandation && ville && dateBesoin && (
        <RecommandationsBoard
          groupes={groupes}
          besoin={{ ville, date: dateBesoin }}
          enMissionIds={[...enMissionIds]}
        />
      )}

      {/* C. Résultats — masqués tant qu'aucune recherche/filtre n'est actif */}
      {afficherCatalogue && (
        <div className="mt-14 border-t border-border pt-10">
          <h2 className="font-heading text-xl font-semibold text-foreground">{titreCatalogue}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{sousTitreCatalogue}</p>

          {/* Filtres — secondaires, repliés derrière les résultats plutôt qu'au premier plan */}
          <details className="group mt-4" open={Boolean(metier || ville)}>
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              Affiner par métier ou ville
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={buildHref(currentParams, { metier: undefined })}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  !metier
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40",
                )}
              >
                Tous
              </Link>
              {METIERS.map((m) => (
                <Link
                  key={m.id}
                  href={buildHref(currentParams, { metier: m.id })}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    metier === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/40",
                  )}
                >
                  {m.filiere}
                </Link>
              ))}
            </div>

            <form method="get" className="mt-3 flex flex-wrap items-center gap-2">
              {metier && <input type="hidden" name="metier" value={metier} />}
              {q && <input type="hidden" name="q" value={q} />}
              <div className="flex items-center gap-2.5 rounded-full border border-border bg-background px-3.5 py-2">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <input
                  id="ville"
                  name="ville"
                  defaultValue={ville ?? ""}
                  placeholder="Paris, Versailles..."
                  className="w-40 min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" variant="outline" size="sm" className="rounded-full">
                Filtrer
              </Button>
              {filtresActifs && (
                <Link
                  href={buildHref({}, {})}
                  className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Réinitialiser
                </Link>
              )}
            </form>
          </details>

          <div className="mt-2 flex justify-end">
            <Link
              href="/tableau-de-bord/publier-mission"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              <Send className="size-3.5" />
              Publier une offre
            </Link>
          </div>

          {resultats.length === 0 ? (
            <div className="mt-16 flex flex-col items-center gap-3 py-10 text-center">
              <SearchX className="size-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                Aucun prestataire ne correspond à ces critères pour l&apos;instant.
              </p>
              {metierActif ? (
                <Link
                  href={buildHref({}, { metier: metierActif })}
                  className="text-sm font-medium text-primary underline underline-offset-2"
                >
                  Voir tous les profils {METIERS.find((m) => m.id === metierActif)?.filiere}
                </Link>
              ) : (
                <Link href="/prestataires?catalogue=1" className="text-sm font-medium text-primary underline underline-offset-2">
                  Voir tout le catalogue
                </Link>
              )}
            </div>
          ) : (
            <>
              <ResultatsPrestataires
                resultats={resultats}
                enMissionIds={[...enMissionIds]}
                missionsTerminees={[...missionsTermineesParId]}
                avis={[...avisParId]}
              />
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={buildHref(currentParams, { page: p === 1 ? undefined : String(p) })}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border text-sm transition-colors",
                        p === page
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-border text-foreground hover:border-primary/40",
                      )}
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* D. État initial — le catalogue reste accessible, mais jamais affiché par défaut.
          Côté "Trouver", on remplit l'écran de vitrines par métier (données réelles,
          mêmes cartes premium que la page d'accueil) plutôt que de laisser la page vide. */}
      {!afficherCatalogue && !modeRecommandation && !modePublier && (
        <div className="mx-auto mt-16 max-w-[1100px]">
          <p className="mb-5 text-center text-sm font-medium text-muted-foreground">Ou parcourez par métier</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {METIERS.map((m) => (
              <SectorCard
                key={m.id}
                metier={m.id}
                titre={SECTEURS_TITRES[m.id]}
                specialites={SPECIALTY_CATEGORIES[m.id].map((c) => c.label)}
              />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/prestataires?catalogue=1"
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Voir tout le catalogue
            </Link>
          </div>
        </div>
      )}
      {!afficherCatalogue && !modeRecommandation && modePublier && (
        <div className="mt-10 text-center">
          <Link
            href="/prestataires?catalogue=1"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Voir tout le catalogue
          </Link>
        </div>
      )}
    </div>
  );
}
