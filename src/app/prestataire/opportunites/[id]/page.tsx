import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MapPin, CalendarDays, Clock, Euro } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { recommanderMissionsPourPrestataire } from "@/lib/matching";
import { type JourneeMission, montantTotalJournees, trierJourneesParDate } from "@/lib/journees";
import { CandidaterButton } from "@/app/prestataire/opportunites/candidater-button";
import { IconeCritere, classeTexteCritere } from "@/components/prestataire/critere-etat";
import { LABEL_METIER } from "@/app/prestataire/_types";
import { dateLongueFr, dateCourteFr } from "@/app/prestataire/_lib";
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

  const [{ data: candidature }, recommandations, { data: journeesRows }] = await Promise.all([
    supabase.from("candidatures").select("statut").eq("offre_id", id).eq("prestataire_id", profil.id).maybeSingle(),
    recommanderMissionsPourPrestataire(user.id),
    // Mission multi-jours (migration 0062) — offres_journees est la
    // source de vérité pour le détail par jour ; repli sur l'unique
    // journée {date_mission, heure_debut, heure_fin} de l'offre si
    // aucune ligne n'existe encore.
    supabase.from("offres_journees").select("date, heure_debut, heure_fin").eq("offre_id", id).order("date", { ascending: true }),
  ]);

  const journees: JourneeMission[] =
    journeesRows && journeesRows.length > 0
      ? trierJourneesParDate(journeesRows.map((j) => ({ date: j.date, heureDebut: j.heure_debut.slice(0, 5), heureFin: j.heure_fin.slice(0, 5) })))
      : [{ date: offre.date_mission, heureDebut: offre.heure_debut.slice(0, 5), heureFin: offre.heure_fin.slice(0, 5) }];
  const plusieursJournees = journees.length > 1;

  const compatibilite = recommandations.find((r) => r.offre.id === id) ?? null;
  const total = montantTotalJournees(journees.map((j) => ({ ...j, tarifHoraire: offre.tarif_horaire })));
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
          {plusieursJournees ? (
            <div className="flex items-start gap-2 text-[#1A1917]">
              <CalendarDays className="mt-0.5 size-4 shrink-0" style={{ color: "#98938B" }} />
              <span className="min-w-0 flex-1 space-y-1">
                {journees.map((j, i) => (
                  <span key={i} className="flex items-center justify-between gap-3">
                    <span>{dateCourteFr(j.date)}</span>
                    <span className="text-[#6B6660]">{j.heureDebut}–{j.heureFin}</span>
                  </span>
                ))}
              </span>
            </div>
          ) : (
            <>
              <p className="flex items-center gap-2 text-[#1A1917]"><CalendarDays className="size-4 shrink-0" style={{ color: "#98938B" }} />{dateLongueFr(journees[0].date)}</p>
              <p className="flex items-center gap-2 text-[#1A1917]"><Clock className="size-4 shrink-0" style={{ color: "#98938B" }} />{journees[0].heureDebut}–{journees[0].heureFin}</p>
            </>
          )}
          <p className="flex items-center gap-2 font-semibold text-[#1A1917]"><Euro className="size-4 shrink-0" style={{ color: "#98938B" }} />{total} € au total ({offre.tarif_horaire} €/heure)</p>
          <p className="text-[#6B6660]">1 poste{plusieursJournees ? ` · ${journees.length} journées` : ""}</p>
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
