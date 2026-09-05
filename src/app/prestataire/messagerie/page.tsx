import type { Metadata } from "next";
import { getSessionPrestataire, getLignesPrestataire, getConversationsPrestataire } from "@/app/prestataire/_data";
import { EcranMessagerie } from "@/app/prestataire/messagerie/ecran";

export const metadata: Metadata = { title: "Messagerie — ProParJour" };

export default async function PagePrestataireMessagerie() {
  const session = await getSessionPrestataire();
  if (!session) return null;
  const lignes = await getLignesPrestataire(session.profilId);
  const conversations = await getConversationsPrestataire(session.userId, lignes);
  return <EcranMessagerie conversations={conversations} />;
}
