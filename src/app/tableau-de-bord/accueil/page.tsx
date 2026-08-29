import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Wallet, Bell, Clock, Briefcase, Send, FileWarning, UserCircle2, ArrowRight, Compass, RotateCcw, Users, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMissionsPrestataire, getMissionsRecruteur } from "@/lib/missions";
import { getCandidaturesPrestataire } from "@/lib/offres";
import { recommanderMissionsPourPrestataire } from "@/lib/matching";
import { calculerCompletudeProfil } from "@/lib/profil-completude";
import { getProfessionnelsHistorique } from "@/lib/professionnels-habituels";
import { listerSeries } from "@/app/actions/series";
import { MissionHeroCard } from "@/components/dashboard/mission-hero-card";
import { MissionCompactCard } from "@/components/dashboard/mission-compact-card";
import { DisponibilitesResume } from "@/components/dashboard/disponibilites-resume";
import { ProfessionnelHabituelCard } from "@/components/dashboard/professionnel-habituel-card";
import { Button } from "@/components/ui/button";
import type { CandidatureStatutType } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "Accueil — ProParJour",
};

const CAP_POUR_VOUS = 3;
const CAP_A_DECOUVRIR = 3;

export default async function AccueilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/accueil");

  const { data: profil } = await supabase
    .from("users")
    .select("prenom, type")
    .eq("id", user.id)
    .maybeSingle();

  if (profil?.type === "recruteur_entreprise" || profil?.type === "recruteur_particulier") {
    return <AccueilRecruteur prenom={profil.prenom} userId={user.id} />;
  }

  const { data: profilPrestataire } = await supabase
    .from("prestataires_profils")
    .select("id, metier, disponibilites, photo_url, titre, bio, specialites, statut_verification")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profilPrestataire) {
    return (
      <div className="space-y-4">
        <h1 className="font-display-serif text-2xl text-foreground">Bonjour {profil?.prenom || ""}</h1>
        <p className="text-muted-foreground">Complétez votre profil prestataire pour commencer à recevoir des missions.</p>
      </div>
    );
  }

  const [lignes, candidatures, recommandations, { data: experiences }, { data: justificatifs }] = await Promise.all([
    getMissionsPrestataire(user.id),
    getCandidaturesPrestataire(profilPrestataire.id),
    recommanderMissionsPourPrestataire(user.id),
    supabase.from("experiences").select("id").eq("prestataire_id", profilPrestataire.id),
    supabase.from("justificatifs").select("type_document, statut, motif_refus").eq("prestataire_id", profilPrestataire.id),
  ]);

  const candidaturesParOffre = Object.fromEntries(candidatures.map((c) => [c.offre_id, c.statut]));

  const aRepondre = lignes.filter((l) => l.statut_acceptation === "en_attente");
  const aVenir = lignes
    .filter(
      (l) =>
        l.statut_acceptation === "acceptee" &&
        (l.mission.statut === "confirmee" || l.mission.statut === "en_cours"),
    )
    .sort((a, b) => a.mission.date_mission.localeCompare(b.mission.date_mission));
  const prochaine = aVenir[0];

  const montantEnAttente = lignes
    .filter((l) => l.paiement?.statut === "sequestre")
    .reduce((somme, l) => somme + l.tarif_applique, 0);

  const debutMois = new Date();
  debutMois.setDate(1);
  const debutMoisIso = debutMois.toISOString().slice(0, 10);
  const revenusMoisRecu = lignes
    .filter((l) => l.paiement?.statut === "libere" && l.mission.date_mission >= debutMoisIso)
    .reduce((somme, l) => somme + l.tarif_applique, 0);

  const completude = calculerCompletudeProfil(profilPrestataire, experiences?.length ?? 0, justificatifs ?? []);
  const documentRefuse = (justificatifs ?? []).find((j) => j.statut === "refuse");

  const pourVous = recommandations.filter((r) => r.niveau !== "partiel").slice(0, CAP_POUR_VOUS);
  const aDecouvrir = recommandations.filter((r) => r.niveau === "partiel").slice(0, CAP_A_DECOUVRIR);

  const aFaire: { cle: string; texte: string; lien: string; libelleAction: string }[] = [];
  if (aRepondre.length > 0) {
    aFaire.push({
      cle: "reponse",
      texte:
        aRepondre.length === 1 ? "Une mission attend votre réponse" : `${aRepondre.length} missions attendent votre réponse`,
      lien: "/tableau-de-bord/missions",
      libelleAction: "Répondre",
    });
  }
  if (documentRefuse) {
    aFaire.push({
      cle: "document",
      texte: "Un document a été refusé — remplacez-le pour rester vérifié.",
      lien: "/tableau-de-bord/compte",
      libelleAction: "Mettre à jour",
    });
  }
  if (profilPrestataire.disponibilites.length === 0) {
    aFaire.push({
      cle: "disponibilites",
      texte: "Vos disponibilités ne sont pas renseignées — vous n'apparaissez dans aucune recommandation.",
      lien: "/tableau-de-bord/compte#disponibilites",
      libelleAction: "Renseigner",
    });
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display-serif text-2xl text-foreground">Bonjour {profil?.prenom || ""} 👋</h1>

      {aFaire.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="font-heading text-lg font-semibold text-foreground">À faire</h2>
          {aFaire.map((item) => (
            <Link
              key={item.cle}
              href={item.lien}
              className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10"
            >
              <div className="flex items-center gap-3">
                {item.cle === "document" ? (
                  <FileWarning className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Bell className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                <p className="text-sm font-medium text-foreground">{item.texte}</p>
              </div>
              <span className="shrink-0 text-sm font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400">
                {item.libelleAction}
              </span>
            </Link>
          ))}
        </section>
      )}

      <section>
        <h2 className="font-heading text-xl font-semibold text-foreground">🎯 Vos meilleures opportunités</h2>
        {pourVous.length === 0 && aDecouvrir.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            Aucune mission ouverte ne correspond à votre métier pour l&apos;instant. Vérifiez vos disponibilités, ou explorez
            toutes les missions.
          </p>
        ) : (
          <>
            {pourVous.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  {pourVous.length} mission{pourVous.length > 1 ? "s" : ""} correspond{pourVous.length > 1 ? "ent" : ""}{" "}
                  particulièrement à votre profil.
                </p>
                <div className="mt-3">
                  <MissionHeroCard
                    recommandation={pourVous[0]}
                    statutCandidature={candidaturesParOffre[pourVous[0].offre.id] as CandidatureStatutType | undefined}
                  />
                </div>
                {pourVous.length > 1 && (
                  <div className="mt-3 space-y-3">
                    {pourVous.slice(1).map((r) => (
                      <MissionCompactCard
                        key={r.offre.id}
                        recommandation={r}
                        statutCandidature={candidaturesParOffre[r.offre.id] as CandidatureStatutType | undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {aDecouvrir.length > 0 && (
              <div className="mt-6">
                <h3 className="font-heading text-base font-semibold text-foreground">À découvrir</h3>
                <p className="text-sm text-muted-foreground">Moins parfaitement adaptées, mais qui peuvent vous intéresser.</p>
                <div className="mt-3 space-y-3">
                  {aDecouvrir.map((r) => (
                    <MissionCompactCard
                      key={r.offre.id}
                      recommandation={r}
                      statutCandidature={candidaturesParOffre[r.offre.id] as CandidatureStatutType | undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <Link
          href="/tableau-de-bord/offres"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary"
        >
          <Compass className="size-4" />
          Explorer toutes les missions
          <ArrowRight className="size-3.5" />
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/tableau-de-bord/missions"
          className="block rounded-2xl border border-border bg-background p-5 shadow-sm"
        >
          <p className="text-sm font-medium text-muted-foreground">Prochaine mission</p>
          {prochaine ? (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <CalendarDays className="size-4 text-muted-foreground" />
                {prochaine.mission.date_mission} · {prochaine.heure_debut}–{prochaine.heure_fin}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {prochaine.mission.lieu}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Aucune mission à venir pour l&apos;instant.</p>
          )}
        </Link>

        <Link
          href="/tableau-de-bord/argent"
          className="flex items-center gap-3 rounded-2xl border border-border bg-background p-5 shadow-sm"
        >
          <Wallet className="size-6 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Revenus ce mois-ci</p>
            <p className="font-heading text-xl font-semibold text-foreground">{revenusMoisRecu.toFixed(2)} €</p>
            <p className="text-xs text-muted-foreground">{montantEnAttente.toFixed(2)} € en attente</p>
          </div>
        </Link>
      </div>

      <DisponibilitesResume disponibilites={profilPrestataire.disponibilites} />

      {completude.pourcentage < 100 && (
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <UserCircle2 className="size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Augmentez vos opportunités</h2>
              <p className="text-sm text-muted-foreground">Votre profil est complet à {completude.pourcentage}%.</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {completude.manquants.map((item) => (
              <li key={item.cle}>
                <Link
                  href={item.lien}
                  className="text-sm text-foreground underline underline-offset-2 hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Le prix est fixé par le prestataire sur son profil ; réserver et
 * payer revient à accepter ce prix, comme un devis. La mission
 * commence à la date prévue — il ne reste au prestataire qu'à
 * confirmer sa disponibilité, jamais à renégocier un tarif. D'où le
 * vocabulaire "en attente de confirmation" plutôt que "en attente de
 * réponse" côté recruteur.
 */
async function AccueilRecruteur({ prenom, userId }: { prenom: string | null; userId: string }) {
  const [missions, { habituels }, series] = await Promise.all([
    getMissionsRecruteur(userId),
    getProfessionnelsHistorique(userId),
    listerSeries(),
  ]);
  const seriesActives = series.filter((s) => s.statut === "active");

  const enAttente = missions.filter((m) => m.statut === "en_attente");
  const aVenir = missions
    .filter((m) => m.statut === "confirmee" || m.statut === "en_cours")
    .sort((a, b) => a.date_mission.localeCompare(b.date_mission));
  const prochaine = aVenir[0];

  const debutMois = new Date();
  debutMois.setDate(1);
  const depensesMois = missions
    .filter((m) => m.date_mission >= debutMois.toISOString().slice(0, 10) && m.statut !== "annulee")
    .reduce((somme, m) => somme + m.montant_total, 0);

  const refaisables = missions
    .filter((m) => (m.statut === "terminee" || m.statut === "litige") && m.lignes.some((l) => l.statut_acceptation === "acceptee"))
    .sort((a, b) => b.date_mission.localeCompare(a.date_mission))
    .slice(0, 2);

  return (
    <div className="space-y-8">
      <h1 className="font-display-serif text-2xl text-foreground">Bonjour {prenom || ""} 👋</h1>

      {enAttente.length > 0 && (
        <Link
          href="/tableau-de-bord/missions"
          className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <Clock className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-foreground">
              {enAttente.length === 1
                ? "Une mission attend la confirmation du prestataire"
                : `${enAttente.length} missions attendent une confirmation`}
            </p>
            <p className="text-sm text-muted-foreground">Touchez pour voir</p>
          </div>
        </Link>
      )}

      <section>
        <h2 className="font-heading text-lg font-semibold text-foreground">Votre prochaine mission</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Link href="/tableau-de-bord/missions" className="block rounded-2xl border border-border bg-background p-5 shadow-sm">
            {prochaine ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  {prochaine.date_mission}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  {prochaine.lieu}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune mission à venir pour l&apos;instant.</p>
            )}
          </Link>

          <Link href="/tableau-de-bord/missions" className="flex items-center gap-3 rounded-2xl border border-border bg-background p-5 shadow-sm">
            <Wallet className="size-6 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dépenses ce mois-ci</p>
              <p className="font-heading text-xl font-semibold text-foreground">{depensesMois.toFixed(2)} €</p>
            </div>
          </Link>
        </div>
      </section>

      {habituels.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
              <Users className="size-5 text-primary" />
              Votre équipe habituelle
            </h2>
            <Link href="/tableau-de-bord/professionnels" className="text-sm font-medium text-primary underline underline-offset-2">
              Voir tous
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {habituels.slice(0, 3).map((h) => (
              <ProfessionnelHabituelCard key={h.prestataireId} professionnel={h} />
            ))}
          </div>
        </section>
      )}

      {refaisables.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <RotateCcw className="size-5 text-primary" />
            Refaire rapidement
          </h2>
          <div className="mt-3 space-y-3">
            {refaisables.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    Mission du {m.date_mission} — {m.lignes.length} professionnel{m.lignes.length > 1 ? "s" : ""}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{m.lieu}</p>
                </div>
                <Button render={<Link href={`/tableau-de-bord/missions/${m.id}/refaire`} />} size="sm" className="shrink-0 rounded-full">
                  Refaire
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {seriesActives.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
              <Repeat className="size-5 text-primary" />
              Vos séries récurrentes
            </h2>
            <Link href="/tableau-de-bord/series" className="text-sm font-medium text-primary underline underline-offset-2">
              Voir toutes
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {seriesActives.slice(0, 2).map((s) => (
              <Link
                key={s.id}
                href={`/tableau-de-bord/series/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{s.titre}</p>
                  <p className="truncate text-sm text-muted-foreground">{s.lieu}</p>
                </div>
                {s.prochaineOccurrence && (
                  <span className="shrink-0 text-sm text-muted-foreground">Prochaine : {s.prochaineOccurrence}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-heading text-lg font-semibold text-foreground">Besoin de personnel ?</h2>
        <Link
          href="/prestataires?mode=publier"
          className="mt-3 flex items-center gap-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-primary via-primary to-red-900 p-6 text-white shadow-lg transition-transform hover:scale-[1.01]"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Send className="size-6" />
          </span>
          <div>
            <p className="font-heading text-lg font-semibold">Créer un nouveau besoin</p>
            <p className="text-sm text-white/75">Décrivez votre besoin, ProParJour vous propose les bons professionnels.</p>
          </div>
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/tableau-de-bord/missions"
          className="flex items-center gap-3 rounded-2xl border border-border bg-background p-5 shadow-sm"
        >
          <Compass className="size-6 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Mes missions</p>
            <p className="text-sm text-muted-foreground">À venir, en cours, terminées</p>
          </div>
        </Link>

        <Link
          href="/tableau-de-bord/mes-offres"
          className="flex items-center gap-3 rounded-2xl border border-border bg-background p-5 shadow-sm"
        >
          <Briefcase className="size-6 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Mes offres</p>
            <p className="text-sm text-muted-foreground">Offres publiées et candidatures reçues</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
