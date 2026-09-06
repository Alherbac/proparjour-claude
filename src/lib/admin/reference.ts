/**
 * Référence mission déterministe — extrait de lib/admin/missions.ts
 * (server-only) dans son propre module : missions-admin-screen.tsx et
 * factures-screen.tsx sont des composants client et ne peuvent pas
 * importer un module "server-only", même pour une seule fonction pure
 * sans accès base.
 */
export function referenceMission(mission: { id: string; created_at: string }): string {
  const annee = new Date(mission.created_at).getFullYear();
  return `PPJ-${annee}-${mission.id.slice(0, 6).toUpperCase()}`;
}
