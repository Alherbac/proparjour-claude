import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getFacturesAdmin } from "@/lib/admin/factures";
import { FacturesScreen } from "@/components/admin/factures-screen";

export const metadata: Metadata = { title: "Factures — Admin ProParJour" };

export default async function AdminFacturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const sp = await searchParams;
  const get = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const client = get("client") ?? "";
  const page = Number(get("page") ?? "1") || 1;

  const { missions, total, totalPages } = await getFacturesAdmin({ client, page });

  return <FacturesScreen missions={missions} total={total} totalPages={totalPages} page={page} client={client} />;
}
