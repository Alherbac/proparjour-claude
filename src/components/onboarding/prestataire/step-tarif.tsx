import { Controller, useFormContext } from "react-hook-form";
import { FormField } from "@/components/onboarding/form-field";
import { ChipMultiSelect } from "@/components/onboarding/chip-multi-select";
import { Input } from "@/components/ui/input";
import {
  JOURS_SEMAINE,
  type PrestataireFormValues,
} from "@/components/onboarding/prestataire/schema";
import { HEURES_JOUR_REFERENCE } from "@/lib/tarif";

export function StepTarif() {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<PrestataireFormValues>();

  const tarifHoraire = watch("tarifMontant");
  const tarifJournalierIndicatif =
    typeof tarifHoraire === "number" && tarifHoraire > 0
      ? Math.round(tarifHoraire * HEURES_JOUR_REFERENCE * 100) / 100
      : null;

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

      <FormField
        label="Tarif horaire (€)"
        htmlFor="tarifMontant"
        error={errors.tarifMontant?.message}
        hint="C'est votre tarif de référence — les recruteurs peuvent vous proposer un tarif horaire différent au moment de la mission."
      >
        <Input
          id="tarifMontant"
          type="number"
          min={0}
          step="0.5"
          placeholder="18"
          {...register("tarifMontant", { valueAsNumber: true })}
        />
      </FormField>

      {tarifJournalierIndicatif !== null && (
        <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Tarif journalier indicatif, affiché sur votre profil
          </p>
          <p className="font-heading text-lg font-semibold text-foreground">
            {tarifJournalierIndicatif} € / jour
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Calculé automatiquement sur la base d&apos;une journée de {HEURES_JOUR_REFERENCE}h.
          </p>
        </div>
      )}

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
