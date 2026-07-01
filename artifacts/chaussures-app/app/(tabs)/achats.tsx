import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { getTodayISO, formatCFA } from '@/utils';

const INITIAL = () => ({
  modele: '', pointure: '', couleur: '',
  quantiteAchetee: '', prixAchat: '',
  dateAchat: getTodayISO(), fournisseur: '',
});

interface SuccessData {
  modele: string;
  pointure: string;
  couleur: string;
  quantite: number;
  prixAchat: number;
}

export default function AchatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addAchat } = useStore();
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const reset = () => { setForm(INITIAL()); setSuccess(null); };

  const submit = async () => {
    if (!form.modele.trim() || !form.pointure.trim() || !form.couleur.trim()) {
      Alert.alert('Champs requis', 'Modèle, pointure et couleur sont obligatoires.');
      return;
    }
    const qty = parseInt(form.quantiteAchetee, 10);
    const pA = parseFloat(form.prixAchat);
    if (!qty || qty <= 0 || !pA || pA <= 0) {
      Alert.alert('Valeurs invalides', "Quantité et prix d'achat doivent être des nombres positifs.");
      return;
    }
    if (!form.dateAchat.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ.');
      return;
    }
    setLoading(true);
    try {
      await addAchat({
        modele: form.modele.trim(),
        pointure: form.pointure.trim(),
        couleur: form.couleur.trim(),
        quantiteAchetee: qty,
        prixAchat: pA,
        prixVente: 0,
        dateAchat: form.dateAchat,
        fournisseur: form.fournisseur.trim(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess({ modele: form.modele.trim(), pointure: form.pointure.trim(), couleur: form.couleur.trim(), quantite: qty, prixAchat: pA });
      setForm(INITIAL());
    } catch {
      Alert.alert('Erreur', "L'enregistrement a échoué.");
    } finally {
      setLoading(false);
    }
  };

  const c = colors;
  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top + 16;

  return (
    <View style={[s.container, { backgroundColor: c.background, paddingTop: topPad }]}>
      <View style={s.titleRow}>
        <Text style={[s.title, { color: c.foreground }]}>Nouvel achat</Text>
        <Text style={[s.subtitle, { color: c.mutedForeground }]}>Enregistrer une entrée de stock</Text>
      </View>

      {success ? (
        <View style={s.successWrap}>
          {/* Success card */}
          <View style={[s.successCard, { backgroundColor: c.card }]}>
            <View style={s.successIconCircle}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={[s.successTitle, { color: c.foreground }]}>Achat enregistré !</Text>
            <Text style={[s.successSub, { color: c.mutedForeground }]}>Le stock a bien été mis à jour.</Text>

            <View style={[s.successDetails, { backgroundColor: c.background }]}>
              <DetailRow label="Article" value={success.modele} colors={c} />
              <DetailRow label="Pointure" value={success.pointure} colors={c} />
              <DetailRow label="Couleur" value={success.couleur} colors={c} />
              <DetailRow label="Quantité" value={`${success.quantite} paire${success.quantite > 1 ? 's' : ''}`} colors={c} />
              <DetailRow label="Prix d'achat" value={formatCFA(success.prixAchat)} colors={c} last />
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity style={[s.newBtn, { backgroundColor: c.primary }]} onPress={reset}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.newBtnText}>Nouvel achat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.form}
          keyboardShouldPersistTaps="handled"
          bottomOffset={80}
        >
          <Field label="MODÈLE *" placeholder="Ex: Nike Air Max, Puma Classic..." value={form.modele} onChangeText={v => set('modele', v)} colors={c} />

          <View style={s.row}>
            <View style={s.half}>
              <Field label="POINTURE *" placeholder="42" value={form.pointure} onChangeText={v => set('pointure', v)} keyboardType="numeric" colors={c} />
            </View>
            <View style={s.half}>
              <Field label="COULEUR *" placeholder="Noir" value={form.couleur} onChangeText={v => set('couleur', v)} colors={c} />
            </View>
          </View>

          <Field label="QUANTITÉ ACHETÉE *" placeholder="1" value={form.quantiteAchetee} onChangeText={v => set('quantiteAchetee', v)} keyboardType="numeric" colors={c} />
          <Field label="PRIX D'ACHAT (FCFA) *" placeholder="15000" value={form.prixAchat} onChangeText={v => set('prixAchat', v)} keyboardType="numeric" colors={c} />
          <Field label="DATE D'ACHAT" placeholder="AAAA-MM-JJ" value={form.dateAchat} onChangeText={v => set('dateAchat', v)} colors={c} />
          <Field label="FOURNISSEUR (OPTIONNEL)" placeholder="Nom du fournisseur" value={form.fournisseur} onChangeText={v => set('fournisseur', v)} colors={c} />

          <View style={s.btnRow}>
            <TouchableOpacity style={[s.resetBtn, { backgroundColor: c.card, borderColor: c.border }]} onPress={reset}>
              <Ionicons name="refresh" size={16} color={c.mutedForeground} />
              <Text style={[s.resetText, { color: c.mutedForeground }]}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={submit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="cart" size={18} color="#fff" />
                    <Text style={s.submitText}>Enregistrer l'achat</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          <View style={{ height: Platform.OS === 'web' ? 120 : 100 }} />
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

function DetailRow({ label, value, colors: c, last }: { label: string; value: string; colors: any; last?: boolean }) {
  return (
    <View style={[sd.row, !last && sd.rowBorder, { borderColor: c.border }]}>
      <Text style={[sd.label, { color: c.mutedForeground }]}>{label}</Text>
      <Text style={[sd.value, { color: c.foreground }]}>{value}</Text>
    </View>
  );
}

const sd = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: 1 },
  label: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  value: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});

interface FieldProps extends React.ComponentProps<typeof TextInput> {
  label: string;
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
}
function Field({ label, colors: c, ...props }: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[fs.label, { color: c.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[fs.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border }]}
        placeholderTextColor={c.mutedForeground}
        {...props}
      />
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
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  resetBtn: { flex: 0, width: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 14, borderWidth: 1 },
  resetText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  submitBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  submitText: { fontSize: 15, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  // Success
  successWrap: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 16, paddingBottom: 40 },
  successCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
  successIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  successTitle: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  successSub: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 8 },
  successDetails: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16 },
  newBtnText: { fontSize: 15, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
