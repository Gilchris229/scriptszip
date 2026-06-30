import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA, formatDate, getCurrentMonth, getMonthLabel, addMonth } from '@/utils';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reglages, ventes, getKPIs } = useStore();
  const [mois, setMois] = useState(getCurrentMonth());

  const kpis = useMemo(() => getKPIs(mois), [getKPIs, mois]);
  const recentVentes = useMemo(() => ventes.slice(0, 12), [ventes]);
  const canGoNext = mois < getCurrentMonth();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.shopName, { color: colors.foreground }]} numberOfLines={1}>{reglages.nomBoutique}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Tableau de bord</Text>
        </View>
        <View style={[styles.iconBox, { backgroundColor: colors.card }]}>
          <Ionicons name="storefront-outline" size={22} color={colors.primary} />
        </View>
      </View>

      {/* Month selector */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => setMois(m => addMonth(m, -1))} style={[styles.arrowBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="chevron-back" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>{getMonthLabel(mois)}</Text>
        <TouchableOpacity
          onPress={() => { if (canGoNext) setMois(m => addMonth(m, 1)); }}
          style={[styles.arrowBtn, { backgroundColor: colors.card, opacity: canGoNext ? 1 : 0.3 }]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <KpiCard label="Chiffre d'affaires" value={formatCFA(kpis.chiffreAffaires)} icon="trending-up" accent="#22c55e" accentBg="rgba(34,197,94,0.12)" colors={colors} />
          <KpiCard label="Bénéfice net" value={formatCFA(kpis.benefice)} icon="cash-outline" accent={colors.primary} accentBg="rgba(99,102,241,0.12)" colors={colors} />
          <KpiCard label="Articles en stock" value={String(kpis.nbArticlesStock)} icon="cube-outline" accent="#f59e0b" accentBg="rgba(245,158,11,0.12)" colors={colors} />
          <KpiCard label="Crédit encours" value={formatCFA(kpis.montantCredit)} icon="time-outline" accent="#ef4444" accentBg="rgba(239,68,68,0.12)" colors={colors} />
        </View>

        {/* Recent sales */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ventes récentes</Text>
        {recentVentes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aucune vente enregistrée</Text>
          </View>
        ) : (
          recentVentes.map(v => (
            <View key={v.id} style={[styles.venteRow, { backgroundColor: colors.card }]}>
              <View style={styles.venteLeft}>
                <Text style={[styles.venteName, { color: colors.foreground }]}>{v.modele}</Text>
                <Text style={[styles.venteMeta, { color: colors.mutedForeground }]}>
                  {v.pointure} · {v.couleur} · ×{v.quantite}
                </Text>
                <Text style={[styles.venteDate, { color: colors.mutedForeground }]}>{formatDate(v.dateVente)}</Text>
              </View>
              <View style={styles.venteRight}>
                <Text style={[styles.venteAmt, { color: colors.primary }]}>{formatCFA(v.montantTotal)}</Text>
                {v.estCredit && v.resteAPayer > 0 && (
                  <View style={[styles.creditBadge, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                    <Text style={styles.creditBadgeText}>Crédit</Text>
                  </View>
                )}
                {v.estCredit && v.resteAPayer === 0 && (
                  <View style={[styles.creditBadge, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                    <Text style={[styles.creditBadgeText, { color: '#22c55e' }]}>Soldé</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: Platform.OS === 'web' ? 120 : 100 }} />
      </ScrollView>
    </View>
  );
}

function KpiCard({ label, value, icon, accent, accentBg, colors }: {
  label: string; value: string; icon: any; accent: string; accentBg: string; colors: any;
}) {
  return (
    <View style={[kpiStyles.card, { backgroundColor: colors.card }]}>
      <View style={[kpiStyles.icon, { backgroundColor: accentBg }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={[kpiStyles.value, { color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={[kpiStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: { width: '48%', padding: 14, borderRadius: 16, gap: 8, marginBottom: 8 },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  label: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 14 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  shopName: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  iconBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 16 },
  arrowBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', minWidth: 150, textAlign: 'center' },
  scroll: { paddingHorizontal: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 10 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  venteRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8 },
  venteLeft: { flex: 1, gap: 3 },
  venteName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  venteMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  venteDate: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  venteRight: { alignItems: 'flex-end', gap: 4 },
  venteAmt: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  creditBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  creditBadgeText: { fontSize: 11, color: '#ef4444', fontFamily: 'Inter_500Medium' },
});
