"use client";

import { useRef } from "react";
import { GoogleButton } from "@/components/onboarding/recruteur/google-button";
import { Field, inputClasses } from "@/components/onboarding/prestataire/field";
import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";

function scorePass(pass: string): number {
  let n = 0;
  if (pass.length >= 8) n++;
  if (/[A-Z]/.test(pass)) n++;
  if (/\d/.test(pass)) n++;
  if (/[^A-Za-z0-9]/.test(pass)) n++;
  return n;
}

export function TempsQuiVousEtes({
  values,
  setField,
  bad,
  existingUser,
  onGoogleClick,
  photoPreviewUrl,
  onPhotoSelect,
}: {
  values: PrestataireFormValues;
  setField: <K extends keyof PrestataireFormValues>(key: K, value: PrestataireFormValues[K]) => void;
  bad: Set<string>;
  existingUser: boolean;
  onGoogleClick: () => void;
  photoPreviewUrl: string | null;
  onPhotoSelect: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const score = scorePass(values.motDePasse);
  const hasPhoto = Boolean(photoPreviewUrl);

  return (
    <div className="grid gap-5">
      <div>
        <h2
          className="mb-1.5 text-[27px] leading-[1.1] tracking-[-0.015em] text-[#1A1917]"
          style={{ fontFamily: "var(--font-instrument-serif, Georgia, serif)" }}
        >
          Qui vous êtes
        </h2>
        <p className="text-[13.5px] leading-[1.6] text-[#6B6660]">
          Vos coordonnées et votre portrait. Le téléphone et la photo sont demandés une fois pour toutes.
        </p>
      </div>

      {!existingUser && (
        <>
          <GoogleButton label="Continuer avec Google" onClick={onGoogleClick} />
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#EAE6E0]" />
            <span className="text-[12.5px] text-[#6B6660]">ou avec e-mail</span>
            <div className="h-px flex-1 bg-[#EAE6E0]" />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Prénom">
          <input
            value={values.prenom}
            onChange={(e) => setField("prenom", e.target.value)}
            placeholder="Camille"
            className={inputClasses(bad.has("prenom"))}
          />
        </Field>
        <Field label="Nom">
          <input
            value={values.nom}
            onChange={(e) => setField("nom", e.target.value)}
            placeholder="Renard"
            className={inputClasses(bad.has("nom"))}
          />
        </Field>
      </div>

      <Field label="Adresse e-mail">
        <input
          type="email"
          value={values.email}
          disabled={existingUser}
          onChange={(e) => setField("email", e.target.value)}
          placeholder="camille.renard@exemple.fr"
          className={inputClasses(bad.has("email"))}
        />
      </Field>

      {!existingUser && (
        <Field label="Mot de passe">
          <input
            type="password"
            value={values.motDePasse}
            onChange={(e) => setField("motDePasse", e.target.value)}
            placeholder="8 caractères, une majuscule, un chiffre"
            className={inputClasses(bad.has("motDePasse"))}
          />
          <span className="mt-[3px] flex gap-[5px]">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="block h-[3px] flex-1 rounded-sm"
                style={{ background: i < score ? (score >= 3 ? "#3DB87A" : "#E09A3A") : "#F0EDE8" }}
              />
            ))}
          </span>
        </Field>
      )}

      <Field
        label="Téléphone"
        badge="jamais public"
      >
        <input
          type="tel"
          value={values.telephone}
          onChange={(e) => setField("telephone", e.target.value)}
          placeholder="06 12 34 56 78"
          className={inputClasses(bad.has("telephone"))}
        />
        <span className="mt-1.5 block text-[12px] leading-[1.55] text-[#6B6660]">
          Visible uniquement par l&rsquo;équipe ProParJour, pour vous joindre en cas d&rsquo;imprévu sur une mission.
          Jamais transmis aux clients, jamais affiché sur votre fiche.
        </span>
      </Field>

      <div className="grid gap-2">
        <span className="text-[12px] font-semibold tracking-[0.05em] text-[#6B6660] uppercase">Votre portrait</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPhotoSelect(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`flex w-full flex-wrap items-center gap-4 rounded-[15px] border p-4 text-left transition-colors ${
            hasPhoto ? "border-solid bg-[rgba(61,184,122,0.06)]" : "border-dashed bg-[#FCFBF9]"
          } ${bad.has("photo") ? "border-[#E21D1B]" : hasPhoto ? "border-[rgba(61,184,122,0.34)]" : "border-[#DDD8D1]"}`}
        >
          <span
            className="grid size-[62px] shrink-0 place-items-center rounded-xl bg-[repeating-linear-gradient(135deg,#EFEBE6_0px,#EFEBE6_5px,#E4DFD7_5px,#E4DFD7_10px)]"
            style={
              hasPhoto
                ? { background: "rgba(61,184,122,0.13)", backgroundImage: photoPreviewUrl ? `url(${photoPreviewUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }
                : undefined
            }
          >
            {hasPhoto && !photoPreviewUrl && <span className="text-[18px] text-[#2A8355]">✓</span>}
          </span>
          <span className="min-w-[180px] flex-1">
            <span className="block text-[14.5px] font-semibold text-[#1A1917]">
              {hasPhoto ? "Portrait ajouté" : "Ajouter votre portrait"}
            </span>
            <span className="mt-1 block text-[12.5px] leading-[1.55] text-[#6B6660]">
              {hasPhoto
                ? "Vous pourrez le remplacer depuis votre espace à tout moment."
                : "Un profil avec portrait est nettement plus consulté. Cadrage aux épaules, tenue professionnelle."}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
