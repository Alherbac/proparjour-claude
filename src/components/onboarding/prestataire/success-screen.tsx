import Link from "next/link";

/**
 * Écran de fin — texte générique unique (voir PROMPT-INSCRIPTION.txt
 * §4 "ÉCRAN DE FIN"), qui remplace l'ancien message spécifique au
 * métier "sécurité" : le justificatif CNAPS n'est plus demandé à
 * l'inscription (voir "Mon compte" pour l'ajouter ensuite), donc plus
 * rien de metier-dépendant à annoncer ici.
 */
export function SuccessScreen() {
  return (
    <div className="grid gap-5 py-5 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full border border-[rgba(61,184,122,0.34)] bg-[rgba(61,184,122,0.13)] text-[24px] text-[#2A8355]">
        ✓
      </span>
      <div>
        <h2
          className="mb-2 text-[30px] tracking-[-0.015em] text-[#1A1917]"
          style={{ fontFamily: "var(--font-instrument-serif, Georgia, serif)" }}
        >
          Votre fiche est en ligne
        </h2>
        <p className="mx-auto max-w-[46ch] text-[14.5px] leading-[1.65] text-[#6B6660]">
          Nous vérifions vos pièces sous 48 heures ouvrées. En attendant, vous pouvez déjà consulter les missions et candidater.
        </p>
      </div>
      <Link
        href="/prestataire/opportunites"
        className="mx-auto inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#E21D1B] px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-[#B8130F]"
      >
        Voir les missions
      </Link>
    </div>
  );
}
