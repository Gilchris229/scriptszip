import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA, formatDate } from '@/utils';
import { downloadReceiptPDF, shareViaWhatsApp } from '@/utils/pdfReceipt';

type Tab = 'achats' | 'ventes';

type UnifiedVente =
  | { kind: 'vente'; data: ReturnType<typeof useStore>['ventes'][number] }
  | { kind: 'credit'; data: ReturnType<typeof useStore>['ventesCredit'][number] };

export default function HistoriqueScreen() {
  const colors = useColors();
  const { achats, ventes, ventesCredit, reglages } = useStore();
  const [tab, setTab] = useState<Tab>('ventes');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const c = colors;

  const sortedAchats = useMemo(
    () => [...achats].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [achats]
  );

  const filteredAchats = useMemo(() => {
    if (!search.trim()) return sortedAchats;
    const q = search.toLowerCase();
    return sortedAchats.filter(a =>
      a.modele.toLowerCase().includes(q) ||
      a.pointure.toLowerCase().includes(q) ||
      a.couleur.toLowerCase().includes(q) ||
      a.fournisseur.toLowerCase().includes(q)
    );
  }, [sortedAchats, search]);

  const unifiedVentes = useMemo<UnifiedVente[]>(() => {
    const regular: UnifiedVente[] = ventes.map(v => ({ kind: 'vente', data: v }));
    const credits: UnifiedVente[] = ventesCredit.map(vc => ({ kind: 'credit', data: vc }));
    return [...regular, ...credits].sort((a, b) => {
      const dateA = a.kind === 'vente' ? a.data.createdAt : a.data.createdAt;
      const dateB = b.kind === 'vente' ? b.data.createdAt : b.data.createdAt;
      return dateB.localeCompare(dateA);
    });
  }, [ventes, ventesCredit]);

  const filteredVentes = useMemo(() => {
    if (!search.trim()) return unifiedVentes;
    const q = search.toLowerCase();
    return unifiedVentes.filter(item => {
      if (item.kind === 'vente') {
        const v = item.data;
        return (
          v.modele.toLowerCase().includes(q) ||
          v.pointure.toLowerCase().includes(q) ||
          v.couleur.toLowerCase().includes(q) ||
          v.client.toLowerCase().includes(q)
        );
      }
      const vc = item.data;
      return (
        vc.modele.toLowerCase().includes(q) ||
        vc.pointure.toLowerCase().includes(q) ||
        vc.couleur.toLowerCase().includes(q) ||
        vc.clientNom.toLowerCase().includes(q)
      );
    });
  }, [unifiedVentes, search]);

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

  const handleCreditWhatsApp = async (vc: typeof ventesCredit[number]) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const montantPaye = vc.prixTotal - vc.resteAPayer;
    const text =
      `🛍️ *${reglages.nomBoutique}*` +
      `${reglages.telephone ? '\n📞 ' + reglages.telephone : ''}` +
      `\n\n*Reçu crédit — ${vc.id}*` +
      `\n👤 Client : ${vc.clientNom}` +
      `\n📞 ${vc.clientTelephone}` +
      `\n📍 ${vc.clientAdresse}` +
      `\n\n👟 ${vc.modele} — P${vc.pointure} · ${vc.couleur} · ×${vc.quantite}` +
      `\n\n💰 Total : ${formatCFA(vc.prixTotal)}` +
      `\n✅ Payé : ${formatCFA(montantPaye)}` +
      `\n⏳ Reste : ${vc.resteAPayer > 0 ? formatCFA(vc.resteAPayer) : 'Soldé'}` +
      `\n\n📅 Échéance : ${formatDate(vc.dateEcheance)}` +
      `\n\nMerci de votre confiance 🙏`;
    const encoded = encodeURIComponent(text);
    if (Platform.OS === 'web') {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    } else {
      const url = `whatsapp://send?text=${encoded}`;
      const canOpen = await Linking.canOpenURL(url).catch(() => false);
      if (canOpen) await Linking.openURL(url);
      else await Linking.openURL(`https://wa.me/?text=${encoded}`);
    }
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
              {t === 'ventes' ? `Ventes (${unifiedVentes.length})` : `Achats (${sortedAchats.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={[s.searchBox, { backgroundColor: c.card, borderColor: c.border }]}>
        <Ionicons name="search" size={16} color={c.mutedForeground} />
        <TextInput
          style={[s.searchInput, { color: c.foreground }]}
          placeholder="Rechercher un modèle, une pointure, un client..."
          placeholderTextColor={c.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={c.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {tab === 'ventes' ? (
        <FlatList
          data={filteredVentes}
          keyExtractor={i => i.data.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          ListEmptyComponent={<EmptyState icon="bag-outline" text={search ? 'Aucun résultat' : 'Aucune vente enregistrée'} colors={c} />}
          renderItem={({ item }) => {
            if (item.kind === 'vente') {
              const v = item.data;
              return (
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
                      <View style={s.btnRow}>
                        <TouchableOpacity
                          style={[s.pdfBtn, { backgroundColor: downloading === v.id ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }]}
                          onPress={() => handleDownloadPDF(v)}
                          disabled={!!downloading}
                        >
                          <Ionicons name={downloading === v.id ? 'hourglass-outline' : 'document-outline'} size={12} color={c.primary} />
                          <Text style={[s.pdfBtnText, { color: c.primary }]}>{downloading === v.id ? '...' : 'PDF'}</Text>
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
              );
            }

            const vc = item.data;
            const isPaid = vc.statut === 'solde';
            return (
              <TouchableOpacity
                style={[s.card, { backgroundColor: c.card, borderLeftWidth: 3, borderLeftColor: isPaid ? '#22c55e' : '#f97316' }]}
                onPress={() => router.push(`/recu-credit/${vc.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={s.cardRow}>
                  <View style={[s.icon, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                    <Ionicons name="card" size={18} color="#f97316" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[s.name, { color: c.foreground }]}>{vc.modele}</Text>
                      <View style={[s.badge, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                        <Text style={[s.badgeText, { color: '#f97316' }]}>Crédit</Text>
                      </View>
                    </View>
                    <Text style={[s.meta, { color: c.mutedForeground }]}>
                      P{vc.pointure} · {vc.couleur} · ×{vc.quantite} · {vc.clientNom}
                    </Text>
                    <Text style={[s.date, { color: c.mutedForeground }]}>{formatDate(vc.dateVente)} · Éch. {formatDate(vc.dateEcheance)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={[s.amount, { color: '#f97316' }]}>{formatCFA(vc.prixTotal)}</Text>
                    <View style={[s.badge, { backgroundColor: isPaid ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)' }]}>
                      <Text style={[s.badgeText, { color: isPaid ? '#22c55e' : '#ef4444' }]}>
                        {isPaid ? 'Soldé' : `Reste: ${formatCFA(vc.resteAPayer)}`}
                      </Text>
                    </View>
                    <View style={s.btnRow}>
                      <TouchableOpacity
                        style={[s.pdfBtn, { backgroundColor: 'rgba(249,115,22,0.10)', borderColor: 'rgba(249,115,22,0.3)' }]}
                        onPress={() => router.push(`/recu-credit/${vc.id}` as any)}
                      >
                        <Ionicons name="receipt-outline" size={12} color="#f97316" />
                        <Text style={[s.pdfBtnText, { color: '#f97316' }]}>Reçu</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.pdfBtn, { backgroundColor: 'rgba(37,211,102,0.12)', borderColor: 'rgba(37,211,102,0.3)' }]}
                        onPress={() => handleCreditWhatsApp(vc)}
                      >
                        <Ionicons name="logo-whatsapp" size={12} color="#25D366" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={filteredAchats}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          ListEmptyComponent={<EmptyState icon="cart-outline" text={search ? 'Aucun résultat' : 'Aucun achat enregistré'} colors={c} />}
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
  tabText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', padding: 0 },
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
  btnRow: { flexDirection: 'row', gap: 6 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  pdfBtnText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
