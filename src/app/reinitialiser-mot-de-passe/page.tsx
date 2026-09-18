import type { Metadata } from "next";
import { ReinitialiserMotDePasseForm } from "@/components/auth/reinitialiser-mot-de-passe-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — ProParJour",
  description: "Choisissez un nouveau mot de passe pour votre compte ProParJour.",
};

export default function ReinitialiserMotDePassePage() {
  return <ReinitialiserMotDePasseForm />;
}
