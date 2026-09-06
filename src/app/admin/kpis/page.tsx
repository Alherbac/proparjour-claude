import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  getEntonnoirDirection,
  getInsightsDirection,
  getInsightsMetiers,
  getInsightsPrestataires,
  getInsightsClients,
  getInsightsFinances,
  getInsightsMarche,
} from "@/lib/admin/insights";
import { InsightsScreen } from "@/components/admin/insights-screen";

export const metadata: Metadata = { title: "Insights — Admin ProParJour" };

export default async function AdminInsightsPage() {
  await requireAdminSession();
  const [entonnoir, direction, metiers, prestataires, clients, finances, marche] = await Promise.all([
    getEntonnoirDirection(),
    getInsightsDirection(),
    getInsightsMetiers(),
    getInsightsPrestataires(),
    getInsightsClients(),
    getInsightsFinances(),
    getInsightsMarche(),
  ]);

  return (
    <InsightsScreen
      entonnoir={entonnoir}
      direction={direction}
      metiers={metiers}
      prestataires={prestataires}
      clients={clients}
      finances={finances}
      marche={marche}
    />
  );
}
