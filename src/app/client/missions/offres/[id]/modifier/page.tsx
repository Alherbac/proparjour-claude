import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { creerClientSession } from "@/app/client/_supabase";
import { LABEL_METIER } from "@/app/client/_types";
import { FormulaireOffre } from "@/app/client/missions/offres/[id]/modifier/formulaire";

export const metadata: Metadata = { title: "Modifier l'offre — ProParJour" };

/**
 * Modification d'une offre publiée encore en recherche de candidat
 * (voir /client/missions/ecran.tsx, action "Modifier l'offre") — la
 * Server Action modifierOffre (actions/offres.ts, déjà existante,
 * jamais câblée à une interface avant ce lot) refuse déjà toute offre
 * ayant une candidature acceptée ; on applique la même règle ici pour
 * ne pas afficher un formulaire qui échouerait à l'enregistrement.
 */
export default async function ModifierOffrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/client/missions/offres/${id}/modifier`);

  const { data: offre } = await supabase.from("offres").select("*").eq("id", id).maybeSingle();
  if (!offre || offre.recruteur_id !== user.id) notFound();

  const { count: candidaturesAcceptees } = await supabase
    .from("candidatures")
    .select("id", { count: "exact", head: true })
    .eq("offre_id", id)
    .eq("statut", "acceptee");

  if (offre.statut !== "publiee" || (candidaturesAcceptees ?? 0) > 0) {
    redirect("/client/missions");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/client/missions" className="inline-flex items-center gap-1 text-[13px] text-[#6B6660] transition-colors hover:text-[#1A1917]">
        <ChevronLeft className="size-4" />
        Retour aux missions
      </Link>

      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Modifier l&apos;offre
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">
          {LABEL_METIER[offre.metier]} — le métier ne peut plus être changé une fois l&apos;offre publiée.
        </p>
      </div>

      <FormulaireOffre offre={offre} />
    </div>
  );
}
