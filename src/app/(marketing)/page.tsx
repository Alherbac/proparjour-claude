import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/marketing/hero";
import { SectorsSection } from "@/components/marketing/sectors-section";
import { StepsSection } from "@/components/marketing/steps-section";
import { AudienceSplit } from "@/components/marketing/audience-split";
import { VerifyBand } from "@/components/marketing/verify-band";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { CoverageBand } from "@/components/marketing/coverage-band";
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
    // le redirige plus tôt vers /tableau-de-bord/accueil (avant même
    // que ce composant ne s'exécute) — voir estRouteReserveeRecruteurs.
    const { data: profil } = await supabase
      .from("users")
      .select("type")
      .eq("id", user.id)
      .maybeSingle();

    if (profil?.type === "recruteur_entreprise" || profil?.type === "recruteur_particulier") {
      redirect("/prestataires");
    }
  }

  return (
    <>
      <Hero />
      <SectorsSection />
      <StepsSection />
      <AudienceSplit />
      <VerifyBand />
      <TestimonialsSection />
      <CoverageBand />
      <FinalCta />
    </>
  );
}
