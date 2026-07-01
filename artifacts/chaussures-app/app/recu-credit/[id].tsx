import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA, formatDate } from '@/utils';
import { downloadCreditReceiptPDF, shareCreditViaWhatsApp } from '@/utils/pdfReceipt';

export default function RecuCreditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { ventesCredit, reglages } = useStore();
  const c = colors;

  const credit = useMemo(() => ventesCredit.find(vc => vc.id === id), [ventesCredit, id]);

  const handleDownloadPDF = async () => {
    if (!credit) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await downloadCreditReceiptPDF(credit, reglages);
  };

  const handleWhatsApp = async () => {
    if (!credit) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await shareCreditViaWhatsApp(credit, reglages);
  };

  if (!credit) {
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

  const isPaid = credit.statut === 'solde';
  const montantPaye = credit.prixTotal - credit.resteAPayer;

  return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Receipt card */}
        <View style={[s.receiptCard, { backgroundColor: c.card }]}>
          {/* Shop header */}
          <View style={s.shopHeader}>
            <View style={[s.shopLogo, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
              <Ionicons name="card" size={28} color="#f97316" />
            </View>
            <Text style={[s.shopName, { color: c.foreground }]}>{reglages.nomBoutique}</Text>
            {reglages.telephone ? <Text style={[s.shopInfo, { color: c.mutedForeground }]}>{reglages.telephone}</Text> : null}
            {reglages.adresse ? <Text style={[s.shopInfo, { color: c.mutedForeground }]}>{reglages.adresse}</Text> : null}
          </View>

          {/* Credit badge */}
          <View style={[s.creditBanner, { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.25)' }]}>
            <Ionicons name="card-outline" size={16} color="#f97316" />
            <Text style={[s.creditBannerText, { color: '#f97316' }]}>
              Vente à crédit — Merci de respecter la date d'échéance
            </Text>
          </View>

          <View style={[s.divider, { backgroundColor: c.border }]} />

          {/* Client info */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: c.mutedForeground }]}>CLIENT</Text>
            <InfoRow label="Nom" value={credit.clientNom} colors={c} />
            <InfoRow label="Téléphone" value={credit.clientTelephone} colors={c} />
            <InfoRow label="Adresse" value={credit.clientAdresse} colors={c} />
          </View>

          <View style={[s.divider, { backgroundColor: c.border }]} />

          {/* Article */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: c.mutedForeground }]}>ARTICLE</Text>
            <View style={[s.articleBox, { backgroundColor: c.background }]}>
              <Text style={[s.articleName, { color: c.foreground }]}>{credit.modele}</Text>
              <Text style={[s.articleMeta, { color: c.mutedForeground }]}>
                Pointure {credit.pointure} · {credit.couleur} · ×{credit.quantite}
              </Text>
            </View>
          </View>

          <View style={[s.divider, { backgroundColor: c.border }]} />

          {/* Amounts */}
          <View style={s.section}>
            <AmountLine label="Prix total" value={formatCFA(credit.prixTotal)} colors={c} />
            <AmountLine label="Acompte versé" value={formatCFA(montantPaye)} colors={c} accent="#22c55e" />
            <View style={[s.divider, { backgroundColor: c.border, marginVertical: 8 }]} />
            <AmountLine
              label="RESTE À PAYER"
              value={isPaid ? 'SOLDÉ' : formatCFA(credit.resteAPayer)}
              colors={c}
              accent={isPaid ? '#22c55e' : '#ef4444'}
              big
            />
          </View>

          <View style={[s.divider, { backgroundColor: c.border }]} />

          {/* Dates */}
          <View style={s.datesSection}>
            <View style={s.dateItem}>
              <Ionicons name="calendar-outline" size={14} color={c.mutedForeground} />
              <View>
                <Text style={[s.dateLabel, { color: c.mutedForeground }]}>Date de vente</Text>
                <Text style={[s.dateValue, { color: c.foreground }]}>{formatDate(credit.dateVente)}</Text>
              </View>
            </View>
            <View style={[s.dateDivider, { backgroundColor: c.border }]} />
            <View style={s.dateItem}>
              <Ionicons name="alarm-outline" size={14} color="#f97316" />
              <View>
                <Text style={[s.dateLabel, { color: c.mutedForeground }]}>Date d'échéance</Text>
                <Text style={[s.dateValue, { color: '#f97316' }]}>{formatDate(credit.dateEcheance)}</Text>
              </View>
            </View>
          </View>

          {/* Note */}
          {!!credit.note && (
            <>
              <View style={[s.divider, { backgroundColor: c.border }]} />
              <Text style={[s.note, { color: c.mutedForeground }]}>📝 {credit.note}</Text>
            </>
          )}

          {/* Paiements history */}
          {credit.paiements.length > 0 && (
            <>
              <View style={[s.divider, { backgroundColor: c.border }]} />
              <View style={s.section}>
                <Text style={[s.sectionLabel, { color: c.mutedForeground }]}>HISTORIQUE DES PAIEMENTS</Text>
                {credit.paiements.map(p => (
                  <View key={p.id} style={[s.payRow, { borderBottomColor: c.border }]}>
                    <Text style={[s.payDate, { color: c.mutedForeground }]}>{formatDate(p.date)}</Text>
                    <Text style={[s.payAmt, { color: '#22c55e' }]}>+ {formatCFA(p.montant)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Status + ID */}
          <View style={[s.footer, { borderTopColor: c.border }]}>
            <Text style={[s.footerId, { color: c.mutedForeground }]}>{credit.id}</Text>
            <View style={[s.footerBadge, { backgroundColor: isPaid ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)' }]}>
              <Text style={[s.footerBadgeText, { color: isPaid ? '#22c55e' : '#f97316' }]}>
                {isPaid ? '✓ Soldé' : 'En cours'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.card, borderColor: c.border }]} onPress={handleDownloadPDF}>
            <Ionicons name="document-outline" size={20} color={c.foreground} />
            <Text style={[s.actionText, { color: c.foreground }]}>Télécharger PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#f97316' }]} onPress={handleDownloadPDF}>
            <Ionicons name="print-outline" size={20} color="#fff" />
            <Text style={[s.actionText, { color: '#fff' }]}>Imprimer</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.whatsappBtn} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
          <Text style={[s.actionText, { color: '#fff' }]}>Partager sur WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.doneBtn, { borderColor: c.border }]} onPress={() => router.back()}>
          <Text style={[s.doneText, { color: c.mutedForeground }]}>Retour</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, colors: c }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ fontSize: 12, color: c.mutedForeground, fontFamily: 'Inter_400Regular' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: c.foreground, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'right', marginLeft: 12 }} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function AmountLine({ label, value, colors: c, accent, big }: { label: string; value: string; colors: any; accent?: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ fontSize: big ? 15 : 13, fontFamily: big ? 'Inter_600SemiBold' : 'Inter_400Regular', color: big ? c.foreground : c.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: big ? 20 : 14, fontFamily: big ? 'Inter_700Bold' : 'Inter_500Medium', color: accent ?? c.foreground }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  scroll: { padding: 16 },
  receiptCard: { borderRadius: 16, padding: 20, gap: 14 },
  shopHeader: { alignItems: 'center', gap: 6, paddingBottom: 4 },
  shopLogo: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  shopName: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  shopInfo: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  creditBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  creditBannerText: { fontSize: 12, fontFamily: 'Inter_500Medium', flex: 1 },
  divider: { height: 1 },
  section: { gap: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6, marginBottom: 6 },
  articleBox: { borderRadius: 8, padding: 10 },
  articleName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  articleMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  datesSection: { flexDirection: 'row', gap: 8 },
  dateItem: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dateDivider: { width: 1 },
  dateLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  dateValue: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  note: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1 },
  payDate: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  payAmt: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10 },
  footerId: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  footerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  footerBadgeText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  actionText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  whatsappBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#25D366', marginTop: 10 },
  doneBtn: { marginTop: 10, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  doneText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
