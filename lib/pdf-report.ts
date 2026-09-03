import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { MODEL_NOTE, type Reviewed, type TextAnalysis } from './analysis.ts';
import { PDF_FONT_RANGES } from './pdf-font-coverage.ts';

type ReportOptions = { date?: Date; fontBase64: string };
export type BatchReportOptions = ReportOptions & {
  totalRows: number;
  sourceName: string;
  query: string;
  filterLabel: string;
  sortLabel: string;
};

const FONT = 'TelaahSans';
const NAVY: [number, number, number] = [19, 37, 65];
const MUTED: [number, number, number] = [82, 98, 120];
const AUTHORSHIP = 'Status AI: tidak dapat ditentukan. Pola bahasa dan duplikasi bukan bukti penggunaan AI.';
const INTERPRETATION = 'Tidak ada peringkat kualitas atau penilaian kejujuran. Teks pendek, nada kritis, dan durasi tidak digunakan untuk menyimpulkan penggunaan AI.';
let fontPromise: Promise<string> | undefined;

/** Only the public font asset is fetched; response content stays in the browser. */
export function loadReportFont(): Promise<string> {
  fontPromise ??= fetch('/fonts/DejaVuSans.ttf').then(async response => {
    if (!response.ok) throw new Error('Font laporan gagal dimuat. Periksa koneksi dan coba lagi.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  }).catch(error => {
    fontPromise = undefined;
    throw error;
  });
  return fontPromise;
}

/** Unsupported glyphs retain a readable, reversible codepoint instead of disappearing. */
export function reportText(value: string): string {
  return Array.from(value.replace(/\r\n?/g, '\n').replace(/\t/g, '    '), char => {
    const point = char.codePointAt(0)!;
    if (char === '\n' || PDF_FONT_RANGES.some(([start, end]) => point >= start && point <= end)) return char;
    return `[U+${point.toString(16).toUpperCase().padStart(4, '0')}]`;
  }).join('');
}

function report(orientation: 'portrait' | 'landscape', title: string, options: ReportOptions) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS('TelaahSans.ttf', options.fontBase64);
  doc.addFont('TelaahSans.ttf', FONT, 'normal');
  doc.setFont(FONT, 'normal');
  doc.setProperties({ title, author: 'Telaah', subject: 'Tinjauan pola bahasa dan duplikasi', creator: 'Telaah' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 17;
  let y = 20;
  let encodedGlyph = false;
  function clean(value: string) {
    const cleaned = reportText(value);
    if (cleaned !== value.replace(/\r\n?/g, '\n').replace(/\t/g, '    ')) encodedGlyph = true;
    return cleaned;
  }
  function paragraph(value: string, size = 9, color = MUTED, gap = 3) {
    doc.setFont(FONT, 'normal').setFontSize(size).setTextColor(...color);
    const lines: string[] = doc.splitTextToSize(clean(value), width - margin * 2);
    const lineHeight = size * 0.3528 * 1.5;
    for (const line of lines) {
      if (y + lineHeight > height - 23) { doc.addPage(); y = 23; }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += gap;
  }
  function section(value: string) {
    if (y + 22 > height - 23) { doc.addPage(); y = 23; }
    y += 3;
    paragraph(value, 12, NAVY, 3);
  }
  paragraph('TELAAH / LAPORAN PEMERIKSAAN', 9, [46, 90, 170], 3);
  paragraph(title, 21, NAVY, 4);
  const stamp = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long', timeStyle: 'long',
  }).format(options.date ?? new Date());
  paragraph(`Dibuat: ${stamp}`, 8, MUTED, 5);

  function finish() {
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      doc.setFont(FONT, 'normal');
      if (page > 1) {
        doc.setFontSize(8).setTextColor(...MUTED);
        doc.text(`TELAAH / ${title}`, margin, 12);
      }
      doc.setDrawColor(216, 224, 236).setLineWidth(0.25);
      doc.line(margin, height - 18, width - margin, height - 18);
      doc.setFontSize(7).setTextColor(...MUTED);
      doc.text('Bahan peninjauan. Bukan vonis AI atau nilai peserta.', margin, height - 13);
      doc.text(`${page} / ${pages}`, width - margin, height - 13, { align: 'right' });
      if (encodedGlyph) doc.text('Karakter di luar cakupan font ditulis sebagai kode [U+XXXX].', margin, height - 8);
    }
    return doc;
  }
  return { doc, clean, paragraph, section, finish, position: () => y, margin };
}

export function buildTextReport(text: string, result: TextAnalysis, options: ReportOptions): jsPDF {
  const pdf = report('portrait', 'Laporan pemeriksaan teks', options);
  pdf.paragraph(result.label, 12, NAVY);
  pdf.paragraph(`${result.words.toLocaleString('id-ID')} kata   |   ${result.characters.toLocaleString('id-ID')} karakter   |   ${result.sentences} kalimat*   |   ${result.signals.length} pola ditandai`);
  pdf.paragraph(AUTHORSHIP);
  if (result.limited) pdf.paragraph('Konteks terbatas: teks di bawah 80 kata. Jawaban singkat tidak otomatis buruk atau buatan AI.');
  pdf.section('Alasan yang bisa diperiksa');
  if (!result.signals.length) pdf.paragraph('Belum ada aturan yang cocok. Ini tidak membuktikan bahwa teks ditulis manusia. Tanyakan pengalaman konkret dan proses penulisan kepada penulis.');
  for (const [index, signal] of result.signals.entries()) {
    pdf.section(`${index + 1}. ${signal.title}`);
    pdf.paragraph(signal.explanation);
    for (const evidence of signal.evidence) pdf.paragraph(`Kutipan: “${evidence}”`, 9, NAVY);
    pdf.paragraph(`Batas interpretasi: ${signal.caution}`, 8);
  }
  pdf.section('Metode dan batasan');
  pdf.paragraph(MODEL_NOTE);
  pdf.paragraph(INTERPRETATION);
  pdf.paragraph('* Kalimat dihitung dari tanda baca. Laporan dibuat di perangkat pengguna.');
  pdf.section('Teks yang diperiksa');
  pdf.paragraph(text, 9, NAVY);
  return pdf.finish();
}

/** Call with the sorted row model, before pagination, to preserve the active table view. */
export function buildBatchReport(rows: Reviewed[], options: BatchReportOptions): jsPDF {
  const pdf = report('landscape', 'Laporan respons peserta', options);
  pdf.paragraph(`Sumber: ${options.sourceName || 'File peserta'}`);
  pdf.paragraph(`Cakupan: ${rows.length.toLocaleString('id-ID')} dari ${options.totalRows.toLocaleString('id-ID')} respons dalam file. Seluruh hasil yang cocok disertakan, termasuk halaman tabel berikutnya.`);
  pdf.paragraph(`Pencarian nama/grup: ${options.query || 'Tidak ada'}   |   Filter: ${options.filterLabel}   |   Urutan: ${options.sortLabel}`);
  pdf.paragraph(`${rows.filter(row => row.analysis.signals.length > 0).length.toLocaleString('id-ID')} respons dengan pola ditandai   |   ${rows.filter(row => row.exactCount > 1).length.toLocaleString('id-ID')} respons dalam kelompok identik   |   ${rows.filter(row => row.analysis.limited).length.toLocaleString('id-ID')} teks di bawah 80 kata`, 10, NAVY);
  pdf.paragraph(AUTHORSHIP);
  pdf.paragraph(MODEL_NOTE, 8);
  pdf.paragraph(INTERPRETATION, 8);
  pdf.paragraph('Kolom identik menghitung pasangan jawaban sama persis pada seluruh file sebelum filter, termasuk peserta tersebut. Nilai 1: tidak ada peserta lain yang cocok; 0: teks kosong. Tidak mencakup kemiripan makna. Nomor baris bukan peringkat.', 8);
  autoTable(pdf.doc, {
    startY: pdf.position() + 2,
    margin: { top: 22, right: pdf.margin, bottom: 23, left: pdf.margin },
    head: [['No.', 'Nama / grup', 'Kata', 'Pola yang ditandai', 'Pasangan\nidentik', 'Catatan']],
    body: rows.map((row, index) => [
      String(index + 1),
      pdf.clean(`${row.name}${row.group ? `\n${row.group}` : ''}`),
      row.analysis.words.toLocaleString('id-ID'),
      pdf.clean(row.analysis.signals.map(signal => signal.title).join('; ') || 'Belum ada pola ditandai'),
      `${row.exactCount.toLocaleString('id-ID')} peserta`,
      pdf.clean([
        row.analysis.limited ? 'Konteks teks terbatas (<80 kata).' : '',
        row.exactCount > 1 ? 'Ada pasangan jawaban identik dalam file.' : '',
        'Status AI tidak dapat ditentukan.',
      ].filter(Boolean).join(' ')),
    ]),
    theme: 'grid',
    styles: { font: FONT, fontStyle: 'normal', fontSize: 8, cellPadding: 3, overflow: 'linebreak', valign: 'top', lineColor: [223, 229, 239], lineWidth: 0.15, textColor: NAVY },
    headStyles: { font: FONT, fontStyle: 'normal', fillColor: NAVY, textColor: [255, 255, 255], cellPadding: 3 },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 60 }, 2: { cellWidth: 18, halign: 'right' }, 3: { cellWidth: 68 }, 4: { cellWidth: 25 }, 5: { cellWidth: 'auto' } },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
  });
  return pdf.finish();
}

export function reportFilename(kind: 'teks' | 'peserta', date = new Date()): string {
  const stamp = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  return `laporan-telaah-${kind}-${stamp}.pdf`;
}
