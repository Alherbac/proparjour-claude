import { Controller, useFormContext } from "react-hook-form";
import { FormField } from "@/components/onboarding/form-field";
import { ChipMultiSelect } from "@/components/onboarding/chip-multi-select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  JOURS_SEMAINE,
  type PrestataireFormValues,
} from "@/components/onboarding/prestataire/schema";

const TARIF_TYPES = [
  { value: "journalier", label: "Au jour (TJM)" },
  { value: "horaire", label: "À l'heure" },
] as const;

export function StepTarif() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PrestataireFormValues>();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Tarif & disponibilités
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Modifiable à tout moment depuis votre tableau de bord.
        </p>
      </div>

      <FormField label="Type de tarif" error={errors.tarifType?.message}>
        <Controller
          name="tarifType"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-3">
              {TARIF_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => field.onChange(type.value)}
                  aria-pressed={field.value === type.value}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                    field.value === type.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-foreground hover:border-primary/40",
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}
        />
      </FormField>

      <FormField
        label="Montant (€)"
        htmlFor="tarifMontant"
        error={errors.tarifMontant?.message}
      >
        <Input
          id="tarifMontant"
          type="number"
          min={0}
          step="0.5"
          placeholder="150"
          {...register("tarifMontant", { valueAsNumber: true })}
        />
      </FormField>

      <FormField
        label="Jours de disponibilité"
        error={errors.disponibilites?.message}
      >
        <Controller
          name="disponibilites"
          control={control}
          render={({ field }) => (
            <ChipMultiSelect
              options={JOURS_SEMAINE}
              value={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>
    </div>
  );
}
