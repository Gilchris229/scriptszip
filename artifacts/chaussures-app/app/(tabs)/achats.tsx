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
import { getTodayISO } from '@/utils';

const INITIAL = () => ({
  modele: '', pointure: '', couleur: '',
  quantiteAchetee: '', prixAchat: '', prixVente: '',
  dateAchat: getTodayISO(), fournisseur: '',
});

export default function AchatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addAchat } = useStore();
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const reset = () => setForm(INITIAL());

  const submit = async () => {
    if (!form.modele.trim() || !form.pointure.trim() || !form.couleur.trim()) {
      Alert.alert('Champs requis', 'Modèle, pointure et couleur sont obligatoires.');
      return;
    }
    const qty = parseInt(form.quantiteAchetee, 10);
    const pA = parseFloat(form.prixAchat);
    const pV = parseFloat(form.prixVente);
    if (!qty || qty <= 0 || !pA || pA <= 0 || !pV || pV <= 0) {
      Alert.alert('Valeurs invalides', 'Quantité et prix doivent être des nombres positifs.');
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
        prixVente: pV,
        dateAchat: form.dateAchat,
        fournisseur: form.fournisseur.trim(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Achat enregistré ✓', '', [{ text: 'OK', onPress: reset }]);
    } catch {
      Alert.alert('Erreur', "L'enregistrement a échoué.");
    } finally {
      setLoading(false);
    }
  };

  const c = colors;
  return (
    <View style={[s.container, { backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top + 16 }]}>
      <View style={s.titleRow}>
        <Text style={[s.title, { color: c.foreground }]}>Nouvel achat</Text>
        <Text style={[s.subtitle, { color: c.mutedForeground }]}>Enregistrer une entrée de stock</Text>
      </View>

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

        <View style={s.row}>
          <View style={s.half}>
            <Field label="PRIX D'ACHAT (FCFA) *" placeholder="15000" value={form.prixAchat} onChangeText={v => set('prixAchat', v)} keyboardType="numeric" colors={c} />
          </View>
          <View style={s.half}>
            <Field label="PRIX DE VENTE (FCFA) *" placeholder="25000" value={form.prixVente} onChangeText={v => set('prixVente', v)} keyboardType="numeric" colors={c} />
          </View>
        </View>

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
});
