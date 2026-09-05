import { redirect } from "next/navigation";
import { Instrument_Serif, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { Sidebar, type LienNav } from "@/app/prestataire/_components/sidebar";
import { MobileNav } from "@/app/prestataire/_components/mobile-nav";
import { getSessionPrestataire, getLignesPrestataire, getConversationsPrestataire } from "@/app/prestataire/_data";

const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif" });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-public-sans" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-ibm-plex-mono" });

export default async function PrestataireLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionPrestataire();
  if (!session) redirect("/connexion?next=/prestataire");

  const lignes = await getLignesPrestataire(session.profilId);
  const conversations = await getConversationsPrestataire(session.userId, lignes);
  const aRepondre = lignes.filter((l) => l.statut_acceptation === "en_attente").length;
  const nonLusTotal = conversations.reduce((s, c) => s + c.nonLus, 0);

  const liens: LienNav[] = [
    { href: "/prestataire", label: "Votre activité" },
    { href: "/prestataire/missions", label: "Vos missions", compteur: aRepondre },
    { href: "/prestataire/opportunites", label: "Opportunités" },
    { href: "/prestataire/disponibilites", label: "Disponibilités" },
    { href: "/prestataire/profil", label: "Votre profil" },
    { href: "/prestataire/messagerie", label: "Messagerie", compteur: nonLusTotal },
    { href: "/prestataire/revenus", label: "Revenus" },
  ];

  const nomAffiche = `${session.prenom ?? ""} ${session.nom ?? ""}`.trim() || "Compte";

  return (
    <div
      className={`${instrumentSerif.variable} ${publicSans.variable} ${ibmPlexMono.variable} flex min-h-screen`}
      style={{ backgroundColor: "#FBFAF8", fontFamily: "var(--font-public-sans), sans-serif" }}
    >
      <div className="hidden lg:flex">
        <Sidebar espace="Espace prestataire" liens={liens} nom={nomAffiche} sousTitre={session.email} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1240px] px-5 pb-24 pt-5 md:px-[30px] md:pt-[26px] lg:pb-[56px]">{children}</div>
      </div>
      <MobileNav liens={liens} />
    </div>
  );
}
