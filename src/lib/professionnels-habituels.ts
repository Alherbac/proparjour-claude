import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MetierType, StatutVerificationType } from "@/lib/supabase/database.types";

/**
 * "Professionnels habituels" / "récemment utilisés" (Bloc 6) —
 * calculés uniquement depuis l'historique réel des missions du
 * recruteur, jamais de donnée fictive.
 *
 * "A réellement travaillé avec" = ligne acceptée sur une mission
 * terminee ou litige (le service a eu lieu, contesté ou non) —
 * annulee est exclue (jamais réalisée), en_attente/confirmee/en_cours
 * ne sont pas encore arrivées à terme. "Habituel" = au moins
 * SEUIL_HABITUEL missions réelles avec ce prestataire ; en dessous,
 * il apparaît seulement dans "récemment utilisés".
 *
 * Utilise le client admin (comme getMissionsPrestataire pour les
 * paiements) uniquement pour ne pas perdre l'historique d'un
 * prestataire devenu invisible/non vérifié depuis — prestataires_publics
 * le masquerait alors que la mission a bien eu lieu. Ne sélectionne
 * que des champs d'affichage, jamais de donnée sensible.
 */

const SEUIL_HABITUEL = 2;
const CAP_RECENTS = 6;

export type ProfessionnelHistorique = {
  prestataireId: string;
  prenom: string | null;
  nom: string | null;
  photoUrl: string | null;
  ville: string | null;
  metier: MetierType | null;
  statutVerification: StatutVerificationType | null;
  nbMissions: number;
  derniereMission: string;
};

export async function getProfessionnelsHistorique(recruteurId: string): Promise<{
  habituels: ProfessionnelHistorique[];
  recents: ProfessionnelHistorique[];
}> {
  const supabase = await createClient();

  const { data: missions } = await supabase
    .from("missions")
    .select("id, date_mission")
    .eq("recruteur_id", recruteurId)
    .in("statut", ["terminee", "litige"]);

  if (!missions || missions.length === 0) return { habituels: [], recents: [] };

  const missionIds = missions.map((m) => m.id);
  const dateParMission = new Map(missions.map((m) => [m.id, m.date_mission]));

  const { data: lignes } = await supabase
    .from("mission_lignes")
    .select("mission_id, prestataire_id, statut_acceptation")
    .in("mission_id", missionIds)
    .eq("statut_acceptation", "acceptee");

  if (!lignes || lignes.length === 0) return { habituels: [], recents: [] };

  const parPrestataire = new Map<string, { nbMissions: number; derniereMission: string }>();
  for (const ligne of lignes) {
    const date = dateParMission.get(ligne.mission_id);
    if (!date) continue;
    const existant = parPrestataire.get(ligne.prestataire_id);
    if (existant) {
      existant.nbMissions += 1;
      if (date > existant.derniereMission) existant.derniereMission = date;
    } else {
      parPrestataire.set(ligne.prestataire_id, { nbMissions: 1, derniereMission: date });
    }
  }

  const admin = createAdminClient();
  const ids = [...parPrestataire.keys()];
  const { data: profils } = await admin
    .from("prestataires_profils")
    .select("id, metier, ville, photo_url, statut_verification, user_id")
    .in("id", ids);

  const userIds = (profils ?? []).map((p) => p.user_id);
  const { data: usersData } =
    userIds.length > 0
      ? await admin.from("users").select("id, prenom, nom").in("id", userIds)
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const userParId = new Map((usersData ?? []).map((u) => [u.id, u]));

  const tous: ProfessionnelHistorique[] = (profils ?? []).map((p) => {
    const agrege = parPrestataire.get(p.id)!;
    const u = userParId.get(p.user_id);
    return {
      prestataireId: p.id,
      prenom: u?.prenom ?? null,
      nom: u?.nom ?? null,
      photoUrl: p.photo_url,
      ville: p.ville,
      metier: p.metier,
      statutVerification: p.statut_verification,
      nbMissions: agrege.nbMissions,
      derniereMission: agrege.derniereMission,
    };
  });

  return {
    habituels: tous.filter((p) => p.nbMissions >= SEUIL_HABITUEL).sort((a, b) => b.nbMissions - a.nbMissions),
    recents: [...tous].sort((a, b) => b.derniereMission.localeCompare(a.derniereMission)).slice(0, CAP_RECENTS),
  };
}
