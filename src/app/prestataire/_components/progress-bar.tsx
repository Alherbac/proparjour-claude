/** Barre de progression — dossier design §5, "Complétion du profil" : 7px, remplie en #E21D1B. */
export function ProgressBar({ pourcentage }: { pourcentage: number }) {
  const clamp = Math.max(0, Math.min(100, pourcentage));
  return (
    <div className="h-[7px] w-full overflow-hidden rounded-[999px] bg-[#EFEBE6]">
      <div className="h-full rounded-[999px] bg-[#E21D1B]" style={{ width: `${clamp}%` }} />
    </div>
  );
}
