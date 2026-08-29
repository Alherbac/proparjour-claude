import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { heuresEntre } from "@/lib/duree";
import type { MetierType } from "@/lib/supabase/database.types";

/**
 * "Refaire cette mission" (Bloc 6) — reconstruit une équipe passée à
 * partir d'une mission réelle (jamais de donnée fictive). Utilise le
 * client admin pour les mêmes raisons que professionnels-habituels.ts
 * (un prestataire devenu invisible reste un fait réel de l'historique).
 *
 * Limite assumée : mission_lignes ne stocke pas tarif_type, seulement
 * tarif_applique (montant total déjà calculé pour la ligne). On
 * reconstruit un tarif horaire de référence en divisant par la durée
 * — exact si la ligne d'origine était bien horaire (cas très
 * largement majoritaire) et de toute façon éditable avant
 * confirmation, jamais présenté comme figé.
 */

export type LigneEquipePassee = {
  prestataireId: string;
  prenom: string | null;
  nom: string | null;
  photoUrl: string | null;
  ville: string | null;
  metier: MetierType;
  heureDebut: string;
  heureFin: string;
  tarifHoraireEstime: number;
};

export type MissionPourRefaire = {
  missionId: string;
  lieu: string;
  dateMission: string;
  description: string | null;
  lignes: LigneEquipePassee[];
};

export async function getMissionPourRefaire(
  missionId: string,
  recruteurId: string,
): Promise<MissionPourRefaire | null> {
  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("id, lieu, date_mission, description, recruteur_id, statut")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission || mission.recruteur_id !== recruteurId) return null;
  if (mission.statut !== "terminee" && mission.statut !== "litige") return null;

  const { data: lignes } = await supabase
    .from("mission_lignes")
    .select("prestataire_id, metier, heure_debut, heure_fin, tarif_applique, statut_acceptation")
    .eq("mission_id", missionId)
    .eq("statut_acceptation", "acceptee");

  if (!lignes || lignes.length === 0) return null;

  const admin = createAdminClient();
  const prestataireIds = lignes.map((l) => l.prestataire_id);
  const { data: profils } = await admin
    .from("prestataires_profils")
    .select("id, ville, photo_url, user_id")
    .in("id", prestataireIds);

  const userIds = (profils ?? []).map((p) => p.user_id);
  const { data: usersData } =
    userIds.length > 0
      ? await admin.from("users").select("id, prenom, nom").in("id", userIds)
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const userParId = new Map((usersData ?? []).map((u) => [u.id, u]));
  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));

  return {
    missionId: mission.id,
    lieu: mission.lieu,
    dateMission: mission.date_mission,
    description: mission.description,
    lignes: lignes.map((l) => {
      const profil = profilParId.get(l.prestataire_id);
      const u = profil ? userParId.get(profil.user_id) : undefined;
      const duree = heuresEntre(l.heure_debut, l.heure_fin);
      return {
        prestataireId: l.prestataire_id,
        prenom: u?.prenom ?? null,
        nom: u?.nom ?? null,
        photoUrl: profil?.photo_url ?? null,
        ville: profil?.ville ?? null,
        metier: l.metier,
        heureDebut: l.heure_debut,
        heureFin: l.heure_fin,
        tarifHoraireEstime: duree > 0 ? Math.round((l.tarif_applique / duree) * 100) / 100 : l.tarif_applique,
      };
    }),
  };
}
