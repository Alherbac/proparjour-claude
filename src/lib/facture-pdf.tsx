import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { METIERS } from "@/config/metiers";
import type { MissionAvecLignes } from "@/lib/missions";
import type { MetierType } from "@/lib/supabase/database.types";
import { repartitionLigne } from "@/lib/facturation";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
  marque: { fontSize: 20, fontWeight: 700, color: "#c0293e" },
  numero: { color: "#666", fontSize: 9, marginTop: 4 },
  section: { marginTop: 20 },
  label: { color: "#666", fontSize: 9, marginBottom: 3, textTransform: "uppercase" },
  ligneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sousTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    fontSize: 14,
    fontWeight: 700,
  },
  mentions: { marginTop: 40, fontSize: 8, color: "#888", lineHeight: 1.5 },
});

export function FacturePDF({
  mission,
  factureA,
}: {
  mission: MissionAvecLignes;
  factureA: string;
}) {
  const numeroFacture = `FACT-${mission.id.slice(0, 8).toUpperCase()}`;
  // mission.paiement.montant est déjà le TOTAL payé par le client,
  // commission comprise (voir lib/facturation.ts) — jamais additionné
  // à la commission pour obtenir un "total" (bug corrigé 2026-09-17 :
  // 109,50 € + 16,43 € affichait un total fantôme de 125,93 €).
  const montantCommission = mission.paiement?.montant_commission ?? 0;
  const tauxCommission = mission.paiement?.taux_commission ?? 0;
  const totalClient = mission.paiement?.montant ?? mission.montant_total;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={styles.marque}>ProParJour</Text>
            <Text style={styles.numero}>Facture n° {numeroFacture}</Text>
            <Text style={styles.numero}>
              Émise le {new Date(mission.created_at).toLocaleDateString("fr-FR")}
            </Text>
          </View>
          <View>
            <Text style={styles.label}>Facturé à</Text>
            <Text>{factureA}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Mission</Text>
          <Text>
            {mission.lieu} — le{" "}
            {new Date(mission.date_mission).toLocaleDateString("fr-FR")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Prestation</Text>
          {mission.lignes
            .filter((ligne) => ligne.statut_acceptation === "acceptee")
            .map((ligne) => {
              const metier = METIERS.find((m) => m.id === ligne.metier);
              // Après une fin de mission déclarée et confirmée (suivi
              // d'exécution, migration 0059), l'horaire réel remplace
              // l'horaire prévu à l'affichage. Le montant de CETTE
              // ligne est sa "prestation" (totalClient − commission,
              // jamais le "net prestataire" — deux fois plus réduit,
              // jamais montré au client, voir lib/facturation.ts) : la
              // somme des lignes + la commission globale ci-dessous
              // reconstitue le total réglé, jamais une seconde fois compté.
              const heureDebutAffichee = ligne.heure_fin_statut === "confirmee" && ligne.heure_debut_reelle ? ligne.heure_debut_reelle : ligne.heure_debut;
              const heureFinAffichee = ligne.heure_fin_statut === "confirmee" && ligne.heure_fin_reelle ? ligne.heure_fin_reelle : ligne.heure_fin;
              const { prestation } = repartitionLigne(ligne, tauxCommission);
              return (
                <View key={ligne.id} style={styles.ligneRow}>
                  <Text>
                    {ligne.prenom} {ligne.nom} — {metier?.label} (
                    {heureDebutAffichee.slice(0, 5)}–{heureFinAffichee.slice(0, 5)})
                  </Text>
                  <Text>{prestation.toFixed(2)} €</Text>
                </View>
              );
            })}
        </View>

        <View style={styles.sousTotalRow}>
          <Text>Commission ProParJour ({tauxCommission}%)</Text>
          <Text>{montantCommission.toFixed(2)} €</Text>
        </View>

        <View style={styles.totalRow}>
          <Text>Total payé par le client</Text>
          <Text>{totalClient.toFixed(2)} €</Text>
        </View>

        <Text style={styles.mentions}>
          Paiement séquestré par ProParJour jusqu&apos;à la réalisation de la
          mission, puis reversé au(x) prestataire(s), commission plateforme
          déduite. TVA non applicable, art. 293 B du CGI (à ajuster selon le
          statut fiscal réel de la structure).
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Données nécessaires à la facture PRESTATAIRE — jamais le montant
 * total de la mission ni la part d'un autre prestataire sur une même
 * mission (voir getLignePourFacturePrestataire, lib/missions.ts, qui
 * ne relit que le taux de commission via le client admin, exactement
 * le même principe que getLignesPrestataire, prestataire/_data.ts).
 */
export type LigneFacturePrestataire = {
  missionId: string;
  createdAt: string;
  lieu: string;
  dateMission: string;
  metier: MetierType;
  heureDebutPrevue: string;
  heureFinPrevue: string;
  heureDebutReelle: string | null;
  heureFinReelle: string | null;
  finConfirmee: boolean;
  tarifApplique: number;
  tarifFinal: number | null;
  tauxCommission: number;
};

/**
 * Facture/justificatif du prestataire — même moteur de calcul que la
 * facture client (montantDuLigne / repartitionLigne, jamais un second
 * calcul), mais un document distinct : le prestataire ne doit jamais
 * voir le montant total facturé au client ni la part d'un autre
 * prestataire sur la même mission.
 */
export function FacturePDFPrestataire({ ligne, factureA }: { ligne: LigneFacturePrestataire; factureA: string }) {
  const numeroFacture = `FACT-${ligne.missionId.slice(0, 8).toUpperCase()}`;
  const metier = METIERS.find((m) => m.id === ligne.metier);
  const { totalClient, commission, prestation, netPrestataire } = repartitionLigne({ tarif_applique: ligne.tarifApplique, tarif_final: ligne.tarifFinal }, ligne.tauxCommission);
  const heureDebutAffichee = ligne.finConfirmee && ligne.heureDebutReelle ? ligne.heureDebutReelle : ligne.heureDebutPrevue;
  const heureFinAffichee = ligne.finConfirmee && ligne.heureFinReelle ? ligne.heureFinReelle : ligne.heureFinPrevue;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={styles.marque}>ProParJour</Text>
            <Text style={styles.numero}>Justificatif de versement n° {numeroFacture}</Text>
            <Text style={styles.numero}>Émis le {new Date(ligne.createdAt).toLocaleDateString("fr-FR")}</Text>
          </View>
          <View>
            <Text style={styles.label}>Prestataire</Text>
            <Text>{factureA}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Mission</Text>
          <Text>
            {metier?.label} — {ligne.lieu} — le {new Date(ligne.dateMission).toLocaleDateString("fr-FR")}
          </Text>
          <Text style={{ marginTop: 3, color: "#666", fontSize: 9 }}>
            {heureDebutAffichee.slice(0, 5)}–{heureFinAffichee.slice(0, 5)}
            {ligne.finConfirmee ? " (horaires réellement effectués, confirmés par le client)" : " (horaires prévus)"}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.ligneRow}>
            <Text>Prestation</Text>
            <Text>{prestation.toFixed(2)} €</Text>
          </View>
        </View>

        <View style={styles.sousTotalRow}>
          <Text>Commission ProParJour ({ligne.tauxCommission}%)</Text>
          <Text>{commission.toFixed(2)} €</Text>
        </View>

        <View style={styles.sousTotalRow}>
          <Text>Total client</Text>
          <Text>{totalClient.toFixed(2)} €</Text>
        </View>

        <View style={styles.totalRow}>
          <Text>Votre net</Text>
          <Text>{netPrestataire.toFixed(2)} €</Text>
        </View>

        <Text style={styles.mentions}>
          Une commission ProParJour de {ligne.tauxCommission}% est prélevée sur le total
          client, puis à nouveau sur la prestation qui en résulte, pour obtenir
          le montant net réellement versé au prestataire. TVA non applicable,
          art. 293 B du CGI (à ajuster selon le statut fiscal réel du prestataire).
        </Text>
      </Page>
    </Document>
  );
}
