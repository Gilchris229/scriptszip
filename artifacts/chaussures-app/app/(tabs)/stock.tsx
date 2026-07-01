import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Platform, Modal,
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; modele: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAchat(deleteTarget.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
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
                  onPress={() => setDeleteTarget({ id: achat.id, modele: achat.modele })}
                >
                  <Ionicons name="trash" size={15} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Delete confirmation modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.dialog, { backgroundColor: c.card }]}>
            <View style={s.dialogIcon}>
              <Ionicons name="trash" size={28} color="#ef4444" />
            </View>
            <Text style={[s.dialogTitle, { color: c.foreground }]}>Supprimer l'article ?</Text>
            <Text style={[s.dialogBody, { color: c.mutedForeground }]}>
              {`"${deleteTarget?.modele}" et toutes ses ventes associées seront supprimés définitivement.`}
            </Text>
            <View style={s.dialogBtns}>
              <TouchableOpacity
                style={[s.dialogBtn, { backgroundColor: c.background, borderColor: c.border }]}
                onPress={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <Text style={[s.dialogBtnText, { color: c.foreground }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.dialogBtn, s.dialogBtnDelete, { opacity: deleting ? 0.6 : 1 }]}
                onPress={handleDelete}
                disabled={deleting}
              >
                <Text style={[s.dialogBtnText, { color: '#fff' }]}>
                  {deleting ? 'Suppression…' : 'Supprimer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 },
  dialogIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dialogTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  dialogBody: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  dialogBtns: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  dialogBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  dialogBtnDelete: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  dialogBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
