import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentDirectory, moveAsync, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import XLSX from 'xlsx';
import type { RapportData } from '../types/rapport';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPDFHtml(data: RapportData): string {
  const trajetsRows = data.trajets
    .map(
      (t) => `
      <tr>
        <td>${escapeHtml(t.date)}</td>
        <td>${escapeHtml(t.adresse_depart)}</td>
        <td>${escapeHtml(t.adresse_arrivee)}</td>
        <td style="text-align:right">${t.distance_km.toFixed(1)}</td>
        <td style="text-align:center">${t.aller_retour ? 'Oui' : 'Non'}</td>
        <td>${escapeHtml(t.motif)}</td>
        <td style="text-align:right">${t.montant_eur.toFixed(2)} &euro;</td>
      </tr>`
    )
    .join('');

  const horodatagesRows = data.horodatages
    .map(
      (h) => `
      <tr>
        <td>${escapeHtml(h.date)}</td>
        <td>${escapeHtml(h.heure)}</td>
        <td>${escapeHtml(h.vehicule_nom || '-')}</td>
        <td style="text-align:right">${h.kilometrage_km.toFixed(1)}</td>
        <td>${escapeHtml(h.note || '-')}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 11px; color: #333; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #007AFF; padding-bottom: 12px; }
    .header h1 { font-size: 18px; color: #007AFF; margin-bottom: 4px; }
    .header p { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #007AFF; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
    tr:nth-child(even) { background: #f9f9f9; }
    .section-title { font-size: 13px; font-weight: bold; color: #007AFF; margin-top: 18px; }
    .totals { margin-top: 16px; text-align: right; }
    .totals p { font-size: 13px; margin-bottom: 4px; }
    .totals .amount { font-size: 18px; font-weight: bold; color: #007AFF; }
    .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Note de Frais Kilom&eacute;triques</h1>
    <p>${escapeHtml(data.nom_utilisateur)}${data.entreprise ? ' - ' + escapeHtml(data.entreprise) : ''}</p>
    <p>${escapeHtml(data.periode)}</p>
  </div>

  <div class="section-title">Trajets</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>D&eacute;part</th>
        <th>Arriv&eacute;e</th>
        <th style="text-align:right">Km</th>
        <th style="text-align:center">A/R</th>
        <th>Motif</th>
        <th style="text-align:right">Montant</th>
      </tr>
    </thead>
    <tbody>
      ${trajetsRows}
    </tbody>
  </table>

  ${data.horodatages.length > 0 ? `
  <div class="section-title">Journal kilom&eacute;trique</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Heure</th>
        <th>V&eacute;hicule</th>
        <th style="text-align:right">Compteur</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${horodatagesRows}
    </tbody>
  </table>
  ` : ''}

  <div class="totals">
    <p>${data.trajets.length} trajet(s) &mdash; ${data.total_km.toFixed(1)} km</p>
    ${data.horodatages.length > 0 ? `<p>${data.horodatages.length} horodatage(s) inclus</p>` : ''}
    <p class="amount">${data.total_eur.toFixed(2)} &euro;</p>
  </div>

  <div class="footer">
    G&eacute;n&eacute;r&eacute; par KiloTrack le ${new Date().toLocaleDateString('fr-FR')}
  </div>
</body>
</html>`;
}

export async function generatePDF(data: RapportData): Promise<string> {
  const html = buildPDFHtml(data);
  const { uri } = await Print.printToFileAsync({ html });

  const filename = `rapport_${data.periode.replace(/\s/g, '_')}.pdf`;
  const destUri = `${documentDirectory}${filename}`;
  await moveAsync({ from: uri, to: destUri });
  return destUri;
}

export async function generateExcel(data: RapportData): Promise<string> {
  const worksheetData = [
    [
      'Date',
      'Départ',
      'Arrivée',
      'Distance (km)',
      'A/R',
      'Motif',
      'Montant (EUR)',
    ],
    ...data.trajets.map((t) => [
      t.date,
      t.adresse_depart,
      t.adresse_arrivee,
      t.distance_km,
      t.aller_retour ? 'Oui' : 'Non',
      t.motif,
      t.montant_eur,
    ]),
    ['', '', 'TOTAL', data.total_km, '', '', data.total_eur],
    [],
    ['Journal kilométrique'],
    ['Date', 'Heure', 'Véhicule', 'Compteur (km)', 'Note'],
    ...data.horodatages.map((h) => [
      h.date,
      h.heure,
      h.vehicule_nom || '',
      h.kilometrage_km,
      h.note,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 30 },
    { wch: 12 },
    { wch: 5 },
    { wch: 25 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Indemnités');

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filename = `rapport_${data.periode.replace(/\s/g, '_')}.xlsx`;
  const destUri = `${documentDirectory}${filename}`;
  await writeAsStringAsync(destUri, base64, {
    encoding: EncodingType.Base64,
  });
  return destUri;
}

export async function shareFile(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage n'est pas disponible sur cet appareil");
  }
  await Sharing.shareAsync(uri);
}
