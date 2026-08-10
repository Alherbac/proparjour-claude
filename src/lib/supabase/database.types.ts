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

export type MessageType = "texte" | "systeme";

export type PaiementStatutType =
  | "en_attente"
  | "sequestre"
  | "libere"
  | "rembourse"
  | "echec";

export type AdminRole = "admin" | "moderator";

export type OffreStatutType = "publiee" | "pourvue" | "annulee" | "expiree";

export type CandidatureStatutType = "en_attente" | "acceptee" | "refusee";

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
  titre: string | null;
  statut_independant: StatutIndependantType;
  numero_carte_cnaps: string | null;
  certifications: string[];
  competences: string[];
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
  visible: boolean;
  created_at: string;
  updated_at: string;
};

export type PrestatairesFormationsRow = {
  id: string;
  prestataire_id: string;
  etablissement: string;
  diplome: string;
  annee_obtention: number | null;
  description: string | null;
  created_at: string;
};

export type AdminAuditLogRow = {
  id: string;
  admin_id: string;
  action: string;
  cible_type: string;
  cible_id: string;
  motif: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type ExperiencesRow = {
  id: string;
  prestataire_id: string;
  intitule: string;
  employeur: string | null;
  periode: string;
  lieu: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type PrestatairesDisponibilitesExceptionsRow = {
  id: string;
  prestataire_id: string;
  date: string;
  disponible: boolean;
  heure_debut: string | null;
  heure_fin: string | null;
  created_at: string;
};

export type PrestatairesPublicsRow = {
  id: string;
  metier: MetierType;
  titre: string | null;
  certifications: string[];
  competences: string[];
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
  description: string | null;
  statut: MissionStatutType;
  service_fait: boolean;
  motif_litige: string | null;
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
  service_fait: boolean;
  created_at: string;
  updated_at: string;
};

export type OffresRow = {
  id: string;
  recruteur_id: string;
  titre: string;
  description: string;
  metier: MetierType;
  ville: string;
  date_mission: string;
  heure_debut: string;
  heure_fin: string;
  tarif_horaire: number;
  statut: OffreStatutType;
  created_at: string;
  updated_at: string;
};

export type CandidaturesRow = {
  id: string;
  offre_id: string;
  prestataire_id: string;
  statut: CandidatureStatutType;
  message: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationsRow = {
  id: string;
  user_id: string;
  type: string;
  titre: string;
  contenu: string | null;
  lien: string | null;
  mission_id: string | null;
  lu: boolean;
  created_at: string;
};

export type MessagesRow = {
  id: string;
  mission_id: string;
  expediteur_id: string;
  destinataire_id: string;
  contenu: string;
  type: MessageType;
  lu: boolean;
  created_at: string;
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

export type UserRolesRow = {
  user_id: string;
  role: AdminRole;
  granted_by: string | null;
  granted_at: string;
};

export type JustificatifsRow = {
  id: string;
  prestataire_id: string;
  type_document: string;
  storage_path: string;
  statut: StatutVerificationType;
  motif_refus: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
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
          | "visible"
          | "competences"
        > &
          Partial<
            Pick<
              PrestatairesProfilsRow,
              | "id"
              | "statut_verification"
              | "motif_refus"
              | "bio"
              | "photo_url"
              | "visible"
              | "competences"
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
      prestataires_formations: {
        Row: PrestatairesFormationsRow;
        Insert: Omit<PrestatairesFormationsRow, "id" | "created_at"> &
          Partial<Pick<PrestatairesFormationsRow, "id" | "created_at">>;
        Update: Partial<PrestatairesFormationsRow>;
        Relationships: [
          {
            foreignKeyName: "prestataires_formations_prestataire_id_fkey";
            columns: ["prestataire_id"];
            isOneToOne: false;
            referencedRelation: "prestataires_profils";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_audit_log: {
        Row: AdminAuditLogRow;
        Insert: Omit<AdminAuditLogRow, "id" | "created_at"> & Partial<Pick<AdminAuditLogRow, "id" | "created_at">>;
        Update: Partial<AdminAuditLogRow>;
        Relationships: [];
      };
      experiences: {
        Row: ExperiencesRow;
        Insert: Omit<ExperiencesRow, "id" | "created_at" | "updated_at"> &
          Partial<Pick<ExperiencesRow, "id" | "created_at" | "updated_at">>;
        Update: Partial<ExperiencesRow>;
        Relationships: [
          {
            foreignKeyName: "experiences_prestataire_id_fkey";
            columns: ["prestataire_id"];
            isOneToOne: false;
            referencedRelation: "prestataires_profils";
            referencedColumns: ["id"];
          },
        ];
      };
      prestataires_disponibilites_exceptions: {
        Row: PrestatairesDisponibilitesExceptionsRow;
        Insert: Omit<PrestatairesDisponibilitesExceptionsRow, "id" | "created_at"> &
          Partial<Pick<PrestatairesDisponibilitesExceptionsRow, "id" | "created_at">>;
        Update: Partial<PrestatairesDisponibilitesExceptionsRow>;
        Relationships: [
          {
            foreignKeyName: "prestataires_disponibilites_exceptions_prestataire_id_fkey";
            columns: ["prestataire_id"];
            isOneToOne: false;
            referencedRelation: "prestataires_profils";
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
      offres: {
        Row: OffresRow;
        Insert: Omit<OffresRow, "id" | "created_at" | "updated_at" | "statut"> &
          Partial<Pick<OffresRow, "id" | "statut">>;
        Update: Partial<OffresRow>;
        Relationships: [];
      };
      candidatures: {
        Row: CandidaturesRow;
        Insert: Omit<CandidaturesRow, "id" | "created_at" | "updated_at" | "statut" | "message"> &
          Partial<Pick<CandidaturesRow, "id" | "statut" | "message">>;
        Update: Partial<CandidaturesRow>;
        Relationships: [
          {
            foreignKeyName: "candidatures_offre_id_fkey";
            columns: ["offre_id"];
            isOneToOne: false;
            referencedRelation: "offres";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidatures_prestataire_id_fkey";
            columns: ["prestataire_id"];
            isOneToOne: false;
            referencedRelation: "prestataires_profils";
            referencedColumns: ["id"];
          },
        ];
      };
      paiements: {
        Row: PaiementsRow;
        Insert: Omit<PaiementsRow, "id" | "created_at" | "updated_at" | "statut" | "date_deblocage"> &
          Partial<Pick<PaiementsRow, "id" | "statut" | "date_deblocage">>;
        Update: Partial<PaiementsRow>;
        Relationships: [];
      };
      messages: {
        Row: MessagesRow;
        Insert: Omit<MessagesRow, "id" | "created_at" | "lu" | "type"> &
          Partial<Pick<MessagesRow, "id" | "lu" | "type">>;
        Update: Partial<MessagesRow>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationsRow;
        Insert: Omit<NotificationsRow, "id" | "created_at" | "lu" | "mission_id"> &
          Partial<Pick<NotificationsRow, "id" | "lu" | "mission_id">>;
        Update: Partial<NotificationsRow>;
        Relationships: [];
      };
      user_roles: {
        Row: UserRolesRow;
        Insert: Omit<UserRolesRow, "granted_at" | "granted_by"> &
          Partial<Pick<UserRolesRow, "granted_at" | "granted_by">>;
        Update: Partial<UserRolesRow>;
        Relationships: [];
      };
      justificatifs: {
        Row: JustificatifsRow;
        Insert: Omit<JustificatifsRow, "id" | "created_at" | "statut" | "motif_refus" | "reviewed_at" | "reviewed_by"> &
          Partial<Pick<JustificatifsRow, "id" | "statut" | "motif_refus" | "reviewed_at" | "reviewed_by">>;
        Update: Partial<JustificatifsRow>;
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
          p_description?: string | null;
        };
        Returns: string;
      };
      has_role: {
        Args: { check_role: AdminRole };
        Returns: boolean;
      };
      compter_missions_total: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      prestataires_en_mission_ids: {
        Args: Record<PropertyKey, never>;
        Returns: { prestataire_id: string }[];
      };
    };
  };
};
