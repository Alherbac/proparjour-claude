import type { Metadata } from "next";
import { RecruteurForm } from "@/components/onboarding/recruteur/form";

export const metadata: Metadata = {
  title: "Créer un compte recruteur — ProParJour",
  description:
    "Créez votre compte entreprise ou particulier pour réserver des prestataires qualifiés en Île-de-France.",
};

export default function InscriptionRecruteurPage() {
  return <RecruteurForm />;
}
