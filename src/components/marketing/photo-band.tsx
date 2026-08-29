"use client";

import { useRouter } from "next/navigation";

// Refonte Claude Istanbul 1, §4.3 — bandeau photo plein écran. Aucune
// photo fournie par le client (README §9 : "à demander au client") :
// seul le motif de repli existe pour l'instant, jamais une image ou
// une illustration inventée à la place.
const FAMILLES = [
  { metier: "securite", label: "Sécurité & Protection" },
  { metier: "accueil", label: "Accueil & Réception" },
  { metier: "vente", label: "Commerce, Retail & Distribution" },
] as const;

export function PhotoBand() {
  const router = useRouter();

  return (
    <section
      aria-label="Les professionnels ProParJour en mission"
      className="relative overflow-hidden"
      style={{ height: "clamp(260px,32vw,440px)" }}
    >
      <div
        className="absolute motion-safe:animate-[ppjPan_38s_ease-in-out_infinite_alternate]"
        style={{
          top: "-4%",
          bottom: "-4%",
          left: "-6%",
          right: "-6%",
          backgroundImage:
            "repeating-linear-gradient(135deg, #F0ECE6 0 12px, #E8E3DC 12px 24px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(26,25,23,0.86) 0%, rgba(26,25,23,0.55) 38%, rgba(26,25,23,0.05) 72%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 pb-7">
        <div className="mx-auto max-w-[1240px] px-6">
          <p
            className="mb-4 max-w-[16em] text-white"
            style={{
              fontFamily: "var(--font-display-serif)",
              fontSize: "clamp(24px,2.8vw,38px)",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 20px rgba(26,25,23,0.75)",
            }}
          >
            Des professionnels de terrain, sur le terrain.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {FAMILLES.map((f) => (
              <button
                key={f.metier}
                type="button"
                onClick={() => router.push(`/prestataires?metier=${f.metier}`)}
                className="rounded-full border px-4 py-2.5 text-[14px] font-medium text-white backdrop-blur-[6px] transition-colors hover:bg-primary hover:border-primary"
                style={{ borderColor: "rgba(255,255,255,0.5)", background: "rgba(26,25,23,0.28)" }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
