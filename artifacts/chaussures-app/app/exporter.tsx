import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import {
  toCSV,
  downloadCSV,
  buildReportHTML,
  downloadReportPDF,
  buildStockRows,
  buildAchatsRows,
  buildVentesRows,
} from '@/utils/exportData';
import { formatCFA, getTodayISO } from '@/utils';

type ExportKey = 'stock-csv' | 'stock-pdf' | 'ventes-csv' | 'ventes-pdf' | 'achats-csv' | 'achats-pdf';

export default function ExportScreen() {
  const colors = useColors();
  const c = colors;
  const { achats, ventes, ventesCredit, reglages, getStockList, getKPIs } = useStore();
  const [loading, setLoading] = useState<ExportKey | null>(null);

  const run = async (key: ExportKey, action: () => Promise<void>) => {
    setLoading(key);
    try {
      await action();
      if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setLoading(null);
    }
  };

  const exportStockCSV = () => run('stock-csv', async () => {
    const { headers, rows } = buildStockRows(getStockList());
    await downloadCSV(`stock_${getTodayISO()}.csv`, toCSV(headers, rows));
  });

  const exportStockPDF = () => run('stock-pdf', async () => {
    const { headers, rows } = buildStockRows(getStockList());
    const kpis = getKPIs();
    const html = buildReportHTML('Rapport de stock', headers, rows, reglages, [
      { label: 'Articles en stock', value: String(kpis.nbArticlesStock) },
      { label: 'Capital investi', value: formatCFA(kpis.capitalInvesti) },
    ]);
    await downloadReportPDF(`stock_${getTodayISO()}.pdf`, html);
  });

  const exportVentesCSV = () => run('ventes-csv', async () => {
    const { headers, rows } = buildVentesRows(ventes, ventesCredit);
    await downloadCSV(`ventes_${getTodayISO()}.csv`, toCSV(headers, rows));
  });

  const exportVentesPDF = () => run('ventes-pdf', async () => {
    const { headers, rows } = buildVentesRows(ventes, ventesCredit);
    const kpis = getKPIs();
    const html = buildReportHTML('Rapport des ventes', headers, rows, reglages, [
      { label: 'Chiffre d\u2019affaires', value: formatCFA(kpis.chiffreAffaires) },
      { label: 'Bénéfice', value: formatCFA(kpis.benefice) },
      { label: 'Crédit en cours', value: formatCFA(kpis.montantCredit) },
    ]);
    await downloadReportPDF(`ventes_${getTodayISO()}.pdf`, html);
  });

  const exportAchatsCSV = () => run('achats-csv', async () => {
    const { headers, rows } = buildAchatsRows(achats);
    await downloadCSV(`achats_${getTodayISO()}.csv`, toCSV(headers, rows));
  });

  const exportAchatsPDF = () => run('achats-pdf', async () => {
    const { headers, rows } = buildAchatsRows(achats);
    const kpis = getKPIs();
    const html = buildReportHTML('Rapport des achats', headers, rows, reglages, [
      { label: 'Total investi', value: formatCFA(kpis.totalAchats) },
      { label: 'Nombre d\u2019achats', value: String(achats.length) },
    ]);
    await downloadReportPDF(`achats_${getTodayISO()}.pdf`, html);
  });

  return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.intro, { color: c.mutedForeground }]}>
          Exportez vos données au format Excel (CSV) ou PDF pour les consulter, les partager ou les archiver.
        </Text>

        <ExportCard
          icon="cube-outline"
          accent="#f97316"
          bg="rgba(249,115,22,0.12)"
          title="Stock"
          subtitle="Articles et quantités disponibles"
          colors={c}
          loading={loading}
          csvKey="stock-csv"
          pdfKey="stock-pdf"
          onCsv={exportStockCSV}
          onPdf={exportStockPDF}
        />

        <ExportCard
          icon="cart-outline"
          accent="#6366f1"
          bg="rgba(99,102,241,0.12)"
          title="Ventes"
          subtitle="Ventes comptant et à crédit"
          colors={c}
          loading={loading}
          csvKey="ventes-csv"
          pdfKey="ventes-pdf"
          onCsv={exportVentesCSV}
          onPdf={exportVentesPDF}
        />

        <ExportCard
          icon="bag-add-outline"
          accent="#22c55e"
          bg="rgba(34,197,94,0.12)"
          title="Achats"
          subtitle="Historique des approvisionnements"
          colors={c}
          loading={loading}
          csvKey="achats-csv"
          pdfKey="achats-pdf"
          onCsv={exportAchatsCSV}
          onPdf={exportAchatsPDF}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

interface ExportCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: string;
  bg: string;
  title: string;
  subtitle: string;
  colors: ReturnType<typeof useColors>;
  loading: ExportKey | null;
  csvKey: ExportKey;
  pdfKey: ExportKey;
  onCsv: () => void;
  onPdf: () => void;
}

function ExportCard({ icon, accent, bg, title, subtitle, colors: c, loading, csvKey, pdfKey, onCsv, onPdf }: ExportCardProps) {
  return (
    <View style={[s.card, { backgroundColor: c.card }]}>
      <View style={s.cardHeader}>
        <View style={[s.cardIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={22} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: c.foreground }]}>{title}</Text>
          <Text style={[s.cardSubtitle, { color: c.mutedForeground }]}>{subtitle}</Text>
        </View>
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: c.background, borderColor: c.border }]}
          onPress={onCsv}
          disabled={loading !== null}
          activeOpacity={0.7}
        >
          {loading === csvKey ? (
            <ActivityIndicator size="small" color="#22c55e" />
          ) : (
            <Ionicons name="grid-outline" size={16} color="#22c55e" />
          )}
          <Text style={[s.actionText, { color: c.foreground }]}>Excel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: c.background, borderColor: c.border }]}
          onPress={onPdf}
          disabled={loading !== null}
          activeOpacity={0.7}
        >
          {loading === pdfKey ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Ionicons name="document-text-outline" size={16} color="#ef4444" />
          )}
          <Text style={[s.actionText, { color: c.foreground }]}>PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  intro: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 4 },
  card: { borderRadius: 16, padding: 16, gap: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  cardSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, borderWidth: 1 },
  actionText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
