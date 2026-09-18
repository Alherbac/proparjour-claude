"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/onboarding/form-field";
import { createClient } from "@/lib/supabase/client";

/**
 * Demande de réinitialisation — envoie le lien Supabase vers
 * /auth/confirm (déjà la seule route qui échange un code/token_hash
 * contre une session, voir sa docstring), avec type=recovery pour que
 * cette route sache renvoyer vers /reinitialiser-mot-de-passe plutôt
 * que dans la logique de complétion de profil habituelle.
 *
 * Toujours le même message de succès, que l'e-mail existe ou non
 * (Supabase ne renvoie pas d'erreur distincte pour un e-mail inconnu)
 * — jamais confirmer ou infirmer l'existence d'un compte.
 */
export function MotDePasseOublieForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent("/reinitialiser-mot-de-passe")}`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setEnvoye(true);
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
            <h1 className="font-heading text-2xl font-semibold text-foreground">Mot de passe oublié</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Indiquez votre e-mail : nous vous envoyons un lien pour choisir un nouveau mot de passe.
            </p>
          </div>

          {envoye ? (
            <p className="text-sm text-foreground">
              Si un compte existe pour <strong className="font-semibold">{email}</strong>, un e-mail avec un lien de
              réinitialisation vient de lui être envoyé. Pensez à vérifier vos spams.
            </p>
          ) : (
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

              {error && <p className="text-sm font-medium text-destructive">{error}</p>}

              <Button type="submit" className="w-full rounded-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Envoyer le lien
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/connexion" className="text-primary underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
