import type { Metadata } from "next";
import { getNotifications } from "@/lib/notifications";
import { EcranNotifications } from "@/app/prestataire/notifications/ecran";

export const metadata: Metadata = { title: "Notifications — ProParJour" };

export default async function PageNotifications() {
  const notifications = await getNotifications(100);
  return <EcranNotifications notificationsInitiales={notifications} />;
}
