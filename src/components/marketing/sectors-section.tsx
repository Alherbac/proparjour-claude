import { FamilleMetierCard } from "@/components/marketing/famille-metier-card";
import type { MetierId } from "@/config/metiers";

/**
 * Refonte Claude Istanbul 1, §4.4 — rôles et spécialités repris mot
 * pour mot de la maquette (tableau FAMILIES du prototype), jamais
 * reformulés ni inventés. Les trois familles sont fixes.
 */
const FAMILLES: {
  metier: MetierId;
  initiale: string;
  titre: string;
  roles: readonly string[];
  specs: string;
}[] = [
  {
    metier: "securite",
    initiale: "S",
    titre: "Sécurité & Protection",
    roles: [
      "Agent de sécurité",
      "Agent SSIAP 1 · 2 · 3",
      "Agent cynophile",
      "Contrôle d'accès & rondes",
      "Opérateur vidéo-surveillance",
    ],
    specs:
      "Surveillance · Gardiennage · Contrôle d'accès · Rondes · Vidéo-surveillance · Événementiel · Sécurité de nuit · Accueil VIP · SSIAP · Cynophile · Prévention & secours · Luxe & hôtellerie",
  },
  {
    metier: "accueil",
    initiale: "A",
    titre: "Accueil & Réception",
    roles: [
      "Hôte · Hôtesse d'accueil",
      "Accueil événementiel & salons",
      "Réceptionniste · Standardiste",
      "Agent de conciergerie",
      "Chef de projet événementiel",
    ],
    specs:
      "Événementiel · Salons & congrès · Cocktails · Street marketing · Émargement · Accueil mobile · Entreprise · VIP · Standard · Conciergerie · Médical · Beauté & cosmétique · Automobile · Aéroportuaire · Culturel",
  },
  {
    metier: "vente",
    initiale: "C",
    titre: "Commerce, Retail & Distribution",
    roles: [
      "Vendeur · Vendeuse",
      "Hôte·sse de caisse",
      "Employé libre-service",
      "Serveur · Cuisinier · Commis",
      "Équipier polyvalent",
    ],
    specs:
      "Restauration · Serveurs · Cuisiniers · Commis · Équipiers polyvalents · Vente · Caisse · Libre-service · Mise en rayon · Cosmétique & parfumerie · Prêt-à-porter · Équipement sportif · Bricolage · Boulangerie · Pâtisserie · Boucherie · Fromagerie",
  },
];

export function SectorsSection() {
  return (
    <section id="metiers" className="border-t border-ppj-line-2 bg-white" style={{ padding: "clamp(64px,8vw,112px) 0" }}>
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="mb-11 flex flex-wrap items-end justify-between gap-5">
          <h2
            className="max-w-[18em] text-ppj-ink"
            style={{ fontFamily: "var(--font-display-serif)", fontSize: "clamp(32px,3.6vw,48px)", lineHeight: 1.04, letterSpacing: "-0.02em" }}
          >
            Les métiers de terrain, réunis
          </h2>
          <p className="max-w-[30em] text-[15.5px] text-ppj-text-3">
            Trois familles, plus de cinquante spécialités. Vous tapez un intitulé précis : nous vous emmenons
            directement au bon endroit — jamais dans un annuaire.
          </p>
        </div>
        <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
          {FAMILLES.map((f) => (
            <FamilleMetierCard key={f.metier} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
