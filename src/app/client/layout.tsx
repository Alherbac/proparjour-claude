import { redirect } from "next/navigation";
import { Instrument_Serif, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { Sidebar, type LienNav } from "@/app/client/_components/sidebar";
import { MobileNav } from "@/app/client/_components/mobile-nav";
import { getSessionClient, getMissionsClient, getOffresAvecCandidatures, candidaturesAExaminer, getConversationsClient } from "@/app/client/_data";

/**
 * Coquille de l'espace client — dossier design §3. Polices chargées
 * ici, propres à cet espace (next/font/google, jamais le thème
 * global) : Instrument Serif pour les titres/valeurs, Public Sans
 * pour le reste, IBM Plex Mono pour les rares mentions techniques.
 */
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif" });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-public-sans" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-ibm-plex-mono" });

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionClient();
  if (!session) redirect("/connexion?next=/client");

  const [missions, offres] = await Promise.all([getMissionsClient(session.userId), getOffresAvecCandidatures(session.userId)]);
  const conversations = await getConversationsClient(session.userId, missions);
  const nonLusTotal = conversations.reduce((s, c) => s + c.nonLus, 0);

  const liens: LienNav[] = [
    { href: "/client", label: "Vue d'ensemble" },
    { href: "/client/missions", label: "Vos missions" },
    { href: "/client/candidatures", label: "Candidatures reçues", compteur: candidaturesAExaminer(offres) },
    { href: "/client/panier", label: "Votre panier" },
    { href: "/client/messagerie", label: "Messagerie", compteur: nonLusTotal },
    { href: "/client/factures", label: "Factures" },
    { href: "/client/parametres", label: "Paramètres" },
  ];

  const nomAffiche = session.entreprise?.raison_sociale || `${session.profil.prenom ?? ""} ${session.profil.nom ?? ""}`.trim() || "Compte";

  return (
    <div
      className={`${instrumentSerif.variable} ${publicSans.variable} ${ibmPlexMono.variable} flex min-h-screen`}
      style={{ backgroundColor: "#FBFAF8", fontFamily: "var(--font-public-sans), sans-serif" }}
    >
      <div className="hidden lg:flex">
        <Sidebar espace="Espace client" liens={liens} nom={nomAffiche} sousTitre={session.email} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1240px] px-5 pb-24 pt-5 md:px-[30px] md:pt-[26px] lg:pb-[56px]">{children}</div>
      </div>
      <MobileNav liens={liens} />
    </div>
  );
}
