import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';

export default function EditStockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { achats, updateAchat } = useStore();
  const c = colors;

  const achat = achats.find(a => a.id === id);

  const [form, setForm] = useState({
    modele: achat?.modele ?? '',
    pointure: achat?.pointure ?? '',
    couleur: achat?.couleur ?? '',
    quantiteAchetee: String(achat?.quantiteAchetee ?? ''),
    prixAchat: String(achat?.prixAchat ?? ''),
    prixVente: String(achat?.prixVente ?? ''),
    dateAchat: achat?.dateAchat ?? '',
    fournisseur: achat?.fournisseur ?? '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (achat) {
      setForm({
        modele: achat.modele,
        pointure: achat.pointure,
        couleur: achat.couleur,
        quantiteAchetee: String(achat.quantiteAchetee),
        prixAchat: String(achat.prixAchat),
        prixVente: String(achat.prixVente),
        dateAchat: achat.dateAchat,
        fournisseur: achat.fournisseur,
      });
    }
  }, [achat?.id]);

  if (!achat) {
    return (
      <View style={[s.container, { backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.mutedForeground} />
        <Text style={[s.notFound, { color: c.mutedForeground }]}>Article introuvable</Text>
      </View>
    );
  }

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
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
      await updateAchat(id!, {
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
      router.back();
    } catch {
      Alert.alert('Erreur', "La mise à jour a échoué.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      <KeyboardAwareScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" bottomOffset={80}>
        <Field label="MODÈLE *" placeholder="Ex: Nike Air Max" value={form.modele} onChangeText={v => set('modele', v)} colors={c} />

        <View style={s.row}>
          <View style={s.half}>
            <Field label="POINTURE *" placeholder="42" value={form.pointure} onChangeText={v => set('pointure', v)} keyboardType="numeric" colors={c} />
          </View>
          <View style={s.half}>
            <Field label="COULEUR *" placeholder="Noir" value={form.couleur} onChangeText={v => set('couleur', v)} colors={c} />
          </View>
        </View>

        <Field label="QUANTITÉ TOTALE ACHETÉE *" placeholder="1" value={form.quantiteAchetee} onChangeText={v => set('quantiteAchetee', v)} keyboardType="numeric" colors={c} />

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

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={save}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Enregistrer les modifications</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: Platform.OS === 'web' ? 60 : 40 }} />
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
  notFound: { fontSize: 16, fontFamily: 'Inter_400Regular', marginTop: 12 },
  form: { padding: 20 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 15, marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },
});
