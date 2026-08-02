import { ShieldCheck, BadgeCheck, Sparkles } from "lucide-react";
import type { BadgeVerification } from "@/data/freelances-demo";
import { cn } from "@/lib/utils";

const BADGE_CONFIG: Record<
  BadgeVerification,
  { label: string; icon: typeof ShieldCheck }
> = {
  cnaps: { label: "CNAPS validé", icon: ShieldCheck },
  identite: { label: "Identité vérifiée", icon: BadgeCheck },
  premium: { label: "Profil premium", icon: Sparkles },
};

export function VerificationBadges({
  badges,
  className,
}: {
  badges: BadgeVerification[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {badges.map((badge) => {
        const { label, icon: Icon } = BADGE_CONFIG[badge];
        return (
          <span
            key={badge}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            <Icon className="size-3.5" />
            {label}
          </span>
        );
      })}
    </div>
  );
}
