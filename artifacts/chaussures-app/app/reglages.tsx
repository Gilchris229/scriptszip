import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';

export default function ReglagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reglages, updateReglages } = useStore();
  const [form, setForm] = useState({ ...reglages });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const c = colors;

  useEffect(() => { setForm({ ...reglages }); }, [reglages]);

  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setSaved(false); };

  const save = async () => {
    if (!form.nomBoutique.trim()) {
      Alert.alert('Champ requis', 'Le nom de la boutique est obligatoire.');
      return;
    }
    setLoading(true);
    try {
      await updateReglages({ nomBoutique: form.nomBoutique.trim(), telephone: form.telephone.trim(), adresse: form.adresse.trim() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
    } catch { Alert.alert('Erreur', "Impossible de sauvegarder."); }
    finally { setLoading(false); }
  };

  return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      <KeyboardAwareScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" bottomOffset={80}>
        {/* Shop info */}
        <View style={[s.section, { backgroundColor: c.card }]}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Ionicons name="storefront-outline" size={20} color={c.primary} />
            </View>
            <Text style={[s.sectionTitle, { color: c.foreground }]}>Informations boutique</Text>
          </View>

          <Field label="NOM DE LA BOUTIQUE *" placeholder="Ex: Boutique Chaussures Plus" value={form.nomBoutique} onChangeText={v => set('nomBoutique', v)} colors={c} />
          <Field label="TÉLÉPHONE" placeholder="+225 07 00 00 00 00" value={form.telephone} onChangeText={v => set('telephone', v)} keyboardType="phone-pad" colors={c} />
          <Field label="ADRESSE" placeholder="Rue, Ville, Pays" value={form.adresse} onChangeText={v => set('adresse', v)} multiline numberOfLines={2} colors={c} />
        </View>

        {/* App info */}
        <View style={[s.section, { backgroundColor: c.card }]}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
              <Ionicons name="information-circle-outline" size={20} color="#22c55e" />
            </View>
            <Text style={[s.sectionTitle, { color: c.foreground }]}>À propos</Text>
          </View>
          <Row label="Application" value="Gestion Chaussures" colors={c} />
          <Row label="Version" value="1.0.0" colors={c} />
          <Row label="Données" value="Stockées localement" colors={c} last />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: saved ? '#22c55e' : c.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={save}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={20} color="#fff" />
              <Text style={s.saveBtnText}>{saved ? 'Enregistré !' : 'Enregistrer les modifications'}</Text>
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
function Field({ label, colors: c, multiline, ...props }: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[fs.label, { color: c.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[fs.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border, minHeight: multiline ? 70 : 44, textAlignVertical: multiline ? 'top' : 'center' }]}
        placeholderTextColor={c.mutedForeground}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

function Row({ label, value, colors: c, last }: { label: string; value: string; colors: any; last?: boolean }) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }, !last && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
      <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: c.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: c.foreground }}>{value}</Text>
    </View>
  );
}

const fs = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6, marginBottom: 6 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: 'Inter_400Regular', borderWidth: 1 },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16, gap: 16 },
  section: { borderRadius: 14, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },
});
