import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";
import { SectionHead } from "@/components/marketing/section-head";
import { SectorCard } from "@/components/marketing/sector-card";
import { SPECIALTY_CATEGORIES } from "@/config/specialtyCategories";
import type { MetierId } from "@/config/metiers";

const SECTORS: { metier: MetierId; titre: string }[] = [
  { metier: "securite", titre: "Sécurité & Protection" },
  { metier: "accueil", titre: "Accueil & Réception" },
  { metier: "vente", titre: "Commerce & Retail" },
];

export function SectorsSection() {
  return (
    <section id="secteurs" className="py-32 max-[900px]:py-20">
      <div className="mx-auto max-w-[1200px] px-10 max-[900px]:px-6">
        <RevealOnScroll>
          <SectionHead
            eyebrow="Trois métiers de terrain, une seule plateforme"
            titre="Des filières pensées pour le travail du jour"
            description="Chaque secteur a ses propres exigences de vérification, ses spécialités et ses tarifs. ProParJour les traite séparément — pas de profil générique."
          />
        </RevealOnScroll>
        <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
          {SECTORS.map((sector, index) => (
            <RevealOnScroll key={sector.metier} delayMs={index * 80}>
              <SectorCard
                metier={sector.metier}
                titre={sector.titre}
                specialites={SPECIALTY_CATEGORIES[sector.metier].map((c) => c.label)}
              />
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
