"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Loader2, MailCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ActsNav, type TempsNav } from "@/components/onboarding/prestataire/acts-nav";
import { TempsQuiVousEtes } from "@/components/onboarding/prestataire/temps-qui-vous-etes";
import { TempsCeQueVousFaites } from "@/components/onboarding/prestataire/temps-ce-que-vous-faites";
import { TempsOuEtQuand } from "@/components/onboarding/prestataire/temps-ou-et-quand";
import { PreviewColumn } from "@/components/onboarding/prestataire/preview-column";
import { SuccessScreen } from "@/components/onboarding/prestataire/success-screen";
import { missingFor, type Manquant } from "@/components/onboarding/prestataire/validation";
import {
  PRESTATAIRE_DEFAULT_VALUES,
  disponibiliteVersChamps,
  prestataireSubmitSchema,
  type PrestataireFormValues,
} from "@/components/onboarding/prestataire/schema";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/supabase/auth-helpers";
import { completerProfilPrestataire } from "@/app/actions/inscription";
import { uploaderPhotoProfil, validerPhotoProfil } from "@/lib/avatar-upload";

const STORAGE_KEY = "proparjour:onboarding-prestataire:v2";
const INSCRIPTION_PATH = "/inscription/prestataire";

const TEMPS_META: { n: 1 | 2 | 3; title: string; sub: string }[] = [
  { n: 1, title: "Qui vous êtes", sub: "Coordonnées, téléphone confidentiel et portrait." },
  { n: 2, title: "Ce que vous faites", sub: "Secteur, intitulé, spécialités et tarif." },
  { n: 3, title: "Où et quand", sub: "Ville, déplacements et disponibilité." },
];

export function PrestataireWizard() {
  const [values, setValues] = useState<PrestataireFormValues>(PRESTATAIRE_DEFAULT_VALUES);
  const [act, setAct] = useState<1 | 2 | 3 | 4>(1);
  const [nudge, setNudge] = useState<Manquant[] | null>(null);
  const [nudgeKey, setNudgeKey] = useState(0);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [existingUser, setExistingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Un seul flux async : le brouillon local est appliqué après le
    // premier `await`, jamais de façon synchrone dans le corps de
    // l'effet (évite les rendus en cascade) — mais toujours après le
    // montage client, comme avant, pour ne pas désynchroniser le
    // rendu serveur (qui ne connaît pas le brouillon local).
    let annule = false;
    async function hydrater() {
      let brouillon: Partial<PrestataireFormValues> | null = null;
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          brouillon = JSON.parse(saved);
        } catch {
          // ignore corrupted local draft
        }
      }
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (annule) return;
      setValues((prev) => ({
        ...prev,
        ...brouillon,
        ...(data.user ? { email: data.user.email ?? "" } : {}),
      }));
      if (data.user) setExistingUser(data.user);
      setHydrated(true);
    }
    hydrater();
    return () => {
      annule = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }, [values, hydrated]);

  const ctx = useMemo(() => ({ existingUser: Boolean(existingUser), hasPhoto: Boolean(photoPreviewUrl) }), [existingUser, photoPreviewUrl]);

  const tempsNav: TempsNav[] = TEMPS_META.map((t) => ({ ...t, manquants: missingFor(t.n, values, ctx).length }));

  const bad = useMemo(() => new Set((nudge ?? []).map((m) => m.key)), [nudge]);

  function setField<K extends keyof PrestataireFormValues>(key: K, value: PrestataireFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setNudge(null);
  }

  function go(n: number) {
    setAct(n as 1 | 2 | 3);
    setNudge(null);
  }

  function back() {
    setAct((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
    setNudge(null);
  }

  function raiseNudge(manquants: Manquant[]) {
    setNudge(manquants);
    setNudgeKey((k) => k + 1);
  }

  async function handleGoogleClick() {
    const { error } = await signInWithGoogle(INSCRIPTION_PATH);
    if (error) setAuthError(error.message);
  }

  function handlePhotoSelect(file: File) {
    const invalide = validerPhotoProfil(file);
    if (invalide) {
      setAuthError(invalide);
      return;
    }
    setAuthError(null);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setNudge(null);
  }

  async function submit() {
    setAuthError(null);
    setSubmitting(true);
    try {
      if (!existingUser) {
        const supabase = createClient();
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: values.email.trim(),
          password: values.motDePasse,
        });
        if (error) {
          setAuthError(error.message);
          return;
        }
        if (!signUpData.session) {
          setAwaitingConfirmation(true);
          return;
        }
      }

      const { disponibilites, visible } = disponibiliteVersChamps(values.disponibilite!);
      const payload = prestataireSubmitSchema.parse({
        prenom: values.prenom.trim(),
        nom: values.nom.trim(),
        email: values.email.trim(),
        telephone: values.telephone.trim(),
        metier: values.metier,
        titre: values.titre.trim(),
        specialites: values.specialites,
        tarifMontant: Number(values.tarifMontant),
        anneesExperience: values.anneesExperience.trim() ? Number(values.anneesExperience) : null,
        ville: values.ville.trim(),
        zonesDeplacement: values.zonesDeplacement,
        disponibilites,
        visible,
        accepteCgu: values.accepteCgu,
      });

      const result = await completerProfilPrestataire(payload);
      if (!result.success) {
        setAuthError(result.error);
        return;
      }

      if (photoFile) {
        const photoResult = await uploaderPhotoProfil(photoFile);
        if (photoResult.success) {
          const supabase = createClient();
          await supabase.from("prestataires_profils").update({ photo_url: photoResult.url }).eq("id", result.data.profilId);
        } else {
          console.error("Échec de l'upload de la photo :", photoResult.error);
        }
      }

      window.localStorage.removeItem(STORAGE_KEY);
      setAct(4);
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (act < 3) {
      const manquants = missingFor(act as 1 | 2 | 3, values, ctx);
      if (manquants.length) {
        raiseNudge(manquants);
        return;
      }
      setAct((act + 1) as 1 | 2 | 3);
      setNudge(null);
      return;
    }

    // Publication : les trois temps sont librement cliquables, donc
    // tous doivent être revérifiés ici — pas seulement le temps
    // courant (voir PROMPT-INSCRIPTION.txt §7).
    for (const t of TEMPS_META) {
      const manquants = missingFor(t.n, values, ctx);
      if (manquants.length) {
        setAct(t.n);
        raiseNudge(manquants);
        return;
      }
    }
    submit();
  }

  if (act === 4) {
    return (
      <PageShell>
        <div className="rounded-[20px] border border-[#EAE6E0] bg-white p-[clamp(18px,3vw,30px)]">
          <SuccessScreen />
        </div>
      </PageShell>
    );
  }

  if (awaitingConfirmation) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md rounded-[20px] border border-[#EAE6E0] bg-white p-8 text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[rgba(226,29,27,0.1)] text-[#E21D1B]">
            <MailCheck className="size-7" />
          </span>
          <h1 className="text-[22px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif, Georgia, serif)" }}>
            Vérifiez votre e-mail
          </h1>
          <p className="mt-2 text-[13.5px] leading-[1.6] text-[#6B6660]">
            Cliquez sur le lien reçu par e-mail pour confirmer votre compte, puis reconnectez-vous pour terminer votre inscription.
          </p>
        </div>
      </PageShell>
    );
  }

  const isLast = act === 3;

  return (
    <PageShell>
      <div className="mb-6">
        <h1
          className="mb-2 text-[clamp(30px,3.4vw,42px)] leading-[1.05] tracking-[-0.02em] text-[#1A1917]"
          style={{ fontFamily: "var(--font-instrument-serif, Georgia, serif)" }}
        >
          Votre profil en trois temps
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-[1.6] text-[#6B6660]">
          Comptez cinq minutes. Vous voyez votre fiche se construire à droite, et vous pouvez revenir en arrière à tout moment.
        </p>
      </div>

      <ActsNav temps={tempsNav} current={act} onGo={go} />

      <div className="flex flex-wrap items-start gap-[22px]">
        <div className="min-w-0 flex-[1_1_440px] rounded-[20px] border border-[#EAE6E0] bg-white p-[clamp(18px,3vw,30px)]" style={{ animation: "ppj-act-in 240ms cubic-bezier(.2,.8,.2,1) both" }}>
          {act === 1 && (
            <TempsQuiVousEtes
              values={values}
              setField={setField}
              bad={bad}
              existingUser={Boolean(existingUser)}
              onGoogleClick={handleGoogleClick}
              photoPreviewUrl={photoPreviewUrl}
              onPhotoSelect={handlePhotoSelect}
            />
          )}
          {act === 2 && <TempsCeQueVousFaites values={values} setField={setField} bad={bad} />}
          {act === 3 && <TempsOuEtQuand values={values} setField={setField} bad={bad} />}

          {authError && <p className="mt-4 text-[13.5px] font-medium text-[#8E2A26]">{authError}</p>}

          <div className="mt-6 grid gap-3 border-t border-[#EFEBE6] pt-5">
            {nudge && (
              <div key={nudgeKey} className="rounded-[13px] border border-[#F8D3D1] bg-[#FDECEB] p-[13px_15px]" style={{ animation: "ppj-nudge 300ms ease both" }}>
                <span className="block text-[13.5px] font-bold text-[#8E2A26]">
                  {nudge.length === 1 ? "Il manque une chose" : `Il manque ${nudge.length} choses`}
                </span>
                <span className="mt-1 block text-[12.5px] leading-[1.55] text-[#8E2A26]">
                  Renseignez {nudge.map((m) => m.label).join(", ")}. Les champs concernés sont encadrés en rouge sur cette étape.
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-[11px]">
              <button
                type="button"
                onClick={next}
                disabled={submitting}
                className="inline-flex min-h-[50px] items-center gap-1.5 rounded-[13px] bg-[#E21D1B] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#B8130F] disabled:opacity-70"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {isLast ? "Publier ma fiche" : "Continuer"}
              </button>
              {act > 1 && (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex min-h-[50px] items-center rounded-[13px] border border-[#DDD8D1] bg-white px-5 text-[14.5px] font-semibold text-[#1A1917] transition-colors hover:border-[#1A1917]"
                >
                  Revenir
                </button>
              )}
              <span className="ml-auto text-[12.5px] text-[#98938B]">{isLast ? "Dernière étape" : `Étape ${act} sur 3`}</span>
            </div>
          </div>
        </div>

        <PreviewColumn values={values} photoPreviewUrl={photoPreviewUrl} existingUser={Boolean(existingUser)} />
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#FBFAF8]">
      <style>{`
        @keyframes ppj-act-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes ppj-nudge { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
      `}</style>
      <header className="sticky top-0 z-20 border-b border-[#EAE6E0] bg-[rgba(251,250,248,0.92)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-[22px] px-[28px] py-4">
          <Logo />
          <span className="ml-auto text-[13px] text-[#6B6660]">
            Déjà inscrit ?{" "}
            <Link href="/connexion" className="font-semibold text-[#E21D1B] hover:text-[#B8130F]">
              Se connecter
            </Link>
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-[1180px] px-[28px] py-[30px] pb-[72px]">{children}</div>
    </div>
  );
}
