import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA, formatDate } from '@/utils';

export default function RecuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ventes, achats, reglages } = useStore();
  const c = colors;

  const vente = useMemo(() => ventes.find(v => v.id === id), [ventes, id]);
  const achat = useMemo(() => achats.find(a => a.id === vente?.achatId), [achats, vente]);

  const printPDF = async () => {
    if (!vente) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      Alert.alert('Impression', 'Utilisez la fonction impression de votre navigateur (Ctrl+P).');
      return;
    }
    try {
      // Dynamic import for expo-print (not available on web)
      const Print = await import('expo-print');
      const html = buildHTML(vente, achat, reglages);
      await Print.printAsync({ html });
    } catch (e) {
      Alert.alert('Erreur', "L'impression n'est pas disponible sur cet appareil.");
    }
  };

  const shareHTML = async () => {
    if (!vente) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      Alert.alert('Partage', 'La fonction de partage est disponible uniquement sur mobile.');
      return;
    }
    try {
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const html = buildHTML(vente, achat, reglages);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
      } else {
        Alert.alert('Partage indisponible');
      }
    } catch (e) {
      Alert.alert('Erreur', "Le partage a échoué.");
    }
  };

  if (!vente) {
    return (
      <View style={[s.center, { backgroundColor: c.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.mutedForeground} />
        <Text style={[s.notFound, { color: c.mutedForeground }]}>Reçu introuvable</Text>
        <TouchableOpacity style={[s.backBtn, { borderColor: c.border }]} onPress={() => router.back()}>
          <Text style={{ color: c.foreground, fontFamily: 'Inter_500Medium' }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const marge = achat ? vente.prixUnitaire - achat.prixAchat : 0;

  return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Receipt card */}
        <View style={[s.receiptCard, { backgroundColor: c.card }]}>
          {/* Shop header */}
          <View style={s.shopHeader}>
            <View style={[s.shopLogo, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
              <Ionicons name="storefront" size={28} color={c.primary} />
            </View>
            <Text style={[s.shopName, { color: c.foreground }]}>{reglages.nomBoutique}</Text>
            {reglages.telephone ? <Text style={[s.shopInfo, { color: c.mutedForeground }]}>{reglages.telephone}</Text> : null}
            {reglages.adresse ? <Text style={[s.shopInfo, { color: c.mutedForeground }]}>{reglages.adresse}</Text> : null}
          </View>

          <View style={[s.divider, { backgroundColor: c.border }]} />

          {/* Receipt info */}
          <View style={s.infoRow}>
            <InfoItem label="Date" value={formatDate(vente.dateVente)} colors={c} />
            <InfoItem label="Client" value={vente.client || 'Anonyme'} colors={c} />
          </View>

          <View style={[s.divider, { backgroundColor: c.border }]} />

          {/* Item */}
          <View style={s.itemSection}>
            <Text style={[s.itemLabel, { color: c.mutedForeground }]}>ARTICLE</Text>
            <View style={[s.itemRow, { backgroundColor: c.background }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.itemName, { color: c.foreground }]}>{vente.modele}</Text>
                <Text style={[s.itemMeta, { color: c.mutedForeground }]}>
                  Pointure {vente.pointure} · {vente.couleur}
                </Text>
              </View>
              <Text style={[s.itemQty, { color: c.mutedForeground }]}>×{vente.quantite}</Text>
            </View>
          </View>

          {/* Amounts */}
          <View style={s.amounts}>
            <AmountRow label="Prix unitaire" value={formatCFA(vente.prixUnitaire)} colors={c} />
            <AmountRow label="Quantité" value={`×${vente.quantite}`} colors={c} />
            <View style={[s.totalDivider, { backgroundColor: c.border }]} />
            <AmountRow label="TOTAL" value={formatCFA(vente.montantTotal)} colors={c} big accent={c.primary} />

            {vente.estCredit && (
              <>
                <View style={[s.totalDivider, { backgroundColor: c.border }]} />
                <AmountRow label="Montant payé" value={formatCFA(vente.montantPaye)} colors={c} accent="#22c55e" />
                <AmountRow
                  label="Reste à payer"
                  value={vente.resteAPayer > 0 ? formatCFA(vente.resteAPayer) : '—'}
                  colors={c}
                  accent={vente.resteAPayer > 0 ? '#ef4444' : '#22c55e'}
                />
              </>
            )}
          </View>

          {/* Status badge */}
          <View style={[s.statusBox, { backgroundColor: vente.estCredit && vente.resteAPayer > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }]}>
            <Ionicons
              name={vente.estCredit && vente.resteAPayer > 0 ? 'time-outline' : 'checkmark-circle'}
              size={18}
              color={vente.estCredit && vente.resteAPayer > 0 ? '#ef4444' : '#22c55e'}
            />
            <Text style={[s.statusText, { color: vente.estCredit && vente.resteAPayer > 0 ? '#ef4444' : '#22c55e' }]}>
              {vente.estCredit && vente.resteAPayer > 0 ? 'Paiement partiel — Crédit en cours' : 'Paiement reçu — Merci !'}
            </Text>
          </View>

          <View style={[s.divider, { backgroundColor: c.border }]} />
          <Text style={[s.footer, { color: c.mutedForeground }]}>Merci pour votre achat !</Text>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.card, borderColor: c.border }]} onPress={printPDF}>
            <Ionicons name="print-outline" size={20} color={c.foreground} />
            <Text style={[s.actionText, { color: c.foreground }]}>Imprimer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.primary }]} onPress={shareHTML}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={[s.actionText, { color: '#fff' }]}>Partager PDF</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.doneBtn, { borderColor: c.border }]} onPress={() => router.replace('/(tabs)/index' as any)}>
          <Text style={[s.doneText, { color: c.mutedForeground }]}>Retour à l'accueil</Text>
        </TouchableOpacity>

        <View style={{ height: Platform.OS === 'web' ? 60 : 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoItem({ label, value, colors: c }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: c.mutedForeground, fontFamily: 'Inter_400Regular', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: c.foreground, fontFamily: 'Inter_600SemiBold' }}>{value}</Text>
    </View>
  );
}

function AmountRow({ label, value, colors: c, big, accent }: { label: string; value: string; colors: any; big?: boolean; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ fontSize: big ? 15 : 13, color: big ? c.foreground : c.mutedForeground, fontFamily: big ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>{label}</Text>
      <Text style={{ fontSize: big ? 18 : 14, color: accent ?? c.foreground, fontFamily: big ? 'Inter_700Bold' : 'Inter_500Medium' }}>{value}</Text>
    </View>
  );
}

function buildHTML(vente: any, achat: any, reglages: any): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:24px;max-width:320px;margin:auto}
    .header{text-align:center;padding-bottom:16px;border-bottom:2px solid #ddd;margin-bottom:16px}
    .shop{font-size:20px;font-weight:bold;margin-bottom:4px}.info{font-size:12px;color:#666;margin-bottom:2px}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
    .label{font-size:12px;color:#888}.value{font-size:12px;font-weight:600}
    .total{border-top:2px solid #333;margin-top:8px;padding-top:8px}
    .total .label{font-size:14px;font-weight:bold;color:#333}.total .value{font-size:16px;font-weight:bold}
    .credit{background:#fff3cd;padding:8px;border-radius:6px;margin-top:12px;font-size:12px}
    .footer{text-align:center;margin-top:16px;font-size:12px;color:#999}
  </style></head><body>
    <div class="header">
      <div class="shop">${reglages.nomBoutique}</div>
      ${reglages.telephone ? `<div class="info">${reglages.telephone}</div>` : ''}
      ${reglages.adresse ? `<div class="info">${reglages.adresse}</div>` : ''}
    </div>
    <div class="row"><span class="label">Date</span><span class="value">${formatDate(vente.dateVente)}</span></div>
    <div class="row"><span class="label">Client</span><span class="value">${vente.client || 'Anonyme'}</span></div>
    <div class="row"><span class="label">Article</span><span class="value">${vente.modele} (P${vente.pointure}, ${vente.couleur})</span></div>
    <div class="row"><span class="label">Prix unitaire</span><span class="value">${formatCFA(vente.prixUnitaire)}</span></div>
    <div class="row"><span class="label">Quantité</span><span class="value">×${vente.quantite}</span></div>
    <div class="row total"><span class="label">TOTAL</span><span class="value">${formatCFA(vente.montantTotal)}</span></div>
    ${vente.estCredit ? `<div class="credit">
      Payé: ${formatCFA(vente.montantPaye)}<br>
      Reste: ${formatCFA(vente.resteAPayer)}
    </div>` : ''}
    <div class="footer">Merci pour votre achat !</div>
  </body></html>`;
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  scroll: { padding: 16 },
  receiptCard: { borderRadius: 16, padding: 20, gap: 16 },
  shopHeader: { alignItems: 'center', gap: 6, paddingBottom: 4 },
  shopLogo: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  shopName: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  shopInfo: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  divider: { height: 1 },
  infoRow: { flexDirection: 'row', gap: 16 },
  itemSection: { gap: 8 },
  itemLabel: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 },
  itemName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  itemMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  itemQty: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  amounts: { gap: 0 },
  totalDivider: { height: 1, marginVertical: 6 },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  statusText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  footer: { textAlign: 'center', fontSize: 13, fontFamily: 'Inter_400Regular' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  actionText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  doneBtn: { marginTop: 10, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  doneText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
