import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Users, History, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfessionnelsHistorique } from "@/lib/professionnels-habituels";
import { CarteProfessionnel } from "@/app/client/professionnels/carte";
import { Favoris } from "@/app/client/professionnels/favoris";
import { DashButton } from "@/app/client/_components/button";

export const metadata: Metadata = { title: "Mes professionnels — ProParJour" };

/** Migré depuis l'ancien /tableau-de-bord/professionnels — même logique et données (getProfessionnelsHistorique), interface refaite. */
export default async function PageProfessionnels() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/client/professionnels");

  const { habituels, recents } = await getProfessionnelsHistorique(user.id);
  const idsHabituels = new Set(habituels.map((h) => h.prestataireId));
  const recentsSeuls = recents.filter((r) => !idsHabituels.has(r.prestataireId));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
            Mes professionnels
          </h1>
          <p className="mt-1 text-[13.5px] text-[#6B6660]">Vos favoris, vos habitués, et ceux que vous avez récemment sollicités.</p>
        </div>
        {habituels.length > 0 && (
          <Link href="/client/series/nouvelle">
            <DashButton variant="secondaire">
              <Repeat className="size-4" />
              Créer une série récurrente
            </DashButton>
          </Link>
        )}
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#1A1917]">
          <Heart className="size-4.5" style={{ color: "#E21D1B" }} />
          Mes favoris
        </h2>
        <p className="mt-0.5 text-[13px] text-[#6B6660]">Professionnels que vous avez enregistrés.</p>
        <div className="mt-3">
          <Favoris />
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#1A1917]">
          <Users className="size-4.5" style={{ color: "#1A1917" }} />
          Mes professionnels habituels
        </h2>
        <p className="mt-0.5 text-[13px] text-[#6B6660]">Ceux avec qui vous avez réellement travaillé plus d&apos;une fois.</p>
        {habituels.length === 0 ? (
          <p className="mt-3 rounded-[14px] border border-dashed border-[#DDD8D1] p-4 text-[13px] text-[#6B6660]">
            Aucun professionnel habituel pour l&apos;instant — il apparaîtra ici après une deuxième mission ensemble.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {habituels.map((h) => (
              <CarteProfessionnel key={h.prestataireId} professionnel={h} />
            ))}
          </div>
        )}
      </section>

      {recentsSeuls.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#1A1917]">
            <History className="size-4.5" style={{ color: "#98938B" }} />
            Récemment utilisés
          </h2>
          <div className="mt-3 space-y-2.5">
            {recentsSeuls.map((r) => (
              <CarteProfessionnel key={r.prestataireId} professionnel={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
