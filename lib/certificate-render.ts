import { jsPDF } from 'jspdf';
import { reportText } from './pdf-font.ts';
import { qrDataUrl } from './qr-code.ts';
import { CERTIFICATE_TEMPLATES, certificateText, certificateVariables, parseCertificateDesign, validateCertificateBatch, type CertificateDesign, type CertificateImage, type CertificateRecipient } from './certificate.ts';

type Paint = { fill?: string; stroke?: string; strokeWidth?: number };
export type CertificateNode =
  | ({ kind: 'rect'; x: number; y: number; width: number; height: number } & Paint)
  | ({ kind: 'polygon'; points: [number, number][] } & Paint)
  | ({ kind: 'circle'; x: number; y: number; radius: number } & Paint)
  | { kind: 'line'; x: number; y: number; x2: number; y2: number; stroke: string; strokeWidth: number }
  | { kind: 'text'; x: number; y: number; text: string; size: number; color: string; align: 'center' | 'left'; family: string }
  | { kind: 'image'; x: number; y: number; width: number; height: number; data: string; format?: 'PNG' | 'GIF' };
export type CertificateScene = { width: 297; height: 210; nodes: CertificateNode[] };
const FONT = 'TelaahCertificate';
const MM_PER_PT = 25.4 / 72;

function documentWithFont(fontBase64: string): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS('CertificateSans.ttf', fontBase64);
  doc.addFont('CertificateSans.ttf', FONT, 'normal');
  doc.setFont(FONT, 'normal');
  return doc;
}

function layout(doc: jsPDF, design: CertificateDesign, recipient: CertificateRecipient, index: number): CertificateScene {
  const nodes: CertificateNode[] = [];
  const { ink, accent, template } = design;
  const paper = CERTIFICATE_TEMPLATES.find(item => item.id === template)!.paper;
  const family = design.fontFamily === 'serif' ? 'times' : design.fontFamily === 'mono' ? 'courier' : FONT;
  const rect = (x: number, y: number, width: number, height: number, fill?: string, stroke?: string, strokeWidth = 0.3) => nodes.push({ kind: 'rect', x, y, width, height, fill, stroke, strokeWidth });
  const line = (x: number, y: number, x2: number, y2: number, stroke: string, strokeWidth = 0.3) => nodes.push({ kind: 'line', x, y, x2, y2, stroke, strokeWidth });
  const polygon = (points: [number, number][], fill: string) => nodes.push({ kind: 'polygon', points, fill });
  rect(0, 0, 297, 210, paper);
  if (design.background) nodes.push({ kind: 'image', x: 0, y: 0, width: 297, height: 210, data: design.background.data, format: 'PNG' });
  if (!design.useTemplateFrame) {
    // A custom full-page background can stand on its own without preset ornaments.
  } else if (template === 'gold') {
    rect(8, 8, 281, 194, undefined, accent, 0.65);
    rect(11, 11, 275, 188, undefined, accent, 0.2);
    for (const [x, y, dx, dy] of [[8, 8, 1, 1], [289, 8, -1, 1], [8, 202, 1, -1], [289, 202, -1, -1]]) {
      polygon([[x, y], [x + dx * 24, y], [x, y + dy * 24]], ink);
      line(x + dx * 4, y + dy * 17, x + dx * 17, y + dy * 4, accent, 0.7);
    }
    line(128, 75, 169, 75, accent, 0.35);
  } else if (template === 'blue') {
    rect(0, 0, 12, 210, ink);
    polygon([[12, 0], [55, 0], [12, 43]], accent);
    polygon([[297, 210], [245, 210], [297, 158]], ink);
    polygon([[297, 190], [277, 210], [266, 210], [297, 179]], accent);
    line(29, 14, 278, 14, accent, 0.6);
    line(29, 200.5, 242, 200.5, accent, 0.3);
  } else if (template === 'green') {
    rect(10, 10, 277, 190, undefined, accent, 0.35);
    for (const [x, y, dx, dy] of [[13, 16, 1, 1], [284, 194, -1, -1]]) {
      line(x, y, x + dx * 28, y + dy * 25, accent, 0.45);
      for (let leaf = 0; leaf < 5; leaf++) {
        const lx = x + dx * leaf * 5, ly = y + dy * leaf * 4.5;
        polygon([[lx, ly], [lx + dx * 2, ly - dy * 7], [lx + dx * 7, ly - dy * 3], [lx + dx * 5, ly + dy * 4]], accent);
      }
    }
    line(115, 76, 182, 76, accent, 0.4);
  } else if (template === 'minimal') {
    rect(11, 11, 275, 188, undefined, ink, 0.25);
    rect(11, 11, 50, 2, accent);
    rect(236, 197, 50, 2, accent);
    line(131, 75, 166, 75, accent, 0.6);
  } else if (template === 'academic') {
    rect(8, 8, 281, 194, undefined, ink, 0.8);
    rect(12, 12, 273, 186, undefined, accent, 0.25);
    rect(18, 18, 261, 3, ink);
    for (const x of [21, 276]) {
      nodes.push({ kind: 'circle', x, y: 21, radius: 3.1, fill: accent });
      nodes.push({ kind: 'circle', x, y: 189, radius: 3.1, fill: accent });
    }
    line(118, 75, 179, 75, accent, 0.5);
  } else if (template === 'executive') {
    rect(7, 7, 283, 196, undefined, accent, 0.55);
    rect(11, 11, 275, 188, undefined, accent, 0.16);
    polygon([[0, 0], [72, 0], [0, 38]], accent);
    polygon([[297, 210], [225, 210], [297, 172]], accent);
    line(111, 75, 186, 75, accent, 0.55);
    for (const x of [18, 279]) for (const y of [55, 155]) nodes.push({ kind: 'circle', x, y, radius: 1.2, fill: accent });
  } else if (template === 'teal') {
    rect(0, 0, 20, 210, ink);
    rect(20, 0, 5, 210, accent);
    rect(272, 0, 25, 210, '#dff3ef');
    polygon([[272, 0], [297, 0], [297, 35]], accent);
    polygon([[272, 210], [297, 175], [297, 210]], ink);
    line(105, 75, 192, 75, accent, 0.55);
  } else if (template === 'purple') {
    rect(9, 9, 279, 192, undefined, ink, 0.45);
    rect(13, 13, 271, 184, undefined, accent, 0.22);
    polygon([[9, 9], [68, 9], [9, 45]], ink);
    polygon([[288, 201], [229, 201], [288, 165]], ink);
    polygon([[9, 9], [45, 9], [9, 30]], accent);
    polygon([[288, 201], [252, 201], [288, 180]], accent);
    line(121, 75, 176, 75, accent, 0.5);
  } else if (template === 'coral') {
    nodes.push({ kind: 'circle', x: 18, y: 18, radius: 30, fill: '#f6c8be' });
    nodes.push({ kind: 'circle', x: 286, y: 197, radius: 33, fill: '#f2b4aa' });
    nodes.push({ kind: 'circle', x: 280, y: 25, radius: 12, fill: accent });
    polygon([[0, 185], [0, 210], [49, 210]], ink);
    rect(11, 11, 275, 188, undefined, accent, 0.25);
    line(124, 75, 173, 75, accent, 0.75);
  } else if (template === 'tech') {
    rect(8, 8, 281, 194, undefined, accent, 0.35);
    rect(12, 12, 273, 186, undefined, ink, 0.18);
    for (const side of [1, -1]) {
      const x = side === 1 ? 8 : 289;
      line(x, 38, x + side * 22, 38, accent, 0.65);
      line(x + side * 22, 38, x + side * 22, 55, accent, 0.65);
      line(x, 171, x + side * 22, 171, accent, 0.65);
      line(x + side * 22, 171, x + side * 22, 154, accent, 0.65);
      nodes.push({ kind: 'circle', x: x + side * 22, y: 55, radius: 1.5, fill: accent });
      nodes.push({ kind: 'circle', x: x + side * 22, y: 154, radius: 1.5, fill: accent });
    }
    line(112, 75, 185, 75, accent, 0.55);
  } else if (template === 'monochrome') {
    rect(8, 8, 281, 194, undefined, ink, 0.8);
    rect(13, 13, 271, 184, undefined, ink, 0.15);
    rect(37, 48, 5, 22, ink);
    rect(255, 48, 5, 22, ink);
    line(118, 75, 179, 75, ink, 0.8);
  } else {
    rect(10, 10, 277, 190, undefined, accent, 0.4);
    for (const [x, y, color] of [[17, 19, ink], [30, 12, accent], [280, 191, ink], [267, 198, accent]] as const) {
      polygon([[x - 9, y], [x, y - 9], [x + 9, y], [x, y + 9]], color);
    }
    for (const [x, y] of [[48, 20], [249, 190], [268, 38], [29, 172]] as const) nodes.push({ kind: 'circle', x, y, radius: 2.5, fill: accent });
    line(116, 75, 181, 75, accent, 0.65);
  }

  const variables = certificateVariables(design, recipient, index);
  function text(value: string, label: string, x: number, y: number, width: number, height: number, maximum: number, minimum: number, color = ink) {
    if (!value.trim()) return;
    maximum *= design.fontScale; minimum *= Math.min(1, design.fontScale);
    const printable = value.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    if (reportText(printable) !== printable) throw new Error(`${label}: sebagian karakter belum didukung font sertifikat. Sesuaikan karakter tersebut sebelum mengunduh.`);
    let lines: string[] = [], size = maximum, lineHeight = 0, totalHeight = 0;
    while (size >= minimum) {
      doc.setFont(family, 'normal').setFontSize(size);
      lines = doc.splitTextToSize(printable, width);
      lineHeight = size * MM_PER_PT * 1.25;
      totalHeight = (lines.length - 1) * lineHeight + size * MM_PER_PT;
      if (totalHeight <= height && lines.every(part => doc.getTextWidth(part) <= width + 0.1)) break;
      size -= 0.5;
    }
    if (size < minimum) throw new Error(`${label} terlalu panjang untuk template. Persingkat teks agar tetap terbaca.`);
    const baseline = y + (height - totalHeight) / 2 + size * MM_PER_PT * 0.8;
    lines.forEach((part, n) => nodes.push({ kind: 'text', x: x + width / 2, y: baseline + n * lineHeight, text: part, size, color, align: 'center', family }));
  }
  function image(source: CertificateImage | null, cx: number, y: number, boxWidth: number, boxHeight: number) {
    if (!source) return;
    const ratio = Math.min(boxWidth / source.width, boxHeight / source.height);
    const width = source.width * ratio, height = source.height * ratio;
    nodes.push({ kind: 'image', x: cx - width / 2, y: y + (boxHeight - height) / 2, width, height, data: source.data });
  }
  if (design.logo1 && design.logo2) {
    image(design.logo1, 127.5, 15, 31, 20); image(design.logo2, 169.5, 15, 31, 20);
  } else image(design.logo1 || design.logo2, 148.5, 15, 45, 20);
  if (recipient.verificationUrl) {
    nodes.push({ kind: 'image', x: 263, y: 17, width: 19, height: 19, data: qrDataUrl(recipient.verificationUrl, 3, 4), format: 'GIF' });
    text('VERIFIKASI', 'Label QR', 260, 36.5, 25, 4, 5.5, 5, ink);
  }
  const expand = (value: string) => certificateText(value, variables);
  text(expand(design.organizer), 'Penyelenggara', 41, 38, 215, 9, 12, 9);
  text(expand(design.title), 'Judul', 36, 50, 225, 17, 32, 19);
  text(expand(design.subtitle), 'Subjudul', 43, 68, 211, 7, 11, 8, accent);
  text(variables.nomor, 'Nomor sertifikat', 43, 78, 211, 6, 8.5, 7);
  text(expand(design.introduction), 'Pengantar nama', 43, 88, 211, 7, 10.5, 8.5);
  text(recipient.name, 'Nama penerima', 37, 99 + design.nameOffsetY, 223, 19, 27, 15);
  line(82, 120 + design.nameOffsetY, 215, 120 + design.nameOffsetY, accent, 0.35);
  if (design.showGroup) text(recipient.group, 'Grup penerima', 43, 122 + design.nameOffsetY, 211, 6, 9, 7.5);
  text(expand(design.body), 'Isi sertifikat', 42, 132 + design.bodyOffsetY, 213, 24, 11, 8.5);
  text(expand(design.dateLine), 'Tempat dan tanggal', 43, 158 + design.bodyOffsetY, 211, 7, 9, 7.5);
  const signers = [
    { name: design.signer1, role: design.role1, image: design.signature1 },
    { name: design.signer2, role: design.role2, image: design.signature2 },
  ].filter(signer => signer.name.trim() || signer.role.trim() || signer.image);
  signers.forEach((signer, n) => {
    const cx = signers.length === 1 ? 148.5 : n === 0 ? 87 : 210;
    image(signer.image, cx, 167 + design.signatureOffsetY, 49, 13);
    text(expand(signer.name), `Nama penandatangan ${n + 1}`, cx - 46, 181 + design.signatureOffsetY, 92, 7, 10, 7);
    line(cx - 24, 188 + design.signatureOffsetY, cx + 24, 188 + design.signatureOffsetY, accent, 0.2);
    text(expand(signer.role), `Jabatan ${n + 1}`, cx - 46, 189 + design.signatureOffsetY, 92, 5, 8, 6.5);
  });
  // Keep the footer inside the innermost border and below the signature roles.
  text(expand(design.footer), 'Catatan bawah', 45, 195 + design.signatureOffsetY, 207, 3, 6.5, 6);
  return { width: 297, height: 210, nodes };
}

function drawScene(doc: jsPDF, scene: CertificateScene) {
  for (const node of scene.nodes) {
    if (node.kind === 'text') {
      doc.setFont(node.family, 'normal').setFontSize(node.size).setTextColor(node.color);
      doc.text(node.text, node.x, node.y, { align: node.align });
    } else if (node.kind === 'image') {
      doc.addImage(node.data, node.format ?? 'PNG', node.x, node.y, node.width, node.height);
    } else if (node.kind === 'line') {
      doc.setDrawColor(node.stroke).setLineWidth(node.strokeWidth); doc.line(node.x, node.y, node.x2, node.y2);
    } else {
      if (node.fill) doc.setFillColor(node.fill);
      if (node.stroke) doc.setDrawColor(node.stroke).setLineWidth(node.strokeWidth ?? 0.3);
      const style = node.fill && node.stroke ? 'FD' : node.fill ? 'F' : 'S';
      if (node.kind === 'rect') doc.rect(node.x, node.y, node.width, node.height, style);
      if (node.kind === 'circle') doc.circle(node.x, node.y, node.radius, style);
      if (node.kind === 'polygon') {
        const offsets = node.points.slice(1).map((point, i) => [point[0] - node.points[i][0], point[1] - node.points[i][1]]);
        doc.lines(offsets, node.points[0][0], node.points[0][1], [1, 1], style, true);
      }
    }
  }
}

export function previewCertificate(design: CertificateDesign, recipient: CertificateRecipient, index: number, fontBase64: string): CertificateScene {
  return layout(documentWithFont(fontBase64), parseCertificateDesign(design), recipient, index);
}
export async function buildCertificates(design: CertificateDesign, recipients: CertificateRecipient[], fontBase64: string, onProgress?: (done: number) => void): Promise<jsPDF> {
  const valid = parseCertificateDesign(design);
  validateCertificateBatch(valid, recipients);
  const doc = documentWithFont(fontBase64);
  doc.setProperties({ title: `${valid.title} - ${valid.event}`, author: valid.organizer, creator: 'Telaah', subject: 'Sertifikat' });
  for (let index = 0; index < recipients.length; index++) {
    if (index) doc.addPage();
    try { drawScene(doc, layout(doc, valid, recipients[index], index)); }
    catch (error) { throw new Error(`${recipients[index].name}: ${error instanceof Error ? error.message : 'Sertifikat tidak dapat dibuat.'}`); }
    onProgress?.(index + 1);
    if ((index + 1) % 5 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return doc;
}
