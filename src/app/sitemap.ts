import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = "https://proparjour.fr";

// Audit final — pages marketing statiques + fiches prestataires
// publiques réelles (jamais une liste inventée : lues depuis
// `prestataires_publics`, la même vue déjà utilisée par le catalogue,
// RLS déjà publique). Le tableau de bord, l'admin et les pages
// authentifiées restent hors sitemap (voir robots.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pagesStatiques: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/prestataires`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/a-propos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/tarifs`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/cgu`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const supabase = await createClient();
  const { data: prestataires } = await supabase.from("prestataires_publics").select("id, created_at").limit(5000);

  const pagesPrestataires: MetadataRoute.Sitemap = (prestataires ?? []).map((p) => ({
    url: `${BASE_URL}/prestataires/${p.id}`,
    lastModified: p.created_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...pagesStatiques, ...pagesPrestataires];
}
