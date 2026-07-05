import { Platform, Alert } from 'react-native';
import { formatCFA, formatDate } from '@/utils';
import { printHtmlOnWeb } from '@/utils/pdfReceipt';
import type { Achat, Vente, VenteCredit, Reglages } from '@/context/StoreContext';

function escCsv(val: string | number): string {
  const str = String(val ?? '');
  if (/[",;\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(escCsv).join(';'), ...rows.map(r => r.map(escCsv).join(';'))];
  return '\uFEFF' + lines.join('\r\n');
}

export async function downloadCSV(filename: string, csv: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  try {
    const FileSystem = await import('expo-file-system/legacy');
    const Sharing = await import('expo-sharing');
    const uri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, csv, { encoding: 'utf8' as any });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: filename,
      });
    } else {
      Alert.alert('Partage indisponible', "Le partage de fichiers n'est pas disponible sur cet appareil.");
    }
  } catch {
    Alert.alert('Erreur', "L'export Excel a échoué.");
  }
}

function escHtml(str: string | number): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildReportHTML(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  reglages: Reglages,
  totals?: { label: string; value: string }[]
): string {
  const headHtml = headers.map(h => `<th>${escHtml(h)}</th>`).join('');
  const bodyHtml = rows
    .map(r => `<tr>${r.map(c => `<td>${escHtml(c)}</td>`).join('')}</tr>`)
    .join('');
  const totalsHtml = totals && totals.length
    ? `<div class="totals">${totals
        .map(t => `<div class="total-item"><span class="total-label">${escHtml(t.label)}</span><span class="total-value">${escHtml(t.value)}</span></div>`)
        .join('')}</div>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a}
    .header{text-align:center;padding-bottom:14px;border-bottom:2px solid #eee;margin-bottom:16px}
    .shop{font-size:20px;font-weight:bold;margin-bottom:4px}
    .info{font-size:11px;color:#666;margin-bottom:2px}
    .title{font-size:16px;font-weight:bold;margin:14px 0 4px;color:#4f46e5}
    .date{font-size:11px;color:#999;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#4f46e5;color:#fff;text-align:left;padding:8px 6px;font-size:10px;text-transform:uppercase;letter-spacing:0.3px}
    td{padding:7px 6px;border-bottom:1px solid #eee}
    tr:nth-child(even) td{background:#f9f9fb}
    .totals{display:flex;gap:16px;margin-top:18px;flex-wrap:wrap}
    .total-item{background:#f4f4fd;border-radius:8px;padding:10px 14px;min-width:140px}
    .total-label{display:block;font-size:10px;color:#666;text-transform:uppercase;margin-bottom:4px}
    .total-value{display:block;font-size:15px;font-weight:bold;color:#4f46e5}
    .footer{text-align:center;margin-top:24px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#aaa}
    @media print{body{padding:0}}
  </style></head><body>
    <div class="header">
      <div class="shop">${escHtml(reglages.nomBoutique)}</div>
      ${reglages.telephone ? `<div class="info">📞 ${escHtml(reglages.telephone)}</div>` : ''}
      ${reglages.adresse ? `<div class="info">📍 ${escHtml(reglages.adresse)}</div>` : ''}
    </div>
    <div class="title">${escHtml(title)}</div>
    <div class="date">Généré le ${escHtml(formatDate(new Date().toISOString().slice(0, 10)))}</div>
    ${totalsHtml}
    <table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml || `<tr><td colspan="${headers.length}" style="text-align:center;color:#999;padding:20px">Aucune donnée</td></tr>`}</tbody></table>
    <div class="footer">${escHtml(reglages.nomBoutique)} — Rapport généré automatiquement</div>
  </body></html>`;
}

export async function downloadReportPDF(filename: string, html: string): Promise<void> {
  if (Platform.OS === 'web') {
    printHtmlOnWeb(html);
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
        dialogTitle: filename,
      });
    } else {
      Alert.alert('Partage indisponible', "Le partage de fichiers n'est pas disponible sur cet appareil.");
    }
  } catch {
    Alert.alert('Erreur', 'La génération du PDF a échoué.');
  }
}

export function buildStockRows(stockList: { achat: Achat; quantiteVendue: number; quantiteRestante: number }[]): {
  headers: string[];
  rows: (string | number)[][];
} {
  const headers = ['Modèle', 'Pointure', 'Couleur', 'Qté achetée', 'Qté vendue', 'Qté restante', 'Prix achat', 'Prix vente', 'Fournisseur', 'Date achat'];
  const rows = stockList.map(({ achat, quantiteVendue, quantiteRestante }) => [
    achat.modele,
    achat.pointure,
    achat.couleur,
    achat.quantiteAchetee,
    quantiteVendue,
    quantiteRestante,
    achat.prixAchat,
    achat.prixVente,
    achat.fournisseur || '—',
    formatDate(achat.dateAchat),
  ]);
  return { headers, rows };
}

export function buildAchatsRows(achats: Achat[]): { headers: string[]; rows: (string | number)[][] } {
  const headers = ['Date', 'Modèle', 'Pointure', 'Couleur', 'Qté achetée', 'Prix achat unit.', 'Prix vente unit.', 'Total investi', 'Fournisseur'];
  const rows = achats.map(a => [
    formatDate(a.dateAchat),
    a.modele,
    a.pointure,
    a.couleur,
    a.quantiteAchetee,
    a.prixAchat,
    a.prixVente,
    a.prixAchat * a.quantiteAchetee,
    a.fournisseur || '—',
  ]);
  return { headers, rows };
}

export function buildVentesRows(ventes: Vente[], ventesCredit: VenteCredit[]): { headers: string[]; rows: (string | number)[][] } {
  const headers = ['Date', 'Client', 'Modèle', 'Pointure', 'Couleur', 'Qté', 'Prix unitaire', 'Montant total', 'Type', 'Payé', 'Reste à payer'];
  const rowsVentes = ventes.map(v => [
    formatDate(v.dateVente),
    v.client || 'Anonyme',
    v.modele,
    v.pointure,
    v.couleur,
    v.quantite,
    v.prixUnitaire,
    v.montantTotal,
    v.estCredit ? 'Crédit' : 'Comptant',
    v.montantPaye,
    v.resteAPayer,
  ]);
  const rowsCredit = ventesCredit.map(vc => [
    formatDate(vc.dateVente),
    vc.clientNom || 'Anonyme',
    vc.modele,
    vc.pointure,
    vc.couleur,
    vc.quantite,
    vc.quantite ? Math.round(vc.prixTotal / vc.quantite) : vc.prixTotal,
    vc.prixTotal,
    'Crédit',
    vc.prixTotal - vc.resteAPayer,
    vc.resteAPayer,
  ]);
  const rows = [...rowsVentes, ...rowsCredit].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  return { headers, rows };
}

export function formatCFAPlain(n: number): string {
  return formatCFA(n);
}
