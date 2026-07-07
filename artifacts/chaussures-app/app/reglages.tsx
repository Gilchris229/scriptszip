import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';

function getBackupApiUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/backup-api`;
  }
  return process.env.EXPO_PUBLIC_BACKUP_API ?? '';
}

const STORAGE_KEYS = [
  '@chaussures/achats',
  '@chaussures/ventes',
  '@chaussures/paiements',
  '@chaussures/reglages',
  'ventes_credit',
];

async function getAllData() {
  const pairs = await Promise.all(
    STORAGE_KEYS.map(async (k) => [k, await AsyncStorage.getItem(k)] as [string, string | null])
  );
  const data: Record<string, unknown> = {};
  for (const [k, v] of pairs) {
    data[k] = v ? JSON.parse(v) : null;
  }
  return data;
}

async function restoreAllData(data: Record<string, unknown>) {
  await Promise.all(
    STORAGE_KEYS.map(async (k) => {
      if (data[k] != null) {
        await AsyncStorage.setItem(k, JSON.stringify(data[k]));
      }
    })
  );
}

export default function ReglagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reglages, updateReglages } = useStore();
  const [form, setForm] = useState({ ...reglages });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Backup/restore state
  const [pin, setPin] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

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

  const handleBackup = async () => {
    if (!form.telephone.trim()) {
      Alert.alert('Téléphone requis', 'Veuillez d\'abord entrer votre numéro de téléphone dans les informations boutique.');
      return;
    }
    if (!pin || pin.length !== 4) {
      Alert.alert('PIN requis', 'Veuillez entrer un code PIN à 4 chiffres.');
      return;
    }
    const backupApi = getBackupApiUrl();
    if (!backupApi) {
      Alert.alert('Erreur', 'URL de sauvegarde non configurée.');
      return;
    }
    setBackupLoading(true);
    try {
      const data = await getAllData();
      const res = await fetch(`${backupApi}/api/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: form.telephone.trim(), pin, data }),
      });
      const json = await res.json() as { error?: string; message?: string };
      if (!res.ok) {
        Alert.alert('Erreur', json.error ?? 'Sauvegarde échouée');
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Succès', json.message ?? 'Données sauvegardées dans le cloud !');
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de joindre le serveur. Vérifiez votre connexion.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!form.telephone.trim()) {
      Alert.alert('Téléphone requis', 'Veuillez entrer votre numéro de téléphone.');
      return;
    }
    if (!pin || pin.length !== 4) {
      Alert.alert('PIN requis', 'Veuillez entrer votre code PIN à 4 chiffres.');
      return;
    }
    const backupApi2 = getBackupApiUrl();
    if (!backupApi2) {
      Alert.alert('Erreur', 'URL de sauvegarde non configurée.');
      return;
    }
    Alert.alert(
      'Restaurer la sauvegarde',
      'Cette action remplacera toutes vos données locales par la sauvegarde. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: async () => {
            setRestoreLoading(true);
            try {
              const res = await fetch(`${backupApi2}/api/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telephone: form.telephone.trim(), pin }),
              });
              const json = await res.json() as { error?: string; data?: Record<string, unknown>; updatedAt?: string };
              if (!res.ok) {
                Alert.alert('Erreur', json.error ?? 'Restauration échouée');
                return;
              }
              if (json.data) {
                await restoreAllData(json.data);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const dateStr = json.updatedAt ? new Date(json.updatedAt).toLocaleDateString('fr-FR') : '';
                Alert.alert(
                  'Restauration réussie',
                  `Données restaurées${dateStr ? ` (sauvegarde du ${dateStr})` : ''}. Relancez l'application pour voir vos données.`
                );
              }
            } catch {
              Alert.alert('Erreur réseau', 'Impossible de joindre le serveur. Vérifiez votre connexion.');
            } finally {
              setRestoreLoading(false);
            }
          },
        },
      ]
    );
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

        {/* Cloud Backup */}
        <View style={[s.section, { backgroundColor: c.card }]}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
              <Ionicons name="cloud-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={[s.sectionTitle, { color: c.foreground }]}>Sauvegarde cloud</Text>
          </View>

          <Text style={[s.backupDesc, { color: c.mutedForeground }]}>
            Sauvegardez vos données en ligne et restaurez-les sur n'importe quel appareil avec votre numéro de téléphone et un code PIN à 4 chiffres.
          </Text>

          <View style={{ marginBottom: 14 }}>
            <Text style={[fs.label, { color: c.mutedForeground }]}>CODE PIN (4 CHIFFRES)</Text>
            <TextInput
              style={[fs.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
              placeholderTextColor={c.mutedForeground}
              placeholder="••••"
              value={pin}
              onChangeText={v => setPin(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
            />
          </View>

          <View style={s.backupButtons}>
            <TouchableOpacity
              style={[s.backupBtn, { backgroundColor: '#3b82f6', opacity: backupLoading ? 0.7 : 1, flex: 1 }]}
              onPress={handleBackup}
              disabled={backupLoading || restoreLoading}
            >
              {backupLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={s.backupBtnText}>Sauvegarder</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.backupBtn, { backgroundColor: '#f59e0b', opacity: restoreLoading ? 0.7 : 1, flex: 1 }]}
              onPress={handleRestore}
              disabled={backupLoading || restoreLoading}
            >
              {restoreLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                  <Text style={s.backupBtnText}>Restaurer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
          <Row label="Données" value="Locales + Cloud" colors={c} last />
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
  backupDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 14, lineHeight: 19 },
  backupButtons: { flexDirection: 'row', gap: 10 },
  backupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13 },
  backupBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },
});
