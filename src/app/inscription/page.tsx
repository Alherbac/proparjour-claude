import type { Metadata } from "next";
import Link from "next/link";
import { Send, UserPlus, ArrowRight } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Créer mon compte — ProParJour",
  description: "Créez votre compte prestataire ou recruteur sur ProParJour.",
};

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const nextRaw = sp.next;
  const next = Array.isArray(nextRaw) ? nextRaw[0] : nextRaw;
  const hrefRecruteur = next ? `/inscription/recruteur?next=${encodeURIComponent(next)}` : "/inscription/recruteur";

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-secondary/30 px-4 py-16">
      <div className="mb-8">
        <Logo />
      </div>

      <div className="w-full max-w-2xl">
        <h1 className="text-center font-heading text-2xl font-semibold text-foreground">
          Comment souhaitez-vous utiliser ProParJour ?
        </h1>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
          Choisissez votre profil pour commencer — vous pourrez toujours créer
          l&apos;autre type de compte plus tard avec une adresse différente.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href={hrefRecruteur}
            className="group rounded-2xl border border-border bg-background p-6 shadow-sm transition-colors hover:border-primary"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Send className="size-5" />
            </span>
            <p className="mt-4 text-lg font-semibold text-foreground">Je recrute</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Entreprise ou particulier — réservez un agent, un hôte ou un
              vendeur qualifié pour votre mission.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Créer un compte recruteur
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/inscription/prestataire"
            className="group rounded-2xl border border-border bg-background p-6 shadow-sm transition-colors hover:border-primary"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus className="size-5" />
            </span>
            <p className="mt-4 text-lg font-semibold text-foreground">Je propose mes services</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Agent de sécurité, hôte/hôtesse ou vendeur — créez votre carte
              pro et recevez des missions.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Créer un compte prestataire
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Déjà inscrit·e ?{" "}
          <Button render={<Link href="/connexion" />} variant="link" className="h-auto p-0">
            Se connecter
          </Button>
        </p>
      </div>
    </div>
  );
}
