import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * /tableau-de-bord n'est plus qu'un point d'entrée : chaque rôle a
 * son propre "Accueil" sous /tableau-de-bord/accueil (miroir
 * prestataire / recruteur, voir layout.tsx pour le chrome commun).
 */
export default async function TableauDeBordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/tableau-de-bord");
  }

  redirect("/tableau-de-bord/accueil");
}
