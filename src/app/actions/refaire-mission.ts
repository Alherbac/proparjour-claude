"use server";

import { recommanderPrestataires } from "@/lib/matching";
import type { MetierType, TarifType } from "@/lib/supabase/database.types";

/**
 * Vérifie, pour une nouvelle date, si chaque membre d'une équipe
 * passée reste disponible — et sinon propose des remplaçants
 * réellement compatibles. Réutilise recommanderPrestataires (Bloc 3)
 * tel quel, un appel par métier distinct de l'équipe : ni nouveau
 * moteur, ni requête par personne.
 */

export type RemplacantPropose = {
  prestataireId: string;
  prenom: string | null;
  photoUrl: string | null;
  ville: string;
  score: number;
  tarifMontant: number;
  tarifType: TarifType;
};

export type VerificationLigne = {
  prestataireId: string;
  metier: MetierType;
  disponible: boolean;
  remplacements: RemplacantPropose[];
};

export async function verifierEquipePourNouvelleDate(
  equipe: { prestataireId: string; metier: MetierType }[],
  ville: string,
  date: string,
  heureDebut: string,
  heureFin: string,
): Promise<VerificationLigne[]> {
  const metiersDistincts = [...new Set(equipe.map((e) => e.metier))];

  const entrees = await Promise.all(
    metiersDistincts.map(async (metier) => {
      const resultat = await recommanderPrestataires({ metier, ville, date, heureDebut, heureFin, quantite: 1 });
      return [metier, resultat.recommandations] as const;
    }),
  );
  const resultatsParMetier = new Map(entrees);
  const idsEquipe = new Set(equipe.map((e) => e.prestataireId));

  return equipe.map((membre) => {
    const pool = resultatsParMetier.get(membre.metier) ?? [];
    const recommandation = pool.find((r) => r.prestataire.id === membre.prestataireId);
    const disponible = recommandation?.criteres.find((c) => c.cle === "disponible")?.etat === "correspond";

    const remplacements: RemplacantPropose[] = disponible
      ? []
      : pool
          .filter((r) => r.prestataire.id !== membre.prestataireId && !idsEquipe.has(r.prestataire.id))
          .filter((r) => r.criteres.find((c) => c.cle === "disponible")?.etat === "correspond")
          .slice(0, 3)
          .map((r) => ({
            prestataireId: r.prestataire.id,
            prenom: r.prestataire.prenom,
            photoUrl: r.prestataire.photo_url,
            ville: r.prestataire.ville,
            score: r.score,
            tarifMontant: r.prestataire.tarif_montant,
            tarifType: r.prestataire.tarif_type,
          }));

    return { prestataireId: membre.prestataireId, metier: membre.metier, disponible, remplacements };
  });
}
