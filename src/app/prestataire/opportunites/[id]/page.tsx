import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MapPin, CalendarDays, Clock, Euro } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { recommanderMissionsPourPrestataire } from "@/lib/matching";
import { montantMission } from "@/lib/duree";
import { CandidaterButton } from "@/app/prestataire/opportunites/candidater-button";
import { IconeCritere, classeTexteCritere } from "@/components/prestataire/critere-etat";
import { LABEL_METIER } from "@/app/prestataire/_types";
import { dateLongueFr } from "@/app/prestataire/_lib";
import type { CandidatureStatutType } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Détail de la mission — ProParJour" };

/**
 * Migré depuis l'ancien /tableau-de-bord/offres/[id] — même logique
 * (matching, candidature) et même action réelle (postulerOffre via
 * CandidaterButton), interface refaite dans le système visuel /prestataire.
 */
export default async function DetailOffrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/prestataire/opportunites/${id}`);

  const { data: profil } = await supabase
    .from("prestataires_profils")
    .select("id, statut_verification")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profil) redirect("/prestataire");

  const { data: offre } = await supabase.from("offres").select("*").eq("id", id).maybeSingle();
  if (!offre) notFound();

  const [{ data: candidature }, recommandations] = await Promise.all([
    supabase.from("candidatures").select("statut").eq("offre_id", id).eq("prestataire_id", profil.id).maybeSingle(),
    recommanderMissionsPourPrestataire(user.id),
  ]);

  const compatibilite = recommandations.find((r) => r.offre.id === id) ?? null;
  const total = montantMission(offre.heure_debut, offre.heure_fin, offre.tarif_horaire);
  const statutCandidature = candidature?.statut as CandidatureStatutType | undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/prestataire/opportunites" className="inline-flex items-center gap-1 text-[13px] text-[#6B6660] transition-colors hover:text-[#1A1917]">
        <ChevronLeft className="size-4" />
        Retour aux missions
      </Link>

      <div>
        <p className="text-[13px] font-semibold" style={{ color: "#E21D1B" }}>{LABEL_METIER[offre.metier]}</p>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>{offre.titre}</h1>
      </div>

      {compatibilite && (
        <div className="rounded-[18px] border-2 p-5" style={{ borderColor: "rgba(226,29,27,.3)", backgroundColor: "rgba(226,29,27,.04)" }}>
          <h2 className="text-[15px] font-bold text-[#1A1917]">{compatibilite.score}% compatible avec votre profil</h2>
          <p className="mt-1 text-[13px] text-[#6B6660]">Pourquoi cette mission vous correspond :</p>
          <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {compatibilite.criteres.map((critere) => (
              <li key={critere.cle} className={`flex items-center gap-1.5 text-[13px] text-[#1A1917] ${classeTexteCritere(critere.etat)}`}>
                <IconeCritere etat={critere.etat} className={`size-4 shrink-0 ${critere.etat === "correspond" ? "text-[#3DB87A]" : "text-[#98938B]"}`} />
                {critere.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
        <h2 className="text-[15px] font-bold text-[#1A1917]">La mission</h2>
        <div className="mt-3 space-y-2.5 text-[13.5px]">
          <p className="flex items-center gap-2 text-[#1A1917]"><MapPin className="size-4 shrink-0" style={{ color: "#98938B" }} />{offre.ville}</p>
          <p className="flex items-center gap-2 text-[#1A1917]"><CalendarDays className="size-4 shrink-0" style={{ color: "#98938B" }} />{dateLongueFr(offre.date_mission)}</p>
          <p className="flex items-center gap-2 text-[#1A1917]"><Clock className="size-4 shrink-0" style={{ color: "#98938B" }} />{offre.heure_debut.slice(0, 5)}–{offre.heure_fin.slice(0, 5)}</p>
          <p className="flex items-center gap-2 font-semibold text-[#1A1917]"><Euro className="size-4 shrink-0" style={{ color: "#98938B" }} />{total} € au total ({offre.tarif_horaire} €/heure)</p>
          <p className="text-[#6B6660]">1 poste</p>
        </div>
        {offre.description && <p className="mt-4 leading-relaxed text-[13.5px] text-[#6B6660]">{offre.description}</p>}
      </div>

      <CandidaterButton
        offreId={offre.id}
        statutInitial={statutCandidature}
        postulable={offre.statut === "publiee"}
        // Blocage sur profil non vérifié désactivé temporairement
        // (période de préparation, voir actions/offres.ts::postulerOffre)
        // — remettre `profil.statut_verification !== "valide" ? "..." :
        // undefined` dès que la vérification des profils est
        // opérationnelle.
        raisonBlocage={undefined}
      />
    </div>
  );
}
