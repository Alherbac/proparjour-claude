"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/onboarding/form-field";
import { createClient } from "@/lib/supabase/client";

/** Espace réel selon le rôle — même logique que connexion-form.tsx. */
async function destinationSelonRole(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data: profil } = await supabase.from("users").select("type").eq("id", userId).maybeSingle();
  if (profil?.type === "prestataire") return "/prestataire";
  if (profil?.type === "admin") return "/admin";
  return "/client";
}

/**
 * Cette page n'est atteignable qu'avec la session temporaire posée par
 * /auth/confirm (type=recovery) après un clic sur le lien reçu par
 * e-mail — jamais en tapant l'URL directement sans lien valide, d'où
 * la vérification de session au montage plutôt que de supposer sa
 * présence.
 */
export function ReinitialiserMotDePasseForm() {
  const router = useRouter();
  const [sessionPrete, setSessionPrete] = useState<"verification" | "prete" | "absente">("verification");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionPrete(session ? "prete" : "absente");
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (motDePasse.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: updateError } = await supabase.auth.updateUser({ password: motDePasse });

    if (updateError || !data.user) {
      setSubmitting(false);
      setError(updateError?.message ?? "Impossible de mettre à jour le mot de passe.");
      return;
    }

    const destination = await destinationSelonRole(supabase, data.user.id);
    setSubmitting(false);
    router.push(destination);
    router.refresh();
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
            <h1 className="font-heading text-2xl font-semibold text-foreground">Nouveau mot de passe</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choisissez un nouveau mot de passe pour votre compte.</p>
          </div>

          {sessionPrete === "verification" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Vérification du lien…
            </p>
          )}

          {sessionPrete === "absente" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-destructive">
                Ce lien de réinitialisation est invalide ou a expiré.
              </p>
              <Link href="/mot-de-passe-oublie" className="text-sm text-primary underline">
                Demander un nouveau lien
              </Link>
            </div>
          )}

          {sessionPrete === "prete" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Nouveau mot de passe" htmlFor="motDePasse" hint="8 caractères minimum.">
                <Input
                  id="motDePasse"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={motDePasse}
                  onChange={(event) => setMotDePasse(event.target.value)}
                />
              </FormField>

              <FormField label="Confirmer le mot de passe" htmlFor="confirmation">
                <Input
                  id="confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </FormField>

              {error && <p className="text-sm font-medium text-destructive">{error}</p>}

              <Button type="submit" className="w-full rounded-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Enregistrer le mot de passe
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
