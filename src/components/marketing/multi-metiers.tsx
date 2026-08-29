"use client";

import { sauvegarderBesoin } from "@/lib/besoin";

// Refonte Claude Istanbul 1, §4.5. Copie de l'exemple et des 3 cartes
// reprise mot pour mot de la maquette (carte "Une demande").
const EXEMPLE = "Vendredi à Paris, 2 agents de sécurité, 1 hôtesse, 1 vendeur";

const APERCU = [
  { label: "Sécurité privée", meta: "2 professionnels" },
  { label: "Accueil & Réception", meta: "1 professionnel" },
  { label: "Commerce & Retail", meta: "1 professionnel" },
] as const;

export function MultiMetiers() {
  function voirSurUnExemple() {
    sauvegarderBesoin({
      texte:
        "Vendredi à Paris, j'ai besoin de 2 agents de sécurité, d'une hôtesse et d'un vendeur.",
      metier: null,
      ville: null,
      quantite: null,
      date: null,
      heureDebut: null,
      heureFin: null,
    });
    // HeroSearchBar vit sur la même page — un événement suffit pour lui
    // faire relire le brouillon tout de suite, pas besoin de recharger.
    window.dispatchEvent(new Event("proparjour:besoin-exemple"));
    document.getElementById("recherche")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="bg-ppj-ink" style={{ padding: "clamp(64px,8vw,112px) 0" }}>
      <div
        className="mx-auto grid max-w-[1240px] items-center gap-[clamp(36px,5vw,64px)] px-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}
      >
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.12em] text-primary">Multi-métiers</p>
          <h2
            className="mb-[18px] text-white"
            style={{ fontFamily: "var(--font-display-serif)", fontSize: "clamp(32px,3.8vw,52px)", lineHeight: 1.03, letterSpacing: "-0.02em" }}
          >
            Un seul besoin.
            <br />
            Plusieurs métiers.
          </h2>
          <p className="mb-[26px] max-w-[32em] text-[16.5px] leading-[1.6] text-ppj-dark-text">
            Une soirée demande souvent trois métiers différents. Décrivez l&apos;ensemble en une phrase :
            chaque métier est traité séparément, avec ses horaires et son effectif.
          </p>
          <button
            type="button"
            onClick={voirSurUnExemple}
            className="min-h-[50px] rounded-[13px] border px-6 text-[15px] font-medium text-white transition-colors hover:border-primary hover:bg-primary"
            style={{ borderColor: "#383C41" }}
          >
            Voir sur un exemple
          </button>
        </div>
        <div className="grid gap-3.5">
          <div className="rounded-2xl border p-4 pl-[18px]" style={{ borderColor: "#2E3135", background: "#1F2124" }}>
            <span className="block font-mono text-xs uppercase tracking-[0.1em] text-ppj-dark-text-2">Une demande</span>
            <span className="mt-1.5 block text-base text-white">« {EXEMPLE} »</span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))" }}>
            {APERCU.map((a) => (
              <div key={a.label} className="rounded-2xl border p-4" style={{ borderColor: "#2E3135", background: "#1F2124" }}>
                <span className="mb-3 block h-[18px] w-px bg-primary" />
                <span className="block text-[15px] font-semibold text-white">{a.label}</span>
                <span className="mt-1 block text-[13px] text-ppj-dark-text-2">{a.meta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
