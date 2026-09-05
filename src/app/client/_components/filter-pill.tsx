"use client";

/**
 * Pastille de filtre — dossier design §7. Active = fond #1A1917,
 * texte #FBFAF8. Inactive = fond blanc, bordure #DDD8D1. Doit
 * RÉELLEMENT filtrer la liste ; ne jamais l'utiliser en décoration.
 */
export function FilterPill({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[38px] rounded-[10px] px-[14px] py-[10px] text-[12.5px] font-semibold transition-colors ${
        actif ? "bg-[#1A1917] text-[#FBFAF8]" : "border border-[#DDD8D1] bg-white text-[#1A1917] hover:border-[#1A1917]"
      }`}
    >
      {children}
    </button>
  );
}
