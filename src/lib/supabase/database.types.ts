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

export type MissionStatutType =
  | "en_attente"
  | "confirmee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "litige";

export type LigneStatutType = "en_attente" | "acceptee" | "refusee";

export type PaiementStatutType =
  | "en_attente"
  | "sequestre"
  | "libere"
  | "rembourse"
  | "echec";

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
  specialites: string[];
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

export type PrestatairesPublicsRow = {
  id: string;
  metier: MetierType;
  certifications: string[];
  langues: string[];
  bio: string | null;
  ville: string;
  tarif_type: TarifType;
  tarif_montant: number;
  disponibilites: string[];
  photo_url: string | null;
  specialites: string[];
  statut_verification: StatutVerificationType;
  cnaps_verifie: boolean;
  prenom: string | null;
  nom: string | null;
  created_at: string;
};

export type MissionsRow = {
  id: string;
  recruteur_id: string;
  lieu: string;
  date_mission: string;
  statut: MissionStatutType;
  service_fait: boolean;
  montant_total: number;
  created_at: string;
  updated_at: string;
};

export type MissionLignesRow = {
  id: string;
  mission_id: string;
  prestataire_id: string;
  metier: MetierType;
  heure_debut: string;
  heure_fin: string;
  tarif_applique: number;
  statut_acceptation: LigneStatutType;
  created_at: string;
  updated_at: string;
};

export type PaiementsRow = {
  id: string;
  mission_id: string;
  montant: number;
  statut: PaiementStatutType;
  taux_commission: number;
  montant_commission: number;
  stripe_payment_intent_id: string | null;
  date_deblocage: string | null;
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
        Relationships: [];
      };
      entreprises: {
        Row: EntreprisesRow;
        Insert: Omit<EntreprisesRow, "id" | "created_at" | "updated_at"> &
          Partial<Pick<EntreprisesRow, "id">>;
        Update: Partial<EntreprisesRow>;
        Relationships: [];
      };
      prestataires_profils: {
        Row: PrestatairesProfilsRow;
        Insert: Omit<
          PrestatairesProfilsRow,
          | "id"
          | "created_at"
          | "updated_at"
          | "statut_verification"
          | "motif_refus"
          | "bio"
          | "photo_url"
        > &
          Partial<
            Pick<
              PrestatairesProfilsRow,
              "id" | "statut_verification" | "motif_refus" | "bio" | "photo_url"
            >
          >;
        Update: Partial<PrestatairesProfilsRow>;
        Relationships: [
          {
            foreignKeyName: "prestataires_profils_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      missions: {
        Row: MissionsRow;
        Insert: Omit<MissionsRow, "id" | "created_at" | "updated_at" | "statut" | "service_fait"> &
          Partial<Pick<MissionsRow, "id" | "statut" | "service_fait">>;
        Update: Partial<MissionsRow>;
        Relationships: [];
      };
      mission_lignes: {
        Row: MissionLignesRow;
        Insert: Omit<MissionLignesRow, "id" | "created_at" | "updated_at" | "statut_acceptation"> &
          Partial<Pick<MissionLignesRow, "id" | "statut_acceptation">>;
        Update: Partial<MissionLignesRow>;
        Relationships: [];
      };
      paiements: {
        Row: PaiementsRow;
        Insert: Omit<PaiementsRow, "id" | "created_at" | "updated_at" | "statut" | "date_deblocage"> &
          Partial<Pick<PaiementsRow, "id" | "statut" | "date_deblocage">>;
        Update: Partial<PaiementsRow>;
        Relationships: [];
      };
    };
    Views: {
      prestataires_publics: {
        Row: PrestatairesPublicsRow;
        Relationships: [];
      };
    };
    Functions: {
      creer_mission_payee: {
        Args: {
          p_recruteur_id: string;
          p_lieu: string;
          p_date_mission: string;
          p_lignes: {
            prestataire_id: string;
            metier: MetierType;
            heure_debut: string;
            heure_fin: string;
            tarif_applique: number;
          }[];
          p_montant_total: number;
          p_taux_commission: number;
          p_montant_commission: number;
          p_stripe_payment_intent_id: string;
        };
        Returns: string;
      };
    };
  };
};
