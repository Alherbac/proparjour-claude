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

export type SuppressionStatutType = "en_attente" | "traitee" | "refusee";

export type MissionStatutType =
  | "en_attente"
  | "confirmee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "litige";

export type LigneStatutType = "en_attente" | "acceptee" | "refusee";

export type MessageType = "texte" | "systeme" | "devis";

export type PaiementStatutType =
  | "en_attente"
  | "sequestre"
  | "libere"
  | "rembourse"
  | "echec";

export type AdminRole = "admin" | "moderator";

export type OffreStatutType = "publiee" | "pourvue" | "annulee" | "expiree";

export type CandidatureStatutType = "en_attente" | "en_discussion" | "acceptee" | "refusee";

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
  annees_experience: number | null;
  bio: string | null;
  ville: string;
  tarif_type: TarifType;
  tarif_montant: number;
  disponibilites: string[];
  zones_deplacement: string[];
  photo_url: string | null;
  statut_verification: StatutVerificationType;
  motif_refus: string | null;
  visible: boolean;
  iban: string | null;
  bic: string | null;
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

export type TauxCommissionMetierRow = { metier: MetierType; taux: number; updated_at: string; updated_by: string | null };
export type TauxCommissionPrestataireRow = { prestataire_id: string; taux: number; updated_at: string; updated_by: string | null };
export type TauxFraisSegmentClientRow = { segment: string; taux: number; updated_at: string; updated_by: string | null };
export type TauxFraisClientRow = { recruteur_id: string; taux: number; updated_at: string; updated_by: string | null };

export type VisitesRow = { id: string; chemin: string; session_id: string; appareil: "mobile" | "desktop"; created_at: string };

export type VillesAdminRow = {
  id: string;
  nom: string;
  code_zone: string;
  active: boolean;
  created_at: string;
  created_by: string | null;
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

// Vitrine page d'accueil (PhotoBand) — voir migration 0049. Colonnes
// d'affichage uniquement ; contrairement à PrestatairesPublicsRow,
// inclut les profils non encore validés.
export type PrestatairesVitrineRow = {
  id: string;
  metier: MetierType;
  titre: string | null;
  ville: string;
  photo_url: string | null;
  statut_verification: StatutVerificationType;
  created_at: string;
  prenom: string | null;
};

export type MissionsRow = {
  id: string;
  recruteur_id: string;
  offre_id: string | null;
  candidature_id: string | null;
  lieu: string;
  date_mission: string;
  description: string | null;
  statut: MissionStatutType;
  service_fait: boolean;
  motif_litige: string | null;
  montant_total: number;
  serie_id: string | null;
  modalites_acces: string | null;
  contact_sur_place: string | null;
  consignes_particulieres: string | null;
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
  refus_automatique: boolean;
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
  demande_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DemandesRow = {
  id: string;
  client_id: string;
  titre: string;
  texte_original: string | null;
  created_at: string;
};

export type SeriesFrequenceType = "hebdomadaire" | "toutes_les_2_semaines" | "jours_specifiques" | "mensuelle";
export type SeriesStatutType = "active" | "annulee";

export type SeriesMissionsRow = {
  id: string;
  recruteur_id: string;
  titre: string;
  lieu: string;
  description: string | null;
  frequence: SeriesFrequenceType;
  jours_semaine: string[];
  date_debut: string;
  date_fin: string;
  statut: SeriesStatutType;
  created_at: string;
  updated_at: string;
};

export type SeriesSousBesoinsRow = {
  id: string;
  serie_id: string;
  metier: MetierType;
  prestataire_id: string;
  heure_debut: string;
  heure_fin: string;
  tarif_horaire: number;
  created_at: string;
};

export type CandidaturesRow = {
  id: string;
  offre_id: string;
  prestataire_id: string;
  statut: CandidatureStatutType;
  message: string | null;
  profil_consulte_le: string | null;
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
  metadata: Record<string, unknown> | null;
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

export type CommandesEnAttenteRow = {
  payment_intent_id: string;
  recruteur_id: string;
  lignes: unknown;
  serie_id: string | null;
  created_at: string;
};

export type WebhookEventsTraitesRow = {
  event_id: string;
  type: string;
  created_at: string;
};

export type VersementsPrestatairesRow = {
  mission_ligne_id: string;
  reference: string | null;
  verse_par: string;
  verse_le: string;
};

export type AvisRow = {
  id: string;
  mission_ligne_id: string;
  auteur_id: string;
  cible_id: string;
  note: number;
  commentaire: string | null;
  created_at: string;
};

export type AvisPublicsRow = {
  id: string;
  prestataire_id: string;
  note: number;
  commentaire: string | null;
  created_at: string;
  auteur_prenom: string | null;
};

export type ParametresCommissionRow = {
  id: boolean;
  taux: number;
  updated_at: string;
  updated_by: string | null;
};

export type DemandesSuppressionCompteRow = {
  id: string;
  user_id: string;
  motif: string | null;
  statut: SuppressionStatutType;
  traitee_par: string | null;
  traitee_le: string | null;
  motif_refus: string | null;
  created_at: string;
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
          | "iban"
          | "bic"
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
              | "iban"
              | "bic"
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
      taux_commission_metier: {
        Row: TauxCommissionMetierRow;
        Insert: Omit<TauxCommissionMetierRow, "updated_at"> & Partial<Pick<TauxCommissionMetierRow, "updated_at">>;
        Update: Partial<TauxCommissionMetierRow>;
        Relationships: [];
      };
      taux_commission_prestataire: {
        Row: TauxCommissionPrestataireRow;
        Insert: Omit<TauxCommissionPrestataireRow, "updated_at"> & Partial<Pick<TauxCommissionPrestataireRow, "updated_at">>;
        Update: Partial<TauxCommissionPrestataireRow>;
        Relationships: [];
      };
      taux_frais_segment_client: {
        Row: TauxFraisSegmentClientRow;
        Insert: Omit<TauxFraisSegmentClientRow, "updated_at"> & Partial<Pick<TauxFraisSegmentClientRow, "updated_at">>;
        Update: Partial<TauxFraisSegmentClientRow>;
        Relationships: [];
      };
      taux_frais_client: {
        Row: TauxFraisClientRow;
        Insert: Omit<TauxFraisClientRow, "updated_at"> & Partial<Pick<TauxFraisClientRow, "updated_at">>;
        Update: Partial<TauxFraisClientRow>;
        Relationships: [];
      };
      visites: {
        Row: VisitesRow;
        Insert: Omit<VisitesRow, "id" | "created_at"> & Partial<Pick<VisitesRow, "id" | "created_at">>;
        Update: Partial<VisitesRow>;
        Relationships: [];
      };
      villes_admin: {
        Row: VillesAdminRow;
        Insert: Omit<VillesAdminRow, "id" | "created_at" | "active"> & Partial<Pick<VillesAdminRow, "id" | "created_at" | "active">>;
        Update: Partial<VillesAdminRow>;
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
        Insert: Omit<
          MissionsRow,
          "id" | "created_at" | "updated_at" | "statut" | "service_fait" | "serie_id" | "offre_id" | "candidature_id"
        > &
          Partial<Pick<MissionsRow, "id" | "statut" | "service_fait" | "serie_id" | "offre_id" | "candidature_id">>;
        Update: Partial<MissionsRow>;
        Relationships: [
          {
            foreignKeyName: "missions_serie_id_fkey";
            columns: ["serie_id"];
            isOneToOne: false;
            referencedRelation: "series_missions";
            referencedColumns: ["id"];
          },
        ];
      };
      series_missions: {
        Row: SeriesMissionsRow;
        Insert: Omit<SeriesMissionsRow, "id" | "created_at" | "updated_at" | "statut"> &
          Partial<Pick<SeriesMissionsRow, "id" | "statut">>;
        Update: Partial<SeriesMissionsRow>;
        Relationships: [];
      };
      series_sous_besoins: {
        Row: SeriesSousBesoinsRow;
        Insert: Omit<SeriesSousBesoinsRow, "id" | "created_at"> & Partial<Pick<SeriesSousBesoinsRow, "id">>;
        Update: Partial<SeriesSousBesoinsRow>;
        Relationships: [
          {
            foreignKeyName: "series_sous_besoins_serie_id_fkey";
            columns: ["serie_id"];
            isOneToOne: false;
            referencedRelation: "series_missions";
            referencedColumns: ["id"];
          },
        ];
      };
      mission_lignes: {
        Row: MissionLignesRow;
        Insert: Omit<MissionLignesRow, "id" | "created_at" | "updated_at" | "statut_acceptation" | "refus_automatique"> &
          Partial<Pick<MissionLignesRow, "id" | "statut_acceptation" | "refus_automatique">>;
        Update: Partial<MissionLignesRow>;
        Relationships: [];
      };
      offres: {
        Row: OffresRow;
        Insert: Omit<OffresRow, "id" | "created_at" | "updated_at" | "statut" | "demande_id"> &
          Partial<Pick<OffresRow, "id" | "statut" | "demande_id">>;
        Update: Partial<OffresRow>;
        Relationships: [
          {
            foreignKeyName: "offres_demande_id_fkey";
            columns: ["demande_id"];
            isOneToOne: false;
            referencedRelation: "demandes";
            referencedColumns: ["id"];
          },
        ];
      };
      demandes: {
        Row: DemandesRow;
        Insert: Omit<DemandesRow, "id" | "created_at"> & Partial<Pick<DemandesRow, "id" | "created_at">>;
        Update: Partial<DemandesRow>;
        Relationships: [];
      };
      candidatures: {
        Row: CandidaturesRow;
        Insert: Omit<CandidaturesRow, "id" | "created_at" | "updated_at" | "statut" | "message" | "profil_consulte_le"> &
          Partial<Pick<CandidaturesRow, "id" | "statut" | "message" | "profil_consulte_le">>;
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
        Insert: Omit<MessagesRow, "id" | "created_at" | "lu" | "type" | "metadata"> &
          Partial<Pick<MessagesRow, "id" | "lu" | "type" | "metadata">>;
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
      commandes_en_attente: {
        Row: CommandesEnAttenteRow;
        Insert: Omit<CommandesEnAttenteRow, "created_at" | "serie_id"> & Partial<Pick<CommandesEnAttenteRow, "serie_id">>;
        Update: Partial<CommandesEnAttenteRow>;
        Relationships: [];
      };
      webhook_events_traites: {
        Row: WebhookEventsTraitesRow;
        Insert: Omit<WebhookEventsTraitesRow, "created_at">;
        Update: Partial<WebhookEventsTraitesRow>;
        Relationships: [];
      };
      versements_prestataires: {
        Row: VersementsPrestatairesRow;
        Insert: Omit<VersementsPrestatairesRow, "verse_le"> & Partial<Pick<VersementsPrestatairesRow, "verse_le">>;
        Update: Partial<VersementsPrestatairesRow>;
        Relationships: [];
      };
      avis: {
        Row: AvisRow;
        Insert: Omit<AvisRow, "id" | "created_at"> & Partial<Pick<AvisRow, "id" | "created_at">>;
        Update: Partial<AvisRow>;
        Relationships: [];
      };
      demandes_suppression_compte: {
        Row: DemandesSuppressionCompteRow;
        Insert: Omit<DemandesSuppressionCompteRow, "id" | "created_at" | "statut" | "traitee_par" | "traitee_le" | "motif_refus"> &
          Partial<Pick<DemandesSuppressionCompteRow, "id" | "created_at" | "statut" | "traitee_par" | "traitee_le" | "motif_refus">>;
        Update: Partial<DemandesSuppressionCompteRow>;
        Relationships: [];
      };
      parametres_commission: {
        Row: ParametresCommissionRow;
        Insert: Partial<ParametresCommissionRow>;
        Update: Partial<ParametresCommissionRow>;
        Relationships: [];
      };
    };
    Views: {
      prestataires_publics: {
        Row: PrestatairesPublicsRow;
        Relationships: [];
      };
      prestataires_vitrine: {
        Row: PrestatairesVitrineRow;
        Relationships: [];
      };
      avis_publics: {
        Row: AvisPublicsRow;
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
      creer_mission_depuis_candidature: {
        Args: {
          p_recruteur_id: string;
          p_offre_id: string;
          p_candidature_id: string;
          p_prestataire_id: string;
          p_metier: MetierType;
          p_lieu: string;
          p_date_mission: string;
          p_heure_debut: string;
          p_heure_fin: string;
          p_tarif_applique: number;
          p_montant_total: number;
          p_taux_commission: number;
          p_montant_commission: number;
          p_description?: string | null;
        };
        Returns: string;
      };
      confirmer_paiement_mission: {
        Args: { p_mission_id: string; p_stripe_payment_intent_id: string; p_montant?: number | null };
        Returns: undefined;
      };
      creer_mission_proposee: {
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
          p_description?: string | null;
        };
        Returns: string;
      };
      compter_missions_total: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      compter_prestataires_valides: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      prestataires_en_mission_ids: {
        Args: Record<PropertyKey, never>;
        Returns: { prestataire_id: string }[];
      };
      prestataires_indisponibles_le: {
        Args: { p_date: string };
        Returns: { prestataire_id: string }[];
      };
      prestataires_fiabilite: {
        Args: Record<PropertyKey, never>;
        Returns: { prestataire_id: string; missions_terminees: number; nb_litiges: number }[];
      };
      verifier_limite_debit: {
        Args: { p_cle: string; p_max: number; p_fenetre_secondes: number };
        Returns: boolean;
      };
      avis_moyenne_prestataires: {
        Args: Record<PropertyKey, never>;
        Returns: { prestataire_id: string; note_moyenne: number; nb_avis: number }[];
      };
    };
  };
};
