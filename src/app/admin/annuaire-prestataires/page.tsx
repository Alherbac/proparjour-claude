import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { rechercherPrestataires } from "@/lib/recherche";
import { ResultatsPrestataires } from "@/components/prestataire/resultats-prestataires";
import { METIERS, type MetierId } from "@/config/metiers";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminInput } from "@/components/admin/ui/input";
import { AdminButton } from "@/components/admin/ui/button";
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
    <div className="space-y-4">
      <div>
        <AdminH1>Annuaire prestataires</AdminH1>
        <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
          {total} prestataire{total !== 1 ? "s" : ""} vérifié{total !== 1 ? "s" : ""} — vue de consultation,
          identique à la recherche recruteur.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildHref(currentParams, { metier: undefined })}
          className={cn(
            "rounded-[9px] border px-3 py-[7px] text-[12px] font-semibold transition-colors",
            !metier
              ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white"
              : "border-[var(--a-border-strong)] text-[var(--a-ink)] hover:border-[var(--a-accent)]/50",
          )}
          style={{ fontFamily: "var(--a-font-display)" }}
        >
          Tous les métiers
        </Link>
        {METIERS.map((m) => (
          <Link
            key={m.id}
            href={buildHref(currentParams, { metier: m.id })}
            className={cn(
              "rounded-[9px] border px-3 py-[7px] text-[12px] font-semibold transition-colors",
              metier === m.id
                ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white"
                : "border-[var(--a-border-strong)] text-[var(--a-ink)] hover:border-[var(--a-accent)]/50",
            )}
            style={{ fontFamily: "var(--a-font-display)" }}
          >
            {m.filiere}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        {metier && <input type="hidden" name="metier" value={metier} />}
        <AdminInput name="q" defaultValue={q ?? ""} placeholder="Mot-clé de spécialité..." className="w-auto" />
        <AdminInput name="ville" defaultValue={ville ?? ""} placeholder="Ville..." className="w-auto" />
        <AdminButton type="submit" variant="primary">
          Rechercher
        </AdminButton>
      </form>

      {resultats.length === 0 ? (
        <p className="text-[13px] text-[var(--a-text-3)]">Aucun prestataire ne correspond à ces critères.</p>
      ) : (
        <ResultatsPrestataires resultats={resultats} enMissionIds={[...enMissionIds]} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref(currentParams, { page: p === 1 ? undefined : String(p) })}
              className={cn(
                "flex size-9 items-center justify-center rounded-[9px] border text-[13px] font-semibold transition-colors",
                p === page
                  ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white"
                  : "border-[var(--a-border-strong)] text-[var(--a-ink)] hover:border-[var(--a-accent)]/50",
              )}
              style={{ fontFamily: "var(--a-font-display)" }}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
