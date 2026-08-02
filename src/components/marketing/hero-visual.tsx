import { ShieldCheck } from "lucide-react";
import { StarRating } from "@/components/prestataire/star-rating";
import { Badge } from "@/components/ui/badge";
import { ShowcaseRotator } from "@/components/marketing/showcase-rotator";
import { FREELANCES_DEMO } from "@/data/freelances-demo";
import { cn } from "@/lib/utils";

const AVATAR_STACK = FREELANCES_DEMO.slice(0, 4);
const CORNER_AVATAR = FREELANCES_DEMO[4];
const WIDGET_AVATAR = FREELANCES_DEMO[2];

function Avatar({
  freelance,
  className,
}: {
  freelance: (typeof FREELANCES_DEMO)[number];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br font-heading font-semibold text-foreground/70",
        freelance.gradient,
        className,
      )}
    >
      {freelance.prenom.charAt(0)}
    </span>
  );
}

export function HeroVisual() {
  return (
    <div className="relative mx-auto mt-16 h-[440px] w-full max-w-5xl sm:h-[480px] lg:h-[520px]">
      {/* Avatar isolé, statut en ligne */}
      <div className="absolute left-[4%] top-[6%] hidden sm:block">
        <div className="relative">
          <Avatar freelance={CORNER_AVATAR} className="size-16 text-xl shadow-lg" />
          <span className="absolute -right-0.5 -top-0.5 size-4 rounded-full border-2 border-cream bg-emerald-500" />
        </div>
      </div>

      {/* Widget "notez votre expérience" */}
      <div className="absolute left-[14%] top-[26%] rounded-2xl bg-background px-4 py-3 shadow-lg ring-1 ring-border sm:left-[17%] sm:top-0">
        <p className="text-xs font-medium text-foreground">
          Notez votre expérience
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="relative h-1.5 w-24 rounded-full bg-muted">
            <div className="h-full w-2/3 rounded-full bg-primary" />
            <span className="absolute left-2/3 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background" />
          </div>
          <Avatar freelance={WIDGET_AVATAR} className="size-7 text-[10px]" />
        </div>
      </div>

      {/* Mise en situation centrale */}
      <div className="absolute left-1/2 top-[8%] w-72 -translate-x-1/2 overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-border sm:left-[30%] sm:w-80 sm:translate-x-0">
        <ShowcaseRotator />
      </div>

      {/* Étiquette flottante avec un prénom */}
      <div className="absolute right-[2%] top-[22%] hidden rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg sm:block">
        {WIDGET_AVATAR.prenom}
      </div>

      {/* Cluster d'avatars + stat sociale */}
      <div className="absolute right-[4%] top-[6%] hidden flex-col items-end gap-2 sm:flex">
        <div className="flex -space-x-2.5">
          {AVATAR_STACK.map((freelance) => (
            <Avatar
              key={freelance.id}
              freelance={freelance}
              className="size-9 border-2 border-cream text-xs"
            />
          ))}
        </div>
        <p className="text-sm font-medium text-cream-foreground/80">
          <span className="font-heading font-semibold text-primary">+340</span>{" "}
          prestataires actifs
        </p>
      </div>

      {/* Fiche prestataire, coin bas-gauche */}
      <div className="absolute bottom-[6%] left-[2%] w-72 rounded-2xl bg-background p-4 shadow-xl ring-1 ring-border sm:bottom-0">
        <div className="flex items-center gap-1.5">
          <StarRating note={4.9} />
          <span className="text-xs font-medium text-muted-foreground">
            4.9 (89 missions)
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="gap-1 text-xs font-normal">
            <ShieldCheck className="size-3" />
            CNAPS validé
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal">
            Premium
          </Badge>
        </div>
        <p className="mt-2 font-semibold text-foreground">Sécurité</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-300/40 to-blue-100/20 text-[10px] font-semibold text-foreground/70">
            G
          </span>
          <span className="text-sm text-muted-foreground">Geoffroy</span>
        </div>
      </div>

      {/* Note moyenne, coin bas-droit */}
      <div className="absolute bottom-[6%] right-[3%] rounded-2xl bg-foreground px-5 py-4 text-background shadow-xl sm:bottom-0">
        <p className="text-xs text-background/70">Note moyenne</p>
        <p className="mt-0.5 text-2xl font-semibold">4.9</p>
        <StarRating note={4.9} className="mt-1" />
        <p className="mt-1 text-xs text-background/70">356 avis</p>
      </div>
    </div>
  );
}
