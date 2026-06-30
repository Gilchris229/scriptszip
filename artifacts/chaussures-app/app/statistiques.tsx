import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA, getMonthLabel } from '@/utils';

export default function StatistiquesScreen() {
  const colors = useColors();
  const { getMonthlyData, ventes, achats } = useStore();
  const c = colors;

  const monthly = useMemo(() => getMonthlyData(), [getMonthlyData]);
  const maxCA = useMemo(() => Math.max(...monthly.map(m => m.ca), 1), [monthly]);

  // Top 5 models by quantity sold
  const topModels = useMemo(() => {
    const map: Record<string, { modele: string; qty: number; ca: number }> = {};
    ventes.forEach(v => {
      const key = `${v.modele}|${v.pointure}|${v.couleur}`;
      if (!map[key]) map[key] = { modele: `${v.modele} (P${v.pointure}, ${v.couleur})`, qty: 0, ca: 0 };
      map[key].qty += v.quantite;
      map[key].ca += v.montantTotal;
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [ventes]);

  const maxQty = useMemo(() => Math.max(...topModels.map(m => m.qty), 1), [topModels]);

  // Global stats
  const totalCA = ventes.reduce((s, v) => s + v.montantTotal, 0);
  const totalBenefice = ventes.reduce((s, v) => {
    const a = achats.find(ac => ac.id === v.achatId);
    return a ? s + (v.prixUnitaire - a.prixAchat) * v.quantite : s;
  }, 0);
  const totalAchats = achats.reduce((s, a) => s + a.prixAchat * a.quantiteAchetee, 0);
  const margeGlobale = totalCA > 0 ? Math.round((totalBenefice / totalCA) * 100) : 0;

  return (
    <ScrollView style={[s.container, { backgroundColor: c.background }]} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Global KPIs */}
      <Text style={[s.sectionTitle, { color: c.foreground }]}>Vue globale</Text>
      <View style={s.kpiRow}>
        <View style={[s.kpiBox, { backgroundColor: c.card }]}>
          <Text style={[s.kpiVal, { color: c.primary }]}>{formatCFA(totalCA)}</Text>
          <Text style={[s.kpiLabel, { color: c.mutedForeground }]}>Chiffre d'affaires total</Text>
        </View>
        <View style={[s.kpiBox, { backgroundColor: c.card }]}>
          <Text style={[s.kpiVal, { color: '#22c55e' }]}>{formatCFA(totalBenefice)}</Text>
          <Text style={[s.kpiLabel, { color: c.mutedForeground }]}>Bénéfice total</Text>
        </View>
      </View>
      <View style={s.kpiRow}>
        <View style={[s.kpiBox, { backgroundColor: c.card }]}>
          <Text style={[s.kpiVal, { color: '#f59e0b' }]}>{formatCFA(totalAchats)}</Text>
          <Text style={[s.kpiLabel, { color: c.mutedForeground }]}>Investissements</Text>
        </View>
        <View style={[s.kpiBox, { backgroundColor: c.card }]}>
          <Text style={[s.kpiVal, { color: margeGlobale >= 20 ? '#22c55e' : '#f59e0b' }]}>{margeGlobale}%</Text>
          <Text style={[s.kpiLabel, { color: c.mutedForeground }]}>Marge brute</Text>
        </View>
      </View>

      {/* Monthly chart */}
      <Text style={[s.sectionTitle, { color: c.foreground }]}>6 derniers mois — CA</Text>
      <View style={[s.chartCard, { backgroundColor: c.card }]}>
        {monthly.every(m => m.ca === 0) ? (
          <Text style={[s.noData, { color: c.mutedForeground }]}>Pas encore de données</Text>
        ) : (
          <View style={s.chart}>
            {monthly.map((m, i) => {
              const barH = maxCA > 0 ? Math.max(4, (m.ca / maxCA) * 120) : 4;
              const bH = maxCA > 0 ? Math.max(4, (m.benefice / maxCA) * 120) : 4;
              return (
                <View key={m.mois} style={s.barGroup}>
                  <Text style={[s.barAmt, { color: c.mutedForeground }]} numberOfLines={1}>
                    {m.ca > 0 ? `${Math.round(m.ca / 1000)}k` : ''}
                  </Text>
                  <View style={s.bars}>
                    <View style={[s.bar, { height: barH, backgroundColor: c.primary }]} />
                    <View style={[s.bar, { height: bH, backgroundColor: '#22c55e', opacity: 0.8 }]} />
                  </View>
                  <Text style={[s.barLabel, { color: c.mutedForeground }]}>
                    {getMonthLabel(m.mois).slice(0, 3)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        {/* Legend */}
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: c.primary }]} />
            <Text style={[s.legendText, { color: c.mutedForeground }]}>CA</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={[s.legendText, { color: c.mutedForeground }]}>Bénéfice</Text>
          </View>
        </View>
      </View>

      {/* Monthly breakdown table */}
      <Text style={[s.sectionTitle, { color: c.foreground }]}>Détail mensuel</Text>
      <View style={[s.tableCard, { backgroundColor: c.card }]}>
        <View style={[s.tableHead, { borderBottomColor: c.border }]}>
          <Text style={[s.thCell, { color: c.mutedForeground, flex: 2 }]}>Mois</Text>
          <Text style={[s.thCell, { color: c.mutedForeground }]}>CA</Text>
          <Text style={[s.thCell, { color: c.mutedForeground }]}>Bénéfice</Text>
        </View>
        {[...monthly].reverse().map((m, i) => (
          <View key={m.mois} style={[s.tableRow, i < monthly.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
            <Text style={[s.tdCell, { color: c.foreground, flex: 2 }]}>{getMonthLabel(m.mois)}</Text>
            <Text style={[s.tdCell, { color: c.primary }]}>{m.ca > 0 ? formatCFA(m.ca) : '—'}</Text>
            <Text style={[s.tdCell, { color: '#22c55e' }]}>{m.benefice > 0 ? formatCFA(m.benefice) : '—'}</Text>
          </View>
        ))}
      </View>

      {/* Top models */}
      {topModels.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { color: c.foreground }]}>Top articles vendus</Text>
          <View style={[s.tableCard, { backgroundColor: c.card }]}>
            {topModels.map((m, i) => (
              <View key={m.modele} style={[s.topRow, i < topModels.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
                <View style={[s.rank, { backgroundColor: i === 0 ? 'rgba(99,102,241,0.2)' : c.background }]}>
                  <Text style={[s.rankText, { color: i === 0 ? c.primary : c.mutedForeground }]}>#{i + 1}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[s.topName, { color: c.foreground }]} numberOfLines={1}>{m.modele}</Text>
                  <View style={[s.topBarBg, { backgroundColor: c.border }]}>
                    <View style={[s.topBarFill, { width: `${(m.qty / maxQty) * 100}%` as any, backgroundColor: c.primary }]} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[s.topQty, { color: c.foreground }]}>{m.qty} u.</Text>
                  <Text style={[s.topCA, { color: c.mutedForeground }]}>{formatCFA(m.ca)}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: Platform.OS === 'web' ? 60 : 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 10, marginTop: 8 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiBox: { flex: 1, borderRadius: 12, padding: 14, gap: 6 },
  kpiVal: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  kpiLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  chartCard: { borderRadius: 14, padding: 16, marginBottom: 16 },
  noData: { textAlign: 'center', paddingVertical: 24, fontFamily: 'Inter_400Regular' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150 },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  barAmt: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  bars: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  bar: { width: 10, borderRadius: 3 },
  barLabel: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  tableCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  tableHead: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
  thCell: { flex: 1, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.4 },
  tdCell: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  rank: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  topName: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  topBarBg: { height: 4, borderRadius: 2 },
  topBarFill: { height: 4, borderRadius: 2 },
  topQty: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  topCA: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
