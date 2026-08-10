import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Chiffres réels affichés sur la landing page et la page À propos —
 * calculés depuis la base à chaque rendu, jamais des valeurs figées
 * dans le code. Aucun système d'avis/notation n'existe encore dans
 * l'app : ne jamais afficher de note moyenne tant que ce n'est pas
 * une vraie fonctionnalité.
 */
export async function getStatsPlateforme() {
  const supabase = await createClient();

  const [{ count: prestatairesValides }, { data: missionsTotal }] = await Promise.all([
    supabase
      .from("prestataires_profils")
      .select("*", { count: "exact", head: true })
      .eq("statut_verification", "valide")
      .eq("visible", true),
    // `missions` n'a pas de policy de lecture publique (données
    // semi-privées) — cette fonction expose uniquement le total via
    // SECURITY DEFINER, voir migration 0018.
    supabase.rpc("compter_missions_total"),
  ]);

  return {
    prestatairesValides: prestatairesValides ?? 0,
    missionsTotal: missionsTotal ?? 0,
  };
}

export type PrestataireVedette = {
  id: string;
  prenom: string | null;
  nom: string | null;
  ville: string;
  titre: string | null;
  metier: string;
  photo_url: string | null;
  cnaps_verifie: boolean;
};

/**
 * Deux vrais profils vérifiés à mettre en avant sur la landing (Hero)
 * — jamais des noms inventés. Tiré au hasard parmi tous les profils
 * validés avec photo à chaque rendu, pour qu'un visiteur ne voie pas
 * toujours les deux mêmes personnes.
 */
export async function getPrestatairesVedettes(): Promise<PrestataireVedette[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("prestataires_publics")
    .select("id, prenom, nom, ville, titre, metier, photo_url, cnaps_verifie")
    .not("photo_url", "is", null);

  const pool = data ?? [];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, 2);
}
