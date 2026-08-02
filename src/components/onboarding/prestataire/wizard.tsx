"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { PreviewCard } from "@/components/onboarding/prestataire/preview-card";
import { getStepsForMetier } from "@/components/onboarding/prestataire/steps-config";
import {
  PRESTATAIRE_DEFAULT_VALUES,
  prestataireSchema,
  type PrestataireFormValues,
} from "@/components/onboarding/prestataire/schema";
import { StepCoordonnees } from "@/components/onboarding/prestataire/step-coordonnees";
import { StepMetier } from "@/components/onboarding/prestataire/step-metier";
import { StepSpecialites } from "@/components/onboarding/prestataire/step-specialites";
import { StepLocalisation } from "@/components/onboarding/prestataire/step-localisation";
import { StepTarif } from "@/components/onboarding/prestataire/step-tarif";
import { StepPhoto } from "@/components/onboarding/prestataire/step-photo";
import { StepJustificatifs } from "@/components/onboarding/prestataire/step-justificatifs";
import { StepCgu } from "@/components/onboarding/prestataire/step-cgu";
import { SuccessScreen } from "@/components/onboarding/prestataire/success-screen";

const STORAGE_KEY = "proparjour:onboarding-prestataire";

export function PrestataireWizard() {
  const methods = useForm<PrestataireFormValues>({
    resolver: zodResolver(prestataireSchema),
    defaultValues: PRESTATAIRE_DEFAULT_VALUES,
    mode: "onChange",
  });
  const { control, trigger, getValues, setError, clearErrors, reset } = methods;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [justificatifFile, setJustificatifFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const metier = useWatch({ control, name: "metier" });
  const steps = useMemo(() => getStepsForMetier(metier), [metier]);
  const values = useWatch({ control });

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        reset({ ...PRESTATAIRE_DEFAULT_VALUES, ...JSON.parse(saved) });
      } catch {
        // ignore corrupted local draft
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time flag after reading the localStorage draft on mount, not a render-derivable value
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }, [values, hydrated]);

  const safeIndex = Math.min(currentIndex, steps.length - 1);

  function handlePhotoSelect(file: File) {
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  function handlePhotoRemove() {
    setPhotoPreviewUrl(null);
  }

  function validateSpecialites(): boolean {
    const currentMetier = getValues("metier");
    clearErrors(["numeroCarteCnaps", "langues", "secteurExperience"]);

    if (currentMetier === "securite" && !getValues("numeroCarteCnaps")?.trim()) {
      setError("numeroCarteCnaps", {
        type: "manual",
        message: "Le numéro de carte professionnelle CNAPS est requis",
      });
      return false;
    }
    if (currentMetier === "accueil" && getValues("langues").length === 0) {
      setError("langues", {
        type: "manual",
        message: "Sélectionnez au moins une langue parlée",
      });
      return false;
    }
    if (currentMetier === "vente" && !getValues("secteurExperience")?.trim()) {
      setError("secteurExperience", {
        type: "manual",
        message: "Sélectionnez votre secteur d'expérience",
      });
      return false;
    }
    return true;
  }

  async function handleNext() {
    const step = steps[safeIndex];
    const fieldsValid = step.fields.length ? await trigger(step.fields) : true;
    const stepValid =
      step.id === "specialites" ? fieldsValid && validateSpecialites() : fieldsValid;
    if (!stepValid) return;

    if (safeIndex === steps.length - 1) {
      window.localStorage.removeItem(STORAGE_KEY);
      setSubmitted(true);
      return;
    }
    setCurrentIndex(safeIndex + 1);
  }

  function handleBack() {
    setCurrentIndex(Math.max(0, safeIndex - 1));
  }

  if (submitted) {
    return <SuccessScreen enAttenteValidation={getValues("metier") === "securite"} />;
  }

  const step = steps[safeIndex];
  const isLast = safeIndex === steps.length - 1;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleNext();
        }}
      >
        <WizardShell
          steps={steps}
          currentIndex={safeIndex}
          tip={step.tip}
          preview={
            <PreviewCard values={values} photoPreviewUrl={photoPreviewUrl} />
          }
        >
          {step.id === "coordonnees" && <StepCoordonnees />}
          {step.id === "metier" && <StepMetier />}
          {step.id === "specialites" && <StepSpecialites />}
          {step.id === "localisation" && <StepLocalisation />}
          {step.id === "tarif" && <StepTarif />}
          {step.id === "photo" && (
            <StepPhoto
              previewUrl={photoPreviewUrl}
              onSelect={handlePhotoSelect}
              onRemove={handlePhotoRemove}
            />
          )}
          {step.id === "justificatifs" && (
            <StepJustificatifs
              file={justificatifFile}
              onSelect={setJustificatifFile}
              onRemove={() => setJustificatifFile(null)}
            />
          )}
          {step.id === "cgu" && (
            <StepCgu values={values as PrestataireFormValues} />
          )}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={safeIndex === 0}
              className="rounded-full"
            >
              <ChevronLeft className="size-4" />
              Précédent
            </Button>
            <Button type="submit" className="rounded-full">
              {isLast ? (
                "Créer mon profil"
              ) : (
                <>
                  Suivant
                  <ChevronRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </WizardShell>
      </form>
    </FormProvider>
  );
}
