import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { listeUtilisateurs } from "@/lib/admin/utilisateurs";
import { UtilisateursScreen } from "@/components/admin/utilisateurs-screen";
import type { UserType } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Utilisateurs — Admin ProParJour" };

export default async function AdminUtilisateursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const sp = await searchParams;
  const get = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const q = get("q") ?? "";
  const type = get("type") ?? "tous";
  const page = Number(get("page") ?? "1") || 1;

  const { utilisateurs, total, totalPages } = await listeUtilisateurs({
    q,
    type: type as UserType | "tous",
    page,
  });

  return (
    <UtilisateursScreen
      utilisateurs={utilisateurs}
      total={total}
      totalPages={totalPages}
      page={page}
      q={q}
      type={type}
      role={session.role}
    />
  );
}
