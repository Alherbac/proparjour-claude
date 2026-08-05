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

  const lignes = await getMissionsPrestataire(user.id);
  return <MissionsScreen userId={user.id} lignes={lignes} messagesNonLusParMission={messagesNonLusParMission} />;
}
