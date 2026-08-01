import { ShieldCheck, Star } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-4/5 w-full max-w-md">
      <div className="h-full w-full overflow-hidden rounded-3xl bg-gradient-to-br from-primary/25 via-cream to-primary/10 shadow-xl ring-1 ring-border" />

      <div className="absolute -left-4 top-8 flex items-center gap-2 rounded-2xl bg-background px-4 py-3 shadow-lg ring-1 ring-border sm:-left-8">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">
            Qualité Premium
          </p>
          <p className="text-xs text-muted-foreground">Service vérifié</p>
        </div>
      </div>

      <div className="absolute -right-2 top-1/3 flex items-center gap-1.5 rounded-2xl bg-background px-3.5 py-2 shadow-lg ring-1 ring-border sm:-right-6">
        <Star className="size-4 fill-primary text-primary" />
        <span className="text-sm font-semibold text-foreground">5.0</span>
      </div>

      <div className="absolute -bottom-6 left-1/2 w-[85%] -translate-x-1/2 rounded-2xl bg-background px-4 py-3 shadow-lg ring-1 ring-border">
        <p className="mb-2 text-xs font-semibold text-foreground">
          Prestataires vérifiés
        </p>
        <div className="flex -space-x-2">
          {["A", "M", "S", "L"].map((initial) => (
            <span
              key={initial}
              className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary/15 text-xs font-semibold text-primary"
            >
              {initial}
            </span>
          ))}
          <span className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
            +12
          </span>
        </div>
      </div>
    </div>
  );
}
