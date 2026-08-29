import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PersonneAdmin } from "@/lib/admin/missions";
import type { MetierType } from "@/lib/supabase/database.types";

export type VersementAFaire = {
  missionLigneId: string;
  missionId: string;
  lieu: string;
  dateMission: string;
  metier: MetierType;
  montant: number;
  prestataire: PersonneAdmin | null;
};

export type VersementEffectue = VersementAFaire & {
  reference: string | null;
  verseLe: string;
  versePar: PersonneAdmin | null;
};

/**
 * Modèle de paiement actuel (séquestre simple, pas de Stripe Connect,
 * cf. audit consolidé du 2026-08-23) : `paiements.statut = 'libere'`
 * signifie seulement que le recruteur a confirmé le service fait —
 * l'argent est débloqué côté plateforme, mais rien n'atteste encore
 * qu'il a réellement été viré au prestataire. Une ligne de mission
 * "à verser" est une ligne dont le paiement est libéré et qui n'a pas
 * encore de ligne correspondante dans versements_prestataires (0035).
 */
export async function getVersementsAVerser(): Promise<VersementAFaire[]> {
  const admin = createAdminClient();

  const { data: paiementsLiberes } = await admin.from("paiements").select("mission_id").eq("statut", "libere");
  const missionIds = (paiementsLiberes ?? []).map((p) => p.mission_id);
  if (missionIds.length === 0) return [];

  const [{ data: lignes }, { data: missions }, { data: dejaVerses }] = await Promise.all([
    admin.from("mission_lignes").select("id, mission_id, prestataire_id, metier, tarif_applique").in("mission_id", missionIds),
    admin.from("missions").select("id, lieu, date_mission").in("id", missionIds),
    admin.from("versements_prestataires").select("mission_ligne_id"),
  ]);

  const idsVerses = new Set((dejaVerses ?? []).map((v) => v.mission_ligne_id));
  const lignesAVerser = (lignes ?? []).filter((l) => !idsVerses.has(l.id));
  if (lignesAVerser.length === 0) return [];

  const prestataireIds = [...new Set(lignesAVerser.map((l) => l.prestataire_id))];
  const { data: profils } = await admin.from("prestataires_profils").select("id, user_id").in("id", prestataireIds);
  const userIds = [...new Set((profils ?? []).map((p) => p.user_id))];
  const { data: users } = userIds.length > 0 ? await admin.from("users").select("id, prenom, nom").in("id", userIds) : { data: [] };

  const userParId = new Map((users ?? []).map((u) => [u.id, u]));
  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));
  const missionParId = new Map((missions ?? []).map((m) => [m.id, m]));

  return lignesAVerser
    .map((ligne) => {
      const mission = missionParId.get(ligne.mission_id);
      const profil = profilParId.get(ligne.prestataire_id);
      const user = profil ? userParId.get(profil.user_id) : null;
      if (!mission) return null;
      return {
        missionLigneId: ligne.id,
        missionId: ligne.mission_id,
        lieu: mission.lieu,
        dateMission: mission.date_mission,
        metier: ligne.metier,
        montant: ligne.tarif_applique,
        prestataire: user ? { id: user.id, prenom: user.prenom, nom: user.nom } : null,
      };
    })
    .filter((v): v is VersementAFaire => v !== null)
    .sort((a, b) => a.dateMission.localeCompare(b.dateMission));
}

/** Historique des virements déjà marqués comme effectués — le plus récent en premier. */
export async function getVersementsEffectues(limite = 50): Promise<VersementEffectue[]> {
  const admin = createAdminClient();

  const { data: versements } = await admin
    .from("versements_prestataires")
    .select("mission_ligne_id, reference, verse_le, verse_par")
    .order("verse_le", { ascending: false })
    .limit(limite);
  if (!versements || versements.length === 0) return [];

  const ligneIds = versements.map((v) => v.mission_ligne_id);
  const { data: lignes } = await admin
    .from("mission_lignes")
    .select("id, mission_id, prestataire_id, metier, tarif_applique")
    .in("id", ligneIds);
  const missionIds = [...new Set((lignes ?? []).map((l) => l.mission_id))];
  const { data: missions } = missionIds.length > 0 ? await admin.from("missions").select("id, lieu, date_mission").in("id", missionIds) : { data: [] };

  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  const adminIds = [...new Set(versements.map((v) => v.verse_par))];
  const { data: profils } = prestataireIds.length > 0 ? await admin.from("prestataires_profils").select("id, user_id").in("id", prestataireIds) : { data: [] };
  const profilUserIds = [...new Set((profils ?? []).map((p) => p.user_id))];
  const { data: users } = await admin.from("users").select("id, prenom, nom").in("id", [...new Set([...profilUserIds, ...adminIds])]);

  const userParId = new Map((users ?? []).map((u) => [u.id, u]));
  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));
  const missionParId = new Map((missions ?? []).map((m) => [m.id, m]));
  const ligneParId = new Map((lignes ?? []).map((l) => [l.id, l]));

  return versements
    .map((v) => {
      const ligne = ligneParId.get(v.mission_ligne_id);
      const mission = ligne ? missionParId.get(ligne.mission_id) : null;
      if (!ligne || !mission) return null;
      const profil = profilParId.get(ligne.prestataire_id);
      const user = profil ? userParId.get(profil.user_id) : null;
      const admin_ = userParId.get(v.verse_par);
      return {
        missionLigneId: ligne.id,
        missionId: ligne.mission_id,
        lieu: mission.lieu,
        dateMission: mission.date_mission,
        metier: ligne.metier,
        montant: ligne.tarif_applique,
        prestataire: user ? { id: user.id, prenom: user.prenom, nom: user.nom } : null,
        reference: v.reference,
        verseLe: v.verse_le,
        versePar: admin_ ? { id: admin_.id, prenom: admin_.prenom, nom: admin_.nom } : null,
      };
    })
    .filter((v): v is VersementEffectue => v !== null);
}
