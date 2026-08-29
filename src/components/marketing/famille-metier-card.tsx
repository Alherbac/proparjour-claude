import Link from "next/link";
import type { MetierId } from "@/config/metiers";

/**
 * Carte "Les métiers" de la landing — refonte Claude Istanbul 1,
 * §4.4. Distincte de <SectorCard/> (tuile pleine couleur, encore
 * utilisée par /prestataires) : fond clair, pastille + initiale
 * serif, liste de rôles, ligne de spécialités, lien rouge. Rôles et
 * spécialités repris mot pour mot de la maquette, jamais reformulés.
 */
export function FamilleMetierCard({
  metier,
  initiale,
  titre,
  roles,
  specs,
}: {
  metier: MetierId;
  initiale: string;
  titre: string;
  roles: readonly string[];
  specs: string;
}) {
  return (
    <Link
      href={`/prestataires?metier=${metier}`}
      className="group flex flex-col rounded-[20px] border border-ppj-line bg-ppj-field p-[26px] transition-[transform,border-color] duration-200 hover:-translate-y-[3px] hover:border-ppj-ink"
      style={{ transitionTimingFunction: "cubic-bezier(.2,.8,.2,1)" }}
    >
      <span
        className="flex size-[42px] items-center justify-center rounded-xl border border-ppj-red-border bg-white text-xl text-primary"
        style={{ fontFamily: "var(--font-display-serif)" }}
      >
        {initiale}
      </span>
      <h3 className="mb-3 mt-[18px] text-xl font-semibold tracking-[-0.01em] text-ppj-ink">{titre}</h3>
      <ul className="grid gap-[7px]">
        {roles.map((role) => (
          <li key={role} className="text-[14.5px] text-ppj-text-2">
            {role}
          </li>
        ))}
      </ul>
      <p className="mb-5 mt-5 border-t border-ppj-line pt-4 text-[13px] leading-[1.6] text-ppj-text-4">
        {specs}
      </p>
      <span className="mt-auto text-[14.5px] font-semibold text-primary">Rechercher dans cette famille</span>
    </Link>
  );
}
