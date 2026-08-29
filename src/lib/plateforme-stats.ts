import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Chiffres réels affichés sur la landing page et la page À propos —
 * calculés depuis la base à chaque rendu, jamais des valeurs figées
 * dans le code.
 */
export async function getStatsPlateforme() {
  const supabase = await createClient();

  // Ni `prestataires_profils` ni `missions` n'ont de policy de lecture
  // publique côté ligne (données semi-privées, iban/bic/CNAPS pour la
  // première) — ces deux fonctions n'exposent que le total via
  // SECURITY DEFINER, voir migrations 0018 et 0032.
  const [{ data: prestatairesValides }, { data: missionsTotal }] = await Promise.all([
    supabase.rpc("compter_prestataires_valides"),
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
