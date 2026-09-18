import type { Metadata } from "next";
import { Suspense } from "react";
import { PrestataireWizard } from "@/components/onboarding/prestataire/wizard";

export const metadata: Metadata = {
  title: "Devenir prestataire — ProParJour",
  description:
    "Créez votre profil prestataire ProParJour en quelques étapes : sécurité, accueil ou vente.",
};

export default function InscriptionPrestatairePage() {
  return (
    <Suspense>
      <PrestataireWizard />
    </Suspense>
  );
}
