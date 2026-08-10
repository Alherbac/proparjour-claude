import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { getMissionsAdmin } from "@/lib/admin/missions";
import { MissionsAdminScreen } from "@/components/admin/missions-admin-screen";
import { METIERS } from "@/config/metiers";
import type { MissionStatutType } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Missions — Admin ProParJour" };

const STATUTS: { value: MissionStatutType; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "confirmee", label: "Confirmée" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
  { value: "litige", label: "Litige" },
  { value: "annulee", label: "Annulée" },
];

type Params = Record<string, string | undefined>;

function buildHref(current: Params, overrides: Params) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return `/admin/missions${qs ? `?${qs}` : ""}`;
}

export default async function AdminMissionsPage({
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

  const statut = get("statut") as MissionStatutType | undefined;
  const metier = get("metier");
  const dateDebut = get("dateDebut");
  const dateFin = get("dateFin");
  const client = get("client");
  const prestataire = get("prestataire");
  const page = Number(get("page") ?? "1") || 1;

  const { missions, total, totalPages } = await getMissionsAdmin({
    statut,
    metier: METIERS.some((m) => m.id === metier) ? (metier as (typeof METIERS)[number]["id"]) : undefined,
    dateDebut,
    dateFin,
    client,
    prestataire,
    page,
  });

  const currentParams: Params = { statut, metier, dateDebut, dateFin, client, prestataire };

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">Missions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {total} mission{total !== 1 ? "s" : ""}.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={buildHref(currentParams, { statut: undefined })}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            !statut ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/40",
          )}
        >
          Tous les statuts
        </Link>
        {STATUTS.map((s) => (
          <Link
            key={s.value}
            href={buildHref(currentParams, { statut: s.value })}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              statut === s.value ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/40",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <form method="get" className="mt-3 flex flex-wrap gap-2">
        {statut && <input type="hidden" name="statut" value={statut} />}
        <select name="metier" defaultValue={metier ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">Tous les métiers</option>
          {METIERS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.filiere}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="dateDebut"
          defaultValue={dateDebut ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="dateFin"
          defaultValue={dateFin ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="client"
          defaultValue={client ?? ""}
          placeholder="Client..."
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="prestataire"
          defaultValue={prestataire ?? ""}
          placeholder="Prestataire..."
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Filtrer
        </button>
      </form>

      <div className="mt-4">
        {missions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune mission ne correspond à ces critères.</p>
        ) : (
          <MissionsAdminScreen missions={missions} />
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref(currentParams, { page: p === 1 ? undefined : String(p) })}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border text-sm transition-colors",
                p === page ? "border-primary bg-primary/10 font-medium text-primary" : "border-border text-foreground hover:border-primary/40",
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
