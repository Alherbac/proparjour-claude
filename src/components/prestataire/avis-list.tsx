import { StarRating } from "@/components/prestataire/star-rating";
import type { Avis } from "@/data/freelances-demo";

export function AvisList({ avis }: { avis: Avis[] }) {
  if (avis.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Pas encore d&apos;avis pour ce profil.
      </p>
    );
  }

  return (
    <ul className="space-y-5">
      {avis.map((item, index) => (
        <li
          key={index}
          className="rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">{item.auteur}</p>
            <span className="text-xs text-muted-foreground">{item.date}</span>
          </div>
          <StarRating note={item.note} className="mt-1" />
          <p className="mt-2 text-sm text-muted-foreground">
            {item.commentaire}
          </p>
        </li>
      ))}
    </ul>
  );
}
