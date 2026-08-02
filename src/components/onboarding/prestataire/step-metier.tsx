import { Controller, useFormContext } from "react-hook-form";
import { ShieldCheck, UserRound, ShoppingBag } from "lucide-react";
import { METIERS } from "@/config/metiers";
import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";
import { cn } from "@/lib/utils";

const METIER_ICONS = {
  securite: ShieldCheck,
  accueil: UserRound,
  vente: ShoppingBag,
} as const;

export function StepMetier() {
  const {
    control,
    formState: { errors },
  } = useFormContext<PrestataireFormValues>();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Quel est votre métier ?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les étapes suivantes s&apos;adaptent à votre choix.
        </p>
      </div>

      <Controller
        name="metier"
        control={control}
        render={({ field }) => (
          <div className="grid gap-3 sm:grid-cols-3">
            {METIERS.map((metier) => {
              const Icon = METIER_ICONS[metier.id];
              const selected = field.value === metier.id;
              return (
                <button
                  key={metier.id}
                  type="button"
                  onClick={() => field.onChange(metier.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-medium text-foreground">
                      {metier.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {metier.filiere}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      />
      {errors.metier ? (
        <p className="text-xs font-medium text-destructive">
          {errors.metier.message}
        </p>
      ) : null}
    </div>
  );
}
