const TRUST_ITEMS = [
  "Agences événementielles",
  "Enseignes retail",
  "Sociétés de sécurité privée",
  "Organisateurs de salons",
  "Hôtels & restauration",
];

export function TrustBar() {
  return (
    <div className="border-t border-white/7 bg-ink-2">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-8 px-10 py-[26px] max-[900px]:justify-start max-[900px]:px-6">
        <span className="font-mono-landing text-[11.5px] uppercase tracking-[0.08em] whitespace-nowrap text-white/40">
          Utilisé par
        </span>
        <div className="flex flex-wrap gap-[38px]">
          {TRUST_ITEMS.map((item) => (
            <span key={item} className="font-display text-[14.5px] font-medium tracking-[0.01em] text-white/62">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
