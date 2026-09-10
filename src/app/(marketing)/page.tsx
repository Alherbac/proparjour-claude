import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/marketing/hero";
import { PhotoBand } from "@/components/marketing/photo-band";
import { SectorsSection } from "@/components/marketing/sectors-section";
import { MultiMetiers } from "@/components/marketing/multi-metiers";
import { StepsSection } from "@/components/marketing/steps-section";
import { AudienceSplit } from "@/components/marketing/audience-split";
import { VerifyBand } from "@/components/marketing/verify-band";
import { FinalCta } from "@/components/marketing/final-cta";

export default async function Home() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: vitrine },
  ] = await Promise.all([
    supabase.auth.getUser(),
    // Portraits qui défilent dans le bandeau photo — tous les
    // prestataires inscrits ayant une photo, validés ou non (la vue
    // `prestataires_vitrine`, migration 0049, n'expose que des champs
    // d'affichage : prénom, intitulé, métier, ville, photo). Aucune
    // image de repli inventée.
    supabase
      .from("prestataires_vitrine")
      .select("id, prenom, titre, metier, statut_verification, photo_url")
      .not("photo_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const photosVitrine = (vitrine ?? [])
    .filter((p) => p.photo_url != null)
    .map((p) => ({
      id: p.id,
      prenom: p.prenom,
      titre: p.titre,
      metier: p.metier,
      verifie: p.statut_verification === "valide",
      photoUrl: p.photo_url as string,
    }));

  if (user) {
    const [{ data: estAdmin }, { data: estModerateur }] = await Promise.all([
      supabase.rpc("has_role", { check_role: "admin" }),
      supabase.rpc("has_role", { check_role: "moderator" }),
    ]);
    if (estAdmin || estModerateur) redirect("/admin");

    // Un prestataire connecté ne voit jamais cette page : src/proxy.ts
    // le redirige plus tôt vers /prestataire (avant même que ce
    // composant ne s'exécute) — voir estRouteReserveeRecruteurs.
    //
    // Un client (recruteur) connecté, en revanche, DOIT pouvoir atterrir
    // ici : c'est la landing page, et le logo ProParJour doit toujours y
    // ramener un client, quel que soit son état de connexion (règle
    // explicite "CORRECTION UX CRITIQUE" §logo). Rediriger un recruteur
    // connecté vers /prestataires ici entrait en conflit avec cette
    // règle — un clic sur le logo semblait "ne rien faire" pour un
    // client déjà connecté.
  }

  return (
    <>
      <Hero />
      <PhotoBand photos={photosVitrine} />
      <SectorsSection />
      <MultiMetiers />
      <StepsSection />
      <VerifyBand />
      <AudienceSplit />
      <FinalCta />
    </>
  );
}
