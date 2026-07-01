import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  Platform, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA, getTodayISO } from '@/utils';

const INIT_FORM = () => ({
  client: '', quantite: '1', dateVente: getTodayISO(),
  estCredit: false, montantPaye: '',
});

export default function VentesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getStockList, addVente, achats } = useStore();

  const [selectedAchatId, setSelectedAchatId] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [form, setForm] = useState(INIT_FORM());
  const [loading, setLoading] = useState(false);

  const stockList = useMemo(() => getStockList().filter(s => s.quantiteRestante > 0), [getStockList]);
  const selectedStock = useMemo(() => stockList.find(s => s.achat.id === selectedAchatId), [stockList, selectedAchatId]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const reset = () => { setSelectedAchatId(''); setForm(INIT_FORM()); };

  const submit = async () => {
    if (!selectedAchatId || !selectedStock) {
      Alert.alert('Article requis', 'Sélectionnez un article à vendre.');
      return;
    }
    const qty = parseInt(form.quantite, 10);
    if (!qty || qty <= 0 || qty > selectedStock.quantiteRestante) {
      Alert.alert('Quantité invalide', `Stock disponible: ${selectedStock.quantiteRestante}`);
      return;
    }
    if (!form.dateVente.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ.');
      return;
    }
    const prixU = selectedStock.achat.prixVente;
    if (!prixU || prixU <= 0) {
      Alert.alert(
        'Prix de vente non défini',
        'Définissez le prix de vente de cet article dans le Stock avant de le vendre.',
      );
      return;
    }
    const total = prixU * qty;
    let montantPaye = total;
    let resteAPayer = 0;
    if (form.estCredit) {
      const paye = parseFloat(form.montantPaye) || 0;
      if (paye < 0 || paye > total) {
        Alert.alert('Montant invalide', `Montant payé doit être entre 0 et ${formatCFA(total)}`);
        return;
      }
      montantPaye = paye;
      resteAPayer = total - paye;
    }
    setLoading(true);
    try {
      const vente = await addVente({
        achatId: selectedAchatId,
        modele: selectedStock.achat.modele,
        pointure: selectedStock.achat.pointure,
        couleur: selectedStock.achat.couleur,
        quantite: qty,
        prixUnitaire: prixU,
        montantTotal: total,
        dateVente: form.dateVente,
        client: form.client.trim(),
        estCredit: form.estCredit,
        montantPaye,
        resteAPayer,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      router.push(`/recu/${vente.id}`);
    } catch {
      Alert.alert('Erreur', "L'enregistrement a échoué.");
    } finally {
      setLoading(false);
    }
  };

  const c = colors;
  const total = selectedStock ? selectedStock.achat.prixVente * (parseInt(form.quantite) || 1) : 0;

  return (
    <View style={[s.container, { backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top + 16 }]}>
      <View style={s.titleRow}>
        <Text style={[s.title, { color: c.foreground }]}>Nouvelle vente</Text>
        <Text style={[s.subtitle, { color: c.mutedForeground }]}>Enregistrer une sortie de stock</Text>
      </View>

      <KeyboardAwareScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" bottomOffset={80}>
        {/* Article picker */}
        <Text style={[s.label, { color: c.mutedForeground }]}>ARTICLE *</Text>
        <TouchableOpacity
          style={[s.picker, { backgroundColor: c.card, borderColor: selectedAchatId ? c.primary : c.border }]}
          onPress={() => setPickerVisible(true)}
        >
          {selectedStock ? (
            <View style={{ flex: 1 }}>
              <Text style={[s.pickerTitle, { color: c.foreground }]}>{selectedStock.achat.modele}</Text>
              <Text style={[s.pickerSub, { color: c.mutedForeground }]}>
                P{selectedStock.achat.pointure} · {selectedStock.achat.couleur} · Stock: {selectedStock.quantiteRestante}
              </Text>
            </View>
          ) : (
            <Text style={[s.pickerPlaceholder, { color: c.mutedForeground }]}>Sélectionner un article</Text>
          )}
          <Ionicons name="chevron-down" size={18} color={c.mutedForeground} />
        </TouchableOpacity>

        {selectedStock && (
          <View style={[s.priceInfo, { backgroundColor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.25)' }]}>
            <Text style={[s.priceInfoText, { color: c.primary }]}>
              Prix unitaire: {formatCFA(selectedStock.achat.prixVente)}  ·  Stock dispo: {selectedStock.quantiteRestante}
            </Text>
          </View>
        )}

        <Field label="QUANTITÉ *" placeholder="1" value={form.quantite} onChangeText={v => set('quantite', v)} keyboardType="numeric" colors={c} />
        <Field label="CLIENT (OPTIONNEL)" placeholder="Nom du client" value={form.client} onChangeText={v => set('client', v)} colors={c} />
        <Field label="DATE DE VENTE" placeholder="AAAA-MM-JJ" value={form.dateVente} onChangeText={v => set('dateVente', v)} colors={c} />

        {/* Credit toggle */}
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.toggleLabel, { color: c.foreground }]}>Vente à crédit</Text>
            <Text style={[s.toggleSub, { color: c.mutedForeground }]}>Le client paye en plusieurs fois</Text>
          </View>
          <TouchableOpacity
            onPress={() => set('estCredit', !form.estCredit)}
            style={[s.toggle, { backgroundColor: form.estCredit ? c.primary : c.card, borderColor: form.estCredit ? c.primary : c.border }]}
          >
            <View style={[s.toggleThumb, { transform: [{ translateX: form.estCredit ? 18 : 2 }] }]} />
          </TouchableOpacity>
        </View>

        {form.estCredit && (
          <Field
            label="MONTANT PAYÉ MAINTENANT (FCFA)"
            placeholder={`0 à ${total}`}
            value={form.montantPaye}
            onChangeText={v => set('montantPaye', v)}
            keyboardType="numeric"
            colors={c}
          />
        )}

        {/* Total preview */}
        {selectedStock && (
          <View style={[s.totalBox, { backgroundColor: c.card }]}>
            <Text style={[s.totalLabel, { color: c.mutedForeground }]}>Total à payer</Text>
            <Text style={[s.totalValue, { color: c.primary }]}>{formatCFA(total)}</Text>
            {form.estCredit && parseFloat(form.montantPaye) > 0 && (
              <Text style={[s.totalSub, { color: '#ef4444' }]}>
                Reste: {formatCFA(Math.max(0, total - parseFloat(form.montantPaye)))}
              </Text>
            )}
          </View>
        )}

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.resetBtn, { backgroundColor: c.card, borderColor: c.border }]} onPress={reset}>
            <Ionicons name="refresh" size={16} color={c.mutedForeground} />
            <Text style={[s.resetText, { color: c.mutedForeground }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={submit} disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="bag-check" size={18} color="#fff" />
                <Text style={s.submitText}>Valider la vente</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: Platform.OS === 'web' ? 120 : 100 }} />
      </KeyboardAwareScrollView>

      {/* Stock picker modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={[s.modalSheet, { backgroundColor: c.card }]}>
            <View style={[s.modalHandle, { backgroundColor: c.border }]} />
            <Text style={[s.modalTitle, { color: c.foreground }]}>Choisir un article</Text>
            {stockList.length === 0 ? (
              <View style={s.emptyModal}>
                <Ionicons name="cube-outline" size={40} color={c.mutedForeground} />
                <Text style={[s.emptyModalText, { color: c.mutedForeground }]}>Stock épuisé ou vide</Text>
              </View>
            ) : (
              <FlatList
                data={stockList}
                keyExtractor={i => i.achat.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.stockRow, { borderColor: c.border }, selectedAchatId === item.achat.id && { backgroundColor: 'rgba(99,102,241,0.1)', borderColor: c.primary }]}
                    onPress={() => { setSelectedAchatId(item.achat.id); setPickerVisible(false); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.stockName, { color: c.foreground }]}>{item.achat.modele}</Text>
                      <Text style={[s.stockMeta, { color: c.mutedForeground }]}>P{item.achat.pointure} · {item.achat.couleur}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={[s.stockPrice, { color: c.primary }]}>{formatCFA(item.achat.prixVente)}</Text>
                      <View style={[s.stockBadge, { backgroundColor: item.quantiteRestante > 2 ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                        <Text style={[s.stockBadgeText, { color: item.quantiteRestante > 2 ? '#22c55e' : '#f59e0b' }]}>
                          Stock: {item.quantiteRestante}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 400 }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

interface FieldProps extends React.ComponentProps<typeof TextInput> {
  label: string;
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
}
function Field({ label, colors: c, ...props }: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[fs.label, { color: c.mutedForeground }]}>{label}</Text>
      <TextInput style={[fs.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border }]} placeholderTextColor={c.mutedForeground} {...props} />
    </View>
  );
}

const fs = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6, marginBottom: 6 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular', borderWidth: 1 },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  titleRow: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6, marginBottom: 6 },
  picker: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10, gap: 8 },
  pickerTitle: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  pickerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  pickerPlaceholder: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  priceInfo: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  priceInfoText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  toggleSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  toggle: { width: 44, height: 26, borderRadius: 13, borderWidth: 1, justifyContent: 'center' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  totalBox: { borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center', gap: 4 },
  totalLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  totalValue: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  totalSub: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  resetBtn: { width: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 14, borderWidth: 1 },
  resetText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  submitBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  submitText: { fontSize: 15, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 16 },
  stockRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  stockName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  stockMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  stockPrice: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  stockBadgeText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  emptyModal: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyModalText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
