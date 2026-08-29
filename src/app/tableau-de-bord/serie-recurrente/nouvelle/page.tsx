import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfessionnelsHistorique } from "@/lib/professionnels-habituels";
import { getMissionPourRefaire } from "@/lib/refaire-mission";
import { CreerSerieForm } from "@/components/dashboard/creer-serie-form";

export const metadata: Metadata = { title: "Créer une série récurrente — ProParJour" };

export default async function NouvelleSeriePage({
  searchParams,
}: {
  searchParams: Promise<{ missionId?: string }>;
}) {
  const { missionId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/serie-recurrente/nouvelle");

  const { data: profil } = await supabase.from("users").select("type").eq("id", user.id).maybeSingle();
  const estRecruteur = profil?.type === "recruteur_entreprise" || profil?.type === "recruteur_particulier";
  if (!estRecruteur) redirect("/tableau-de-bord");

  const { habituels, recents } = await getProfessionnelsHistorique(user.id);
  const idsHabituels = new Set(habituels.map((h) => h.prestataireId));
  const candidats = [...habituels, ...recents.filter((r) => !idsHabituels.has(r.prestataireId))];

  const missionPrefill = missionId ? await getMissionPourRefaire(missionId, user.id) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8 lg:py-12">
      <h1 className="font-display-serif text-2xl text-foreground sm:text-3xl">Créer une mission récurrente</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Un besoin qui revient chaque semaine ou chaque mois ? Planifiez-le une fois, ProParJour vérifie la disponibilité de vos
        professionnels habituels sur chaque date.
      </p>

      <div className="mt-8">
        <CreerSerieForm
          candidats={candidats.map((c) => ({
            prestataireId: c.prestataireId,
            prenom: c.prenom,
            metier: c.metier,
            ville: c.ville,
            photoUrl: c.photoUrl,
            nbMissions: c.nbMissions,
          }))}
          prefill={
            missionPrefill
              ? {
                  lieu: missionPrefill.lieu,
                  titre: missionPrefill.description ?? "",
                  sousBesoins: missionPrefill.lignes.map((l) => ({
                    prestataireId: l.prestataireId,
                    prenom: l.prenom,
                    photoUrl: l.photoUrl,
                    metier: l.metier,
                    heureDebut: l.heureDebut,
                    heureFin: l.heureFin,
                    tarifHoraire: l.tarifHoraireEstime,
                  })),
                }
              : null
          }
        />
      </div>
    </div>
  );
}
