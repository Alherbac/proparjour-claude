import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublierDemandeForm } from "@/components/dashboard/publier-demande-form";

export const metadata: Metadata = {
  title: "Publier une demande — ProParJour",
};

export default async function PublierDemandePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/publier-demande");

  const { data: profil } = await supabase.from("users").select("type").eq("id", user.id).maybeSingle();
  const estRecruteur = profil?.type === "recruteur_entreprise" || profil?.type === "recruteur_particulier";
  if (!estRecruteur) redirect("/tableau-de-bord");

  return <PublierDemandeForm />;
}
