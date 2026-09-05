/**
 * Carte d'indicateur — dossier design §4. Libellé 11px/600, lettres
 * espacées 0.08em, majuscules, #6B6660. Valeur en Instrument Serif
 * 30px, jamais coupée (nowrap). Aide 12px #6B6660 en ellipsis.
 */
export function StatCard({
  label,
  valeur,
  aide,
}: {
  label: string;
  valeur: string | number;
  aide?: string;
}) {
  return (
    <div className="rounded-[14px] border border-[#EAE6E0] bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6660]">{label}</p>
      <p
        className="mt-1.5 whitespace-nowrap text-[30px] text-[#1A1917]"
        style={{ fontFamily: "var(--font-instrument-serif)" }}
      >
        {valeur}
      </p>
      {aide && <p className="mt-1 truncate text-[12px] text-[#6B6660]">{aide}</p>}
    </div>
  );
}
