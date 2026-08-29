const TRUST_ITEMS = [
  "Agences événementielles",
  "Enseignes retail",
  "Sociétés de sécurité privée",
  "Organisateurs de salons",
  "Hôtels & restauration",
];

export function TrustBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 border-t border-line py-6">
      <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink/40">Utilisé par</span>
      <div className="flex flex-wrap justify-center gap-x-9 gap-y-2">
        {TRUST_ITEMS.map((item) => (
          <span key={item} className="font-display text-[14px] font-semibold text-ink/55">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
