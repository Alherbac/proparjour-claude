import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { METIERS } from "@/config/metiers";
import { SPECIALTY_CATEGORIES } from "@/config/specialtyCategories";
import { recommanderPrestataires } from "@/lib/matching";
import { tarifJournalierAffiche } from "@/lib/tarif";
import { AvisList } from "@/components/prestataire/avis-list";
import { FicheBandeau } from "@/components/prestataire/fiche-bandeau";
import { RecommandationCompactCard } from "@/components/prestataire/recommandation-compact-card";
import { IconeCritere } from "@/components/prestataire/critere-etat";
import { cn } from "@/lib/utils";

async function getPrestataire(id: string) {
  const supabase = await createClient();
  // SKIP_KYC_VALIDATION (jamais en production, voir migration 0061) :
  // même colonnes, sans exiger statut_verification = 'valide' — sinon
  // un prestataire trouvé par la recherche en mode test (même bascule)
  // retomberait quand même sur un 404 en cliquant sur sa fiche.
  const table =
    process.env.SKIP_KYC_VALIDATION === "true" ? "prestataires_publics_test_sans_validation" : "prestataires_publics";
  const { data } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function estEnMission(prestataireId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("prestataires_en_mission_ids");
  return (data ?? []).some((r) => r.prestataire_id === prestataireId);
}

async function getAvis(prestataireId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("avis_publics")
    .select("*")
    .eq("prestataire_id", prestataireId);
  return data ?? [];
}

async function getFormations(prestataireId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prestataires_formations")
    .select("*")
    .eq("prestataire_id", prestataireId)
    .order("annee_obtention", { ascending: false });
  return data ?? [];
}

async function getExperiences(prestataireId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("experiences")
    .select("*")
    .eq("prestataire_id", prestataireId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const prestataire = await getPrestataire(id);
  if (!prestataire) return {};

  const metier = METIERS.find((m) => m.id === prestataire.metier);
  const prenom = prestataire.prenom ?? "";
  return {
    title: `${prenom} — ${metier?.label} à ${prestataire.ville} | ProParJour`,
    description: prestataire.bio ?? undefined,
  };
}

export default async function PrestataireProfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const get = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const prestataire = await getPrestataire(id);
  if (!prestataire) notFound();
  const [formations, experiences, enMission, avis] = await Promise.all([
    getFormations(id),
    getExperiences(id),
    estEnMission(id),
    getAvis(id),
  ]);

  const metier = METIERS.find((m) => m.id === prestataire.metier);
  const prenom = prestataire.prenom ?? "Prestataire";

  // Compatibilité avec une mission précise, uniquement si on arrive
  // depuis une recommandation (date transmise dans l'URL) — réutilise
  // le moteur du Bloc 3 tel quel, jamais un second calcul de score.
  const dateMission = get("date");
  const villeMission = get("ville");
  const heureDebutMission = get("heureDebut");
  const heureFinMission = get("heureFin");
  // Lot F §19 — mêmes contraintes/contexte que ceux ayant produit la
  // recommandation d'origine (transmis par lienProposer, voir
  // recommandations-board.tsx), pour que ce recalcul retombe
  // EXACTEMENT sur le même score, jamais un second calcul divergent.
  const contraintesMission = (() => {
    const brut = get("contraintes");
    if (!brut) return undefined;
    try {
      return JSON.parse(brut) as { label: string; niveau: "requis" | "prefere" }[];
    } catch {
      return undefined;
    }
  })();
  const contexteMission = get("contexte") || undefined;
  const compatibilite = dateMission
    ? (
        await recommanderPrestataires({
          metier: prestataire.metier,
          ville: villeMission || prestataire.ville,
          date: dateMission,
          heureDebut: heureDebutMission || "09:00",
          heureFin: heureFinMission || "17:00",
          quantite: 1,
          contraintes: contraintesMission,
          contexte: contexteMission,
        })
      ).recommandations.find((r) => r.prestataire.id === id) ?? null
    : null;

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const similaires = (
    await recommanderPrestataires({
      metier: prestataire.metier,
      ville: prestataire.ville,
      date: aujourdhui,
      heureDebut: "09:00",
      heureFin: "17:00",
      quantite: 1,
    })
  ).recommandations.filter((r) => r.prestataire.id !== id).slice(0, 3);

  const cnapsVerifie = prestataire.metier === "securite" && prestataire.cnaps_verifie;
  const identiteVerifiee = prestataire.statut_verification === "valide";
  const premierJourDispo = prestataire.disponibilites[0] ?? null;
  const tarifJournalier = prestataire.tarif_montant > 0 ? tarifJournalierAffiche(prestataire.tarif_montant, prestataire.tarif_type) : null;

  // Spécialités groupées par catégorie — dossier design, "Fiche
  // professionnelle" (isFiche) : un bloc à filet rouge par catégorie
  // représentée, jamais une seule ligne aplatie.
  const specialitesParCategorie = (SPECIALTY_CATEGORIES[prestataire.metier] ?? [])
    .map((cat) => ({
      label: cat.label,
      items: cat.specialites.filter((s) => prestataire.specialites.includes(s)),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div>
      <FicheBandeau
        prestataire={{
          id: prestataire.id,
          prenom: prestataire.prenom,
          photoUrl: prestataire.photo_url,
          ville: prestataire.ville,
          tarifMontant: prestataire.tarif_montant,
          tarifType: prestataire.tarif_type,
          metier: prestataire.metier,
          certifications: prestataire.certifications,
        }}
        metierLabel={prestataire.titre || metier?.label || ""}
        filiere={metier?.filiere ?? ""}
        cnapsVerifie={cnapsVerifie}
        identiteVerifiee={identiteVerifiee}
        premierJourDispo={premierJourDispo}
        enMission={enMission}
      />

      <div className="mx-auto max-w-[1120px] px-6 py-[26px] sm:px-9 sm:pb-14">
        {compatibilite && (
          <section className="mb-[18px] rounded-[18px] border border-ppj-red-border bg-ppj-red-bg p-5">
            <h2 className="text-[17px] font-semibold text-ppj-red-text">
              {compatibilite.score}% compatible avec votre mission
            </h2>
            <p className="mt-1 text-sm text-ppj-red-text/80">Pourquoi ce profil vous est recommandé :</p>
            <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {compatibilite.criteres.map((critere) => (
                <li
                  key={critere.cle}
                  className={cn(
                    "flex items-center gap-1.5 text-sm text-ppj-ink",
                    critere.etat === "ne_correspond_pas" && "text-ppj-red-text/50 line-through",
                    critere.etat === "non_renseigne" && "text-ppj-red-text/50",
                  )}
                >
                  <IconeCritere
                    etat={critere.etat}
                    className={cn("size-4 shrink-0", critere.etat === "correspond" ? "text-primary" : "text-ppj-red-text/40")}
                  />
                  {critere.label}
                </li>
              ))}
            </ul>
            {/* Lot F §14 — même détail par contrainte que sur la carte de
                recommandation d'origine, jamais un second calcul. */}
            {compatibilite.contraintesDetail.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-ppj-red-border/50 pt-3">
                {compatibilite.contraintesDetail.map((d) => (
                  <li key={d.label} className="flex items-center gap-1.5 text-sm text-ppj-ink">
                    <IconeCritere
                      etat={d.etat}
                      className={cn("size-3.5 shrink-0", d.etat === "correspond" ? "text-primary" : "text-ppj-red-text/40")}
                    />
                    {d.label}
                    {d.etat === "non_renseigne" && " — non renseigné"}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="grid items-start gap-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
          <div className="grid min-w-0 gap-[18px] [&>section]:min-w-0">
            <section className="rounded-[18px] border border-ppj-line bg-white p-5">
              <h2 className="mb-2.5 text-[17px] font-semibold text-ppj-ink">Présentation</h2>
              <p className="text-[14.5px] leading-[1.65] text-ppj-neutral-text" style={{ textWrap: "pretty" }}>
                {prestataire.bio || "Ce prestataire n'a pas encore rédigé de présentation."}
              </p>
            </section>

            {specialitesParCategorie.length > 0 && (
              <section className="rounded-[18px] border border-ppj-line bg-white p-5">
                <h2 className="mb-4 text-[17px] font-semibold text-ppj-ink">Spécialités</h2>
                <div className="grid gap-3">
                  {specialitesParCategorie.map((cat) => (
                    <div key={cat.label} className="border-l-2 border-primary pl-3.5">
                      <span className="block text-[14.5px] font-semibold text-ppj-ink">{cat.label}</span>
                      <span className="mt-0.5 block text-[13.5px] text-ppj-text-3">{cat.items.join(" · ")}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {prestataire.certifications.length > 0 && (
              <section className="rounded-[18px] border border-ppj-line bg-white p-5">
                <h2 className="mb-4 text-[17px] font-semibold text-ppj-ink">Certifications</h2>
                <div className="grid gap-2.5">
                  {prestataire.certifications.map((certification) => (
                    <div key={certification} className="flex items-center gap-3 rounded-[13px] border border-ppj-line-2 p-3.5">
                      <span className="block size-4 flex-none rounded-full border-[1.5px] border-ppj-red-bg bg-primary" />
                      <span className="text-[14.5px] font-semibold text-ppj-ink">{certification}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {prestataire.competences.length > 0 && (
              <section className="rounded-[18px] border border-ppj-line bg-white p-5">
                <h2 className="mb-2.5 text-[17px] font-semibold text-ppj-ink">Compétences</h2>
                <div className="flex flex-wrap gap-1.5">
                  {prestataire.competences.map((competence) => (
                    <span key={competence} className="rounded-[6px] bg-ppj-fill px-2 py-[3px] text-[11px] text-ppj-neutral-text">
                      {competence}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {formations.length > 0 && (
              <section className="rounded-[18px] border border-ppj-line bg-white p-5">
                <h2 className="mb-2.5 text-[17px] font-semibold text-ppj-ink">Formations</h2>
                <ul className="grid gap-3">
                  {formations.map((formation) => (
                    <li key={formation.id} className="text-[13.5px] text-ppj-text-3">
                      <span className="font-semibold text-ppj-ink">{formation.diplome}</span>
                      {" — "}
                      {formation.etablissement}
                      {formation.annee_obtention ? ` (${formation.annee_obtention})` : ""}
                      {formation.description && <p className="mt-0.5 text-ppj-text-4">{formation.description}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {prestataire.disponibilites.length > 0 && (
              <section className="rounded-[18px] border border-ppj-line bg-white p-5">
                <h2 className="mb-2.5 text-[17px] font-semibold text-ppj-ink">Disponibilités</h2>
                <div className="flex flex-wrap gap-1.5">
                  {prestataire.disponibilites.map((jour) => (
                    <span
                      key={jour}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ppj-line px-3 py-1 text-sm text-ppj-ink"
                    >
                      <CalendarDays className="size-3.5 text-primary" />
                      {jour}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section id="avis" className="scroll-mt-24 rounded-[18px] border border-ppj-line bg-white p-5">
              <div className="mb-2.5 flex items-center gap-2">
                <h2 className="text-[17px] font-semibold text-ppj-ink">Avis</h2>
                {avis.length > 0 && (
                  <span className="text-sm text-ppj-neutral-text">
                    {(avis.reduce((somme, a) => somme + a.note, 0) / avis.length).toFixed(1)}/5 ({avis.length} avis)
                  </span>
                )}
              </div>
              <AvisList avis={avis} />
            </section>

            {similaires.length > 0 && (
              <section className="rounded-[18px] border border-ppj-line bg-white p-5">
                <h2 className="mb-3 text-[17px] font-semibold text-ppj-ink">
                  Vous cherchez quelqu&apos;un comme {prenom} ?
                </h2>
                <div className="grid gap-3">
                  {similaires.map((r) => (
                    <RecommandationCompactCard
                      key={r.prestataire.id}
                      recommandation={r}
                      lienProfil={`/prestataires/${r.prestataire.id}#proposer`}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="grid min-w-0 gap-[18px] [&>section]:min-w-0">
            <section className="rounded-[18px] border border-ppj-line bg-white p-5">
              <h2 className="mb-3.5 text-[17px] font-semibold text-ppj-ink">Conditions</h2>
              <div className="grid gap-[11px] text-[14.5px]">
                <span className="flex justify-between gap-3.5">
                  <span className="text-ppj-text-3">Tarif</span>
                  <span className="text-ppj-ink">{tarifJournalier !== null ? `${tarifJournalier} € / jour` : "au devis"}</span>
                </span>
                <span className="flex justify-between gap-3.5">
                  <span className="text-ppj-text-3">Zone d&apos;intervention</span>
                  <span className="text-ppj-ink">{prestataire.ville}</span>
                </span>
                <span className="flex justify-between gap-3.5">
                  <span className="text-ppj-text-3">Ouvert aux missions</span>
                  <span className="text-ppj-ink">{enMission ? "Non" : "Oui"}</span>
                </span>
              </div>
              <p className="mt-3.5 text-[12.5px] leading-[1.6] text-ppj-text-4">
                Le tarif définitif figure sur le devis envoyé dans la conversation.
              </p>
            </section>

            <section className="rounded-[18px] border border-ppj-line bg-white p-5">
              <h2 className="mb-2.5 text-[17px] font-semibold text-ppj-ink">Expériences</h2>
              {experiences.length > 0 ? (
                <ul className="grid gap-4">
                  {experiences.map((experience) => (
                    <li key={experience.id} className="text-sm">
                      <p className="font-semibold text-ppj-ink">{experience.intitule}</p>
                      <p className="text-[13.5px] text-ppj-text-3">
                        {[experience.employeur, experience.periode, experience.lieu].filter(Boolean).join(" · ")}
                      </p>
                      {experience.description && (
                        <p className="mt-1 text-[13.5px] text-ppj-text-4">{experience.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13.5px] leading-[1.6] text-ppj-text-3">
                  Les missions réalisées sur ProParJour apparaissent ici. Ce professionnel n&apos;a pas encore d&apos;historique public.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
