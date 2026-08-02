"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { MapPin } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/onboarding/form-field";
import { GoogleButton } from "@/components/onboarding/recruteur/google-button";
import { RecruteurSuccessScreen } from "@/components/onboarding/recruteur/success-screen";
import {
  RECRUTEUR_DEFAULT_VALUES,
  recruteurSchema,
  SECTEURS_ACTIVITE,
  type RecruteurFormValues,
} from "@/components/onboarding/recruteur/schema";
import { estVilleCouverte, MESSAGE_HORS_ZONE } from "@/config/zones-couverture";

export function RecruteurForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<RecruteurFormValues>({
    resolver: zodResolver(recruteurSchema),
    defaultValues: RECRUTEUR_DEFAULT_VALUES,
  });

  const typeCompte = watch("typeCompte");
  const ville = watch("ville");
  const horsZone = Boolean(ville) && ville.trim().length > 2 && !estVilleCouverte(ville);

  function onSubmit(data: RecruteurFormValues) {
    clearErrors(["raisonSociale", "siret", "secteurActivite"]);
    if (data.typeCompte === "entreprise") {
      let hasError = false;
      if (!data.raisonSociale?.trim()) {
        setError("raisonSociale", { type: "manual", message: "La raison sociale est requise" });
        hasError = true;
      }
      if (!data.siret?.trim() || !/^\d{14}$/.test(data.siret.trim())) {
        setError("siret", { type: "manual", message: "Le SIRET doit contenir 14 chiffres" });
        hasError = true;
      }
      if (!data.secteurActivite?.trim()) {
        setError("secteurActivite", { type: "manual", message: "Sélectionnez un secteur" });
        hasError = true;
      }
      if (hasError) return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return <RecruteurSuccessScreen />;
  }

  return (
    <div className="min-h-full bg-secondary/30">
      <header className="border-b border-border bg-background px-4 py-4 lg:px-8">
        <div className="mx-auto max-w-xl">
          <Logo />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-10 lg:px-8">
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Créer un compte recruteur
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Réservez des prestataires qualifiés en quelques clics.
            </p>
          </div>

          <Controller
            name="typeCompte"
            control={control}
            render={({ field }) => (
              <Tabs
                value={field.value}
                onValueChange={field.onChange}
                className="mb-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="particulier">Particulier</TabsTrigger>
                  <TabsTrigger value="entreprise">Entreprise</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          />

          <GoogleButton label="Continuer avec Google" />

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou avec e-mail</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {typeCompte === "entreprise" && (
              <>
                <FormField
                  label="Raison sociale"
                  htmlFor="raisonSociale"
                  error={errors.raisonSociale?.message}
                >
                  <Input id="raisonSociale" {...register("raisonSociale")} />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="SIRET"
                    htmlFor="siret"
                    error={errors.siret?.message}
                  >
                    <Input
                      id="siret"
                      inputMode="numeric"
                      placeholder="14 chiffres"
                      {...register("siret")}
                    />
                  </FormField>

                  <FormField
                    label="Secteur d'activité"
                    error={errors.secteurActivite?.message}
                  >
                    <Controller
                      name="secteurActivite"
                      control={control}
                      render={({ field }) => (
                        <Select
                          items={SECTEURS_ACTIVITE.map((s) => ({ value: s, label: s }))}
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Secteur" />
                          </SelectTrigger>
                          <SelectContent>
                            {SECTEURS_ACTIVITE.map((secteur) => (
                              <SelectItem key={secteur} value={secteur}>
                                {secteur}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                </div>

                <p className="text-xs font-medium text-muted-foreground">
                  Contact principal
                </p>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Prénom" htmlFor="prenom" error={errors.prenom?.message}>
                <Input id="prenom" {...register("prenom")} />
              </FormField>
              <FormField label="Nom" htmlFor="nom" error={errors.nom?.message}>
                <Input id="nom" {...register("nom")} />
              </FormField>
            </div>

            <FormField label="E-mail" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register("email")} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Téléphone"
                htmlFor="telephone"
                error={errors.telephone?.message}
              >
                <Input id="telephone" type="tel" {...register("telephone")} />
              </FormField>
              <FormField
                label="Mot de passe"
                htmlFor="motDePasse"
                error={errors.motDePasse?.message}
              >
                <Input id="motDePasse" type="password" {...register("motDePasse")} />
              </FormField>
            </div>

            <FormField label="Ville" htmlFor="ville" error={errors.ville?.message}>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="ville" className="pl-9" {...register("ville")} />
              </div>
            </FormField>
            {horsZone && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                {MESSAGE_HORS_ZONE}
              </div>
            )}

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

            <Button type="submit" className="w-full rounded-full">
              Créer mon compte
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
