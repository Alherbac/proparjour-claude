import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOffresPubliees, getCandidaturesPrestataire } from "@/lib/offres";
import { OffresBrowser } from "@/components/dashboard/offres-browser";

export const metadata: Metadata = {
  title: "Offres de mission — ProParJour",
};

export default async function OffresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/offres");

  const { data: profil } = await supabase
    .from("prestataires_profils")
    .select("id, metier")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profil) redirect("/tableau-de-bord");

  const [offres, candidatures] = await Promise.all([
    getOffresPubliees({}),
    getCandidaturesPrestataire(profil.id),
  ]);

  const candidaturesParOffre = Object.fromEntries(candidatures.map((c) => [c.offre_id, c.statut]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
      <OffresBrowser
        offres={offres}
        candidaturesParOffre={candidaturesParOffre}
        metierDefaut={profil.metier}
        postulable
        sousTitre="Les offres publiées sur le marché ouvert."
      />
    </div>
  );
}
