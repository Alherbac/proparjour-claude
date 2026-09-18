"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/onboarding/form-field";
import { GoogleButton } from "@/components/onboarding/recruteur/google-button";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/supabase/auth-helpers";
import { verifierLimiteConnexion } from "@/app/actions/auth";
import { cheminInterneOuNull } from "@/lib/redirection";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Espace réel d'un utilisateur selon son rôle — /client et /prestataire sont deux espaces distincts (contrairement à l'ancien /tableau-de-bord unique, qui se répartissait lui-même en interne). */
async function destinationSelonRole(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: profil } = await supabase.from("users").select("type").eq("id", userId).maybeSingle();
  if (profil?.type === "prestataire") return "/prestataire";
  if (profil?.type === "admin") return "/admin";
  return "/client";
}

export function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Sans "next" explicite, la destination dépend du rôle — déterminée
  // juste après la connexion réussie (voir handleSubmit), jamais
  // fixée à l'avance : /client et /prestataire sont deux espaces
  // distincts, contrairement à l'ancien /tableau-de-bord unique qui
  // savait lui-même se répartir en interne.
  // Filtré (audit prod I2) : on n'accepte qu'un chemin interne absolu,
  // jamais une URL externe ("//evil.com", "https://evil.com").
  const next = cheminInterneOuNull(searchParams.get("next"));
  // Distinct de `next` ci-dessus : ne transmet vers l'inscription que si un
  // vrai "next" a été fourni — sinon chaque inscription ordinaire serait
  // redirigée vers l'espace au lieu de l'écran de bienvenue habituel
  // (RecruteurSuccessScreen).
  const nextExplicite = next;

  // /auth/confirm redirige ici avec ?erreur=... quand l'échange du lien
  // (confirmation d'inscription ou réinitialisation de mot de passe)
  // échoue — sans ce message, l'utilisateur atterrissait sur une page
  // de connexion silencieuse, sans savoir pourquoi (lien expiré, déjà
  // utilisé, ou une nouvelle demande l'a invalidé).
  const MESSAGES_ERREUR: Record<string, string> = {
    reinitialisation:
      "Ce lien de réinitialisation a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
    confirmation: "Ce lien de confirmation a expiré ou a déjà été utilisé.",
  };
  const erreurLien = searchParams.get("erreur");

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(erreurLien ? MESSAGES_ERREUR[erreurLien] ?? null : null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const limite = await verifierLimiteConnexion(email);
    if (!limite.autorise) {
      setError(limite.erreur ?? "Trop de tentatives. Réessayez dans quelques minutes.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "E-mail ou mot de passe incorrect."
          : signInError.message,
      );
      setSubmitting(false);
      return;
    }

    // Réinitialisé avant la navigation (jamais après) : si `push` ne
    // change pas réellement de page pour une raison quelconque, le
    // bouton ne doit pas rester bloqué en chargement indéfiniment,
    // sans aucun retour visible (bug staging signalé — "il ne se
    // passe rien visuellement").
    setSubmitting(false);
    router.push(next ?? (await destinationSelonRole(supabase, signInData.user.id)));
    router.refresh();
  }

  async function handleGoogleClick() {
    const { error: oauthError } = await signInWithGoogle(next ?? "/");
    if (oauthError) setError(oauthError.message);
  }

  return (
    <div className="min-h-full bg-secondary/30">
      <header className="border-b border-border bg-background px-4 py-4 lg:px-8">
        <div className="mx-auto max-w-md">
          <Logo />
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-10 lg:px-8">
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Connexion
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Accédez à votre tableau de bord ProParJour.
            </p>
          </div>

          <GoogleButton label="Continuer avec Google" onClick={handleGoogleClick} />

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou avec e-mail</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="E-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </FormField>

            <FormField label="Mot de passe" htmlFor="motDePasse">
              <Input
                id="motDePasse"
                type="password"
                autoComplete="current-password"
                required
                value={motDePasse}
                onChange={(event) => setMotDePasse(event.target.value)}
              />
            </FormField>

            <p className="text-right text-sm">
              <Link href="/mot-de-passe-oublie" className="text-primary underline">
                Mot de passe oublié ?
              </Link>
            </p>

            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full rounded-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Se connecter
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link
              href={nextExplicite ? `/inscription/recruteur?next=${encodeURIComponent(nextExplicite)}` : "/inscription/recruteur"}
              className="text-primary underline"
            >
              Je recrute
            </Link>{" "}
            ·{" "}
            <Link href="/inscription/prestataire" className="text-primary underline">
              Je suis prestataire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
