/**
 * Badge — dossier design §2. Fond translucide, bordure plus dense,
 * texte foncé lisible. Jamais de fond plein. white-space: nowrap
 * obligatoire (sinon un badge à deux mots se coupe dans une carte
 * étroite).
 */
export type BadgeTone = "vert" | "orange" | "rouge" | "bleu" | "gris";

const TONES: Record<BadgeTone, { bg: string; border: string; color: string }> = {
  vert: { bg: "rgba(61,184,122,.13)", border: "rgba(61,184,122,.34)", color: "#2A8355" },
  orange: { bg: "rgba(224,154,58,.14)", border: "rgba(224,154,58,.36)", color: "#96662A" },
  rouge: { bg: "#FDECEB", border: "#F8D3D1", color: "#8E2A26" },
  bleu: { bg: "rgba(29,116,232,.1)", border: "rgba(29,116,232,.3)", color: "#1D5FB8" },
  gris: { bg: "#F6F4F0", border: "#EAE6E0", color: "#6B6660" },
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-[999px] px-[9px] py-[4px] text-[11px] font-bold"
      style={{ backgroundColor: t.bg, border: `1px solid ${t.border}`, color: t.color }}
    >
      {children}
    </span>
  );
}
