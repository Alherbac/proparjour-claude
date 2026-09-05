import Link from "next/link";
import { Badge, type BadgeTone } from "@/app/prestataire/_components/badge";
import { DashButton } from "@/app/prestataire/_components/button";
import { ancienneteFr } from "@/app/prestataire/_lib";

export type ItemAFaire = {
  cle: string;
  titre: string;
  badge: { label: string; tone: BadgeTone };
  explication: string;
  depuis: string;
  actionLabel: string;
  href: string;
};

/**
 * "À faire maintenant" côté prestataire — dossier design §5 : porte
 * ce qui BLOQUE ses missions (jamais les mêmes décisions que côté
 * client, cf. principe directeur §1). Composant serveur : toutes les
 * données sont déjà réelles et connues avant le rendu (pas de
 * panier/localStorage ici).
 */
export function AFaireMaintenant({ items }: { items: ItemAFaire[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
        <p className="text-[13px] text-[#6B6660]">Rien ne bloque vos missions pour l&apos;instant.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border p-5" style={{ borderColor: "#F8D3D1" }}>
      <div className="mb-3.5 flex items-center gap-2">
        <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: "#E21D1B" }} />
        <h2 className="text-[15px] font-bold text-[#1A1917]">À faire maintenant</h2>
        <span className="text-[13px] text-[#6B6660]">
          {items.length} action{items.length > 1 ? "s" : ""} qui bloquent vos missions
        </span>
      </div>
      <div className="divide-y divide-[#EFEBE6]">
        {items.map((item) => (
          <div key={item.cle} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14.5px] font-semibold text-[#1A1917]">{item.titre}</p>
                <Badge tone={item.badge.tone}>{item.badge.label}</Badge>
              </div>
              <p className="mt-0.5 text-[13px] text-[#6B6660]">{item.explication}</p>
            </div>
            <span className="min-w-[96px] shrink-0 text-[12px] text-[#98938B]">{ancienneteFr(item.depuis)}</span>
            <Link href={item.href} className="shrink-0">
              <DashButton variant="sombre">{item.actionLabel}</DashButton>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
