import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { METIERS } from "@/config/metiers";
import type { MissionAvecLignes } from "@/lib/missions";

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
  const montantCommission = mission.paiement?.montant_commission ?? 0;
  const tauxCommission = mission.paiement?.taux_commission ?? 0;

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
          {mission.lignes.map((ligne) => {
            const metier = METIERS.find((m) => m.id === ligne.metier);
            return (
              <View key={ligne.id} style={styles.ligneRow}>
                <Text>
                  {ligne.prenom} {ligne.nom} — {metier?.label} (
                  {ligne.heure_debut.slice(0, 5)}–{ligne.heure_fin.slice(0, 5)})
                </Text>
                <Text>{ligne.tarif_applique.toFixed(2)} €</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sousTotalRow}>
          <Text>Dont commission ProParJour ({tauxCommission}%)</Text>
          <Text>{montantCommission.toFixed(2)} €</Text>
        </View>

        <View style={styles.totalRow}>
          <Text>Total réglé</Text>
          <Text>{mission.montant_total.toFixed(2)} €</Text>
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
