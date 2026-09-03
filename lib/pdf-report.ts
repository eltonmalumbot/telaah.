import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { MODEL_NOTE, type Reviewed, type TextAnalysis } from './analysis.ts';
import { reportText } from './pdf-font.ts';
export { loadReportFont, reportText } from './pdf-font.ts';
import { QUALITY_NOTE, QUALITY_SCOPE, qualityScore, qualityStatus, rankQuality, type QualityAssessment } from './quality.ts';

type ReportOptions = { date?: Date; fontBase64: string; quality?: QualityAssessment | null };
export type BatchReportOptions = ReportOptions & {
  totalRows: number;
  sourceName: string;
  query: string;
  filterLabel: string;
  sortLabel: string;
  rankingCount?: number;
};

const FONT = 'TelaahSans';
const NAVY: [number, number, number] = [19, 37, 65];
const MUTED: [number, number, number] = [82, 98, 120];
const AUTHORSHIP = 'Status AI: tidak dapat ditentukan. Pola bahasa dan duplikasi bukan bukti penggunaan AI.';
const INTERPRETATION = 'Skor kualitas terpisah dari indikasi AI. Teks pendek, nada kritis, dan durasi tidak digunakan untuk menyimpulkan penggunaan AI atau memberi penalti otomatis pada kualitas.';

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
      doc.text('Bahan peninjauan. Bukan vonis AI atau nilai final.', margin, height - 13);
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
  if (options.quality) {
    const quality = options.quality;
    pdf.section(`Kualitas jawaban: ${qualityScore(quality)}/100`);
    pdf.paragraph(`Status: ${qualityStatus(quality)}. Acuan tugas: ${quality.prompt}`);
    pdf.paragraph(QUALITY_NOTE, 8);
    for (const item of quality.criteria) {
      pdf.section(`${item.title}: ${item.level}/4 (bobot 25 poin)`);
      pdf.paragraph(`Saran awal otomatis: ${item.suggestedLevel}/4. ${item.explanation}`, 8);
      for (const quote of item.evidence) pdf.paragraph(`Kutipan saran awal: “${quote}”`, 8, NAVY);
      pdf.paragraph(item.guidance, 8);
    }
    if (quality.reviewerNote) pdf.paragraph(`Catatan reviewer: ${quality.reviewerNote}`, 9, NAVY);
    pdf.paragraph(QUALITY_SCOPE, 8);
  }
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
  const hasQuality = rows.some(row => row.quality);
  const displayRows = hasQuality && options.rankingCount === undefined ? rankQuality(rows) : rows;
  const pdf = report('landscape', 'Laporan respons peserta', options);
  pdf.paragraph(`Sumber: ${options.sourceName || 'File peserta'}`);
  pdf.paragraph(`Cakupan: ${rows.length.toLocaleString('id-ID')} dari ${options.totalRows.toLocaleString('id-ID')} respons dalam file. Seluruh hasil yang cocok disertakan, termasuk halaman tabel berikutnya.`);
  pdf.paragraph(`Pencarian nama/grup: ${options.query || 'Tidak ada'}   |   Filter: ${options.filterLabel}   |   Urutan: ${options.sortLabel}`);
  pdf.paragraph(`${rows.filter(row => row.analysis.signals.length > 0).length.toLocaleString('id-ID')} respons dengan pola ditandai   |   ${rows.filter(row => row.exactCount > 1).length.toLocaleString('id-ID')} respons dalam kelompok identik   |   ${rows.filter(row => row.analysis.limited).length.toLocaleString('id-ID')} teks di bawah 80 kata`, 10, NAVY);
  pdf.paragraph(AUTHORSHIP);
  pdf.paragraph(MODEL_NOTE, 8);
  pdf.paragraph(INTERPRETATION, 8);
  pdf.paragraph('Kolom identik menghitung pasangan jawaban sama persis pada seluruh file sebelum filter, termasuk peserta tersebut. Nilai 1: tidak ada peserta lain yang cocok; 0: teks kosong. Tidak mencakup kemiripan makna. Nomor baris bukan peringkat.', 8);
  if (hasQuality) {
    pdf.paragraph(`Acuan kualitas: ${rows.find(row => row.quality)?.quality?.prompt}`, 9, NAVY);
    pdf.paragraph(QUALITY_NOTE, 8);
    pdf.paragraph(QUALITY_SCOPE, 8);
    pdf.paragraph(`Peringkat kualitas dibandingkan pada ${options.rankingCount ?? rows.filter(row => row.quality).length} respons bernilai dalam filter aktif sebelum pembatasan Top 10. Nilai seri berbagi peringkat dan ikut ditampilkan pada batas Top 10. Skor awal dan koreksi reviewer dibedakan melalui status, tanpa penalti otomatis dari duplikasi. Tingkat tiap aspek di kolom rubrik: 0–4.`, 8);
  }
  const notes = (row: Reviewed) => [
    row.analysis.limited ? 'Konteks teks terbatas (<80 kata).' : '',
    row.exactCount > 1 ? 'Ada pasangan jawaban identik dalam file.' : '',
    'Status AI tidak dapat ditentukan.',
  ].filter(Boolean).join(' ');
  const qualityNotes = (row: Reviewed) => {
    const quality = row.quality;
    if (!quality) return `Kualitas belum dinilai. ${notes(row)}`;
    const levels = quality.criteria.map(item => `${item.title}: ${item.level}/4`).join('; ');
    const evidence = [...new Set(quality.criteria.filter(item => item.id !== 'relevance').flatMap(item => item.evidence))].slice(0, 1);
    return [levels, evidence.length ? `Kutipan saran awal: “${evidence[0].slice(0, 180)}”` : 'Belum ada kutipan yang cocok dengan aturan refleksi, contoh, atau tindakan.', quality.reviewerNote ? `Reviewer: ${quality.reviewerNote}` : ''].filter(Boolean).join('\n');
  };
  autoTable(pdf.doc, {
    startY: pdf.position() + 2,
    margin: { top: 22, right: pdf.margin, bottom: 23, left: pdf.margin },
    head: [hasQuality ? ['No.', 'Peringkat', 'Nama / grup', 'Kata', 'Kualitas\n/100', 'Pola yang ditandai', 'Pasangan\nidentik', 'Rubrik & catatan'] : ['No.', 'Nama / grup', 'Kata', 'Pola yang ditandai', 'Pasangan\nidentik', 'Catatan']],
    body: displayRows.map((row, index) => [
      String(index + 1),
      ...(hasQuality ? [row.qualityRank !== undefined ? String(row.qualityRank) : '—'] : []),
      pdf.clean(`${row.name}${row.group ? `\n${row.group}` : ''}`),
      row.analysis.words.toLocaleString('id-ID'),
      ...(hasQuality ? [row.quality ? `${qualityScore(row.quality)}\n${qualityStatus(row.quality)}` : 'Belum dinilai'] : []),
      pdf.clean(row.analysis.signals.map(signal => signal.title).join('; ') || 'Belum ada pola ditandai'),
      `${row.exactCount.toLocaleString('id-ID')} peserta`,
      pdf.clean(hasQuality ? qualityNotes(row) : notes(row)),
    ]),
    theme: 'grid',
    pageBreak: hasQuality ? 'always' : 'auto',
    styles: { font: FONT, fontStyle: 'normal', fontSize: 8, cellPadding: 3, overflow: 'linebreak', valign: 'top', lineColor: [223, 229, 239], lineWidth: 0.15, textColor: NAVY },
    headStyles: { font: FONT, fontStyle: 'normal', fillColor: NAVY, textColor: [255, 255, 255], cellPadding: 3 },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    columnStyles: hasQuality
      ? { 0: { cellWidth: 12 }, 1: { cellWidth: 22 }, 2: { cellWidth: 38 }, 3: { cellWidth: 14, halign: 'right' }, 4: { cellWidth: 26 }, 5: { cellWidth: 44 }, 6: { cellWidth: 24 }, 7: { cellWidth: 'auto' } }
      : { 0: { cellWidth: 12 }, 1: { cellWidth: 60 }, 2: { cellWidth: 18, halign: 'right' }, 3: { cellWidth: 68 }, 4: { cellWidth: 25 }, 5: { cellWidth: 'auto' } },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
  });
  return pdf.finish();
}

export function reportFilename(kind: 'teks' | 'peserta', date = new Date()): string {
  const stamp = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  return `laporan-telaah-${kind}-${stamp}.pdf`;
}
