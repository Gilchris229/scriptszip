import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/context/StoreContext';
import { formatCFA, formatDate, getTodayISO } from '@/utils';

type SubTab = 'new' | 'list';

const INIT_FORM = () => ({
  clientNom: '',
  clientTelephone: '',
  clientAdresse: '',
  quantite: '1',
  prixTotal: '',
  acompte: '0',
  dateVente: getTodayISO(),
  dateEcheance: '',
  note: '',
});

function getEcheanceStatus(dateEcheance: string): 'expired' | 'soon' | 'ok' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateEcheance);
  const diff = (due.getTime() - today.getTime()) / 86400000;
  if (diff < 0) return 'expired';
  if (diff <= 7) return 'soon';
  return 'ok';
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function CreditsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [subTab, setSubTab] = useState<SubTab>('new');
  const c = colors;

  return (
    <View style={[s.container, { backgroundColor: c.background, paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top + 16 }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: c.foreground }]}>Crédit</Text>
        <Text style={[s.subtitle, { color: c.mutedForeground }]}>Gestion des ventes à crédit</Text>
      </View>

      <View style={[s.tabs, { backgroundColor: c.card, borderColor: c.border }]}>
        <TouchableOpacity
          style={[s.tab, subTab === 'new' && { backgroundColor: c.primary }]}
          onPress={() => setSubTab('new')}
        >
          <Ionicons name="add-circle-outline" size={15} color={subTab === 'new' ? '#fff' : c.mutedForeground} />
          <Text style={[s.tabText, { color: subTab === 'new' ? '#fff' : c.mutedForeground }]}>Nouvelle vente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, subTab === 'list' && { backgroundColor: c.primary }]}
          onPress={() => setSubTab('list')}
        >
          <Ionicons name="list-outline" size={15} color={subTab === 'list' ? '#fff' : c.mutedForeground} />
          <Text style={[s.tabText, { color: subTab === 'list' ? '#fff' : c.mutedForeground }]}>Liste des crédits</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'new'
        ? <NewCreditForm onSuccess={() => setSubTab('list')} />
        : <CreditList />
      }
    </View>
  );
}

// ─── Sub-tab 1: New Credit Form ────────────────────────────────────────────────

interface SuccessData {
  creditId: string;
  clientNom: string;
  modele: string;
  pointure: string;
  couleur: string;
  quantite: number;
  prixTotal: number;
  acompte: number;
  resteAPayer: number;
}

function NewCreditForm({ onSuccess }: { onSuccess: () => void }) {
  const colors = useColors();
  const { getStockList, addVenteCredit } = useStore();
  const [form, setForm] = useState(INIT_FORM());
  const [selectedAchatId, setSelectedAchatId] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const c = colors;

  const stockList = useMemo(() => getStockList().filter(s => s.quantiteRestante > 0), [getStockList]);
  const selectedStock = useMemo(() => stockList.find(s => s.achat.id === selectedAchatId), [stockList, selectedAchatId]);

  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setErrorMsg(''); };

  const prixTotal = parseFloat(form.prixTotal) || 0;
  const acompte = parseFloat(form.acompte) || 0;
  const resteAPayer = Math.max(0, prixTotal - acompte);

  const reset = () => { setForm(INIT_FORM()); setSelectedAchatId(''); setErrorMsg(''); setSuccess(null); };

  const submit = async () => {
    setErrorMsg('');
    if (!form.clientNom.trim()) { setErrorMsg('Le nom du client est obligatoire.'); return; }
    if (!form.clientTelephone.trim()) { setErrorMsg('Le téléphone du client est obligatoire.'); return; }
    if (!form.clientAdresse.trim()) { setErrorMsg("L'adresse / quartier est obligatoire."); return; }
    if (!selectedAchatId || !selectedStock) { setErrorMsg('Sélectionnez un article depuis le stock.'); return; }
    const qty = parseInt(form.quantite, 10);
    if (!qty || qty <= 0 || qty > selectedStock.quantiteRestante) {
      setErrorMsg(`Quantité invalide. Stock disponible : ${selectedStock.quantiteRestante}`); return;
    }
    if (prixTotal <= 0) { setErrorMsg('Le prix de vente total doit être supérieur à 0.'); return; }
    if (acompte < 0 || acompte > prixTotal) {
      setErrorMsg(`L'acompte doit être entre 0 et ${formatCFA(prixTotal)}.`); return;
    }
    if (!form.dateVente.match(/^\d{4}-\d{2}-\d{2}$/)) { setErrorMsg('Date de vente invalide — format AAAA-MM-JJ.'); return; }
    if (!form.dateEcheance.match(/^\d{4}-\d{2}-\d{2}$/)) { setErrorMsg("Date d'échéance invalide — format AAAA-MM-JJ."); return; }
    if (form.dateEcheance <= form.dateVente) { setErrorMsg("La date d'échéance doit être postérieure à la date de vente."); return; }

    setLoading(true);
    try {
      const credit = await addVenteCredit({
        clientNom: form.clientNom.trim(),
        clientTelephone: form.clientTelephone.trim(),
        clientAdresse: form.clientAdresse.trim(),
        achatId: selectedAchatId,
        modele: selectedStock.achat.modele,
        pointure: selectedStock.achat.pointure,
        couleur: selectedStock.achat.couleur,
        quantite: qty,
        prixTotal,
        acompte,
        resteAPayer,
        dateVente: form.dateVente,
        dateEcheance: form.dateEcheance,
        note: form.note.trim(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess({
        creditId: credit.id,
        clientNom: form.clientNom.trim(),
        modele: selectedStock.achat.modele,
        pointure: selectedStock.achat.pointure,
        couleur: selectedStock.achat.couleur,
        quantite: qty,
        prixTotal,
        acompte,
        resteAPayer,
      });
      setForm(INIT_FORM());
      setSelectedAchatId('');
    } catch {
      setErrorMsg("L'enregistrement a échoué. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (success) {
    return (
      <View style={s.successWrap}>
        <View style={[s.successCard, { backgroundColor: c.card }]}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
          <Text style={[s.successTitle, { color: c.foreground }]}>Crédit enregistré !</Text>
          <Text style={[s.successSub, { color: c.mutedForeground }]}>Le stock a bien été mis à jour.</Text>

          <View style={[s.successDetails, { backgroundColor: c.background }]}>
            <DetailRow label="Référence" value={success.creditId} colors={c} />
            <DetailRow label="Client" value={success.clientNom} colors={c} />
            <DetailRow label="Article" value={`${success.modele} P${success.pointure}`} colors={c} />
            <DetailRow label="Quantité" value={`${success.quantite} paire${success.quantite > 1 ? 's' : ''}`} colors={c} />
            <DetailRow label="Prix total" value={formatCFA(success.prixTotal)} colors={c} />
            {success.acompte > 0 && <DetailRow label="Acompte" value={formatCFA(success.acompte)} valueColor="#22c55e" colors={c} />}
            <DetailRow label="Reste à payer" value={formatCFA(success.resteAPayer)} valueColor={success.resteAPayer > 0 ? '#ef4444' : '#22c55e'} colors={c} last />
          </View>
        </View>

        <TouchableOpacity
          style={[s.receiptBtn, { backgroundColor: '#f97316' }]}
          onPress={() => { setSuccess(null); router.push(`/recu-credit/${success.creditId}` as any); }}
        >
          <Ionicons name="receipt-outline" size={18} color="#fff" />
          <Text style={s.receiptBtnText}>Voir le reçu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.listBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => { setSuccess(null); onSuccess(); }}
        >
          <Ionicons name="list-outline" size={18} color={c.foreground} />
          <Text style={[s.listBtnText, { color: c.foreground }]}>Voir la liste des crédits</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={reset}>
          <Text style={[s.newLink, { color: c.mutedForeground }]}>+ Nouveau crédit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Form ──
  return (
    <KeyboardAwareScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.form}
      keyboardShouldPersistTaps="handled"
      bottomOffset={80}
    >
      {/* Error banner */}
      {!!errorMsg && (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#fff" />
          <Text style={s.errorText}>{errorMsg}</Text>
        </View>
      )}

      <SectionHeader icon="person-outline" label="INFORMATIONS CLIENT" colors={c} />
      <Field label="NOM COMPLET *" placeholder="Ex: Kouamé Jean" value={form.clientNom} onChangeText={(v: string) => set('clientNom', v)} colors={c} />
      <Field label="TÉLÉPHONE *" placeholder="+225 07 00 00 00 00" value={form.clientTelephone} onChangeText={(v: string) => set('clientTelephone', v)} keyboardType="phone-pad" colors={c} />
      <Field label="ADRESSE / QUARTIER *" placeholder="Ex: Cocody Angré" value={form.clientAdresse} onChangeText={(v: string) => set('clientAdresse', v)} colors={c} />

      <SectionHeader icon="cube-outline" label="ARTICLE & MONTANTS" colors={c} />

      <Text style={[s.label, { color: c.mutedForeground }]}>ARTICLE *</Text>
      <TouchableOpacity
        style={[s.picker, { backgroundColor: c.card, borderColor: selectedAchatId ? c.primary : c.border }]}
        onPress={() => setPickerVisible(true)}
      >
        {selectedStock ? (
          <View style={{ flex: 1 }}>
            <Text style={[s.pickerName, { color: c.foreground }]}>{selectedStock.achat.modele}</Text>
            <Text style={[s.pickerMeta, { color: c.mutedForeground }]}>
              P{selectedStock.achat.pointure} · {selectedStock.achat.couleur} · Stock: {selectedStock.quantiteRestante}
            </Text>
          </View>
        ) : (
          <Text style={[s.pickerPlaceholder, { color: c.mutedForeground }]}>Sélectionner un article</Text>
        )}
        <Ionicons name="chevron-down" size={18} color={c.mutedForeground} />
      </TouchableOpacity>

      <Field label="QUANTITÉ *" placeholder="1" value={form.quantite} onChangeText={(v: string) => set('quantite', v)} keyboardType="numeric" colors={c} />

      <View style={s.row}>
        <View style={s.half}>
          <Field label="PRIX VENTE TOTAL (FCFA) *" placeholder="Ex: 30000" value={form.prixTotal} onChangeText={(v: string) => set('prixTotal', v)} keyboardType="numeric" colors={c} />
        </View>
        <View style={s.half}>
          <Field label="ACOMPTE VERSÉ (FCFA)" placeholder="0" value={form.acompte} onChangeText={(v: string) => set('acompte', v)} keyboardType="numeric" colors={c} />
        </View>
      </View>

      {prixTotal > 0 && (
        <View style={[s.resteBox, { backgroundColor: resteAPayer > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', borderColor: resteAPayer > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)' }]}>
          <Text style={[s.resteLabel, { color: c.mutedForeground }]}>Reste à payer</Text>
          <Text style={[s.resteValue, { color: resteAPayer > 0 ? '#ef4444' : '#22c55e' }]}>{formatCFA(resteAPayer)}</Text>
        </View>
      )}

      <View style={s.row}>
        <View style={s.half}>
          <Field label="DATE DE VENTE" placeholder="AAAA-MM-JJ" value={form.dateVente} onChangeText={(v: string) => set('dateVente', v)} colors={c} />
        </View>
        <View style={s.half}>
          <Field label="DATE D'ÉCHÉANCE *" placeholder="AAAA-MM-JJ" value={form.dateEcheance} onChangeText={(v: string) => set('dateEcheance', v)} colors={c} />
        </View>
      </View>

      <Field label="NOTE (OPTIONNEL)" placeholder="Remarque, accord particulier..." value={form.note} onChangeText={(v: string) => set('note', v)} multiline colors={c} />

      <View style={s.btnRow}>
        <TouchableOpacity style={[s.resetBtn, { backgroundColor: c.card, borderColor: c.border }]} onPress={reset}>
          <Ionicons name="refresh" size={16} color={c.mutedForeground} />
          <Text style={[s.resetText, { color: c.mutedForeground }]}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: '#f97316', opacity: loading ? 0.7 : 1 }]}
          onPress={submit} disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="card" size={18} color="#fff" /><Text style={s.submitText}>Enregistrer le crédit</Text></>
          }
        </TouchableOpacity>
      </View>

      <View style={{ height: Platform.OS === 'web' ? 120 : 100 }} />

      {/* Stock picker modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={[s.sheet, { backgroundColor: c.card }]}>
            <View style={[s.handle, { backgroundColor: c.border }]} />
            <Text style={[s.sheetTitle, { color: c.foreground }]}>Choisir un article</Text>
            {stockList.length === 0 ? (
              <View style={s.emptyModal}>
                <Ionicons name="cube-outline" size={40} color={c.mutedForeground} />
                <Text style={[s.emptyModalText, { color: c.mutedForeground }]}>Stock épuisé</Text>
              </View>
            ) : (
              <FlatList
                data={stockList}
                keyExtractor={i => i.achat.id}
                style={{ maxHeight: 380 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.stockRow, { borderColor: c.border }, selectedAchatId === item.achat.id && { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: '#f97316' }]}
                    onPress={() => {
                      setSelectedAchatId(item.achat.id);
                      setForm(p => ({ ...p, prixTotal: item.achat.prixVente > 0 ? String(item.achat.prixVente) : '' }));
                      setPickerVisible(false);
                      setErrorMsg('');
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.stockName, { color: c.foreground }]}>{item.achat.modele}</Text>
                      <Text style={[s.stockMeta, { color: c.mutedForeground }]}>P{item.achat.pointure} · {item.achat.couleur}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      {item.achat.prixVente > 0
                        ? <Text style={[s.stockPrice, { color: '#f97316' }]}>{formatCFA(item.achat.prixVente)}</Text>
                        : <Text style={[s.stockPrice, { color: c.mutedForeground }]}>Prix à définir</Text>
                      }
                      <Text style={[s.stockMeta, { color: c.mutedForeground }]}>Stock: {item.quantiteRestante}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAwareScrollView>
  );
}

// ─── Sub-tab 2: Credit List ────────────────────────────────────────────────────

type Filter = 'all' | 'en_cours' | 'solde';

function CreditList() {
  const colors = useColors();
  const { ventesCredit, addPaiementVenteCredit, getTotalCreances } = useStore();
  const [filter, setFilter] = useState<Filter>('en_cours');
  const [payModal, setPayModal] = useState<{ id: string; max: number; client: string } | null>(null);
  const [montantPaiement, setMontantPaiement] = useState('');
  const [payError, setPayError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paidClient, setPaidClient] = useState('');
  const c = colors;

  const totalCreances = getTotalCreances();

  const filtered = useMemo(() => {
    const sorted = [...ventesCredit].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter === 'all') return sorted;
    return sorted.filter(vc => vc.statut === filter);
  }, [ventesCredit, filter]);

  const openPayModal = (id: string, max: number, client: string) => {
    setPayModal({ id, max, client });
    setMontantPaiement('');
    setPayError('');
    setPaidClient('');
  };

  const submitPaiement = async () => {
    if (!payModal) return;
    const m = parseFloat(montantPaiement);
    if (!m || m <= 0 || m > payModal.max) {
      setPayError(`Entrez un montant entre 1 et ${formatCFA(payModal.max)}`);
      return;
    }
    setLoading(true);
    try {
      await addPaiementVenteCredit(payModal.id, m, getTodayISO());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (m >= payModal.max) setPaidClient(payModal.client);
      setPayModal(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Soldé toast */}
      {!!paidClient && (
        <TouchableOpacity
          style={s.soldeBanner}
          onPress={() => setPaidClient('')}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={s.soldeBannerText}>Crédit de {paidClient} entièrement soldé ✓</Text>
        </TouchableOpacity>
      )}

      {/* Total banner */}
      <View style={[s.banner, { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.25)' }]}>
        <View style={[s.bannerIcon, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
          <Ionicons name="card-outline" size={22} color="#f97316" />
        </View>
        <View>
          <Text style={[s.bannerAmt, { color: '#f97316' }]}>{formatCFA(totalCreances)}</Text>
          <Text style={[s.bannerSub, { color: c.mutedForeground }]}>
            {ventesCredit.filter(vc => vc.statut === 'en_cours').length} crédit(s) en cours
          </Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={s.filterRow}>
        {(['all', 'en_cours', 'solde'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.chip, { backgroundColor: filter === f ? '#f97316' : c.card, borderColor: filter === f ? '#f97316' : c.border }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.chipText, { color: filter === f ? '#fff' : c.mutedForeground }]}>
              {f === 'all' ? 'Tous' : f === 'en_cours' ? 'En cours' : 'Soldés'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="card-outline" size={48} color={c.mutedForeground} />
            <Text style={[s.emptyText, { color: c.mutedForeground }]}>
              Aucun crédit {filter === 'en_cours' ? 'en cours' : filter === 'solde' ? 'soldé' : ''}
            </Text>
          </View>
        }
        renderItem={({ item: vc }) => {
          const status = vc.statut === 'solde' ? 'ok' : getEcheanceStatus(vc.dateEcheance);
          const statusColor = { expired: '#ef4444', soon: '#f59e0b', ok: '#22c55e' }[status];
          const statusBg = { expired: 'rgba(239,68,68,0.12)', soon: 'rgba(245,158,11,0.12)', ok: 'rgba(34,197,94,0.12)' }[status];
          const statusLabel = vc.statut === 'solde' ? 'Soldé' : status === 'expired' ? 'Dépassé' : status === 'soon' ? 'Bientôt dû' : 'OK';

          return (
            <View style={[s.card, { backgroundColor: c.card, borderLeftWidth: 3, borderLeftColor: vc.statut === 'solde' ? '#22c55e' : status === 'expired' ? '#ef4444' : '#f97316' }]}>
              <View style={s.cardHead}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[s.clientName, { color: c.foreground }]}>{vc.clientNom}</Text>
                    <Text style={[s.creditId, { color: c.mutedForeground }]}>{vc.id}</Text>
                  </View>
                  <Text style={[s.clientMeta, { color: c.mutedForeground }]}>{vc.clientTelephone} · {vc.clientAdresse}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>

              <View style={[s.articleRow, { backgroundColor: c.background }]}>
                <Text style={[s.articleName, { color: c.foreground }]}>{vc.modele}</Text>
                <Text style={[s.articleMeta, { color: c.mutedForeground }]}>P{vc.pointure} · {vc.couleur} · ×{vc.quantite}</Text>
              </View>

              <View style={s.amtRow}>
                <AmtItem label="Total" value={formatCFA(vc.prixTotal)} color={c.foreground} colors={c} />
                <AmtItem label="Acompte" value={formatCFA(vc.prixTotal - vc.resteAPayer)} color="#22c55e" colors={c} />
                <AmtItem label="Reste dû" value={formatCFA(vc.resteAPayer)} color={vc.resteAPayer > 0 ? '#ef4444' : '#22c55e'} colors={c} big />
              </View>

              <View style={s.datesRow}>
                <Text style={[s.dateText, { color: c.mutedForeground }]}>
                  <Ionicons name="calendar-outline" size={11} /> Vente: {formatDate(vc.dateVente)}
                </Text>
                <Text style={[s.dateText, { color: status === 'expired' && vc.statut !== 'solde' ? '#ef4444' : c.mutedForeground }]}>
                  <Ionicons name="alarm-outline" size={11} /> Échéance: {formatDate(vc.dateEcheance)}
                </Text>
              </View>

              {vc.paiements.length > 0 && (
                <View style={[s.payHistory, { borderTopColor: c.border }]}>
                  <Text style={[s.payHistoryTitle, { color: c.mutedForeground }]}>
                    {vc.paiements.length} paiement{vc.paiements.length > 1 ? 's' : ''}
                  </Text>
                  {vc.paiements.slice(0, 2).map(p => (
                    <Text key={p.id} style={[s.payHistoryItem, { color: c.mutedForeground }]}>
                      + {formatCFA(p.montant)} — {formatDate(p.date)}
                    </Text>
                  ))}
                  {vc.paiements.length > 2 && (
                    <Text style={[s.payHistoryItem, { color: c.mutedForeground }]}>
                      ...et {vc.paiements.length - 2} autre{vc.paiements.length - 2 > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              )}

              {!!vc.note && (
                <Text style={[s.noteText, { color: c.mutedForeground }]}>📝 {vc.note}</Text>
              )}

              {vc.statut === 'en_cours' && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: 'rgba(249,115,22,0.12)', flex: 1 }]}
                    onPress={() => openPayModal(vc.id, vc.resteAPayer, vc.clientNom)}
                  >
                    <Ionicons name="add-circle-outline" size={15} color="#f97316" />
                    <Text style={[s.actionText, { color: '#f97316' }]}>Enregistrer paiement</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtnSm, { backgroundColor: 'rgba(99,102,241,0.1)' }]}
                    onPress={() => router.push(`/recu-credit/${vc.id}` as any)}
                  >
                    <Ionicons name="receipt-outline" size={16} color={c.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {vc.statut === 'solde' && (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: 'rgba(99,102,241,0.1)' }]}
                  onPress={() => router.push(`/recu-credit/${vc.id}` as any)}
                >
                  <Ionicons name="receipt-outline" size={15} color={c.primary} />
                  <Text style={[s.actionText, { color: c.primary }]}>Voir le reçu</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Payment modal */}
      <Modal visible={!!payModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setPayModal(null)}>
          <View style={[s.sheet, { backgroundColor: c.card }]}>
            <View style={[s.handle, { backgroundColor: c.border }]} />
            <Text style={[s.sheetTitle, { color: c.foreground }]}>Enregistrer un paiement</Text>
            {payModal && (
              <>
                <Text style={[s.sheetSub, { color: c.mutedForeground }]}>
                  {payModal.client} · Reste: {formatCFA(payModal.max)}
                </Text>
                {!!payError && (
                  <View style={s.payErrorBox}>
                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                    <Text style={s.payErrorText}>{payError}</Text>
                  </View>
                )}
                <View style={[s.amtInput, { backgroundColor: c.background, borderColor: payError ? '#ef4444' : c.border }]}>
                  <TextInput
                    style={[s.amtText, { color: c.foreground }]}
                    placeholder={`Montant reçu (max ${formatCFA(payModal.max)})`}
                    placeholderTextColor={c.mutedForeground}
                    value={montantPaiement}
                    onChangeText={v => { setMontantPaiement(v); setPayError(''); }}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[s.confirmBtn, { backgroundColor: '#f97316', opacity: loading ? 0.7 : 1 }]}
                  onPress={submitPaiement}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.confirmText}>Confirmer le paiement</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Helper components ─────────────────────────────────────────────────────────

function DetailRow({ label, value, valueColor, colors: c, last }: {
  label: string; value: string; valueColor?: string; colors: any; last?: boolean;
}) {
  return (
    <View style={[dr.row, !last && dr.border, { borderColor: c.border }]}>
      <Text style={[dr.label, { color: c.mutedForeground }]}>{label}</Text>
      <Text style={[dr.value, { color: valueColor ?? c.foreground }]}>{value}</Text>
    </View>
  );
}
const dr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  border: { borderBottomWidth: 1 },
  label: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  value: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});

function SectionHeader({ icon, label, colors: c }: { icon: any; label: string; colors: any }) {
  return (
    <View style={[sh.row, { borderBottomColor: c.border }]}>
      <Ionicons name={icon} size={14} color={c.mutedForeground} />
      <Text style={[sh.label, { color: c.mutedForeground }]}>{label}</Text>
    </View>
  );
}
const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 10, marginBottom: 14, borderBottomWidth: 1 },
  label: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6 },
});

function Field({ label, colors: c, multiline, ...props }: {
  label: string;
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
  multiline?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[fs.label, { color: c.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[fs.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border, minHeight: multiline ? 64 : undefined, textAlignVertical: multiline ? 'top' : undefined }]}
        placeholderTextColor={c.mutedForeground}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}
const fs = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6, marginBottom: 6 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular', borderWidth: 1 },
});

function AmtItem({ label, value, color, colors: c, big }: { label: string; value: string; color: string; colors: any; big?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: big ? 14 : 12, fontWeight: '700', fontFamily: 'Inter_700Bold', color }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: c.mutedForeground, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 0, borderRadius: 10, padding: 4, borderWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
  tabText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  form: { padding: 20, paddingTop: 16 },
  label: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef4444', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { flex: 1, fontSize: 13, color: '#fff', fontFamily: 'Inter_500Medium' },
  picker: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14, gap: 8 },
  pickerName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  pickerMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  pickerPlaceholder: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  resteBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resteLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  resteValue: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  resetBtn: { width: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 14, borderWidth: 1 },
  resetText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  submitBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  submitText: { fontSize: 15, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  // Success
  successWrap: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 12, paddingBottom: 40 },
  successCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  successTitle: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  successSub: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  successDetails: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15 },
  receiptBtnText: { fontSize: 15, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  listBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, borderWidth: 1 },
  listBtnText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  newLink: { textAlign: 'center', fontSize: 13, fontFamily: 'Inter_500Medium', paddingVertical: 4 },
  // List
  soldeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#22c55e', marginHorizontal: 16, marginTop: 8, borderRadius: 10, padding: 12 },
  soldeBannerText: { flex: 1, fontSize: 13, color: '#fff', fontFamily: 'Inter_600SemiBold' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, margin: 16, borderRadius: 14, padding: 16, borderWidth: 1 },
  bannerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bannerAmt: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  bannerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  list: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'web' ? 120 : 100 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  card: { borderRadius: 14, padding: 14, marginBottom: 10, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  clientName: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  creditId: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  clientMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  articleRow: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  articleName: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  articleMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  amtRow: { flexDirection: 'row', paddingVertical: 4 },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  dateText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  payHistory: { borderTopWidth: 1, paddingTop: 8, gap: 3 },
  payHistoryTitle: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  payHistoryItem: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  noteText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 8 },
  actionBtnSm: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  sheetSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  payErrorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: 10 },
  payErrorText: { flex: 1, fontSize: 13, color: '#ef4444', fontFamily: 'Inter_500Medium' },
  amtInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  amtText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  confirmBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmText: { fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },
  emptyModal: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyModalText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  stockRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  stockName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  stockMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  stockPrice: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
