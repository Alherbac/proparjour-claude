import Link from "next/link";
import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { METIERS } from "@/config/metiers";
import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";

export function StepCgu({ values }: { values: PrestataireFormValues }) {
  const {
    control,
    formState: { errors },
  } = useFormContext<PrestataireFormValues>();
  const metier = METIERS.find((m) => m.id === values.metier);

  const recap: [string, string | undefined][] = [
    ["Prénom", values.prenom],
    ["Métier", metier?.label],
    ["Ville", values.ville],
    [
      "Tarif",
      values.tarifMontant
        ? `${values.tarifMontant} € ${values.tarifType === "horaire" ? "/ heure" : "/ jour"}`
        : undefined,
    ],
    ["Disponibilités", values.disponibilites?.join(", ")],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Dernière étape
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Vérifiez votre profil avant de le publier.
        </p>
      </div>

      <dl className="divide-y divide-border rounded-lg border border-border">
        {recap
          .filter(([, value]) => Boolean(value))
          .map(([label, value]) => (
            <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ))}
      </dl>

      <Controller
        name="accepteCgu"
        control={control}
        render={({ field }) => (
          <label className="flex items-start gap-2.5 text-sm text-foreground">
            <Checkbox
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <span>
              J&apos;accepte les{" "}
              <Link href="/cgu" className="text-primary underline">
                conditions générales d&apos;utilisation
              </Link>{" "}
              de ProParJour.
            </span>
          </label>
        )}
      />
      {errors.accepteCgu ? (
        <p className="text-xs font-medium text-destructive">
          {errors.accepteCgu.message}
        </p>
      ) : null}
    </div>
  );
}
