/**
 * Types générés manuellement à partir de supabase/migrations/0001_init.sql.
 * À remplacer par la sortie de `supabase gen types typescript` une fois
 * le projet Supabase créé et la CLI installée, pour rester synchronisé
 * automatiquement avec le schéma réel.
 */

export type UserType =
  | "recruteur_entreprise"
  | "recruteur_particulier"
  | "prestataire"
  | "admin";

export type MetierType = "securite" | "accueil" | "vente";

export type StatutIndependantType = "auto_entrepreneur" | "societe" | "autre";

export type TarifType = "horaire" | "journalier";

export type StatutVerificationType = "en_attente" | "valide" | "refuse";

export type UsersRow = {
  id: string;
  type: UserType | null;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  ville: string | null;
  created_at: string;
  updated_at: string;
};

export type EntreprisesRow = {
  id: string;
  user_id: string;
  raison_sociale: string;
  siret: string;
  secteur_activite: string;
  created_at: string;
  updated_at: string;
};

export type PrestatairesProfilsRow = {
  id: string;
  user_id: string;
  metier: MetierType;
  statut_independant: StatutIndependantType;
  numero_carte_cnaps: string | null;
  certifications: string[];
  langues: string[];
  tenue: string | null;
  secteur_experience: string | null;
  remuneration_commission: boolean;
  bio: string | null;
  ville: string;
  tarif_type: TarifType;
  tarif_montant: number;
  disponibilites: string[];
  photo_url: string | null;
  statut_verification: StatutVerificationType;
  motif_refus: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UsersRow;
        Insert: Partial<UsersRow> & { id: string };
        Update: Partial<UsersRow>;
      };
      entreprises: {
        Row: EntreprisesRow;
        Insert: Omit<EntreprisesRow, "id" | "created_at" | "updated_at"> &
          Partial<Pick<EntreprisesRow, "id">>;
        Update: Partial<EntreprisesRow>;
      };
      prestataires_profils: {
        Row: PrestatairesProfilsRow;
        Insert: Omit<
          PrestatairesProfilsRow,
          "id" | "created_at" | "updated_at" | "statut_verification" | "motif_refus"
        > &
          Partial<
            Pick<
              PrestatairesProfilsRow,
              "id" | "statut_verification" | "motif_refus"
            >
          >;
        Update: Partial<PrestatairesProfilsRow>;
      };
    };
  };
};
