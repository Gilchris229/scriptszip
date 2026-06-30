import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA } from '@/utils';

const MENU = [
  { label: 'Historique', sub: 'Achats & ventes', icon: 'time-outline' as const, route: '/historique', accent: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  { label: 'Crédit', sub: 'Ventes à crédit', icon: 'wallet-outline' as const, route: '/credit', accent: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { label: 'Statistiques', sub: 'Analyse des ventes', icon: 'bar-chart-outline' as const, route: '/statistiques', accent: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { label: 'Réglages', sub: 'Boutique & profil', icon: 'settings-outline' as const, route: '/reglages', accent: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
];

export default function PlusScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getKPIs, ventes, reglages } = useStore();
  const kpis = getKPIs();
  const creditVentes = ventes.filter(v => v.estCredit && v.resteAPayer > 0);
  const c = colors;

  return (
    <View style={[s.container, { backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top + 16 }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: c.foreground }]}>Plus</Text>
        <Text style={[s.subtitle, { color: c.mutedForeground }]}>{reglages.nomBoutique}</Text>
      </View>

      {/* Quick stats banner */}
      <View style={[s.banner, { backgroundColor: c.card }]}>
        <View style={s.bannerStat}>
          <Text style={[s.bannerVal, { color: c.primary }]}>{formatCFA(kpis.chiffreAffaires)}</Text>
          <Text style={[s.bannerLabel, { color: c.mutedForeground }]}>CA total</Text>
        </View>
        <View style={[s.bannerDiv, { backgroundColor: c.border }]} />
        <View style={s.bannerStat}>
          <Text style={[s.bannerVal, { color: '#22c55e' }]}>{formatCFA(kpis.benefice)}</Text>
          <Text style={[s.bannerLabel, { color: c.mutedForeground }]}>Bénéfice</Text>
        </View>
        <View style={[s.bannerDiv, { backgroundColor: c.border }]} />
        <View style={s.bannerStat}>
          <Text style={[s.bannerVal, { color: '#ef4444' }]}>{creditVentes.length}</Text>
          <Text style={[s.bannerLabel, { color: c.mutedForeground }]}>Crédits</Text>
        </View>
      </View>

      {/* Menu grid */}
      <View style={s.grid}>
        {MENU.map(item => (
          <TouchableOpacity
            key={item.route}
            style={[s.tile, { backgroundColor: c.card }]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={[s.tileIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={28} color={item.accent} />
            </View>
            <Text style={[s.tileLabel, { color: c.foreground }]}>{item.label}</Text>
            <Text style={[s.tileSub, { color: c.mutedForeground }]}>{item.sub}</Text>
            <Ionicons name="chevron-forward" size={14} color={c.mutedForeground} style={{ position: 'absolute', top: 12, right: 12 }} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: Platform.OS === 'web' ? 120 : 100 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  banner: { marginHorizontal: 16, borderRadius: 14, flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 12, marginBottom: 20 },
  bannerStat: { flex: 1, alignItems: 'center', gap: 4 },
  bannerVal: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  bannerLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  bannerDiv: { width: 1, marginVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  tile: { width: '47%', borderRadius: 16, padding: 16, gap: 8, marginLeft: 4 },
  tileIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tileLabel: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  tileSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
