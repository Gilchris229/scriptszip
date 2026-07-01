import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AlertTriangle } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA, formatDate, getCurrentMonth, getMonthLabel, addMonth } from '@/utils';
import { useStockAlerts } from '@/hooks/useStockAlerts';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reglages, ventes, getKPIs } = useStore();
  const { getLowStockItems } = useStockAlerts();
  const [mois, setMois] = useState(getCurrentMonth());

  // Computed fresh every render — no stale memoisation
  const kpis = getKPIs(mois);
  const recentVentes = ventes
    .filter(v => v.dateVente.startsWith(mois))
    .sort((a, b) => b.dateVente.localeCompare(a.dateVente))
    .slice(0, 12);
  const canGoNext = mois < getCurrentMonth();
  const lowStockItems = getLowStockItems();

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
        {/* KPI grid — 4 standard cards */}
        <View style={styles.kpiGrid}>
          <KpiCard label="Chiffre d'affaires" value={formatCFA(kpis.chiffreAffaires)} icon="trending-up" accent="#22c55e" accentBg="rgba(34,197,94,0.12)" colors={colors} />
          <KpiCard label="Bénéfice net" value={formatCFA(kpis.benefice)} icon="cash-outline" accent={colors.primary} accentBg="rgba(99,102,241,0.12)" colors={colors} />
          <KpiCard label="Articles en stock" value={String(kpis.nbArticlesStock)} icon="cube-outline" accent="#f59e0b" accentBg="rgba(245,158,11,0.12)" colors={colors} />
          <KpiCard label="Crédit encours" value={formatCFA(kpis.montantCredit)} icon="time-outline" accent="#ef4444" accentBg="rgba(239,68,68,0.12)" colors={colors} />
        </View>

        {/* Capital investi — full-width, blue */}
        <View style={[styles.creancesCard, { backgroundColor: colors.card, marginBottom: 10 }]}>
          <View style={[styles.creancesIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
            <Ionicons name="wallet-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.creancesLabel, { color: colors.mutedForeground }]}>Capital investi (total)</Text>
            <Text style={[styles.creancesValue, { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatCFA(kpis.capitalInvesti)}
            </Text>
          </View>
        </View>

        {/* Créances — full-width, orange */}
        <View style={[styles.creancesCard, { backgroundColor: colors.card }]}>
          <View style={[styles.creancesIcon, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
            <Ionicons name="card-outline" size={22} color="#f97316" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.creancesLabel, { color: colors.mutedForeground }]}>Créances (ventes à crédit)</Text>
            <Text style={[styles.creancesValue, { color: '#f97316' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatCFA(kpis.totalCreances)}
            </Text>
          </View>
          <View style={[styles.creancesBadge, { backgroundColor: kpis.totalCreances > 0 ? 'rgba(249,115,22,0.12)' : 'rgba(34,197,94,0.12)' }]}>
            <Text style={[styles.creancesBadgeText, { color: kpis.totalCreances > 0 ? '#f97316' : '#22c55e' }]}>
              {kpis.totalCreances > 0 ? 'À récupérer' : 'Tout soldé'}
            </Text>
          </View>
        </View>

        {/* Stock alerts */}
        {lowStockItems.length > 0 && (
          <>
            <View style={[styles.alertsHeader, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }]}>
              <AlertTriangle size={18} color="#ef4444" />
              <Text style={[styles.alertsTitle, { color: '#ef4444' }]}>
                Alertes stock ({lowStockItems.length})
              </Text>
            </View>
            {lowStockItems.map(item => (
              <View key={item.achat.id} style={[styles.alertRow, { backgroundColor: colors.card, borderLeftColor: '#ef4444' }]}>
                <View style={styles.alertLeft}>
                  <Text style={[styles.alertName, { color: colors.foreground }]}>{item.achat.modele}</Text>
                  <Text style={[styles.alertMeta, { color: colors.mutedForeground }]}>
                    {item.achat.pointure} · {item.achat.couleur}
                  </Text>
                </View>
                <View style={[styles.alertBadge, { backgroundColor: item.quantiteRestante <= 1 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                  <Text style={[styles.alertBadgeText, { color: item.quantiteRestante <= 1 ? '#ef4444' : '#f59e0b' }]}>
                    {item.quantiteRestante} restant{item.quantiteRestante > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            ))}
            <View style={{ height: 8 }} />
          </>
        )}

        {/* Recent sales */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ventes du mois</Text>
        {recentVentes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aucune vente ce mois-ci</Text>
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
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  creancesCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 20 },
  creancesIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  creancesLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  creancesValue: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  creancesBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  creancesBadgeText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
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
  alertsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  alertsTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  alertRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 6, borderLeftWidth: 3 },
  alertLeft: { flex: 1, gap: 2 },
  alertName: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  alertMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  alertBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  alertBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
