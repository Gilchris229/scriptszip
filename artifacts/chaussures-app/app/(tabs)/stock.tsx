import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
  TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA } from '@/utils';

export default function StockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getStockList, deleteAchat } = useStore();
  const [search, setSearch] = useState('');

  const stockList = useMemo(() => {
    const list = getStockList();
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(i =>
      i.achat.modele.toLowerCase().includes(q) ||
      i.achat.pointure.toLowerCase().includes(q) ||
      i.achat.couleur.toLowerCase().includes(q)
    );
  }, [getStockList, search]);

  const confirmDelete = (id: string, modele: string) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${modele}" et toutes ses ventes associées ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            await deleteAchat(id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const c = colors;
  return (
    <View style={[s.container, { backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top + 16 }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: c.foreground }]}>Stock</Text>
        <Text style={[s.subtitle, { color: c.mutedForeground }]}>{stockList.length} article{stockList.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Search */}
      <View style={[s.searchBox, { backgroundColor: c.card, borderColor: c.border }]}>
        <Ionicons name="search" size={16} color={c.mutedForeground} />
        <TextInput
          style={[s.searchInput, { color: c.foreground }]}
          placeholder="Rechercher..."
          placeholderTextColor={c.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={c.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={stockList}
        keyExtractor={i => i.achat.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={48} color={c.mutedForeground} />
            <Text style={[s.emptyTitle, { color: c.foreground }]}>Stock vide</Text>
            <Text style={[s.emptyText, { color: c.mutedForeground }]}>
              {search ? 'Aucun résultat' : 'Enregistrez des achats pour voir votre stock'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { achat, quantiteRestante, quantiteVendue } = item;
          const isOut = quantiteRestante === 0;
          const isLow = quantiteRestante > 0 && quantiteRestante <= 2;
          const stockColor = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e';
          const stockBg = isOut ? 'rgba(239,68,68,0.12)' : isLow ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)';
          return (
            <View style={[s.card, { backgroundColor: c.card }]}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.modele, { color: c.foreground }]}>{achat.modele}</Text>
                  <Text style={[s.meta, { color: c.mutedForeground }]}>P{achat.pointure} · {achat.couleur}</Text>
                </View>
                <View style={[s.stockBadge, { backgroundColor: stockBg }]}>
                  <Text style={[s.stockBadgeText, { color: stockColor }]}>
                    {isOut ? 'Épuisé' : `${quantiteRestante} restant${quantiteRestante > 1 ? 's' : ''}`}
                  </Text>
                </View>
              </View>

              <View style={[s.divider, { backgroundColor: c.border }]} />

              <View style={s.cardMid}>
                <Stat label="Achat/u" value={formatCFA(achat.prixAchat)} colors={c} />
                <Stat label="Vente/u" value={formatCFA(achat.prixVente)} colors={c} accent={c.primary} />
                <Stat label="Marge" value={`${Math.round((achat.prixVente - achat.prixAchat) / achat.prixAchat * 100)}%`} colors={c} accent="#22c55e" />
                <Stat label="Vendus" value={`${quantiteVendue}/${achat.quantiteAchetee}`} colors={c} />
              </View>

              <View style={s.cardActions}>
                {achat.fournisseur ? (
                  <Text style={[s.fournisseur, { color: c.mutedForeground }]}>
                    <Ionicons name="business-outline" size={12} /> {achat.fournisseur}
                  </Text>
                ) : <View style={{ flex: 1 }} />}
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: 'rgba(99,102,241,0.12)' }]}
                  onPress={() => router.push(`/stock/${achat.id}`)}
                >
                  <Ionicons name="pencil" size={15} color={c.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: 'rgba(239,68,68,0.12)' }]}
                  onPress={() => confirmDelete(achat.id, achat.modele)}
                >
                  <Ionicons name="trash" size={15} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

function Stat({ label, value, colors: c, accent }: { label: string; value: string; colors: any; accent?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: accent ?? c.foreground }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: c.mutedForeground, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'web' ? 120 : 100 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  card: { borderRadius: 14, padding: 14, marginBottom: 10, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  modele: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  meta: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockBadgeText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  divider: { height: 1 },
  cardMid: { flexDirection: 'row', paddingVertical: 4 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fournisseur: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular' },
  actionBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
