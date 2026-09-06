import type { Metadata } from "next";
import { Bell, LogOut } from "lucide-react";
import { getSessionPrestataire } from "@/app/prestataire/_data";
import { signOutAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Paramètres — ProParJour" };

function Carte({ titre, description, icone }: { titre: string; description: string; icone?: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#1A1917]">{titre}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6B6660]">{description}</p>
        </div>
        {icone && <span className="shrink-0" style={{ color: "#98938B" }}>{icone}</span>}
      </div>
    </div>
  );
}

export default async function PageParametresPrestataire() {
  const session = await getSessionPrestataire();
  if (!session) return null;

  const nomAffiche = `${session.prenom ?? ""} ${session.nom ?? ""}`.trim() || "Votre profil";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Paramètres
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Votre compte et vos préférences.</p>
      </div>

      <Carte titre={nomAffiche} description={session.email} />

      <Carte
        titre="Notifications"
        description="Affichées dans l'application (cloche en haut) à chaque candidature retenue et chaque devis reçu."
        icone={<Bell className="size-5" />}
      />

      <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-[#1A1917]">Session</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#6B6660]">Connecté en tant que {session.email}.</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-[#DDD8D1] px-3.5 py-2 text-[13px] font-semibold text-[#1A1917] transition-colors hover:border-[#1A1917]"
            >
              <LogOut className="size-3.5" />
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
