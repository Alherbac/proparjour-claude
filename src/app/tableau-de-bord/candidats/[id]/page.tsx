import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, BadgeCheck, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfilCandidat } from "@/lib/offres";
import { METIERS } from "@/config/metiers";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profil du candidat — ProParJour" };

const STATUT_LABEL: Record<string, { label: string; classe: string }> = {
  valide: { label: "Profil vérifié", classe: "bg-emerald-500 text-white" },
  en_attente: { label: "Vérification en cours", classe: "bg-amber-500 text-white" },
  refuse: { label: "Vérification refusée", classe: "bg-destructive text-white" },
};

export default async function ProfilCandidatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/tableau-de-bord/candidats/${id}`);

  const profil = await getProfilCandidat(id, user.id);
  if (!profil) notFound();

  const metier = METIERS.find((m) => m.id === profil.metier);
  const nom = `${profil.prenom ?? "Prestataire"} ${profil.nom?.charAt(0) ?? ""}`.trim();
  const statut = STATUT_LABEL[profil.statutVerification] ?? STATUT_LABEL.en_attente;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 lg:px-8 lg:py-14">
      <Link
        href="/tableau-de-bord/mes-offres"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Retour à mes offres
      </Link>

      <div className="mt-4 flex items-start gap-4">
        {profil.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
          <img src={profil.photoUrl} alt={nom} className="size-20 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div
            className={cn(
              "flex size-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-heading font-semibold text-foreground/70",
              metier?.accent.gradient,
            )}
          >
            {(profil.prenom ?? "P").charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display-serif text-2xl text-foreground">{nom}</h1>
          <p className={cn("text-sm font-medium", metier?.accent.text)}>{profil.titre || metier?.label}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {profil.ville}
            </span>
            <Badge className={cn("gap-1 text-xs font-medium", statut.classe)}>
              <BadgeCheck className="size-3.5" />
              {statut.label}
            </Badge>
          </div>
        </div>
      </div>

      {profil.statutVerification !== "valide" && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          Ce profil n&apos;est pas encore visible publiquement — sa vérification est en cours. Vous le voyez ici
          uniquement parce qu&apos;il a candidaté à votre offre.
        </p>
      )}

      {profil.bio && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold text-foreground">À propos</h2>
          <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{profil.bio}</p>
        </div>
      )}

      {profil.specialites.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold text-foreground">Spécialités</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profil.specialites.map((s) => (
              <Badge key={s} variant="secondary" className="font-normal">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {profil.certifications.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold text-foreground">Certifications</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profil.certifications.map((c) => (
              <Badge key={c} variant="secondary" className="font-normal">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {profil.competences.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold text-foreground">Compétences</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profil.competences.map((c) => (
              <Badge key={c} variant="secondary" className="font-normal">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {profil.langues.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold text-foreground">Langues</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{profil.langues.join(", ")}</p>
        </div>
      )}

      {profil.experiences.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold text-foreground">Expériences</h2>
          <ul className="mt-2 space-y-3">
            {profil.experiences.map((e) => (
              <li key={e.id} className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">{e.intitule}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3" />
                  {e.periode}
                  {e.employeur ? ` · ${e.employeur}` : ""}
                </p>
                {e.description && <p className="mt-1.5 text-sm text-muted-foreground">{e.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {profil.formations.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold text-foreground">Formations</h2>
          <ul className="mt-2 space-y-2">
            {profil.formations.map((f) => (
              <li key={f.id} className="text-sm text-foreground">
                {f.diplome} — {f.etablissement}
                {f.anneeObtention ? ` (${f.anneeObtention})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
