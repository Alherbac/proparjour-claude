import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { getMissionsAdmin, getStatistiquesMissionsAdmin } from "@/lib/admin/missions";
import { MissionsAdminScreen } from "@/components/admin/missions-admin-screen";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminKpiCard } from "@/components/admin/ui/kpi-card";
import { METIERS } from "@/config/metiers";
import type { MissionStatutType } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Missions — Admin ProParJour" };

const STATUTS: { value: MissionStatutType; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "confirmee", label: "Contractée" },
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

  const [{ missions, total, totalPages }, stats] = await Promise.all([
    getMissionsAdmin({
      statut,
      metier: METIERS.some((m) => m.id === metier) ? (metier as (typeof METIERS)[number]["id"]) : undefined,
      dateDebut,
      dateFin,
      client,
      prestataire,
      page,
    }),
    getStatistiquesMissionsAdmin(),
  ]);

  const currentParams: Params = { statut, metier, dateDebut, dateFin, client, prestataire };
  const exportDataset = "missions";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <AdminH1>Missions</AdminH1>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">{total} mission{total !== 1 ? "s" : ""}</p>
        </div>
        <a
          href={`/api/admin/export/${exportDataset}`}
          className="rounded-[9px] border border-[var(--a-border-strong)] px-4 py-[9px] text-[12.5px] font-semibold text-[var(--a-ink)] hover:bg-[var(--a-surface-2)]"
          style={{ fontFamily: "var(--a-font-display)" }}
        >
          Exporter
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminKpiCard label="En cours" valeur={String(stats.enCours)} aide={`dont ${stats.aArbitrer} à arbitrer`} />
        <AdminKpiCard label="Séquestre bloqué" valeur={`${stats.sequestreMontant.toLocaleString("fr-FR")} €`} aide={`sur ${stats.sequestreCount} mission${stats.sequestreCount > 1 ? "s" : ""}`} />
        <AdminKpiCard label="Litiges ouverts" valeur={String(stats.litigesCount)} aide={stats.litigeDelaiMoyenJours !== null ? `délai moyen ${stats.litigeDelaiMoyenJours} j` : "aucun litige"} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildHref(currentParams, { statut: undefined })}
          className={cn(
            "rounded-[9px] border px-3 py-[7px] text-[12px] font-semibold transition-colors",
            !statut ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white" : "border-[var(--a-border-strong)] text-[var(--a-ink)] hover:border-[var(--a-accent)]/50",
          )}
          style={{ fontFamily: "var(--a-font-display)" }}
        >
          Tous les statuts
        </Link>
        {STATUTS.map((s) => (
          <Link
            key={s.value}
            href={buildHref(currentParams, { statut: s.value })}
            className={cn(
              "rounded-[9px] border px-3 py-[7px] text-[12px] font-semibold transition-colors",
              statut === s.value ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white" : "border-[var(--a-border-strong)] text-[var(--a-ink)] hover:border-[var(--a-accent)]/50",
            )}
            style={{ fontFamily: "var(--a-font-display)" }}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        {statut && <input type="hidden" name="statut" value={statut} />}
        <select name="metier" defaultValue={metier ?? ""} className="h-[38px] rounded-[11px] border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-3 text-[13px]">
          <option value="">Tous les métiers</option>
          {METIERS.map((m) => (
            <option key={m.id} value={m.id}>{m.filiere}</option>
          ))}
        </select>
        <input type="date" name="dateDebut" defaultValue={dateDebut ?? ""} className="h-[38px] rounded-[11px] border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-3 text-[13px]" />
        <input type="date" name="dateFin" defaultValue={dateFin ?? ""} className="h-[38px] rounded-[11px] border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-3 text-[13px]" />
        <input name="client" defaultValue={client ?? ""} placeholder="Client..." className="h-[38px] rounded-[11px] border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-3 text-[13px]" />
        <input name="prestataire" defaultValue={prestataire ?? ""} placeholder="Prestataire..." className="h-[38px] rounded-[11px] border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-3 text-[13px]" />
        <button type="submit" className="h-[38px] rounded-[9px] px-4 text-[12.5px] font-semibold text-white" style={{ background: "var(--a-accent)", fontFamily: "var(--a-font-display)" }}>
          Filtrer par période
        </button>
      </form>

      {missions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--a-border-strong)] py-10 text-center text-[13px] text-[var(--a-text-3)]">
          Aucune mission ne correspond à ces critères.
        </p>
      ) : (
        <MissionsAdminScreen missions={missions} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref(currentParams, { page: p === 1 ? undefined : String(p) })}
              className={cn(
                "flex size-8 items-center justify-center rounded-[9px] border text-[12.5px] font-semibold",
                p === page ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white" : "border-[var(--a-border-strong)] text-[var(--a-ink)] hover:border-[var(--a-accent)]/50",
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
