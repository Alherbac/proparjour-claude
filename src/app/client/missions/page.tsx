import type { Metadata } from "next";
import { getSessionClient, getMissionsClient } from "@/app/client/_data";
import { EcranMissions } from "@/app/client/missions/ecran";

export const metadata: Metadata = { title: "Vos missions — ProParJour" };

export default async function PageMissions() {
  const session = await getSessionClient();
  if (!session) return null;
  const missions = await getMissionsClient(session.userId);
  return <EcranMissions missions={missions} />;
}
