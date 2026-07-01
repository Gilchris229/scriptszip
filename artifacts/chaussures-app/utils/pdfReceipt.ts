import { Platform, Alert, Linking } from 'react-native';
import { formatCFA, formatDate } from '@/utils';

export function buildReceiptHTML(vente: any, achat: any | undefined, reglages: any): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;padding:28px;max-width:340px;margin:auto;color:#1a1a1a}
    .header{text-align:center;padding-bottom:18px;border-bottom:2px solid #eee;margin-bottom:18px}
    .shop{font-size:22px;font-weight:bold;margin-bottom:4px}
    .info{font-size:12px;color:#666;margin-bottom:2px}
    .section-title{font-size:10px;font-weight:bold;color:#999;letter-spacing:1px;text-transform:uppercase;margin:14px 0 6px}
    .row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f0f0f0}
    .label{font-size:12px;color:#666}
    .value{font-size:13px;font-weight:600}
    .article-box{background:#f8f8f8;border-radius:8px;padding:10px 12px;margin:8px 0}
    .article-name{font-size:15px;font-weight:bold}
    .article-meta{font-size:12px;color:#666;margin-top:2px}
    .total-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:2px solid #333;margin-top:10px}
    .total-label{font-size:15px;font-weight:bold}
    .total-value{font-size:20px;font-weight:bold;color:#4f46e5}
    .credit-box{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;margin-top:12px}
    .credit-row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}
    .credit-label{color:#9a3412}
    .credit-value{font-weight:600;color:#9a3412}
    .status-box{text-align:center;padding:10px;border-radius:8px;margin-top:14px;font-size:13px;font-weight:600}
    .status-paid{background:#f0fdf4;color:#15803d}
    .status-credit{background:#fef2f2;color:#dc2626}
    .footer{text-align:center;margin-top:20px;padding-top:14px;border-top:1px solid #eee;font-size:12px;color:#999}
    .id{font-size:10px;color:#bbb;text-align:center;margin-top:4px}
    @media print{body{padding:0}}
  </style></head><body>
    <div class="header">
      <div class="shop">${escHtml(reglages.nomBoutique)}</div>
      ${reglages.telephone ? `<div class="info">📞 ${escHtml(reglages.telephone)}</div>` : ''}
      ${reglages.adresse ? `<div class="info">📍 ${escHtml(reglages.adresse)}</div>` : ''}
    </div>

    <div class="section-title">Informations</div>
    <div class="row"><span class="label">N° Vente</span><span class="value">${escHtml(vente.id)}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${formatDate(vente.dateVente)}</span></div>
    <div class="row"><span class="label">Client</span><span class="value">${escHtml(vente.client || 'Anonyme')}</span></div>

    <div class="section-title">Article</div>
    <div class="article-box">
      <div class="article-name">${escHtml(vente.modele)}</div>
      <div class="article-meta">Pointure ${escHtml(vente.pointure)} · ${escHtml(vente.couleur)}</div>
    </div>

    <div class="section-title">Détail du prix</div>
    <div class="row"><span class="label">Prix unitaire</span><span class="value">${formatCFA(vente.prixUnitaire)}</span></div>
    <div class="row"><span class="label">Quantité</span><span class="value">×${vente.quantite}</span></div>
    <div class="total-row">
      <span class="total-label">TOTAL</span>
      <span class="total-value">${formatCFA(vente.montantTotal)}</span>
    </div>

    ${vente.estCredit ? `
    <div class="credit-box">
      <div class="credit-row"><span class="credit-label">Montant payé</span><span class="credit-value">${formatCFA(vente.montantPaye)}</span></div>
      <div class="credit-row"><span class="credit-label">Reste à payer</span><span class="credit-value">${vente.resteAPayer > 0 ? formatCFA(vente.resteAPayer) : '—'}</span></div>
    </div>` : ''}

    <div class="status-box ${vente.estCredit && vente.resteAPayer > 0 ? 'status-credit' : 'status-paid'}">
      ${vente.estCredit && vente.resteAPayer > 0 ? '⏳ Crédit en cours' : '✅ Paiement reçu — Merci !'}
    </div>

    <div class="footer">Merci pour votre achat !</div>
    <div class="id">Réf: ${escHtml(vente.id)}</div>
  </body></html>`;
}

function buildReceiptText(vente: any, reglages: any): string {
  const status = vente.estCredit && vente.resteAPayer > 0
    ? `⏳ Crédit en cours\nMontant payé : ${formatCFA(vente.montantPaye)}\nReste à payer : ${formatCFA(vente.resteAPayer)}`
    : '✅ Paiement reçu';

  return `🛍️ *${reglages.nomBoutique}*${reglages.telephone ? '\n📞 ' + reglages.telephone : ''}${reglages.adresse ? '\n📍 ' + reglages.adresse : ''}

*Reçu de vente*
📅 Date : ${formatDate(vente.dateVente)}
👤 Client : ${vente.client || 'Anonyme'}

👟 Article : ${vente.modele}
   Pointure ${vente.pointure} · ${vente.couleur}
   Qté : ×${vente.quantite}

💰 Prix unitaire : ${formatCFA(vente.prixUnitaire)}
*TOTAL : ${formatCFA(vente.montantTotal)}*

${status}

Merci pour votre achat ! 🙏`;
}

function escHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function downloadReceiptPDF(vente: any, achat: any | undefined, reglages: any): Promise<void> {
  const html = buildReceiptHTML(vente, achat, reglages);

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 400);
    } else {
      Alert.alert('Bloqué', 'Autorisez les pop-ups pour télécharger le PDF.');
    }
    return;
  }

  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: '.pdf',
        dialogTitle: `Reçu — ${vente.modele}`,
      });
    } else {
      Alert.alert('Partage indisponible', "Le partage de fichiers n'est pas disponible sur cet appareil.");
    }
  } catch {
    Alert.alert('Erreur', 'La génération du PDF a échoué.');
  }
}

export async function shareViaWhatsApp(vente: any, achat: any | undefined, reglages: any): Promise<void> {
  const text = buildReceiptText(vente, reglages);
  const encoded = encodeURIComponent(text);

  if (Platform.OS === 'web') {
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    return;
  }

  const waUrl = `whatsapp://send?text=${encoded}`;
  try {
    const canOpen = await Linking.canOpenURL(waUrl);
    if (canOpen) {
      await Linking.openURL(waUrl);
    } else {
      const webUrl = `https://wa.me/?text=${encoded}`;
      await Linking.openURL(webUrl);
    }
  } catch {
    Alert.alert('WhatsApp', "WhatsApp n'est pas installé sur cet appareil.");
  }
}
