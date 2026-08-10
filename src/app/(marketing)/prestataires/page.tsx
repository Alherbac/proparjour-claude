import type { Metadata } from "next";
import Link from "next/link";
import { Search, MapPin, SearchX, Send } from "lucide-react";
import { METIERS, type MetierId } from "@/config/metiers";
import { rechercherPrestataires } from "@/lib/recherche";
import { ResultatsPrestataires } from "@/components/prestataire/resultats-prestataires";
import { StickySearchShell } from "@/components/prestataire/sticky-search-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Trouver un prestataire — ProParJour",
  description:
    "Recherchez des prestataires vérifiés en Île-de-France par métier, ville, disponibilité et tarif.",
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
  const metier = METIERS.some((m) => m.id === metierParam)
    ? (metierParam as MetierId)
    : undefined;
  const ville = get("ville");
  const q = get("q");
  const page = Number(get("page") ?? "1") || 1;

  const { resultats, total, totalPages, enMissionIds } = await rechercherPrestataires({
    metier,
    ville,
    q,
    page,
  });

  const currentParams: Params = { metier, ville, q };
  const filtresActifs = Boolean(ville || q);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 lg:px-8 lg:py-14">
      <div className="mb-6 max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Trouver un prestataire
        </h1>
        <p className="mt-2 text-muted-foreground">
          {total} prestataire{total !== 1 ? "s" : ""} vérifié
          {total !== 1 ? "s" : ""} en Île-de-France.
        </p>
      </div>

      <StickySearchShell
          chips={
            <div className="flex flex-wrap gap-2 pb-3">
              <Link
                href={buildHref(currentParams, { metier: undefined })}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  !metier
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40",
                )}
              >
                Tous les métiers
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
          }
        >
          <div className="rounded-[28px] border border-border bg-secondary/30 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form
                method="get"
                className="flex flex-1 flex-col gap-2 rounded-full border border-border bg-background p-2 shadow-sm sm:flex-row sm:items-center"
              >
                {metier && <input type="hidden" name="metier" value={metier} />}

                <div className="flex flex-1 items-center gap-2.5 rounded-full px-3.5 py-2 sm:py-1.5">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="q"
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Un métier, une compétence (ex. SSIAP)..."
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="hidden h-6 w-px shrink-0 bg-border sm:block" />

                <div className="flex flex-1 items-center gap-2.5 rounded-full px-3.5 py-2 sm:py-1.5">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="ville"
                    name="ville"
                    defaultValue={ville ?? ""}
                    placeholder="Paris, Versailles..."
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <Button type="submit" className="shrink-0 rounded-full sm:ml-1">
                  Rechercher
                </Button>
              </form>

              <Link
                href="/tableau-de-bord/publier-mission"
                className="flex shrink-0 items-center justify-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary sm:justify-start"
              >
                <Send className="size-3.5" />
                Publier une offre
              </Link>
            </div>

            {filtresActifs && (
              <Link
                href={buildHref({}, { metier })}
                className="mt-3 inline-block text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Réinitialiser les filtres
              </Link>
            )}
          </div>
        </StickySearchShell>

      {resultats.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 py-10 text-center">
          <SearchX className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            Aucun prestataire ne correspond à ces critères pour l&apos;instant.
          </p>
        </div>
      ) : (
        <ResultatsPrestataires resultats={resultats} enMissionIds={[...enMissionIds]} />
      )}

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
    </div>
  );
}
