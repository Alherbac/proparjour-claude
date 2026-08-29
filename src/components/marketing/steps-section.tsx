/**
 * Refonte Claude Istanbul 1, §4.6 — 5 étapes (pas 4), fond blanc,
 * filet rouge en haut de chaque colonne. Copie reprise mot pour mot
 * de la maquette.
 */
const STEPS = [
  { n: "01", titre: "Décrivez votre besoin", texte: "Ou recherchez directement un métier précis." },
  { n: "02", titre: "Découvrez les bons professionnels", texte: "Des profils pertinents, pas un annuaire entier." },
  { n: "03", titre: "Proposez la mission", texte: "Effectif, horaires et lieu au clair." },
  { n: "04", titre: "Payez en toute sécurité", texte: "Le paiement est encadré par la plateforme." },
  { n: "05", titre: "La mission est réalisée", texte: "Documents et historique restent accessibles." },
] as const;

export function StepsSection() {
  return (
    <section id="fonctionnement" className="border-b border-ppj-line-2 bg-white" style={{ padding: "clamp(64px,8vw,112px) 0" }}>
      <div className="mx-auto max-w-[1240px] px-6">
        <h2
          className="mb-3 text-ppj-ink"
          style={{ fontFamily: "var(--font-display-serif)", fontSize: "clamp(32px,3.6vw,48px)", lineHeight: 1.04, letterSpacing: "-0.02em" }}
        >
          Pas besoin de passer des heures à comparer
        </h2>
        <p className="mb-[46px] max-w-[34em] text-[16.5px] text-ppj-text-3">Cinq étapes, du besoin à la mission réalisée.</p>
        <div
          className="grid border-t border-ppj-line"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(196px, 100%), 1fr))" }}
        >
          {STEPS.map((s) => (
            <div key={s.n} className="border-t-2 border-primary pt-[26px] pr-[22px] pb-[30px]" style={{ marginTop: "-1px" }}>
              <span className="block font-mono text-xs tracking-[0.08em] text-primary">{s.n}</span>
              <h3 className="mb-2 mt-3.5 text-[17.5px] font-semibold tracking-[-0.01em] text-ppj-ink">{s.titre}</h3>
              <p className="text-[14.5px] leading-[1.55] text-ppj-text-3">{s.texte}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
