/**
 * Refonte Claude Istanbul 1, §4.7 — section Confiance. Deux colonnes ;
 * à droite une grille à filets 1px (gap sur fond ppj-line) de cartes
 * blanches. Les sept intitulés/textes sont repris mot pour mot de la
 * maquette (tableau `trust` du prototype).
 */
const TRUST = [
  { titre: "Des professionnels vérifiés", texte: "Identité et qualifications contrôlées avant l'accès aux missions." },
  { titre: "Paiement sécurisé", texte: "Le règlement passe par la plateforme, jamais de la main à la main." },
  { titre: "Missions encadrées", texte: "Horaires, lieu et effectif formalisés pour les deux parties." },
  { titre: "Documents disponibles", texte: "Attestations et pièces accessibles depuis votre espace." },
  { titre: "Historique et expériences", texte: "Les missions passées restent consultables sur chaque profil." },
  { titre: "Avis clients réels", texte: "Publiés uniquement par les clients ayant réellement travaillé avec le profil." },
  { titre: "Compatibilité calculée", texte: "Métier, date, horaires et zone : chaque critère est vérifié, aucun score arbitraire." },
] as const;

export function VerifyBand() {
  return (
    <section className="bg-white" style={{ padding: "clamp(64px,8vw,112px) 0" }}>
      <div
        className="mx-auto grid max-w-[1240px] items-center gap-[clamp(32px,4vw,56px)] px-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}
      >
        <div>
          <h2
            className="mb-4 text-ppj-ink"
            style={{ fontFamily: "var(--font-display-serif)", fontSize: "clamp(32px,3.6vw,48px)", lineHeight: 1.04, letterSpacing: "-0.02em" }}
          >
            Une mission encadrée, de bout en bout
          </h2>
          <p className="max-w-[30em] text-[16.5px] leading-[1.6] text-ppj-text-3" style={{ textWrap: "pretty" }}>
            Ce qui compte pour vous n&apos;est pas la technologie, c&apos;est que la personne soit là, qualifiée, et
            que tout soit en règle.
          </p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-[20px] border border-ppj-line bg-ppj-line">
          {TRUST.map((t) => (
            <div key={t.titre} className="flex items-baseline gap-3.5 bg-white p-5">
              <span className="mt-[-3px] block size-[5px] shrink-0 rounded-full bg-primary" />
              <span className="min-w-0">
                <span className="block text-base font-semibold text-ppj-ink">{t.titre}</span>
                <span className="mt-[3px] block text-[14.5px] text-ppj-text-3">{t.texte}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
