import { MapPin, Briefcase, Zap, Smile, MousePointer2 } from "lucide-react";
import { StarRating } from "@/components/prestataire/star-rating";
import { ShowcaseRotator } from "@/components/marketing/showcase-rotator";
import { FREELANCES_DEMO } from "@/data/freelances-demo";
import { cn } from "@/lib/utils";

const AVATAR_STACK = FREELANCES_DEMO.slice(0, 4);
const CORNER_AVATAR = FREELANCES_DEMO[4];
const TAG_AVATAR = FREELANCES_DEMO[2];

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

function ProfileCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-indigo-50 p-6 shadow-md dark:bg-indigo-500/10",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <StarRating note={4.9} />
          <span className="text-sm text-foreground/70">
            4.9<span className="text-muted-foreground">(89 missions)</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-background px-3 py-1 text-[13px] font-medium text-violet-600 dark:border-violet-400/40 dark:text-violet-300">
            <MapPin className="size-3.5" />
            Île-de-France
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-background px-3 py-1 text-[13px] font-medium text-orange-600 dark:border-orange-400/40 dark:text-orange-300">
            <Briefcase className="size-3.5" />
            Vérifié CNAPS
          </span>
        </div>
      </div>

      <p className="mt-5 text-xl font-bold text-foreground">
        Geoffroy · Sécurité privée
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-300/40 to-blue-100/20 font-heading text-sm font-semibold text-foreground/70">
            G
          </span>
          <span className="text-[15px] font-semibold text-foreground">
            Geoffroy
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-[13px] font-semibold text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
          <Zap className="size-3.5 fill-current" />
          PRO
        </span>
      </div>
    </div>
  );
}

function RatingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-foreground px-6 py-6 text-background shadow-md",
        className,
      )}
    >
      <p className="text-sm text-background/60">Note moyenne</p>
      <p className="mt-1 text-4xl font-bold">4.9</p>
      <StarRating note={4.9} size="md" className="mt-2" />
      <p className="mt-2 text-sm text-background/60">356 avis</p>
    </div>
  );
}

export function HeroVisual() {
  return (
    <div className="relative mx-auto mt-8 w-full max-w-5xl sm:mt-10">
      {/* Mobile : version simplifiée empilée */}
      <div className="mx-auto flex max-w-md flex-col gap-4 sm:hidden">
        <div className="overflow-hidden rounded-3xl bg-background shadow-xl ring-1 ring-border">
          <ShowcaseRotator />
        </div>
        <ProfileCard />
        <RatingCard className="w-52" />
      </div>

      {/* Desktop : cluster compact aligné en grille */}
      <div className="mx-auto hidden sm:grid sm:w-fit sm:grid-cols-[19rem_28rem_12rem] sm:items-stretch sm:gap-x-4 sm:gap-y-8">
        {/* 1 + 2. Avatar isolé + carte "Notez votre expérience" */}
        <div className="relative z-10 col-start-1 row-start-1 flex items-start gap-3 self-start sm:-mr-6">
          <div className="relative mt-2 shrink-0 rounded-full bg-amber-300 p-2.5 shadow-md dark:bg-amber-400/90">
            <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-300 to-orange-200 font-heading text-2xl font-semibold text-foreground/70">
              {CORNER_AVATAR.prenom.charAt(0)}
            </span>
            <span className="absolute right-1 top-1 size-4 rounded-full border-2 border-amber-300 bg-emerald-500 dark:border-amber-400/90" />
          </div>
          <div className="mt-2 w-52 rounded-2xl bg-background p-4 shadow-md ring-1 ring-border">
            <p className="text-sm text-foreground/80">Notez votre expérience</p>
            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="relative h-[3px] w-24 rounded-full bg-muted-foreground/25">
                <div className="absolute inset-y-0 left-0 w-[57%] rounded-full bg-foreground/70" />
                <span className="absolute left-[57%] top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-violet-500 bg-background" />
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-500 dark:bg-violet-500/20 dark:text-violet-300">
                <Smile className="size-4" />
              </span>
            </div>
          </div>
        </div>

        {/* 3. Mise en situation centrale — occupe les deux lignes, hauteur pilotée par la grille */}
        <div className="relative col-start-2 row-span-2 row-start-1 overflow-hidden rounded-3xl bg-background shadow-xl ring-1 ring-border">
          <ShowcaseRotator />
        </div>

        {/* 5. Groupe d'avatars + étiquette flottante */}
        <div className="relative z-10 col-start-3 row-start-1 flex flex-col items-end gap-2.5 self-start sm:-ml-6">
          <div className="flex -space-x-3">
            {AVATAR_STACK.map((freelance) => (
              <Avatar
                key={freelance.id}
                freelance={freelance}
                className="size-11 border-2 border-cream text-sm"
              />
            ))}
          </div>
          <p className="text-sm text-cream-foreground/80">
            <span className="font-heading font-semibold text-primary">+340</span>{" "}
            prestataires actifs
          </p>
          <div className="mt-1 flex flex-col items-end gap-1">
            <MousePointer2 className="size-4 fill-foreground text-foreground" />
            <div className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-md">
              {TAG_AVATAR.prenom}
            </div>
          </div>
        </div>

        {/* 4. Fiche prestataire */}
        <ProfileCard className="col-start-1 row-start-2 w-full self-end" />

        {/* 6. Carte "Note moyenne" */}
        <RatingCard className="col-start-3 row-start-2 w-full self-end" />
      </div>
    </div>
  );
}
