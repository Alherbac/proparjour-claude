import Link from "next/link";

/**
 * Panneau — dossier design §4. Radius 18px, bordure #EAE6E0, aucune
 * ombre. Lien "Tout voir →" optionnel quand la liste affichée n'est
 * qu'un extrait (§6.d) — sans lui un panneau partiel se lit comme
 * complet et contredit son propre compteur.
 */
export function Panel({
  titre,
  lienTout,
  children,
}: {
  titre: string;
  lienTout?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-[#1A1917]">{titre}</h2>
        {lienTout && (
          <Link href={lienTout} className="shrink-0 text-[12.5px] font-semibold text-[#E21D1B] hover:underline">
            Tout voir →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
