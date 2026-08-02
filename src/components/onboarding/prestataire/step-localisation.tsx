import { useFormContext, useWatch } from "react-hook-form";
import { MapPin } from "lucide-react";
import { FormField } from "@/components/onboarding/form-field";
import { Input } from "@/components/ui/input";
import { estVilleCouverte, MESSAGE_HORS_ZONE } from "@/config/zones-couverture";
import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";

export function StepLocalisation() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PrestataireFormValues>();
  const ville = useWatch({ control, name: "ville" });

  const horsZone = Boolean(ville) && ville.trim().length > 2 && !estVilleCouverte(ville);

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
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="ville"
            placeholder="Paris, Boulogne-Billancourt..."
            className="pl-9"
            {...register("ville")}
          />
        </div>
      </FormField>

      {horsZone && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          {MESSAGE_HORS_ZONE}
        </div>
      )}
    </div>
  );
}
