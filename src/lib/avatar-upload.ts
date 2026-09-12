import { createClient } from "@/lib/supabase/client";

/**
 * Formats et taille acceptés pour une photo de profil — alignés sur les
 * limites du bucket `avatars` (migration 0057). Validé côté client pour
 * un message clair ; le bucket rejette de toute façon le reste.
 */
export const AVATAR_TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_TAILLE_MAX = 6 * 1024 * 1024;
export const AVATAR_ACCEPT_ATTR = AVATAR_TYPES_ACCEPTES.join(",");

const EXT_PAR_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** null = OK, sinon message d'erreur prêt à afficher. */
export function validerPhotoProfil(file: File): string | null {
  if (!(AVATAR_TYPES_ACCEPTES as readonly string[]).includes(file.type)) {
    return "Format non accepté — utilisez une image JPEG, PNG ou WebP.";
  }
  if (file.size > AVATAR_TAILLE_MAX) {
    return "Image trop lourde — 6 Mo maximum.";
  }
  return null;
}

/** Extension déduite du type MIME validé (jamais du nom de fichier). */
export function extensionAvatar(file: File): string {
  return EXT_PAR_TYPE[file.type] ?? "jpg";
}

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
  const invalide = validerPhotoProfil(file);
  if (invalide) return { success: false, error: invalide };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vous devez être connecté." };

  const chemin = `${user.id}/profile.${extensionAvatar(file)}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(chemin, file, { contentType: file.type, upsert: true });
  if (uploadError) {
    return { success: false, error: "Impossible d'envoyer cette photo pour le moment." };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(chemin);
  return { success: true, url: data.publicUrl };
}
