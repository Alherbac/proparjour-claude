import { Controller, useFormContext, useWatch } from "react-hook-form";
import { FormField } from "@/components/onboarding/form-field";
import { ChipMultiSelect } from "@/components/onboarding/chip-multi-select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CERTIFICATIONS_SECURITE,
  LANGUES_DISPONIBLES,
  SECTEURS_VENTE,
  type PrestataireFormValues,
} from "@/components/onboarding/prestataire/schema";
import {
  MAX_SPECIALITES,
  SPECIALTY_CATEGORIES,
} from "@/config/specialtyCategories";

export function StepSpecialites() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PrestataireFormValues>();
  const metier = useWatch({ control, name: "metier" });
  const categories = metier ? SPECIALTY_CATEGORIES[metier] : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Vos spécialités
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ces informations apparaîtront sur votre fiche publique, sous forme
          de badges, et permettront aux recruteurs de vous retrouver par
          mot-clé.
        </p>
      </div>

      <Controller
        name="specialites"
        control={control}
        render={({ field }) => (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              Choisissez de 1 à {MAX_SPECIALITES} spécialités{" "}
              <span
                className={
                  field.value.length >= MAX_SPECIALITES
                    ? "text-primary"
                    : "text-muted-foreground"
                }
              >
                ({field.value.length}/{MAX_SPECIALITES})
              </span>
            </p>

            {categories.map((categorie) => (
              <div key={categorie.label} className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {categorie.label}
                </p>
                <ChipMultiSelect
                  options={categorie.specialites}
                  value={field.value}
                  onChange={field.onChange}
                  max={MAX_SPECIALITES}
                />
              </div>
            ))}

            {errors.specialites?.message && (
              <p className="text-sm text-destructive">
                {errors.specialites.message}
              </p>
            )}
          </div>
        )}
      />

      {metier === "securite" && (
        <>
          <FormField
            label="Numéro de carte professionnelle CNAPS"
            htmlFor="numeroCarteCnaps"
            error={errors.numeroCarteCnaps?.message}
            hint="Le justificatif sera demandé à l'étape suivante."
          >
            <Input
              id="numeroCarteCnaps"
              placeholder="Ex. 012345678901"
              {...register("numeroCarteCnaps")}
            />
          </FormField>

          <FormField label="Certifications (optionnel)">
            <Controller
              name="certifications"
              control={control}
              render={({ field }) => (
                <ChipMultiSelect
                  options={CERTIFICATIONS_SECURITE}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>
        </>
      )}

      {metier === "accueil" && (
        <>
          <FormField label="Langues parlées" error={errors.langues?.message}>
            <Controller
              name="langues"
              control={control}
              render={({ field }) => (
                <ChipMultiSelect
                  options={LANGUES_DISPONIBLES}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <FormField
            label="Tenue (optionnel)"
            htmlFor="tenue"
            hint="Ex. tailleur noir, costume, uniforme fourni par vos soins..."
          >
            <Input
              id="tenue"
              placeholder="Décrivez votre tenue habituelle"
              {...register("tenue")}
            />
          </FormField>
        </>
      )}

      {metier === "vente" && (
        <>
          <FormField
            label="Secteur d'expérience"
            error={errors.secteurExperience?.message}
          >
            <Controller
              name="secteurExperience"
              control={control}
              render={({ field }) => (
                <Select
                  items={SECTEURS_VENTE.map((s) => ({ value: s, label: s }))}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez un secteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTEURS_VENTE.map((secteur) => (
                      <SelectItem key={secteur} value={secteur}>
                        {secteur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <Controller
            name="remunerationCommission"
            control={control}
            render={({ field }) => (
              <label className="flex items-start gap-2.5 text-sm text-foreground">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                Je suis ouvert(e) à une rémunération avec commission sur
                vente, en plus du taux horaire.
              </label>
            )}
          />
        </>
      )}
    </div>
  );
}
