import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { METIERS } from "@/config/metiers";
import type { PrestataireVedette } from "@/lib/plateforme-stats";
import { cn } from "@/lib/utils";

function PhotoCard({
  prestataire,
  className,
}: {
  prestataire: PrestataireVedette;
  className: string;
}) {
  const metier = METIERS.find((m) => m.id === prestataire.metier);
  const prenom = prestataire.prenom ?? "";
  const nom = prestataire.nom?.charAt(0) ?? "";
  const role = prestataire.titre || metier?.label || "";

  return (
    <Link
      href={`/prestataires/${prestataire.id}`}
      className={cn(
        "group absolute outline-none transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1",
        className,
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-[var(--shadow-landing-card)]">
        {prestataire.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
          <img
            src={prestataire.photo_url}
            alt={`${prenom} ${nom}.`}
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        )}
        <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-emerald text-white shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
          <BadgeCheck className="size-3.5" strokeWidth={2.5} />
        </span>
      </div>
      <div className="absolute inset-x-[-10px] -bottom-4 rounded-xl bg-paper px-3 py-2.5 shadow-[var(--shadow-landing-lg)]">
        <p className="truncate font-display text-[14px] font-semibold leading-tight text-ink">
          {prenom} {nom}.
        </p>
        <p className="mt-1 truncate font-mono-landing text-[10px] uppercase tracking-[0.04em] text-muted-2">
          {role}
        </p>
        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-2">
          <MapPin className="size-3 shrink-0" />
          {prestataire.ville}
        </p>
      </div>
    </Link>
  );
}

export function HeroVisual({ vedettes }: { vedettes: PrestataireVedette[] }) {
  const [premiere, deuxieme] = vedettes;

  return (
    <div className="relative h-[520px] w-[480px] max-[1080px]:mx-auto max-[1080px]:h-[480px] max-[1080px]:w-full max-[1080px]:max-w-[440px]">
      {premiere && (
        <PhotoCard
          prestataire={premiere}
          className="left-[4%] top-2 z-[2] w-[232px] -rotate-4"
        />
      )}
      {deuxieme && (
        <PhotoCard
          prestataire={deuxieme}
          className="left-[46%] top-[176px] z-[3] w-[208px] rotate-3"
        />
      )}
    </div>
  );
}
