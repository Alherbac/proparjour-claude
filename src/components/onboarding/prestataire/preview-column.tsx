import { tarifJournalierAffiche } from "@/lib/tarif";
import { checklistFor } from "@/components/onboarding/prestataire/validation";
import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";

const DISPO_LABEL: Record<string, string> = {
  now: "Disponible dès maintenant",
  soon: "Disponible prochainement",
  later: "Sans engagement",
};

/**
 * Colonne de droite — aperçu de fiche + complétion (voir
 * PROMPT-INSCRIPTION.txt §6). Collante à partir de 900px seulement
 * (voir wizard.tsx pour la disposition flex qui se replie) — un
 * élément collant empilé sous le formulaire n'a plus de sens en
 * dessous.
 */
export function PreviewColumn({
  values,
  photoPreviewUrl,
  existingUser,
}: {
  values: PrestataireFormValues;
  photoPreviewUrl: string | null;
  existingUser: boolean;
}) {
  const tarif = Number(values.tarifMontant);
  const hasTarif = values.tarifMontant.trim() !== "" && tarif > 0;
  const cardName = values.prenom || values.nom ? `${values.prenom} ${values.nom}`.trim() : "Votre nom";
  const metaBits: string[] = [];
  if (values.ville.trim()) metaBits.push(values.ville);
  if (values.anneesExperience.trim()) metaBits.push(`${values.anneesExperience} ans d’expérience`);

  const checklist = checklistFor(values, { existingUser, hasPhoto: Boolean(photoPreviewUrl) });
  const pct = Math.round((checklist.filter((c) => c.ok).length / checklist.length) * 100);
  // Deux valeurs distinctes volontairement : "10 %" pour l'affichage,
  // "10%" pour la largeur CSS — "10 %" avec l'espace est invalide en
  // CSS et retomberait sur `auto` (barre qui paraît pleine).
  const pctLabel = `${pct} %`;
  const pctWidth = `${pct}%`;

  return (
    <div className="flex-[1_1_300px] min-w-0 max-w-full grid gap-3.5 lg:sticky lg:top-[92px] lg:max-w-[340px]">
      <div className="overflow-hidden rounded-[18px] border border-[#EAE6E0] bg-white">
        <div className="flex items-center gap-2.5 border-b border-[#EFEBE6] px-4 py-3">
          <span className="size-1.5 shrink-0 rounded-full bg-[#E21D1B]" />
          <span className="text-[11.5px] font-bold tracking-[0.08em] text-[#6B6660] uppercase">Votre fiche, en direct</span>
        </div>
        <div className="p-4">
          <div className="flex items-start gap-3.5">
            <span
              className="grid size-[70px] w-[56px] shrink-0 place-items-center rounded-xl bg-[repeating-linear-gradient(135deg,#EFEBE6_0px,#EFEBE6_5px,#E4DFD7_5px,#E4DFD7_10px)] bg-cover bg-center text-[15px] text-[#2A8355]"
              style={photoPreviewUrl ? { backgroundImage: `url(${photoPreviewUrl})`, backgroundColor: "rgba(61,184,122,0.13)" } : undefined}
            />
            <div className="min-w-0 flex-1">
              <span
                className="block text-[19px] tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-instrument-serif, Georgia, serif)", color: cardName === "Votre nom" ? "#C4BEB6" : "#1A1917" }}
              >
                {cardName}
              </span>
              <span className="mt-[3px] block text-[13px] font-semibold" style={{ color: values.titre.trim() ? "#E21D1B" : "#C4BEB6" }}>
                {values.titre.trim() || "Votre intitulé de poste"}
              </span>
              <span className="mt-[3px] block text-[12.5px] text-[#6B6660]">{metaBits.length ? metaBits.join(" · ") : "Ville et expérience"}</span>
            </div>
          </div>

          {values.specialites.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {values.specialites.map((s) => (
                <span key={s} className="rounded-full border border-[rgba(61,184,122,0.3)] bg-[rgba(61,184,122,0.1)] px-2.5 py-1 text-[11.5px] font-medium text-[#2A8355]">
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3.5 flex flex-wrap items-baseline gap-2.5 border-t border-[#EFEBE6] pt-3.5">
            <span className="text-[15px] font-bold" style={{ color: hasTarif ? "#1A1917" : "#C4BEB6" }}>
              {hasTarif ? `${tarifJournalierAffiche(tarif, "horaire")} € / jour` : "Tarif à renseigner"}
            </span>
            <span className="text-[12px] text-[#6B6660]">
              {values.disponibilite ? DISPO_LABEL[values.disponibilite] : "Disponibilité à préciser"}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-4">
        <span className="mb-[11px] flex flex-wrap items-baseline gap-2.5">
          <span className="text-[11.5px] font-bold tracking-[0.08em] text-[#6B6660] uppercase">Complété</span>
          <span className="ml-auto text-[19px]" style={{ fontFamily: "var(--font-instrument-serif, Georgia, serif)" }}>
            {pctLabel}
          </span>
        </span>
        <span className="mb-[13px] block h-1.5 overflow-hidden rounded-full bg-[#F0EDE8]">
          <span className="block h-1.5 rounded-full bg-[#E21D1B] transition-[width] duration-300" style={{ width: pctWidth }} />
        </span>
        <div className="grid gap-2">
          {checklist.map((c) => (
            <span key={c.label} className="flex items-baseline gap-[9px] text-[12.5px]">
              <span className="size-1.5 shrink-0 -translate-y-0.5 rounded-full" style={{ background: c.ok ? "#3DB87A" : "#D9D3C9" }} />
              <span className="min-w-0" style={{ color: c.ok ? "#1A1917" : "#6B6660" }}>
                {c.label}
              </span>
              <span className="ml-auto shrink-0 text-[11.5px] font-semibold" style={{ color: c.ok ? "#2A8355" : "#98938B" }}>
                {c.ok ? "fait" : "à faire"}
              </span>
            </span>
          ))}
        </div>
      </div>

      <p className="text-[12px] leading-[1.6] text-[#98938B]">
        Rien n&rsquo;est publié avant votre validation finale. Vous pouvez fermer cette page et reprendre plus tard : vos réponses sont conservées.
      </p>
    </div>
  );
}
