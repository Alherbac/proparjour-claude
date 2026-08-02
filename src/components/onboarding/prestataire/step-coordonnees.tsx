import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/onboarding/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Controller } from "react-hook-form";
import {
  STATUTS_INDEPENDANT,
  type PrestataireFormValues,
} from "@/components/onboarding/prestataire/schema";

export function StepCoordonnees() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PrestataireFormValues>();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Vos coordonnées
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Commençons par les informations de base de votre profil.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Prénom" htmlFor="prenom" error={errors.prenom?.message}>
          <Input id="prenom" placeholder="Amadou" {...register("prenom")} />
        </FormField>
        <FormField label="Nom" htmlFor="nom" error={errors.nom?.message}>
          <Input id="nom" placeholder="Diallo" {...register("nom")} />
        </FormField>
      </div>

      <FormField label="E-mail" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          placeholder="vous@exemple.com"
          {...register("email")}
        />
      </FormField>

      <FormField
        label="Téléphone"
        htmlFor="telephone"
        error={errors.telephone?.message}
      >
        <Input
          id="telephone"
          type="tel"
          placeholder="06 12 34 56 78"
          {...register("telephone")}
        />
      </FormField>

      <FormField
        label="Statut indépendant"
        htmlFor="statutIndependant"
        error={errors.statutIndependant?.message}
      >
        <Controller
          name="statutIndependant"
          control={control}
          render={({ field }) => (
            <Select
              items={STATUTS_INDEPENDANT}
              value={field.value ?? ""}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="statutIndependant" className="w-full">
                <SelectValue placeholder="Sélectionnez votre statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_INDEPENDANT.map((statut) => (
                  <SelectItem key={statut.value} value={statut.value}>
                    {statut.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
    </div>
  );
}
