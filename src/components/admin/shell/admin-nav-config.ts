/**
 * Les 15 entrées / 4 groupes du prompt ESPACE-ADMIN §4, dans l'ordre
 * exact. Les modules existants sans équivalent direct dans la
 * maquette (Pilotage, Annuaire prestataires, Marché des offres,
 * Versements) restent accessibles — zéro fonctionnalité supprimée —
 * regroupés à part sous "Autres outils" plutôt qu'insérés dans les 15,
 * pour que la nav corresponde au pixel à la référence.
 */
export type NavBadgeKey = "validations" | "messages" | "suppressions";

export type NavItem = {
  href: string;
  label: string;
  badgeKey?: NavBadgeKey;
};

export type NavGroup = {
  titre: string;
  items: NavItem[];
};

export const NAV_GROUPES: NavGroup[] = [
  {
    titre: "Principal",
    items: [
      { href: "/admin", label: "Tableau de bord" },
      { href: "/admin/utilisateurs", label: "Utilisateurs" },
      { href: "/admin/validations", label: "Validation profils", badgeKey: "validations" },
      { href: "/admin/missions", label: "Missions" },
      { href: "/admin/offres", label: "Offres" },
      { href: "/admin/messages", label: "Messages", badgeKey: "messages" },
    ],
  },
  {
    titre: "Finances",
    items: [
      { href: "/admin/commissions", label: "Commissions" },
      { href: "/admin/factures", label: "Factures" },
    ],
  },
  {
    titre: "Analyse",
    items: [
      { href: "/admin/stats", label: "Statistiques" },
      { href: "/admin/kpis", label: "Insights" },
    ],
  },
  {
    titre: "Outils",
    items: [
      { href: "/admin/villes", label: "Villes" },
      { href: "/admin/suppressions", label: "Suppressions", badgeKey: "suppressions" },
      { href: "/admin/export", label: "Export données" },
      { href: "/admin/parametres", label: "Paramètres" },
      { href: "/admin/cgu", label: "CGU" },
    ],
  },
];

export const NAV_AUTRES: NavGroup = {
  titre: "Autres outils",
  items: [
    { href: "/admin/pilotage", label: "Pilotage & alertes" },
    { href: "/admin/versements", label: "Versements" },
    { href: "/admin/annuaire-prestataires", label: "Annuaire prestataires" },
    { href: "/admin/marche-offres", label: "Marché des offres" },
  ],
};
