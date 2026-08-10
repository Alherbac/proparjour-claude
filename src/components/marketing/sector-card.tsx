import Link from "next/link";
import type { MetierId } from "@/config/metiers";
import { cn } from "@/lib/utils";

const TONE = {
  securite: "bg-[linear-gradient(155deg,#2A4C82,#16304F)]",
  accueil: "bg-[linear-gradient(155deg,#C6613E,#8C3E24)]",
  vente: "bg-[linear-gradient(155deg,#647530,#414C1F)]",
} satisfies Record<MetierId, string>;

const ICONS: Record<MetierId, React.ReactNode> = {
  securite: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v5c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V6l7-3z" stroke="#fff" strokeWidth="1.6" />
    </svg>
  ),
  accueil: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="10" r="2.4" stroke="#fff" strokeWidth="1.6" />
    </svg>
  ),
  vente: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8h16l-1.5 11a2 2 0 01-2 1.7H7.5a2 2 0 01-2-1.7L4 8z" stroke="#fff" strokeWidth="1.6" />
      <path d="M8 8V6a4 4 0 018 0v2" stroke="#fff" strokeWidth="1.6" />
    </svg>
  ),
};

export function SectorCard({
  metier,
  titre,
  specialites,
  className,
}: {
  metier: MetierId;
  titre: string;
  specialites: readonly string[];
  className?: string;
}) {
  return (
    <Link
      href={`/prestataires?metier=${metier}`}
      className={cn(
        "group flex min-h-[284px] flex-col justify-between rounded-[24px] px-7 pb-7 pt-8 text-white transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,0.84,0.44,1)] hover:-translate-y-[6px] hover:shadow-[var(--shadow-landing-lg)] motion-reduce:transition-none",
        TONE[metier],
        className,
      )}
    >
      <div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-white/14">
          {ICONS[metier]}
        </div>
        <h3 className="mb-3 mt-[18px] text-[21px] font-semibold">{titre}</h3>
        <ul className="text-[13.5px] leading-[2] text-white/75">
          {specialites.map((s) => (
            <li key={s} className="before:mr-1 before:opacity-50 before:content-['—']">
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-[22px] flex items-center justify-between text-[13px] font-semibold">
        <span>Voir les profils</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="transition-transform duration-[250ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] group-hover:translate-x-1 motion-reduce:transition-none"
        >
          <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="1.8" />
        </svg>
      </div>
    </Link>
  );
}
