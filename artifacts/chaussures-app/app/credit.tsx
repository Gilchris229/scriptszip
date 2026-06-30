import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, TextInput, Modal, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA, formatDate, getTodayISO } from '@/utils';

export default function CreditScreen() {
  const colors = useColors();
  const { ventes, addPaiementCredit } = useStore();
  const [selectedId, setSelectedId] = useState('');
  const [montant, setMontant] = useState('');
  const [loading, setLoading] = useState(false);
  const c = colors;

  const creditVentes = useMemo(() =>
    [...ventes]
      .filter(v => v.estCredit)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [ventes]
  );
  const pending = useMemo(() => creditVentes.filter(v => v.resteAPayer > 0), [creditVentes]);
  const done = useMemo(() => creditVentes.filter(v => v.resteAPayer === 0), [creditVentes]);
  const totalCredit = useMemo(() => pending.reduce((s, v) => s + v.resteAPayer, 0), [pending]);

  const selectedVente = useMemo(() => creditVentes.find(v => v.id === selectedId), [creditVentes, selectedId]);

  const openPayment = (id: string) => {
    setSelectedId(id);
    setMontant('');
  };

  const markFull = async (id: string) => {
    const v = creditVentes.find(x => x.id === id);
    if (!v) return;
    Alert.alert('Soldé', `Marquer ${formatCFA(v.resteAPayer)} comme reçu ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer', onPress: async () => {
          setLoading(true);
          try {
            await addPaiementCredit({ venteId: id, montant: v.resteAPayer, date: getTodayISO() });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } finally { setLoading(false); }
        }
      }
    ]);
  };

  const submitPaiement = async () => {
    if (!selectedVente) return;
    const m = parseFloat(montant);
    if (!m || m <= 0 || m > selectedVente.resteAPayer) {
      Alert.alert('Montant invalide', `Entrez un montant entre 1 et ${formatCFA(selectedVente.resteAPayer)}`);
      return;
    }
    setLoading(true);
    try {
      await addPaiementCredit({ venteId: selectedId, montant: m, date: getTodayISO() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedId('');
    } finally { setLoading(false); }
  };

  return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      {/* Summary banner */}
      <View style={[s.banner, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }]}>
        <View style={[s.bannerIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
          <Ionicons name="wallet-outline" size={22} color="#ef4444" />
        </View>
        <View>
          <Text style={[s.bannerAmt, { color: '#ef4444' }]}>{formatCFA(totalCredit)}</Text>
          <Text style={[s.bannerSub, { color: c.mutedForeground }]}>{pending.length} client{pending.length !== 1 ? 's' : ''} avec solde impayé</Text>
        </View>
      </View>

      <FlatList
        data={[...pending, ...done]}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListHeaderComponent={pending.length > 0 ? null : (
          <View style={s.emptyPending}>
            <Ionicons name="checkmark-circle" size={44} color="#22c55e" />
            <Text style={[s.emptyText, { color: '#22c55e' }]}>Aucun crédit en attente</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="wallet-outline" size={48} color={c.mutedForeground} />
            <Text style={[s.emptyText, { color: c.mutedForeground }]}>Aucune vente à crédit</Text>
          </View>
        }
        renderItem={({ item: v }) => {
          const isPaid = v.resteAPayer === 0;
          return (
            <View style={[s.card, { backgroundColor: c.card, borderLeftWidth: 3, borderLeftColor: isPaid ? '#22c55e' : '#ef4444' }]}>
              <View style={s.cardTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[s.modele, { color: c.foreground }]}>{v.modele}</Text>
                  <Text style={[s.meta, { color: c.mutedForeground }]}>
                    {v.client || 'Anonyme'} · {formatDate(v.dateVente)}
                  </Text>
                  <Text style={[s.meta, { color: c.mutedForeground }]}>
                    P{v.pointure} · {v.couleur} · ×{v.quantite}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[s.total, { color: c.foreground }]}>{formatCFA(v.montantTotal)}</Text>
                  <View style={[s.badge, { backgroundColor: isPaid ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                    <Text style={[s.badgeText, { color: isPaid ? '#22c55e' : '#ef4444' }]}>
                      {isPaid ? 'Soldé' : `Reste: ${formatCFA(v.resteAPayer)}`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Progress bar */}
              <View style={[s.progressBg, { backgroundColor: c.border }]}>
                <View style={[s.progressFill, { backgroundColor: isPaid ? '#22c55e' : c.primary, width: `${(v.montantPaye / v.montantTotal) * 100}%` as any }]} />
              </View>
              <Text style={[s.progressText, { color: c.mutedForeground }]}>
                Payé: {formatCFA(v.montantPaye)} / {formatCFA(v.montantTotal)}
              </Text>

              {!isPaid && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.payBtn, { backgroundColor: 'rgba(99,102,241,0.12)' }]}
                    onPress={() => openPayment(v.id)}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={c.primary} />
                    <Text style={[s.payBtnText, { color: c.primary }]}>Ajouter paiement</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.payBtn, { backgroundColor: 'rgba(34,197,94,0.12)' }]}
                    onPress={() => markFull(v.id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
                    <Text style={[s.payBtnText, { color: '#22c55e' }]}>Solde reçu</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Payment modal */}
      <Modal visible={!!selectedId} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelectedId('')}>
          <View style={[s.sheet, { backgroundColor: c.card }]}>
            <View style={[s.handle, { backgroundColor: c.border }]} />
            <Text style={[s.sheetTitle, { color: c.foreground }]}>Ajouter un paiement</Text>
            {selectedVente && (
              <>
                <Text style={[s.sheetSub, { color: c.mutedForeground }]}>
                  {selectedVente.client || 'Anonyme'} · Reste: {formatCFA(selectedVente.resteAPayer)}
                </Text>
                <View style={[s.amtInput, { backgroundColor: c.background, borderColor: c.border }]}>
                  <TextInput
                    style={[s.amtText, { color: c.foreground }]}
                    placeholder={`Montant (max ${formatCFA(selectedVente.resteAPayer)})`}
                    placeholderTextColor={c.mutedForeground}
                    value={montant}
                    onChangeText={setMontant}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[s.confirmBtn, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]}
                  onPress={submitPaiement}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.confirmText}>Confirmer</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, margin: 16, borderRadius: 14, padding: 16, borderWidth: 1 },
  bannerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bannerAmt: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  bannerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'web' ? 60 : 40 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyPending: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  modele: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  meta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  total: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  progressBg: { height: 4, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
  payBtnText: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  sheetSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  amtInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  amtText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  confirmBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmText: { fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },
});
