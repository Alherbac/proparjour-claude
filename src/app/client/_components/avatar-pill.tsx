/** Pastille-avatar — dossier design §4, "Missions en cours" : rond 20px + prénom, fond #F6F4F0. */
export function AvatarPill({ prenom }: { prenom: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F4F0] py-[3px] pl-[3px] pr-2.5 text-[12px] font-medium text-[#1A1917]">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#E21D1B] text-[9.5px] font-bold text-white">
        {prenom.charAt(0).toUpperCase()}
      </span>
      {prenom}
    </span>
  );
}
