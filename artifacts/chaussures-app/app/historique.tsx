import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA, formatDate } from '@/utils';
import { downloadReceiptPDF, shareViaWhatsApp } from '@/utils/pdfReceipt';

type Tab = 'achats' | 'ventes';

export default function HistoriqueScreen() {
  const colors = useColors();
  const { achats, ventes, reglages } = useStore();
  const [tab, setTab] = useState<Tab>('ventes');
  const [downloading, setDownloading] = useState<string | null>(null);
  const c = colors;

  const sortedAchats = useMemo(() => [...achats].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [achats]);
  const sortedVentes = useMemo(() => [...ventes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [ventes]);

  const handleDownloadPDF = async (vente: typeof ventes[number]) => {
    if (downloading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDownloading(vente.id);
    try {
      const achat = achats.find(a => a.id === vente.achatId);
      await downloadReceiptPDF(vente, achat, reglages);
    } finally {
      setDownloading(null);
    }
  };

  const handleWhatsApp = async (vente: typeof ventes[number]) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const achat = achats.find(a => a.id === vente.achatId);
    await shareViaWhatsApp(vente, achat, reglages);
  };

  return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      {/* Tab selector */}
      <View style={[s.tabs, { backgroundColor: c.card, borderColor: c.border }]}>
        {(['ventes', 'achats'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && { backgroundColor: c.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, { color: tab === t ? '#fff' : c.mutedForeground }]}>
              {t === 'ventes' ? 'Ventes' : 'Achats'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'ventes' ? (
        <FlatList
          data={sortedVentes}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          ListEmptyComponent={<EmptyState icon="bag-outline" text="Aucune vente enregistrée" colors={c} />}
          renderItem={({ item: v }) => (
            <View style={[s.card, { backgroundColor: c.card }]}>
              <View style={s.cardRow}>
                <View style={[s.icon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                  <Ionicons name="bag" size={18} color={c.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.name, { color: c.foreground }]}>{v.modele}</Text>
                  <Text style={[s.meta, { color: c.mutedForeground }]}>
                    P{v.pointure} · {v.couleur} · ×{v.quantite}
                    {v.client ? ` · ${v.client}` : ''}
                  </Text>
                  <Text style={[s.date, { color: c.mutedForeground }]}>{formatDate(v.dateVente)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={[s.amount, { color: c.primary }]}>{formatCFA(v.montantTotal)}</Text>
                  {v.estCredit && (
                    <View style={[s.badge, { backgroundColor: v.resteAPayer > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }]}>
                      <Text style={[s.badgeText, { color: v.resteAPayer > 0 ? '#ef4444' : '#22c55e' }]}>
                        {v.resteAPayer > 0 ? 'Crédit' : 'Soldé'}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={[s.pdfBtn, { backgroundColor: downloading === v.id ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }]}
                      onPress={() => handleDownloadPDF(v)}
                      disabled={!!downloading}
                    >
                      <Ionicons
                        name={downloading === v.id ? 'hourglass-outline' : 'document-outline'}
                        size={12}
                        color={c.primary}
                      />
                      <Text style={[s.pdfBtnText, { color: c.primary }]}>
                        {downloading === v.id ? '...' : 'PDF'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.pdfBtn, { backgroundColor: 'rgba(37,211,102,0.12)', borderColor: 'rgba(37,211,102,0.3)' }]}
                      onPress={() => handleWhatsApp(v)}
                    >
                      <Ionicons name="logo-whatsapp" size={12} color="#25D366" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={sortedAchats}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          ListEmptyComponent={<EmptyState icon="cart-outline" text="Aucun achat enregistré" colors={c} />}
          renderItem={({ item: a }) => (
            <View style={[s.card, { backgroundColor: c.card }]}>
              <View style={s.cardRow}>
                <View style={[s.icon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                  <Ionicons name="cart" size={18} color="#f59e0b" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.name, { color: c.foreground }]}>{a.modele}</Text>
                  <Text style={[s.meta, { color: c.mutedForeground }]}>
                    P{a.pointure} · {a.couleur} · ×{a.quantiteAchetee}
                    {a.fournisseur ? ` · ${a.fournisseur}` : ''}
                  </Text>
                  <Text style={[s.date, { color: c.mutedForeground }]}>{formatDate(a.dateAchat)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[s.amount, { color: '#f59e0b' }]}>{formatCFA(a.prixAchat * a.quantiteAchetee)}</Text>
                  <Text style={[s.meta, { color: c.mutedForeground }]}>{formatCFA(a.prixAchat)}/u</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function EmptyState({ icon, text, colors: c }: { icon: any; text: string; colors: any }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
      <Ionicons name={icon} size={48} color={c.mutedForeground} />
      <Text style={{ fontSize: 14, color: c.mutedForeground, fontFamily: 'Inter_400Regular' }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', margin: 16, borderRadius: 10, padding: 4, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  list: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'web' ? 60 : 40 },
  card: { borderRadius: 12, padding: 14, marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  name: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  meta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  date: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  pdfBtnText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
