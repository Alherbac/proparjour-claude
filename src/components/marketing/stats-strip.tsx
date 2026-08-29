import { cn } from "@/lib/utils";

export function StatsStrip({ prestatairesValides }: { prestatairesValides: number }) {
  const stats = [
    { n: String(prestatairesValides), l: "Prestataires vérifiés CNAPS & documents à jour" },
    { n: "100%", l: "Contrats et factures générés automatiquement" },
    { n: "48h", l: "Délai d'annulation garanti avant mission" },
    { n: "5", l: "Départements couverts en Île-de-France" },
  ] as const;

  return (
    <div className="grid grid-cols-4 rounded-2xl border border-line bg-background max-[900px]:grid-cols-2">
      {stats.map((stat, index) => (
        <div
          key={stat.l}
          className={cn(
            "border-line px-6 py-6 text-center max-[900px]:px-4 max-[900px]:py-5",
            index === 0 ? "border-l-0" : "border-l",
            index === 2 && "max-[900px]:border-l-0",
            index >= 2 && "max-[900px]:border-t",
          )}
        >
          <div className="font-display text-[26px] font-bold text-primary">{stat.n}</div>
          <div className="mt-1.5 text-[12px] leading-[1.5] text-ink/50">{stat.l}</div>
        </div>
      ))}
    </div>
  );
}
