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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      <PhotoBand />
      <SectorsSection />
      <MultiMetiers />
      <StepsSection />
      <VerifyBand />
      <AudienceSplit />
      <FinalCta />
    </>
  );
}
