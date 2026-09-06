import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfilCandidat } from "@/lib/offres";
import { marquerProfilConsulte } from "@/app/client/actions";
import { EcrireButton } from "@/app/client/candidats/[id]/ecrire-button";
import { Badge } from "@/app/client/_components/badge";
import { LABEL_METIER } from "@/app/client/_types";
import type { MetierType } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Profil du candidat — ProParJour" };

const STATUT_INFO: Record<string, { label: string; tone: "vert" | "orange" | "rouge" }> = {
  valide: { label: "Profil vérifié", tone: "vert" },
  en_attente: { label: "Vérification en cours", tone: "orange" },
  refuse: { label: "Vérification refusée", tone: "rouge" },
};

/**
 * Migré depuis l'ancien /tableau-de-bord/candidats/[id] — même
 * logique et données (getProfilCandidat, via le client admin) :
 * CETTE fiche reste accessible même si le profil n'est pas encore
 * public/validé, contrairement à /prestataires/[id]. Ne pas la
 * remplacer par la fiche publique — c'est le correctif demandé.
 */
export default async function PageProfilCandidat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/client/candidats/${id}`);

  const profil = await getProfilCandidat(id, user.id);
  if (!profil) notFound();
  await marquerProfilConsulte(id);

  const nom = `${profil.prenom ?? "Prestataire"} ${profil.nom?.charAt(0) ?? ""}`.trim();
  const statut = STATUT_INFO[profil.statutVerification] ?? STATUT_INFO.en_attente;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/client/candidatures" className="inline-flex items-center gap-1.5 text-[13px] text-[#6B6660] transition-colors hover:text-[#1A1917]">
        <ArrowLeft className="size-3.5" />
        Retour aux candidatures
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        {profil.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
          <img src={profil.photoUrl} alt={nom} className="size-20 shrink-0 rounded-[14px] object-cover" />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-[14px] bg-[#F6F4F0] text-[24px] font-bold text-[#98938B]">
            {(profil.prenom ?? "P").charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif)" }}>{nom}</h1>
          <p className="text-[13.5px] font-semibold" style={{ color: "#E21D1B" }}>{profil.titre || LABEL_METIER[profil.metier as MetierType]}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[13px] text-[#6B6660]">
              <MapPin className="size-3.5" />
              {profil.ville}
            </span>
            <Badge tone={statut.tone}>{statut.label}</Badge>
          </div>
        </div>
        {profil.candidatureStatut === "en_attente" && <EcrireButton candidatureId={id} />}
      </div>

      {profil.statutVerification !== "valide" && (
        <p className="rounded-[14px] border p-3.5 text-[13px]" style={{ borderColor: "rgba(224,154,58,.36)", backgroundColor: "rgba(224,154,58,.1)", color: "#96662A" }}>
          Ce profil n&apos;est pas encore visible publiquement — sa vérification est en cours. Vous le voyez ici uniquement parce qu&apos;il a candidaté à votre offre.
        </p>
      )}

      {profil.bio && (
        <div>
          <h2 className="text-[15px] font-bold text-[#1A1917]">À propos</h2>
          <p className="mt-1 whitespace-pre-line text-[13.5px] text-[#6B6660]">{profil.bio}</p>
        </div>
      )}

      {profil.specialites.length > 0 && (
        <div>
          <h2 className="text-[15px] font-bold text-[#1A1917]">Spécialités</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profil.specialites.map((s) => <Badge key={s} tone="gris">{s}</Badge>)}
          </div>
        </div>
      )}

      {profil.certifications.length > 0 && (
        <div>
          <h2 className="text-[15px] font-bold text-[#1A1917]">Certifications</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profil.certifications.map((c) => <Badge key={c} tone="gris">{c}</Badge>)}
          </div>
        </div>
      )}

      {profil.competences.length > 0 && (
        <div>
          <h2 className="text-[15px] font-bold text-[#1A1917]">Compétences</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profil.competences.map((c) => <Badge key={c} tone="gris">{c}</Badge>)}
          </div>
        </div>
      )}

      {profil.langues.length > 0 && (
        <div>
          <h2 className="text-[15px] font-bold text-[#1A1917]">Langues</h2>
          <p className="mt-1 text-[13.5px] text-[#6B6660]">{profil.langues.join(", ")}</p>
        </div>
      )}

      {profil.experiences.length > 0 && (
        <div>
          <h2 className="text-[15px] font-bold text-[#1A1917]">Expériences</h2>
          <div className="mt-2 space-y-2.5">
            {profil.experiences.map((e) => (
              <div key={e.id} className="rounded-[14px] border border-[#EAE6E0] bg-white p-4">
                <p className="text-[14px] font-semibold text-[#1A1917]">{e.intitule}</p>
                <p className="flex items-center gap-1.5 text-[12px] text-[#6B6660]">
                  <Clock3 className="size-3" />
                  {e.periode}
                  {e.employeur ? ` · ${e.employeur}` : ""}
                </p>
                {e.description && <p className="mt-1.5 text-[13px] text-[#6B6660]">{e.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {profil.formations.length > 0 && (
        <div>
          <h2 className="text-[15px] font-bold text-[#1A1917]">Formations</h2>
          <ul className="mt-2 space-y-1.5">
            {profil.formations.map((f) => (
              <li key={f.id} className="text-[13.5px] text-[#1A1917]">
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
