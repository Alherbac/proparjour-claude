import Link from "next/link";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { createClient } from "@/lib/supabase/server";

/**
 * Refonte Claude Istanbul 1, §4.10 — footer clair (plus de bg-ink).
 * Colonnes et intitulés de liens repris mot pour mot de la maquette
 * (tableau `footer` du prototype) ; les hrefs pointent vers les
 * vraies routes du site (le prototype utilisait des ancres
 * factices "#recherche" pour tout, propres à l'outil de maquettage).
 */
const COLONNES = [
  {
    titre: "Clients",
    liens: [
      { href: "/prestataires?mode=recherche", label: "Trouver un professionnel" },
      { href: "/#recherche", label: "Publier un besoin" },
      { href: "/#fonctionnement", label: "Comment ça marche" },
    ],
  },
  {
    titre: "Professionnels",
    liens: [
      { href: "/inscription/prestataire", label: "Créer mon profil" },
      { href: "/#fonctionnement", label: "Comment ça marche" },
      { href: "/prestataire/missions", label: "Missions" },
    ],
  },
  {
    titre: "ProParJour",
    liens: [
      { href: "/a-propos", label: "À propos" },
      { href: "/contact", label: "Contact" },
      { href: "/cgu", label: "CGU" },
      { href: "/cgu", label: "Confidentialité" },
    ],
  },
] as const;

export async function Footer() {
  // Même règle que Header : un prestataire connecté revient à son
  // propre espace via le logo, jamais à la landing client.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profil = user
    ? (await supabase.from("users").select("type").eq("id", user.id).maybeSingle()).data
    : null;
  const logoHref = profil?.type === "prestataire" ? "/prestataire" : "/";

  return (
    <footer className="border-t border-ppj-line-2 bg-ppj-paper" style={{ padding: "clamp(48px,6vw,72px) 0 32px" }}>
      <div
        className="mx-auto grid max-w-[1240px] gap-9 px-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))" }}
      >
        <div>
          <MarketingLogo height={22} href={logoHref} />
          <p className="mt-3.5 max-w-[22em] text-[13.5px] text-ppj-text-4">
            Les professionnels de terrain, quand vous en avez besoin.
          </p>
        </div>
        {COLONNES.map((col) => (
          <div key={col.titre}>
            <p className="mb-3.5 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ppj-text-4">{col.titre}</p>
            <ul className="grid list-none gap-2.5 p-0">
              {col.liens.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-[14.5px] text-ppj-neutral-text transition-colors hover:text-ppj-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 max-w-[1240px] border-t border-ppj-line-2 px-6 pt-5 text-[12.5px] text-ppj-text-5">
        © {new Date().getFullYear()} ProParJour
      </div>
    </footer>
  );
}
