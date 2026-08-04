import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMissionsPrestataire } from "@/lib/missions";
import { getMessagesNonLusParMission } from "@/lib/messages";
import { MissionsScreen } from "@/components/dashboard/missions-screen";

export const metadata: Metadata = {
  title: "Mes missions — ProParJour",
};

export default async function MissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/missions");

  const [lignes, messagesNonLusParMission] = await Promise.all([
    getMissionsPrestataire(user.id),
    getMessagesNonLusParMission(),
  ]);

  return <MissionsScreen lignes={lignes} messagesNonLusParMission={messagesNonLusParMission} />;
}
