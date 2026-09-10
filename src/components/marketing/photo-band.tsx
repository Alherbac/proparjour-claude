"use client";

import { useRouter } from "next/navigation";
import { METIERS, type MetierId } from "@/config/metiers";

// Refonte Claude Istanbul 1, §4.3 — bandeau photo plein écran.
//
// Depuis la refonte du 2026-09 : défilé horizontal des portraits des
// prestataires réellement inscrits (vue `prestataires_vitrine`,
// migration 0049 — validés ou non), avec leur prénom et leur intitulé
// de poste. Aucune photo n'est fournie/inventée : si aucun profil
// inscrit n'a encore de portrait, le bandeau retombe sur son motif de
// rayures d'origine.
const FAMILLES = [
  { metier: "securite", label: "Sécurité & Protection" },
  { metier: "accueil", label: "Accueil & Réception" },
  { metier: "vente", label: "Commerce, Retail & Distribution" },
] as const;

const LABEL_METIER: Record<MetierId, string> = Object.fromEntries(
  METIERS.map((m) => [m.id, m.label]),
) as Record<MetierId, string>;

export type VitrinePhoto = {
  id: string;
  prenom: string | null;
  titre: string | null;
  metier: MetierId;
  verifie: boolean;
  photoUrl: string;
};

export function PhotoBand({ photos = [] }: { photos?: VitrinePhoto[] }) {
  const router = useRouter();
  const aDesPhotos = photos.length > 0;

  // Assez de vignettes pour couvrir un grand écran, puis une copie
  // identique derrière pour boucler sans couture (l'animation
  // `marquee-scroll` va de translateX(0) à translateX(-50%), voir
  // globals.css) — désactivée si prefers-reduced-motion.
  const base = aDesPhotos
    ? Array.from({ length: Math.max(1, Math.ceil(12 / photos.length)) }).flatMap(() => photos)
    : [];
  const defile = [...base, ...base];

  return (
    <section
      aria-label="Les professionnels ProParJour"
      className="relative overflow-hidden"
      style={{ height: "clamp(260px,32vw,440px)" }}
    >
      {aDesPhotos ? (
        <div className="absolute inset-0">
          <ul className="animate-marquee flex h-full w-max list-none hover:[animation-play-state:paused]">
            {defile.map((p, i) => {
              const role = p.titre?.trim() || LABEL_METIER[p.metier];
              return (
                <li key={`${p.id}-${i}`} className="relative h-full flex-none" style={{ width: "clamp(150px,19vw,230px)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- pas de next/image dans ce projet, cf. next.config.ts (aucun remotePatterns) */}
                  <img
                    src={p.photoUrl}
                    alt={p.prenom ? `${p.prenom}, professionnel ProParJour` : "Professionnel ProParJour"}
                    className="size-full object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-2.5 pb-7"
                    style={{ background: "linear-gradient(180deg, rgba(26,25,23,0.62) 0%, rgba(26,25,23,0) 100%)" }}
                  >
                    <span className="flex items-center gap-1 text-[12px] font-semibold text-white">
                      <span className="truncate">{p.prenom ?? "Professionnel"}</span>
                      {p.verifie && (
                        <span
                          className="flex size-3 shrink-0 items-center justify-center rounded-full bg-[#1D74E8]"
                          title="Profil vérifié par ProParJour"
                        >
                          <svg viewBox="0 0 24 24" className="size-2" fill="none" aria-hidden>
                            <path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-white/75">{role}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div
          className="absolute motion-safe:animate-[ppjPan_38s_ease-in-out_infinite_alternate]"
          style={{
            top: "-4%",
            bottom: "-4%",
            left: "-6%",
            right: "-6%",
            backgroundImage: "repeating-linear-gradient(135deg, #F0ECE6 0 12px, #E8E3DC 12px 24px)",
          }}
        />
      )}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(26,25,23,0.92) 0%, rgba(26,25,23,0.6) 34%, rgba(26,25,23,0.12) 66%, rgba(26,25,23,0.32) 100%)",
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
