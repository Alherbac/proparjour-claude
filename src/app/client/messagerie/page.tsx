import type { Metadata } from "next";
import { getSessionClient, getMissionsClient, getConversationsClient } from "@/app/client/_data";
import { EcranMessagerie } from "@/app/client/messagerie/ecran";

export const metadata: Metadata = { title: "Messagerie — ProParJour" };

export default async function PageMessagerie() {
  const session = await getSessionClient();
  if (!session) return null;
  const missions = await getMissionsClient(session.userId);
  const conversations = await getConversationsClient(session.userId, missions);
  return <EcranMessagerie conversations={conversations} />;
}
