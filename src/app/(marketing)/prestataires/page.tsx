import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, Send, ArrowLeft } from "lucide-react";
import { METIERS, type MetierId } from "@/config/metiers";
import { SPECIALTY_CATEGORIES } from "@/config/specialtyCategories";
import { JOURS_SEMAINE, type JourSemaine } from "@/config/jours-semaine";
import { rechercherPrestataires } from "@/lib/recherche";
import { recommanderPrestataires } from "@/lib/matching";
import { getProfessionnelsHistorique } from "@/lib/professionnels-habituels";
import { createClient } from "@/lib/supabase/server";
import { PrestataireResultCard } from "@/components/prestataire/prestataire-result-card";
import { RecommandationsBoard, type GroupeRecommandation } from "@/components/prestataire/recommandations-board";
import { ChoixParcours } from "@/components/prestataire/choix-parcours";
import { RechercheBar } from "@/components/prestataire/recherche-bar";
import { SectorCard } from "@/components/marketing/sector-card";
import { PanierSidebarCard } from "@/components/prestataire/panier-sidebar-card";
import { ProfessionnelHabituelCard } from "@/components/dashboard/professionnel-habituel-card";
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
  const jourParam = get("jour");
  const jour = (JOURS_SEMAINE as readonly string[]).includes(jourParam ?? "") ? (jourParam as JourSemaine) : undefined;
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
  const entreeBare = !metier && !ville && !q && !jour && !modeBesoin && !catalogueExplicite && !modeParam;
  if (entreeBare) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 lg:px-8 lg:py-14">
        <ChoixParcours />
      </div>
    );
  }

  // "publier" n'est plus une valeur valide ici — le parcours B vit sur
  // sa propre route dédiée, /publier-une-offre (jamais partagée avec
  // cette page de résultats de recherche, README §8/§11).
  const venuDuChoix = modeParam === "recherche";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // "Vos professionnels habituels" (colonne latérale, dossier design) —
  // uniquement pour un client déjà connecté avec un historique réel ;
  // rien à montrer à un visiteur anonyme ou sans mission passée.
  const habituels = user ? (await getProfessionnelsHistorique(user.id)).habituels : [];

  const { resultats, total, totalPages, enMissionIds, missionsTermineesParId, avisParId, metierActif } = await rechercherPrestataires({
    metier,
    ville,
    q,
    jour,
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
  const currentParams: Params = { metier, ville, q, jour };
  const filtresActifs = Boolean(metier || ville || q || jour);
  // Le catalogue (filtré ou complet) ne s'affiche que sur une action
  // volontaire — une recherche, un filtre, ou le lien "Voir tout le
  // catalogue" — jamais par défaut à l'arrivée sur la page.
  const afficherCatalogue = modeRecommandation || filtresActifs || catalogueExplicite;

  const filiereActive = metierActif ? METIERS.find((m) => m.id === metierActif)?.filiere : undefined;
  const sousTitreCatalogue = modeRecommandation
    ? "Vous préférez choisir vous-même ? Explorez tous les profils disponibles."
    : filiereActive || q
      ? `${total} professionnel${total !== 1 ? "s" : ""} correspondant${total !== 1 ? "s" : ""} à votre recherche`
      : `${total} professionnel${total !== 1 ? "s" : ""} vérifié${total !== 1 ? "s" : ""} en Île-de-France`;

  // Résultats groupés par métier — dossier design, "Résultats de
  // recherche" (isResultats) : chaque groupe rappelle le besoin
  // (issu du matching structuré s'il existe, sinon un simple compte).
  const groupesResultats = METIERS.map((m) => {
    const pros = resultats.filter((p) => p.metier === m.id);
    if (pros.length === 0) return null;
    const besoinGroupe = groupes.find((g) => g.metier === m.id);
    const need = besoinGroupe
      ? `${besoinGroupe.quantite} poste${besoinGroupe.quantite > 1 ? "s" : ""} recherché${besoinGroupe.quantite > 1 ? "s" : ""} · ${besoinGroupe.heureDebut} → ${besoinGroupe.heureFin}`
      : `${pros.length} professionnel${pros.length > 1 ? "s" : ""} disponible${pros.length > 1 ? "s" : ""}`;
    return { metier: m, pros, need };
  }).filter((g): g is { metier: (typeof METIERS)[number]; pros: typeof resultats; need: string } => g !== null);

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

      {/* A. Recherche — dossier design, "Résultats de recherche" (isResultats) :
          pas de gros titre ici, seulement la barre de recherche — le titre
          "De quoi avez-vous besoin ?" appartient à l'entrée nue (ChoixParcours),
          jamais répété une fois des résultats déjà affichés. */}
      <RechercheBar texteInitial={q} villeInitial={ville} />

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
        <div className="mt-10 border-t border-border pt-8">
          {/* Affiner — chips à ouverture native (dossier design : "Métier /
              Ville / Disponibilité / Certification" ; la certification est
              omise ici, voir point d'étape — aucun filtre de ce type
              n'existe encore côté recherche, contrairement à jour/ville/métier). */}
          <form method="get" className="flex flex-wrap items-center gap-2">
            {q && <input type="hidden" name="q" value={q} />}
            <span className="text-xs text-muted-foreground/70">Affiner</span>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-border bg-background px-3.5 py-2 text-[13px] text-foreground">
                {metier ? METIERS.find((m) => m.id === metier)?.filiere : "Métier"} <span aria-hidden>▾</span>
              </summary>
              <div className="absolute left-0 top-full z-20 mt-1.5 grid gap-1 rounded-xl border border-border bg-popover p-1.5 shadow-md">
                <Link href={buildHref(currentParams, { metier: undefined })} className={cn("rounded-lg px-3 py-1.5 text-sm hover:bg-secondary", !metier && "font-medium text-primary")}>
                  Tous
                </Link>
                {METIERS.map((m) => (
                  <Link key={m.id} href={buildHref(currentParams, { metier: m.id })} className={cn("rounded-lg px-3 py-1.5 text-sm hover:bg-secondary", metier === m.id && "font-medium text-primary")}>
                    {m.filiere}
                  </Link>
                ))}
              </div>
            </details>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-border bg-background px-3.5 py-2 text-[13px] text-foreground">
                {ville || "Ville"} <span aria-hidden>▾</span>
              </summary>
              <div className="absolute left-0 top-full z-20 mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-popover p-2 shadow-md">
                {metier && <input type="hidden" name="metier" value={metier} />}
                {jour && <input type="hidden" name="jour" value={jour} />}
                <input
                  name="ville"
                  defaultValue={ville ?? ""}
                  placeholder="Paris, Versailles..."
                  className="w-40 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none"
                />
                <Button type="submit" size="sm" className="rounded-lg">
                  Filtrer
                </Button>
              </div>
            </details>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-border bg-background px-3.5 py-2 text-[13px] text-foreground">
                {jour ? `Dispo. ${jour}` : "Disponibilité"} <span aria-hidden>▾</span>
              </summary>
              <div className="absolute left-0 top-full z-20 mt-1.5 grid grid-cols-4 gap-1 rounded-xl border border-border bg-popover p-1.5 shadow-md">
                <Link href={buildHref(currentParams, { jour: undefined })} className={cn("rounded-lg px-2.5 py-1.5 text-center text-sm hover:bg-secondary", !jour && "font-medium text-primary")}>
                  Tous
                </Link>
                {JOURS_SEMAINE.map((j) => (
                  <Link key={j} href={buildHref(currentParams, { jour: j })} className={cn("rounded-lg px-2.5 py-1.5 text-center text-sm hover:bg-secondary", jour === j && "font-medium text-primary")}>
                    {j}
                  </Link>
                ))}
              </div>
            </details>

            {filtresActifs && (
              <Link href={buildHref({}, {})} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Réinitialiser
              </Link>
            )}

            <Link
              href="/publier-une-offre"
              className="ml-auto flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              <Send className="size-3.5" />
              Publier une offre
            </Link>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">{sousTitreCatalogue}</p>

          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_296px]">
            <div className="min-w-0">
              {resultats.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
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
                  <div className="grid gap-7">
                    {groupesResultats.map(({ metier: m, pros, need }) => (
                      <div key={m.id}>
                        <div className="mb-3.5 flex flex-wrap items-center gap-3">
                          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-ppj-red-border bg-ppj-red-bg font-display-serif text-base text-primary">
                            {m.filiere.charAt(0)}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[17px] font-semibold text-ppj-ink">{m.filiere}</span>
                            <span className="mt-0.5 block text-[12.5px] text-ppj-text-3">{need}</span>
                          </span>
                        </div>
                        <div
                          className="grid items-stretch gap-4"
                          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))" }}
                        >
                          {pros.map((p) => (
                            <PrestataireResultCard
                              key={p.id}
                              prestataire={p}
                              enMission={enMissionIds.has(p.id)}
                              missionsTerminees={missionsTermineesParId.get(p.id) ?? 0}
                              avis={avisParId.get(p.id) ?? null}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
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

            <div className="grid gap-4">
              <PanierSidebarCard />
              {habituels.length > 0 && (
                <div className="rounded-[18px] border border-ppj-line bg-white p-5">
                  <h2 className="mb-1 text-[17px] font-semibold text-ppj-ink">Vos professionnels habituels</h2>
                  <p className="mb-3.5 text-[12.5px] text-ppj-text-4">Déjà employés sur vos missions.</p>
                  <div className="grid gap-2.5">
                    {habituels.slice(0, 3).map((h) => (
                      <ProfessionnelHabituelCard key={h.prestataireId} professionnel={h} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* D. État initial — le catalogue reste accessible, mais jamais affiché par défaut.
          Côté "Trouver", on remplit l'écran de vitrines par métier (données réelles,
          mêmes cartes premium que la page d'accueil) plutôt que de laisser la page vide. */}
      {!afficherCatalogue && !modeRecommandation && (
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
    </div>
  );
}
