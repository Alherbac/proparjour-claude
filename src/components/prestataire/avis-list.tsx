import { StarRating } from "@/components/prestataire/star-rating";
import type { AvisPublicsRow } from "@/lib/supabase/database.types";

export function AvisList({ avis }: { avis: AvisPublicsRow[] }) {
  if (avis.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Pas encore d&apos;avis pour ce profil.
      </p>
    );
  }

  return (
    <ul className="space-y-5">
      {avis.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">{item.auteur_prenom ?? "Recruteur ProParJour"}</p>
            <span className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString("fr-FR")}
            </span>
          </div>
          <StarRating note={item.note} className="mt-1" />
          {item.commentaire && (
            <p className="mt-2 text-sm text-muted-foreground">
              {item.commentaire}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
