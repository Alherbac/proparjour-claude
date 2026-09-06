"use client";

import { METIERS, type MetierId } from "@/config/metiers";
import { SPECIALTY_CATEGORIES, MAX_SPECIALITES } from "@/config/specialtyCategories";
import { Field, inputClasses, Pill } from "@/components/onboarding/prestataire/field";
import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";

// Vitrine du métier au temps 2 : placeholder réel déjà utilisé par
// l'ancien parcours (step-metier.tsx) — repris tel quel, rien
// d'inventé.
const TITRE_EXEMPLES: Record<MetierId, string> = {
  securite: "ex. Agent de sécurité événementiel, Coordinateur sécurité...",
  accueil: "ex. Hôte/hôtesse VIP & Luxe, Responsable coordination événementiel...",
  vente: "ex. Vendeur conseil, Responsable boutique...",
};

export function TempsCeQueVousFaites({
  values,
  setField,
  bad,
}: {
  values: PrestataireFormValues;
  setField: <K extends keyof PrestataireFormValues>(key: K, value: PrestataireFormValues[K]) => void;
  bad: Set<string>;
}) {
  const categories = values.metier ? SPECIALTY_CATEGORIES[values.metier] : [];
  const specCount = values.specialites.length;

  function toggleSpecialite(label: string) {
    if (values.specialites.includes(label)) {
      setField(
        "specialites",
        values.specialites.filter((s) => s !== label),
      );
      return;
    }
    if (specCount >= MAX_SPECIALITES) return;
    setField("specialites", [...values.specialites, label]);
  }

  return (
    <div className="grid gap-5">
      <div>
        <h2
          className="mb-1.5 text-[27px] leading-[1.1] tracking-[-0.015em] text-[#1A1917]"
          style={{ fontFamily: "var(--font-instrument-serif, Georgia, serif)" }}
        >
          Ce que vous faites
        </h2>
        <p className="text-[13.5px] leading-[1.6] text-[#6B6660]">
          C&rsquo;est ce qui remplit votre fiche et détermine les missions qui vous seront proposées.
        </p>
      </div>

      <div className="grid gap-2">
        <span className="text-[12px] font-semibold tracking-[0.05em] text-[#6B6660] uppercase">Votre secteur</span>
        {METIERS.map((m) => {
          const on = values.metier === m.id;
          const roles = SPECIALTY_CATEGORIES[m.id].map((c) => c.label).join(" · ");
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setField("metier", m.id)}
              className={`flex w-full items-center gap-3.5 rounded-[15px] border p-4 text-left transition-colors ${
                on ? "border-[#E21D1B] bg-[rgba(226,29,27,0.04)]" : bad.has("metier") ? "border-[#E21D1B] bg-white" : "border-[#EAE6E0] bg-white"
              }`}
            >
              <span className={`size-[34px] shrink-0 rounded-[10px] ${m.accent.bgSoft}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-[#1A1917]">{m.label}</span>
                <span className="mt-[3px] block text-[12.5px] leading-[1.4] text-[#6B6660]">{roles}</span>
              </span>
              <span
                className={`size-[18px] shrink-0 rounded-full border-[1.5px] ${on ? "border-[#E21D1B] bg-[#E21D1B]" : "border-[#DDD8D1] bg-white"}`}
              />
            </button>
          );
        })}
      </div>

      {values.metier && (
        <div className="grid gap-5" style={{ animation: "ppj-act-in 220ms cubic-bezier(.2,.8,.2,1) both" }}>
          <Field label="Votre intitulé de poste" hint="C'est la première ligne que les entreprises lisent sur votre fiche.">
            <input
              value={values.titre}
              onChange={(e) => setField("titre", e.target.value)}
              placeholder={TITRE_EXEMPLES[values.metier]}
              className={inputClasses(bad.has("titre"))}
            />
          </Field>

          <div className="grid gap-2.5">
            <span className="flex flex-wrap items-baseline gap-2.5">
              <span className="text-[12px] font-semibold tracking-[0.05em] text-[#6B6660] uppercase">Vos spécialités</span>
              <span className={`text-[12.5px] font-semibold ${specCount === 0 ? "text-[#98938B]" : "text-[#2A8355]"}`}>
                {specCount === 0 ? "aucune pour l’instant" : `${specCount} sur ${MAX_SPECIALITES}`}
              </span>
            </span>
            <div className="flex flex-wrap gap-[7px]">
              {categories.flatMap((categorie) =>
                categorie.specialites.map((label) => (
                  <Pill
                    key={label}
                    label={label}
                    selected={values.specialites.includes(label)}
                    disabled={!values.specialites.includes(label) && specCount >= MAX_SPECIALITES}
                    onClick={() => toggleSpecialite(label)}
                  />
                )),
              )}
            </div>
            <span className="text-[12px] leading-[1.55] text-[#6B6660]">
              Une à {MAX_SPECIALITES}, celles que vous maîtrisez vraiment. Vous pourrez en ajouter plus tard.
            </span>
            {bad.has("specialites") && (
              <span className="text-[12px] font-medium text-[#8E2A26]">Sélectionnez au moins une spécialité.</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Votre tarif horaire" hint="Vous pourrez l'ajuster à tout moment depuis votre tableau de bord.">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={values.tarifMontant}
                  onChange={(e) => setField("tarifMontant", e.target.value)}
                  placeholder="18"
                  className={`${inputClasses(bad.has("tarifMontant"))} pr-9`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[13px] text-[#98938B]">
                  € / h
                </span>
              </div>
            </Field>
            <Field label="Années d'expérience" badge="facultatif" hint="Renseigné, il rassure les entreprises.">
              <input
                type="number"
                min={0}
                value={values.anneesExperience}
                onChange={(e) => setField("anneesExperience", e.target.value)}
                placeholder="4"
                className={inputClasses(false)}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}
