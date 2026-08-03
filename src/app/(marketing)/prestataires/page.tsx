import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { METIERS, type MetierId } from "@/config/metiers";
import { JOURS_SEMAINE } from "@/components/onboarding/prestataire/schema";
import { rechercherPrestataires } from "@/lib/recherche";
import { PrestataireResultCard } from "@/components/prestataire/prestataire-result-card";
import { FormField } from "@/components/onboarding/form-field";
import { Input } from "@/components/ui/input";
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
  const jour = get("jour");
  const q = get("q");
  const tarifMinRaw = get("tarifMin");
  const tarifMaxRaw = get("tarifMax");
  const page = Number(get("page") ?? "1") || 1;

  const { resultats, total, totalPages } = await rechercherPrestataires({
    metier,
    ville,
    jour,
    q,
    tarifMin: tarifMinRaw ? Number(tarifMinRaw) : undefined,
    tarifMax: tarifMaxRaw ? Number(tarifMaxRaw) : undefined,
    page,
  });

  const currentParams: Params = {
    metier,
    ville,
    jour,
    q,
    tarifMin: tarifMinRaw,
    tarifMax: tarifMaxRaw,
  };
  const filtresActifs = Boolean(ville || jour || q || tarifMinRaw || tarifMaxRaw);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
      <div className="max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Trouver un prestataire
        </h1>
        <p className="mt-2 text-muted-foreground">
          {total} prestataire{total !== 1 ? "s" : ""} vérifié
          {total !== 1 ? "s" : ""} en Île-de-France.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={buildHref(currentParams, { metier: undefined })}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            !metier
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-foreground hover:border-primary/40",
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
                : "border-border text-foreground hover:border-primary/40",
            )}
          >
            {m.filiere}
          </Link>
        ))}
      </div>

      <form
        method="get"
        className="mt-6 grid gap-3 rounded-2xl border border-border bg-secondary/30 p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {metier && <input type="hidden" name="metier" value={metier} />}

        <FormField label="Ville" htmlFor="ville">
          <Input id="ville" name="ville" defaultValue={ville ?? ""} placeholder="Paris, Versailles..." />
        </FormField>

        <FormField label="Jour" htmlFor="jour">
          <select
            id="jour"
            name="jour"
            defaultValue={jour ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">Tous</option>
            {JOURS_SEMAINE.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Tarif min (€)" htmlFor="tarifMin">
          <Input id="tarifMin" name="tarifMin" type="number" min={0} defaultValue={tarifMinRaw ?? ""} />
        </FormField>

        <FormField label="Tarif max (€)" htmlFor="tarifMax">
          <Input id="tarifMax" name="tarifMax" type="number" min={0} defaultValue={tarifMaxRaw ?? ""} />
        </FormField>

        <FormField label="Mot-clé (ex. SSIAP)" htmlFor="q">
          <Input id="q" name="q" defaultValue={q ?? ""} />
        </FormField>

        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-5">
          <Button type="submit" className="rounded-full">
            Rechercher
          </Button>
          {filtresActifs && (
            <Link
              href={buildHref({}, { metier })}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Réinitialiser les filtres
            </Link>
          )}
        </div>
      </form>

      {resultats.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 py-10 text-center">
          <SearchX className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            Aucun prestataire ne correspond à ces critères pour l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {resultats.map((prestataire) => (
            <PrestataireResultCard key={prestataire.id} prestataire={prestataire} />
          ))}
        </div>
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
