import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { getStatsPlateforme } from "@/lib/plateforme-stats";

export const metadata: Metadata = {
  title: "À propos — ProParJour, la plateforme de freelances de terrain vérifiés",
  description:
    "ProParJour connecte entreprises et prestataires indépendants de la sécurité, de l'accueil et du commerce en Île-de-France. Découvrez notre mission, nos valeurs et notre histoire.",
};

const VALEURS = [
  {
    titre: "Confiance",
    description: "Chaque prestataire passe par une vérification de profil avant sa première mission.",
  },
  {
    titre: "Simplicité",
    description: "Une plateforme pensée pour être utilisable sans expertise technique, des deux côtés.",
  },
  {
    titre: "Engagement",
    description: "Un accompagnement réel, du premier profil créé jusqu'à la mission terminée.",
  },
  {
    titre: "Équité",
    description: "Une commission unique et affichée — pas de frais cachés, pour personne.",
  },
] as const;

const HISTOIRE = [
  { annee: "2021", texte: "Le constat d'un manque de transparence dans le travail temporaire de terrain, à partir de l'expérience du secteur." },
  { annee: "2022", texte: "Lancement de la première version de la plateforme." },
  { annee: "2023", texte: "Premiers prestataires inscrits et développement en Île-de-France." },
  { annee: "2024", texte: "Poursuite du déploiement avec de nouvelles fonctionnalités pour les recruteurs comme pour les prestataires." },
] as const;

const EQUIPE = [
  { nom: "Marie Dupont", role: "Fondatrice & CEO" },
  { nom: "Thomas Martin", role: "CTO" },
  { nom: "Sophie Bernard", role: "Directrice commerciale" },
  { nom: "Lucas Petit", role: "Responsable qualité" },
] as const;

export default async function AProposPage() {
  const stats = await getStatsPlateforme();
  const metriques = [
    { n: String(stats.prestatairesValides), l: "Prestataires vérifiés" },
    { n: String(stats.missionsTotal), l: "Missions gérées" },
    { n: "5", l: "Départements couverts" },
  ] as const;

  return (
    <>
      <MarketingPageHeader
        eyebrow="Notre histoire"
        titre="Révolutionner le travail temporaire de terrain"
        description="ProParJour est né d'un constat simple : trouver un agent de sécurité, un hôte ou une hôtesse, ou un vendeur fiable et disponible rapidement reste trop souvent compliqué — pour les entreprises comme pour les indépendants."
      />

      <section className="px-10 py-20 max-[900px]:px-6 max-[900px]:py-14">
        <div className="mx-auto max-w-[800px]">
          <h2 className="mb-4 text-[26px] font-semibold text-ink">Notre mission</h2>
          <p className="mb-3 text-[15.5px] leading-[1.7] text-muted-landing">
            Nous construisons la plateforme de référence pour la mise en relation entre
            entreprises et prestataires indépendants dans trois métiers de terrain :
            la sécurité privée, l&apos;accueil et le commerce. Notre objectif est de rendre
            chaque mise en relation plus simple, plus rapide et plus fiable — pour les
            prestataires comme pour les recruteurs.
          </p>
          <p className="text-[15.5px] leading-[1.7] text-muted-landing">
            Une bonne mise en relation repose avant tout sur la confiance : c&apos;est pour
            cela que chaque prestataire passe par une vérification avant d&apos;apparaître
            dans les résultats de recherche, et que chaque mission génère automatiquement
            son contrat et sa facture.
          </p>

          <h2 className="mb-5 mt-14 text-[26px] font-semibold text-ink">Nos valeurs</h2>
          <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
            {VALEURS.map((valeur) => (
              <div key={valeur.titre} className="rounded-2xl border border-line bg-white p-5">
                <b className="block text-[15px] font-semibold text-ink">{valeur.titre}</b>
                <p className="mt-1.5 text-sm leading-[1.6] text-muted-landing">{valeur.description}</p>
              </div>
            ))}
          </div>

          <h2 className="mb-5 mt-14 text-[26px] font-semibold text-ink">Notre parcours</h2>
          <div className="space-y-5">
            {HISTOIRE.map((etape) => (
              <div key={etape.annee} className="flex gap-5">
                <span className="font-mono-landing w-14 shrink-0 text-sm font-semibold text-sec">{etape.annee}</span>
                <p className="text-[15px] leading-[1.65] text-muted-landing">{etape.texte}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid grid-cols-3 gap-4 rounded-2xl bg-ink px-6 py-8 text-center text-white max-[900px]:grid-cols-1">
            {metriques.map((m) => (
              <div key={m.l}>
                <div className="font-display text-[28px] font-bold text-primary">{m.n}</div>
                <div className="mt-1 text-[13px] text-white/55">{m.l}</div>
              </div>
            ))}
          </div>

          <h2 className="mb-5 mt-14 text-[26px] font-semibold text-ink">L&apos;équipe</h2>
          <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
            {EQUIPE.map((membre) => (
              <div key={membre.nom} className="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-5">
                <div className="size-11 shrink-0 rounded-full bg-[linear-gradient(135deg,#24467A,#5E6E33)]" />
                <div>
                  <b className="block text-[14.5px] font-semibold text-ink">{membre.nom}</b>
                  <span className="font-mono-landing text-xs text-muted-2">{membre.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
