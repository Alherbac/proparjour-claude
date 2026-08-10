import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOffresRecruteur } from "@/lib/offres";
import { MesOffresScreen } from "@/components/dashboard/mes-offres-screen";

export const metadata: Metadata = {
  title: "Mes offres — ProParJour",
};

export default async function MesOffresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/mes-offres");

  const { data: profil } = await supabase.from("users").select("type").eq("id", user.id).maybeSingle();
  const estRecruteur = profil?.type === "recruteur_entreprise" || profil?.type === "recruteur_particulier";
  if (!estRecruteur) redirect("/tableau-de-bord");

  const offres = await getOffresRecruteur(user.id);
  return <MesOffresScreen offres={offres} />;
}
