"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Loader2, MailCheck } from "lucide-react";
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
import { MESSAGE_HORS_ZONE } from "@/config/zones-couverture";
import { VilleAutocompleteIdf } from "@/components/ville-autocomplete-idf";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/supabase/auth-helpers";
import { completerProfilRecruteur } from "@/app/actions/inscription";

const INSCRIPTION_PATH = "/inscription/recruteur";

export function RecruteurForm() {
  const router = useRouter();
  // Brouillon en cours (ex. "Publier une offre" quitté juste avant
  // l'inscription, voir besoin-capture.tsx) — quand présent, ce
  // formulaire redirige directement vers cette page une fois le compte
  // créé, au lieu du RecruteurSuccessScreen générique : le client ne
  // doit jamais recommencer son besoin après s'être identifié.
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  // Round-trip OAuth (signInWithGoogle) : revient sur CETTE page pour
  // compléter le profil (métier, type de compte...), en conservant le
  // même "next" pour la redirection finale après complétion.
  const inscriptionPathAvecNext = next ? `${INSCRIPTION_PATH}?next=${encodeURIComponent(next)}` : INSCRIPTION_PATH;
  const [submitted, setSubmitted] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [existingUser, setExistingUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<RecruteurFormValues>({
    resolver: zodResolver(recruteurSchema),
    defaultValues: RECRUTEUR_DEFAULT_VALUES,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setExistingUser(data.user);
        setValue("email", data.user.email ?? "");
      }
      setCheckingSession(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const typeCompte = watch("typeCompte");
  const ville = watch("ville");
  const [horsZone, setHorsZone] = useState(false);

  async function onSubmit(data: RecruteurFormValues) {
    clearErrors(["raisonSociale", "siret", "secteurActivite"]);
    setAuthError(null);

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

    if (!existingUser && (!data.motDePasse || data.motDePasse.length < 8)) {
      setError("motDePasse", { type: "manual", message: "8 caractères minimum" });
      return;
    }

    setSubmitting(true);
    try {
      if (!existingUser) {
        const supabase = createClient();
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.motDePasse!,
        });
        if (error) {
          setAuthError(error.message);
          return;
        }
        if (!signUpData.session) {
          setAwaitingConfirmation(true);
          return;
        }
      }

      const result = await completerProfilRecruteur(data);
      if (!result.success) {
        setAuthError(result.error);
        return;
      }
      // Un besoin en cours (localStorage, lib/besoin.ts) attend son
      // auteur exactement là où il l'a laissé — jamais l'écran de
      // bienvenue générique dans ce cas précis (règle UX : l'inscription
      // n'est qu'une étape d'identification, pas un nouveau départ).
      if (next) {
        router.push(next);
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleClick() {
    const { error } = await signInWithGoogle(inscriptionPathAvecNext);
    if (error) setAuthError(error.message);
  }

  if (submitted) {
    return <RecruteurSuccessScreen />;
  }

  if (awaitingConfirmation) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-secondary/30 px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-7" />
          </span>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Vérifiez votre e-mail
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cliquez sur le lien reçu par e-mail pour confirmer votre compte,
            puis{" "}
            <Link
              href={next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion"}
              className="font-medium text-primary underline"
            >
              reconnectez-vous
            </Link>{" "}
            pour terminer votre inscription.
            {next && " Votre besoin en cours vous attendra à votre retour."}
          </p>
        </div>
      </div>
    );
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
              {existingUser ? "Complétez votre profil" : "Créer un compte recruteur"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {existingUser
                ? "Encore quelques informations pour activer votre compte."
                : "Réservez des prestataires qualifiés en quelques clics."}
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

          {!existingUser && !checkingSession && (
            <>
              <GoogleButton
                label="Continuer avec Google"
                onClick={handleGoogleClick}
              />
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou avec e-mail</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

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
              <Input
                id="email"
                type="email"
                disabled={Boolean(existingUser)}
                {...register("email")}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Téléphone"
                htmlFor="telephone"
                error={errors.telephone?.message}
              >
                <Input id="telephone" type="tel" {...register("telephone")} />
              </FormField>
              {!existingUser && (
                <FormField
                  label="Mot de passe"
                  htmlFor="motDePasse"
                  error={errors.motDePasse?.message}
                >
                  <Input id="motDePasse" type="password" {...register("motDePasse")} />
                </FormField>
              )}
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
                    <Link
                      href="/cgu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
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

            {authError && (
              <p className="text-sm font-medium text-destructive">{authError}</p>
            )}

            <Button type="submit" className="w-full rounded-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {existingUser ? "Terminer mon inscription" : "Créer mon compte"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
