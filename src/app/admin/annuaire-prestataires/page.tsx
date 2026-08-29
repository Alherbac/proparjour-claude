import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { rechercherPrestataires } from "@/lib/recherche";
import { ResultatsPrestataires } from "@/components/prestataire/resultats-prestataires";
import { METIERS, type MetierId } from "@/config/metiers";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Annuaire prestataires — Admin ProParJour" };

type Params = Record<string, string | undefined>;

function buildHref(current: Params, overrides: Params) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return `/admin/annuaire-prestataires${qs ? `?${qs}` : ""}`;
}

/**
 * Vue de consultation pour l'admin — mêmes données et le même
 * composant de résultats que la page publique de recherche
 * recruteur (voir src/app/(marketing)/prestataires/page.tsx), pour
 * ne pas dupliquer la logique de recherche/affichage.
 */
export default async function AdminAnnuairePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();

  const sp = await searchParams;
  const get = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const metierParam = get("metier");
  const metier = METIERS.some((m) => m.id === metierParam) ? (metierParam as MetierId) : undefined;
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

  return (
    <div>
      <h1 className="font-display-serif text-2xl text-foreground">Annuaire prestataires</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {total} prestataire{total !== 1 ? "s" : ""} vérifié{total !== 1 ? "s" : ""} — vue de consultation,
        identique à la recherche recruteur.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={buildHref(currentParams, { metier: undefined })}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
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
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              metier === m.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40",
            )}
          >
            {m.filiere}
          </Link>
        ))}
      </div>

      <form method="get" className="mt-3 flex flex-wrap gap-2">
        {metier && <input type="hidden" name="metier" value={metier} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Mot-clé de spécialité..."
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        />
        <input
          name="ville"
          defaultValue={ville ?? ""}
          placeholder="Ville..."
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Rechercher
        </button>
      </form>

      {resultats.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Aucun prestataire ne correspond à ces critères.</p>
      ) : (
        <ResultatsPrestataires resultats={resultats} enMissionIds={[...enMissionIds]} />
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
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
