import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMissionsPrestataire, getMissionsRecruteur } from "@/lib/missions";
import { getMessagesNonLusParMission } from "@/lib/messages";
import { MissionsScreen } from "@/components/dashboard/missions-screen";
import { MissionsScreenRecruteur } from "@/components/dashboard/missions-screen-recruteur";

export const metadata: Metadata = {
  title: "Mes missions — ProParJour",
};

export default async function MissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/missions");

  const { data: profil } = await supabase.from("users").select("type").eq("id", user.id).maybeSingle();
  const estRecruteur = profil?.type === "recruteur_entreprise" || profil?.type === "recruteur_particulier";
  const messagesNonLusParMission = await getMessagesNonLusParMission();

  if (estRecruteur) {
    const missions = await getMissionsRecruteur(user.id);
    return (
      <MissionsScreenRecruteur
        userId={user.id}
        missions={missions}
        messagesNonLusParMission={messagesNonLusParMission}
      />
    );
  }

  // getMissionsPrestataire renvoie silencieusement [] si le profil
  // prestataire est introuvable (voir lib/missions.ts) — indiscernable
  // d'un "vraiment aucune mission" pour l'utilisateur. On vérifie ici
  // pour rediriger vers l'accueil (qui explique la situation) plutôt
  // que d'afficher une liste vide trompeuse.
  const { data: profilPrestataire } = await supabase
    .from("prestataires_profils")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profilPrestataire) redirect("/tableau-de-bord/accueil");

  const lignes = await getMissionsPrestataire(user.id);
  return <MissionsScreen userId={user.id} lignes={lignes} messagesNonLusParMission={messagesNonLusParMission} />;
}
