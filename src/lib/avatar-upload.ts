import { createClient } from "@/lib/supabase/client";

/**
 * Upload direct vers Supabase Storage (bucket public `avatars`, RLS
 * insert/update restreinte à son propre dossier — voir migration
 * 0017). Toujours le même chemin par utilisateur (`upsert: true`) :
 * une nouvelle photo remplace l'ancienne sans laisser de fichier
 * orphelin.
 */
export async function uploaderPhotoProfil(
  file: File,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };

  const extension = file.name.split(".").pop() ?? "jpg";
  const chemin = `${user.id}/profile.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(chemin, file, { contentType: file.type, upsert: true });
  if (uploadError) {
    return { success: false, error: "Impossible d'envoyer cette photo pour le moment." };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(chemin);
  return { success: true, url: data.publicUrl };
}
