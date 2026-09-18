import type { Metadata } from "next";
import { MotDePasseOublieForm } from "@/components/auth/mot-de-passe-oublie-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié — ProParJour",
  description: "Réinitialisez le mot de passe de votre compte ProParJour.",
};

export default function MotDePasseOubliePage() {
  return <MotDePasseOublieForm />;
}
