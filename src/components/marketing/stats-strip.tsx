import { cn } from "@/lib/utils";

export function StatsStrip({ prestatairesValides }: { prestatairesValides: number }) {
  const stats = [
    { n: String(prestatairesValides), l: "Prestataires vérifiés CNAPS & documents à jour" },
    { n: "100%", l: "Contrats et factures générés automatiquement" },
    { n: "48h", l: "Délai d'annulation garanti avant mission" },
    { n: "5", l: "Départements couverts en Île-de-France" },
  ] as const;

  return (
    <div className="border-t border-white/8 bg-ink">
      <div className="mx-auto grid max-w-[1200px] grid-cols-4 max-[900px]:grid-cols-2">
        {stats.map((stat, index) => (
          <div
            key={stat.l}
            className={cn(
              "border-white/9 px-8 py-[38px] max-[900px]:px-5 max-[900px]:py-7",
              index === 0 ? "border-l-0 pl-0" : "border-l",
              index === 2 && "max-[900px]:border-l-0",
            )}
          >
            <div className="font-display text-[30px] font-bold text-gold">{stat.n}</div>
            <div className="mt-1.5 text-[12.5px] leading-[1.5] text-white/50">{stat.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
