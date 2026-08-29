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
      <h1 className="font-display-serif text-2xl text-foreground">Pilotage & Alertes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Centre de pilotage stratégique — classements, alertes et répartition géographique.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {PERIODES.map((p) => (
            <Link
              key={p.value}
              href={buildHref(p.value, String(seuilInactivite))}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                periode === p.value ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/40",
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>

        <form method="get" className="flex items-center gap-2 text-sm">
          {periode !== "30j" && <input type="hidden" name="periode" value={periode} />}
          <label htmlFor="seuilInactivite" className="text-muted-foreground">
            Seuil d&apos;inactivité (jours) :
          </label>
          <input
            id="seuilInactivite"
            name="seuilInactivite"
            type="number"
            min={1}
            defaultValue={seuilInactivite}
            className="w-20 rounded-lg border border-border bg-background px-2 py-1"
          />
          <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground">
            Appliquer
          </button>
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
