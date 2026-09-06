import type { Metadata } from "next";
import { CreditCard, Bell, LogOut } from "lucide-react";
import { getSessionClient } from "@/app/client/_data";
import { SuppressionCompte } from "@/app/client/parametres/suppression-compte";
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

export default async function PageParametres() {
  const session = await getSessionClient();
  if (!session) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Paramètres
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Votre compte, votre entreprise et vos préférences.</p>
      </div>

      <Carte
        titre={session.entreprise?.raison_sociale || `${session.profil.prenom ?? ""} ${session.profil.nom ?? ""}`.trim() || "Votre profil"}
        description={
          session.entreprise
            ? `SIRET ${session.entreprise.siret} · ${session.profil.ville ?? "ville non renseignée"} · ${session.email}`
            : `${session.email} · ${session.profil.ville ?? "ville non renseignée"}`
        }
      />

      {/*
        Dossier design §4 : "Facturation (mandat, TVA
        intracommunautaire)". Aucun de ces deux champs n'existe dans
        le schéma réel (`entreprises` n'a que raison_sociale/siret/
        secteur_activite) — signalé (§10.4) plutôt qu'inventé. Le
        seul fait réel et vérifiable est affiché à la place : le
        paiement se fait carte par carte, sans mandat enregistré.
      */}
      <Carte
        titre="Facturation"
        description="Le paiement se fait par carte au moment de la réservation — aucune carte ni mandat n'est enregistré, chaque paiement est un règlement indépendant."
        icone={<CreditCard className="size-5" />}
      />

      <Carte
        titre="Notifications"
        description="Affichées dans l'application (cloche en haut) à chaque candidature et chaque devis reçu."
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

      <SuppressionCompte />
    </div>
  );
}
