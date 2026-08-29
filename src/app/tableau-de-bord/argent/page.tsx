import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMissionsPrestataire } from "@/lib/missions";

export const metadata: Metadata = {
  title: "Mon argent — ProParJour",
};

export default async function ArgentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/argent");

  // Voir le même correctif dans tableau-de-bord/missions/page.tsx —
  // getMissionsPrestataire renvoie [] silencieusement si le profil
  // est introuvable, indiscernable d'un solde réellement vide.
  const { data: profilPrestataire } = await supabase
    .from("prestataires_profils")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profilPrestataire) redirect("/tableau-de-bord/accueil");

  const lignes = await getMissionsPrestataire(user.id);
  // Une mission annulée est remboursée au recruteur — le prestataire
  // n'a rien reçu et rien n'est en attente pour lui sur cette ligne,
  // elle n'a donc rien à faire dans "Mon argent".
  const avecPaiement = lignes
    .filter((l) => l.paiement?.statut === "sequestre" || l.paiement?.statut === "libere")
    .sort((a, b) => b.mission.date_mission.localeCompare(a.mission.date_mission));

  // "libéré" ne veut dire que "le recruteur a confirmé le service
  // fait" — pas "le virement a eu lieu" (modèle séquestre simple,
  // sans Stripe Connect : voir supabase/migrations/0035). On distingue
  // donc trois états réels plutôt que deux, en vérifiant quelles
  // lignes ont un virement effectivement enregistré côté admin.
  const idsLignesLiberees = avecPaiement.filter((l) => l.paiement?.statut === "libere").map((l) => l.id);
  const { data: versements } =
    idsLignesLiberees.length > 0
      ? await supabase.from("versements_prestataires").select("mission_ligne_id").in("mission_ligne_id", idsLignesLiberees)
      : { data: [] };
  const idsVerses = new Set((versements ?? []).map((v) => v.mission_ligne_id));

  function statutReel(l: (typeof avecPaiement)[number]): "en_attente" | "debloque" | "verse" {
    if (l.paiement?.statut === "sequestre") return "en_attente";
    return idsVerses.has(l.id) ? "verse" : "debloque";
  }

  const totalEnAttente = avecPaiement.filter((l) => statutReel(l) === "en_attente").reduce((s, l) => s + l.tarif_applique, 0);
  const totalDebloque = avecPaiement.filter((l) => statutReel(l) === "debloque").reduce((s, l) => s + l.tarif_applique, 0);
  const totalRecu = avecPaiement.filter((l) => statutReel(l) === "verse").reduce((s, l) => s + l.tarif_applique, 0);

  return (
    <div className="space-y-4">
      <h1 className="font-display-serif text-2xl text-foreground">Mon argent</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">En attente</p>
          <p className="font-heading text-xl font-semibold text-foreground">
            {totalEnAttente.toFixed(2)} €
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Débloqué, virement à venir</p>
          <p className="font-heading text-xl font-semibold text-foreground">{totalDebloque.toFixed(2)} €</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Reçu</p>
          <p className="font-heading text-xl font-semibold text-foreground">{totalRecu.toFixed(2)} €</p>
        </div>
      </div>

      <div className="space-y-2">
        {avecPaiement.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Rien à afficher pour l&apos;instant.
          </p>
        )}
        {avecPaiement.map((ligne) => (
          <div
            key={ligne.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-background p-4 shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarDays className="size-4 text-muted-foreground" />
                {ligne.mission.date_mission}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{ligne.mission.lieu}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">{ligne.tarif_applique} €</p>
              <p className="text-xs text-muted-foreground">
                {{ en_attente: "En attente", debloque: "Débloqué, virement à venir", verse: "Reçu" }[statutReel(ligne)]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
