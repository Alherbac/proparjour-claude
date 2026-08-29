import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getConversationsRecentesAdmin } from "@/lib/admin/messages";
import { MessagesScreen } from "@/components/admin/messages-screen";

export const metadata: Metadata = { title: "Messages — Admin ProParJour" };

export default async function AdminMessagesPage() {
  await requireAdminSession();
  const conversations = await getConversationsRecentesAdmin();
  return <MessagesScreen conversations={conversations} />;
}
