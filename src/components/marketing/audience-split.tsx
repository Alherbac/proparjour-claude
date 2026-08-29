import Link from "next/link";

/**
 * Refonte Claude Istanbul 1, §4.8 — « Vous êtes professionnel ? ».
 * Une seule carte blanche à deux colonnes (pas de split symétrique
 * recruteur/prestataire dans la maquette : ce bloc s'adresse
 * uniquement aux prestataires, le recrutement se fait via la barre
 * recherche/publication plus haut). `id="professionnels"` correspond
 * à l'ancre du header.
 */
export function AudienceSplit() {
  return (
    <section id="professionnels" style={{ padding: "clamp(56px,7vw,96px) 0" }}>
      <div className="mx-auto max-w-[1240px] px-6">
        <div
          className="grid overflow-hidden rounded-[26px] border border-ppj-line bg-white"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}
        >
          <div style={{ padding: "clamp(32px,4vw,56px)" }}>
            <p className="mb-3.5 font-mono text-xs uppercase tracking-[0.12em] text-primary">Professionnels</p>
            <h2
              className="mb-4 text-ppj-ink"
              style={{ fontFamily: "var(--font-display-serif)", fontSize: "clamp(30px,3.2vw,42px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
            >
              Vous êtes professionnel ?
            </h2>
            <p className="mb-[26px] max-w-[28em] text-[16.5px] leading-[1.6] text-ppj-text-3" style={{ textWrap: "pretty" }}>
              Développez votre activité en recevant des missions qui correspondent à votre profil, vos
              qualifications et vos disponibilités.
            </p>
            <Link
              href="/inscription/prestataire"
              className="inline-flex min-h-[50px] items-center rounded-[13px] bg-ppj-ink px-6 text-[15px] font-semibold text-ppj-paper transition-colors hover:bg-primary hover:text-white"
            >
              Créer mon profil
            </Link>
          </div>
          <div
            className="grid place-items-center"
            style={{ minHeight: 260, backgroundImage: "repeating-linear-gradient(135deg, #F0ECE6 0 11px, #E8E3DC 11px 22px)" }}
          />
        </div>
      </div>
    </section>
  );
}
