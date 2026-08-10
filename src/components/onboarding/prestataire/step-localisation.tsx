import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { FormField } from "@/components/onboarding/form-field";
import { VilleAutocompleteIdf } from "@/components/ville-autocomplete-idf";
import { MESSAGE_HORS_ZONE } from "@/config/zones-couverture";
import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";

export function StepLocalisation() {
  const {
    control,
    formState: { errors },
  } = useFormContext<PrestataireFormValues>();
  const ville = useWatch({ control, name: "ville" });
  const [horsZone, setHorsZone] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Votre zone d&apos;intervention
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ProParJour est disponible en Île-de-France au lancement.
        </p>
      </div>

      <FormField label="Ville" htmlFor="ville" error={errors.ville?.message}>
        <Controller
          name="ville"
          control={control}
          render={({ field }) => (
            <VilleAutocompleteIdf
              id="ville"
              value={field.value}
              onChange={field.onChange}
              onHorsZoneChange={setHorsZone}
            />
          )}
        />
      </FormField>

      {horsZone && Boolean(ville) && ville.trim().length > 2 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          {MESSAGE_HORS_ZONE}
        </div>
      )}
    </div>
  );
}
