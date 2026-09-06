import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  getClassementPrestataires,
  getClassementRecruteurs,
  getPrestatairesInactifs,
  getRepartitionGeographique,
  type PeriodeFiltre,
} from "@/lib/admin/pilotage";
import { PilotageScreen } from "@/components/admin/pilotage-screen";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminInput } from "@/components/admin/ui/input";
import { AdminButton } from "@/components/admin/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pilotage & Alertes — Admin ProParJour" };

const PERIODES: { value: PeriodeFiltre; label: string }[] = [
  { value: "7j", label: "7 jours" },
  { value: "30j", label: "30 jours" },
  { value: "90j", label: "90 jours" },
  { value: "tout", label: "Tout" },
];

function buildHref(periode: string, seuil: string) {
  const params = new URLSearchParams();
  if (periode !== "30j") params.set("periode", periode);
  if (seuil !== "30") params.set("seuilInactivite", seuil);
  const qs = params.toString();
  return `/admin/pilotage${qs ? `?${qs}` : ""}`;
}

export default async function AdminPilotagePage({
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

  const periode = (get("periode") as PeriodeFiltre) || "30j";
  const seuilInactivite = Number(get("seuilInactivite") ?? "30") || 30;

  const [classementPrestataires, classementRecruteurs, inactifs, repartition] = await Promise.all([
    getClassementPrestataires(periode),
    getClassementRecruteurs(periode),
    getPrestatairesInactifs(seuilInactivite),
    getRepartitionGeographique(),
  ]);

  return (
    <div>
      <AdminH1>Pilotage & Alertes</AdminH1>
      <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
        Centre de pilotage stratégique — classements, alertes et répartition géographique.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-1.5">
          {PERIODES.map((p) => (
            <Link
              key={p.value}
              href={buildHref(p.value, String(seuilInactivite))}
              className={cn(
                "rounded-[9px] border px-3 py-[7px] text-[12px] font-semibold transition-colors",
                periode === p.value
                  ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white"
                  : "border-[var(--a-border-strong)] text-[var(--a-ink)] hover:border-[var(--a-accent)]/50",
              )}
              style={{ fontFamily: "var(--a-font-display)" }}
            >
              {p.label}
            </Link>
          ))}
        </div>

        <form method="get" className="flex items-center gap-2 text-[13px]">
          {periode !== "30j" && <input type="hidden" name="periode" value={periode} />}
          <label htmlFor="seuilInactivite" className="text-[var(--a-text-2)]">
            Seuil d&apos;inactivité (jours) :
          </label>
          <AdminInput id="seuilInactivite" name="seuilInactivite" type="number" min={1} defaultValue={seuilInactivite} className="w-20" />
          <AdminButton type="submit" variant="primary" size="sm">
            Appliquer
          </AdminButton>
        </form>
      </div>

      <div className="mt-4">
        <PilotageScreen
          classementPrestataires={classementPrestataires}
          classementRecruteurs={classementRecruteurs}
          inactifs={inactifs}
          repartition={repartition}
        />
      </div>
    </div>
  );
}
