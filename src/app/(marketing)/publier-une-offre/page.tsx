import type { Metadata } from "next";
import { BesoinCapture } from "@/components/prestataire/besoin-capture";

export const metadata: Metadata = {
  title: "Publier une offre — ProParJour",
  description:
    "Décrivez votre besoin, ProParJour prépare l'offre et les professionnels concernés candidatent.",
};

/**
 * Route dédiée du parcours B ("Publier mon besoin") — README §8/§11,
 * ÉCLAIRCISSEMENT-DEUX-PARCOURS.txt. Volontairement séparée de
 * /prestataires (parcours A "Rechercher un professionnel") : ce
 * parcours ne doit jamais retomber sur le panier ni sur des résultats
 * de recherche/vignettes de prestataires — le client décrit un besoin,
 * publie l'offre, et les professionnels candidatent un par un (suivi
 * sur /client/candidatures).
 */
export default async function PublierUneOffrePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qRaw = sp.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 lg:px-8 lg:py-14">
      <BesoinCapture texteInitial={q} />
    </div>
  );
}
