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
      <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] shadow-[0_24px_56px_-20px_rgba(10,15,28,0.28)]">
        {prestataire.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
          <img
            src={prestataire.photo_url}
            alt={`${prenom} ${nom}.`}
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-secondary to-line" />
        )}
        {prestataire.cnaps_verifie && (
          <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-emerald text-white shadow-[0_1px_4px_rgba(0,0,0,0.25)]">
            <BadgeCheck className="size-4" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="absolute inset-x-3 -bottom-4 rounded-2xl border border-line bg-background px-4 py-3 shadow-[var(--shadow-landing-md)]">
        <p className="truncate font-display text-[14.5px] font-bold leading-tight text-ink">
          {prenom} {nom}.
        </p>
        <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.03em] text-ink/45">{role}</p>
        <p className="mt-1 flex items-center gap-1 truncate text-[11.5px] text-ink/50">
          <MapPin className="size-3 shrink-0" />
          {prestataire.ville}
        </p>
      </div>
    </Link>
  );
}

export function HeroVisual({
  vedettes,
  prestatairesValides,
}: {
  vedettes: PrestataireVedette[];
  prestatairesValides: number;
}) {
  const [premiere, deuxieme] = vedettes;

  return (
    <div className="relative h-[440px] w-[420px] max-[1080px]:mx-auto max-[1080px]:h-[400px] max-[1080px]:w-full max-[1080px]:max-w-[380px]">
      {deuxieme && (
        <PhotoCard
          prestataire={deuxieme}
          className="right-0 top-4 z-[1] w-[168px] rotate-3 opacity-90"
        />
      )}
      {premiere && (
        <PhotoCard
          prestataire={premiere}
          className="left-0 top-14 z-[2] w-[236px] -rotate-2"
        />
      )}

      {premiere?.cnaps_verifie && (
        <div className="absolute -left-4 bottom-16 z-[3] flex items-center gap-2 rounded-2xl border border-line bg-background px-3.5 py-2.5 shadow-[var(--shadow-landing-md)] max-[1080px]:hidden">
          <BadgeCheck className="size-4 text-emerald" strokeWidth={2.5} />
          <span className="text-[12.5px] font-semibold text-ink">Carte CNAPS vérifiée</span>
        </div>
      )}

      <div className="absolute right-2 top-0 z-[3] rounded-2xl border border-line bg-background px-4 py-3 text-center shadow-[var(--shadow-landing-md)] max-[1080px]:hidden">
        <p className="font-display text-[22px] font-bold text-primary">{prestatairesValides}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-ink/45">prestataires vérifiés</p>
      </div>
    </div>
  );
}
