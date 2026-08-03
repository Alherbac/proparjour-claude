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

export function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/tableau-de-bord";

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
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

    router.push(next);
    router.refresh();
  }

  async function handleGoogleClick() {
    const { error: oauthError } = await signInWithGoogle(next);
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
            <Link href="/inscription/recruteur" className="text-primary underline">
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
