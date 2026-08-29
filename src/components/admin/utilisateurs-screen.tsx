"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UtilisateurListe } from "@/lib/admin/utilisateurs";
import { suspendreUtilisateur, reactiverUtilisateur } from "@/app/actions/admin-utilisateurs";

const TYPE_LABEL: Record<string, string> = {
  prestataire: "Prestataire",
  recruteur_particulier: "Recruteur (particulier)",
  recruteur_entreprise: "Recruteur (entreprise)",
};

function SuspendreAction({ userId, suspendu, peutAgir }: { userId: string; suspendu: boolean; peutAgir: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [motif, setMotif] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!peutAgir) return null;

  if (suspendu) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="rounded-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await reactiverUtilisateur(userId);
            if (result.success) router.refresh();
            else setErreur(result.error);
          })
        }
      >
        <CheckCircle2 className="size-3.5" />
        Réactiver
      </Button>
    );
  }

  if (!ouvert) {
    return (
      <Button size="sm" variant="outline" className="rounded-full text-destructive" onClick={() => setOuvert(true)}>
        <Ban className="size-3.5" />
        Suspendre
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Motif"
          className="h-8 w-40 text-xs"
        />
        <Button
          size="sm"
          variant="destructive"
          className="rounded-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await suspendreUtilisateur(userId, motif);
              if (result.success) {
                setOuvert(false);
                router.refresh();
              } else {
                setErreur(result.error);
              }
            })
          }
        >
          Confirmer
        </Button>
      </div>
      {erreur && <p className="text-xs text-destructive">{erreur}</p>}
    </div>
  );
}

export function UtilisateursScreen({
  utilisateurs,
  total,
  totalPages,
  page,
  q,
  type,
  role,
}: {
  utilisateurs: UtilisateurListe[];
  total: number;
  totalPages: number;
  page: number;
  q: string;
  type: string;
  role: "admin" | "moderator";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recherche, setRecherche] = useState(q);

  function appliquerFiltres(next: { q?: string; type?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.type !== undefined) {
      if (next.type && next.type !== "tous") params.set("type", next.type);
      else params.delete("type");
    }
    if (next.page !== undefined && next.page > 1) params.set("page", String(next.page));
    else params.delete("page");
    router.push(`/admin/utilisateurs?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} compte{total > 1 ? "s" : ""}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            appliquerFiltres({ q: recherche, page: 1 });
          }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un nom..."
              className="w-64 pl-9"
            />
          </div>
          <button
            type="submit"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
          >
            Rechercher
          </button>
        </form>
        {(["tous", "prestataire", "recruteur_particulier", "recruteur_entreprise"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => appliquerFiltres({ type: t, page: 1 })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              (type || "tous") === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {t === "tous" ? "Tous" : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Nom</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Ville</th>
              <th className="px-4 py-2.5 font-medium">Inscrit le</th>
              <th className="px-4 py-2.5 font-medium">Statut</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
              <tr key={u.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  {u.prenom || u.nom ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.email ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.type ? TYPE_LABEL[u.type] ?? u.type : "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.ville ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-2.5">
                  {u.suspendu ? (
                    <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">Suspendu</span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      Actif
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {u.type === "prestataire" && (
                      <Link href="/admin/validations" className="text-xs font-medium text-primary hover:underline">
                        Dossier
                      </Link>
                    )}
                    <SuspendreAction userId={u.id} suspendu={u.suspendu} peutAgir={role === "admin"} />
                  </div>
                </td>
              </tr>
            ))}
            {utilisateurs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => appliquerFiltres({ page: p })}
              className={cn(
                "flex size-8 items-center justify-center rounded-full border text-sm",
                p === page ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
