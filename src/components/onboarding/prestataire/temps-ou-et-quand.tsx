"use client";

import { Field, Pill } from "@/components/onboarding/prestataire/field";
import { VilleInput } from "@/components/onboarding/prestataire/ville-input";
import { DISPONIBILITE_VALUES, type DisponibiliteStatut, type PrestataireFormValues } from "@/components/onboarding/prestataire/schema";

const ZONES = ["Petite couronne", "Grande couronne", "Toute la région", "Déplacements nationaux"];

const DISPONIBILITES: Record<DisponibiliteStatut, { label: string; hint: string }> = {
  now: { label: "Dès maintenant", hint: "Votre fiche apparaît en tête des recherches." },
  soon: { label: "Dans les prochains jours", hint: "Vous préciserez vos dates depuis votre espace." },
  later: { label: "Je regarde seulement", hint: "Votre fiche reste visible, sans engagement." },
};

export function TempsOuEtQuand({
  values,
  setField,
  bad,
}: {
  values: PrestataireFormValues;
  setField: <K extends keyof PrestataireFormValues>(key: K, value: PrestataireFormValues[K]) => void;
  bad: Set<string>;
}) {
  function toggleZone(label: string) {
    setField(
      "zonesDeplacement",
      values.zonesDeplacement.includes(label)
        ? values.zonesDeplacement.filter((z) => z !== label)
        : [...values.zonesDeplacement, label],
    );
  }

  return (
    <div className="grid gap-5">
      <div>
        <h2
          className="mb-1.5 text-[27px] leading-[1.1] tracking-[-0.015em] text-[#1A1917]"
          style={{ fontFamily: "var(--font-instrument-serif, Georgia, serif)" }}
        >
          Où et quand
        </h2>
        <p className="text-[13.5px] leading-[1.6] text-[#6B6660]">Dernier temps. Les entreprises filtrent d&rsquo;abord par ville.</p>
      </div>

      <Field label="Votre ville principale">
        <VilleInput value={values.ville} onChange={(v) => setField("ville", v)} error={bad.has("ville")} />
      </Field>

      <div className="grid gap-2.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold tracking-[0.05em] text-[#6B6660] uppercase">Vous vous déplacez aussi</span>
          <span className="rounded-full border border-[#EAE6E0] bg-[#F6F4F0] px-2 py-[3px] text-[10.5px] font-bold text-[#6B6660]">
            facultatif
          </span>
        </span>
        <div className="flex flex-wrap gap-[7px]">
          {ZONES.map((zone) => (
            <Pill key={zone} label={zone} selected={values.zonesDeplacement.includes(zone)} onClick={() => toggleZone(zone)} />
          ))}
        </div>
      </div>

      <div className="grid gap-2.5">
        <span className="text-[12px] font-semibold tracking-[0.05em] text-[#6B6660] uppercase">Vous êtes disponible</span>
        {DISPONIBILITE_VALUES.map((id) => {
          const on = values.disponibilite === id;
          const info = DISPONIBILITES[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setField("disponibilite", id)}
              className={`flex w-full items-center gap-[13px] rounded-[14px] border p-4 text-left transition-colors ${
                on ? "border-[#E21D1B] bg-[rgba(226,29,27,0.04)]" : bad.has("disponibilite") ? "border-[#E21D1B] bg-white" : "border-[#EAE6E0] bg-white"
              }`}
            >
              <span className={`size-4 shrink-0 rounded-full border-[1.5px] ${on ? "border-[#E21D1B] bg-[#E21D1B]" : "border-[#DDD8D1] bg-white"}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-[#1A1917]">{info.label}</span>
                <span className="mt-0.5 block text-[12.5px] text-[#6B6660]">{info.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setField("accepteCgu", !values.accepteCgu)}
        className={`flex w-full items-start gap-[13px] rounded-[14px] border p-4 text-left transition-colors ${
          values.accepteCgu ? "border-[#3DB87A] bg-[rgba(61,184,122,0.06)]" : bad.has("accepteCgu") ? "border-[#E21D1B] bg-[#FCFBF9]" : "border-[#DDD8D1] bg-[#FCFBF9]"
        }`}
      >
        <span
          className={`grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px] text-[12px] font-bold text-white ${
            values.accepteCgu ? "border-[#3DB87A] bg-[#3DB87A]" : "border-[#DDD8D1] bg-white"
          }`}
        >
          {values.accepteCgu ? "✓" : ""}
        </span>
        <span className="min-w-0 flex-1 text-[13.5px] leading-[1.6] text-[#1A1917]">
          J&rsquo;accepte les{" "}
          <a href="/cgu" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#E21D1B] hover:text-[#B8130F]" onClick={(e) => e.stopPropagation()}>
            conditions générales
          </a>{" "}
          et la{" "}
          <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#E21D1B] hover:text-[#B8130F]" onClick={(e) => e.stopPropagation()}>
            politique de confidentialité
          </a>{" "}
          de ProParJour.
        </span>
      </button>
    </div>
  );
}
