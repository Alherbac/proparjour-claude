"use client";

export type TempsNav = {
  n: 1 | 2 | 3;
  title: string;
  sub: string;
  manquants: number;
};

/**
 * Les trois cartes de temps, affichées en permanence et cliquables
 * dans les deux sens (voir PROMPT-INSCRIPTION.txt §2) — la saisie
 * n'est jamais perdue en changeant de temps, seul l'index affiché
 * change (voir wizard.tsx).
 */
export function ActsNav({
  temps,
  current,
  onGo,
}: {
  temps: TempsNav[];
  current: number;
  onGo: (n: number) => void;
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {temps.map((t) => {
        const done = t.manquants === 0;
        const active = t.n === current;
        const bg = active ? "bg-white" : done ? "bg-[rgba(61,184,122,0.06)]" : "bg-white";
        const rim = active ? "border-[#E21D1B]" : done ? "border-[rgba(61,184,122,0.34)]" : "border-[#EAE6E0]";
        const dotBg = done ? "bg-[#3DB87A]" : active ? "bg-[#E21D1B]" : "bg-[#F0EDE8]";
        const dotFg = done || active ? "text-white" : "text-[#98938B]";
        const countFg = done ? "text-[#2A8355]" : "text-[#98938B]";

        return (
          <button
            key={t.n}
            type="button"
            onClick={() => onGo(t.n)}
            className={`min-w-0 rounded-[15px] border ${rim} ${bg} px-4 py-[15px] text-left transition-colors`}
          >
            <span className="flex items-center gap-2.5">
              <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${dotBg} ${dotFg}`}>
                {done ? "✓" : t.n}
              </span>
              <span className="min-w-0 truncate text-[14.5px] font-bold text-[#1A1917]">{t.title}</span>
              <span className={`ml-auto shrink-0 whitespace-nowrap text-[11.5px] font-semibold ${countFg}`}>
                {done ? "complet" : `${t.manquants} à remplir`}
              </span>
            </span>
            <span className="mt-1.5 block text-[12.5px] leading-[1.5] text-[#6B6660]">{t.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
