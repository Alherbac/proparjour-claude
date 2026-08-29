import type { NextConfig } from "next";

// Content-Security-Policy (catégorie B, liste du 2026-08-23, point 6)
// — sources réellement utilisées par ce projet uniquement : Stripe.js
// (Elements + iframe de paiement), le projet Supabase (REST, Storage,
// Realtime websocket), les deux API publiques data.gouv.fr appelées
// directement depuis le navigateur par les autocomplete adresse/ville
// (adresse-autocomplete.tsx, ville-autocomplete-idf.tsx — trouvées en
// testant en direct : une première version de cette CSP les bloquait
// silencieusement), et le strict nécessaire de Next.js. Les polices
// sont chargées via next/font/google (auto-hébergées au build, jamais
// de requête runtime vers fonts.googleapis.com) — pas besoin de les
// autoriser ici. `script-src` garde 'unsafe-inline' (Next.js n'a pas
// de middleware à base de nonce dans ce projet) : une CSP restreinte
// aux bonnes origines reste une vraie protection contre l'injection
// de scripts tiers même sans nonce, mais une version durcie avec
// nonces serait un chantier séparé.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseOrigin.replace(/^https:/, "wss:");

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs} https://api.stripe.com https://api-adresse.data.gouv.fr https://geo.api.gouv.fr`,
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
