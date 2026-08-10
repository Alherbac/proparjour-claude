import { createClient } from "@/lib/supabase/client";
import { enregistrerJustificatif } from "@/app/actions/justificatifs";

/**
 * Upload direct vers Supabase Storage (le navigateur, déjà
 * authentifié, respecte la policy justificatifs_storage_insert_own :
 * le chemin doit commencer par son propre user_id) puis enregistre
 * la ligne via une Server Action (la mise à jour de la table n'est
 * pas ouverte au client par RLS, réservée à l'admin/modérateur pour
 * la décision — voir enregistrerJustificatif).
 */
export async function uploaderEtEnregistrerJustificatif(
  profilId: string,
  typeDocument: string,
  file: File,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };

  const extension = file.name.split(".").pop() ?? "bin";
  const chemin = `${user.id}/${typeDocument}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("justificatifs")
    .upload(chemin, file, { contentType: file.type });
  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  return enregistrerJustificatif(profilId, typeDocument, chemin);
}
