import type { MetadataRoute } from "next";

// Audit final — aucun robots.txt n'existait avant ce lot : les
// robots pouvaient explorer sans limite /admin, /client, /prestataire,
// /api, /auth (protégés par authentification, donc rien d'utile à
// indexer, mais un budget de crawl gaspillé et des URLs de connexion
// qui n'ont aucune raison d'apparaître dans les résultats Google).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/client", "/prestataire", "/api", "/auth", "/panier", "/missions", "/connexion"],
    },
    sitemap: "https://proparjour.fr/sitemap.xml",
  };
}
