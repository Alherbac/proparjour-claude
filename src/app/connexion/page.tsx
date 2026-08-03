import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnexionForm } from "@/components/auth/connexion-form";

export const metadata: Metadata = {
  title: "Connexion — ProParJour",
  description: "Connectez-vous à votre compte ProParJour.",
};

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionForm />
    </Suspense>
  );
}
