export type CertificateTemplate = 'gold' | 'blue' | 'green' | 'minimal' | 'academic' | 'executive' | 'teal' | 'purple' | 'coral' | 'tech' | 'monochrome' | 'celebration';
export type CertificateImage = { data: string; width: number; height: number };
export type CertificateRecipient = { id: string; name: string; group: string; email?: string; verificationUrl?: string };
export type CertificateDesign = {
  version: 1;
  template: CertificateTemplate;
  ink: string;
  accent: string;
  organizer: string;
  title: string;
  subtitle: string;
  introduction: string;
  event: string;
  body: string;
  numberPattern: string;
  startNumber: number;
  date: string;
  place: string;
  dateLine: string;
  signer1: string;
  role1: string;
  signer2: string;
  role2: string;
  footer: string;
  showGroup: boolean;
  fontFamily: 'sans' | 'serif' | 'mono';
  fontScale: number;
  nameOffsetY: number;
  bodyOffsetY: number;
  signatureOffsetY: number;
  useTemplateFrame: boolean;
  background: CertificateImage | null;
  logo1: CertificateImage | null;
  logo2: CertificateImage | null;
  signature1: CertificateImage | null;
  signature2: CertificateImage | null;
};
export const CERTIFICATE_LIMIT = 200;
export const CERTIFICATE_TEMPLATES = [
  { id: 'gold', name: 'Klasik Emas', description: 'Bingkai ganda, navy dan emas', ink: '#18304e', accent: '#b08a42', paper: '#fffdf7' },
  { id: 'blue', name: 'Modern Biru', description: 'Bidang geometris yang tegas', ink: '#17375b', accent: '#3978bf', paper: '#ffffff' },
  { id: 'green', name: 'Elegan Hijau', description: 'Ornamen daun dan warna hangat', ink: '#24493e', accent: '#819a64', paper: '#fafbf5' },
  { id: 'minimal', name: 'Minimal', description: 'Tipografi bersih, aksen sederhana', ink: '#292929', accent: '#606060', paper: '#ffffff' },
  { id: 'academic', name: 'Akademik Merah', description: 'Formal, berwibawa, dan klasik', ink: '#641c2f', accent: '#c39a4a', paper: '#fffaf0' },
  { id: 'executive', name: 'Eksekutif Navy', description: 'Latar gelap premium dengan emas', ink: '#f8f3e7', accent: '#d5ad55', paper: '#10243f' },
  { id: 'teal', name: 'Profesional Teal', description: 'Segar, korporat, dan terpercaya', ink: '#183e46', accent: '#31a6a0', paper: '#f8fcfb' },
  { id: 'purple', name: 'Royal Ungu', description: 'Mewah dengan komposisi simetris', ink: '#3f285d', accent: '#9d78c5', paper: '#fdfaff' },
  { id: 'coral', name: 'Kreatif Coral', description: 'Hangat, ekspresif, dan modern', ink: '#49333d', accent: '#e77f70', paper: '#fff9f7' },
  { id: 'tech', name: 'Teknologi', description: 'Garis digital untuk acara inovasi', ink: '#173653', accent: '#2a9fd6', paper: '#f7fbff' },
  { id: 'monochrome', name: 'Monokrom', description: 'Hitam putih yang tegas dan bersih', ink: '#222222', accent: '#777777', paper: '#ffffff' },
  { id: 'celebration', name: 'Perayaan', description: 'Dinamis untuk penghargaan spesial', ink: '#502b4f', accent: '#e39b4a', paper: '#fffaf3' },
] as const;

export function defaultCertificateDesign(date = new Date()): CertificateDesign {
  const iso = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  return {
    version: 1, template: 'gold', ink: '#18304e', accent: '#b08a42', organizer: 'NAMA PENYELENGGARA',
    title: 'SERTIFIKAT', subtitle: 'APRESIASI', introduction: 'Diberikan kepada', event: 'Refleksi Podcast',
    body: 'Atas partisipasi dan kontribusinya dalam kegiatan {acara} yang diselenggarakan oleh {penyelenggara} pada {tanggal}.',
    numberPattern: 'Nomor: CERT/{tahun}/{urutan}', startNumber: 1, date: iso, place: 'Jakarta', dateLine: '{tempat}, {tanggal}',
    signer1: 'Nama penandatangan', role1: 'Jabatan', signer2: '', role2: '', footer: '', showGroup: true,
    fontFamily: 'sans', fontScale: 1, nameOffsetY: 0, bodyOffsetY: 0, signatureOffsetY: 0, useTemplateFrame: true,
    background: null, logo1: null, logo2: null, signature1: null, signature2: null,
  };
}

export const CERTIFICATE_FIELDS: { key: keyof CertificateDesign; label: string; max: number }[] = [
  { key: 'organizer', label: 'Penyelenggara', max: 180 }, { key: 'title', label: 'Judul', max: 70 },
  { key: 'subtitle', label: 'Subjudul', max: 100 }, { key: 'introduction', label: 'Pengantar nama', max: 100 },
  { key: 'event', label: 'Nama kegiatan', max: 220 }, { key: 'body', label: 'Isi sertifikat', max: 900 },
  { key: 'numberPattern', label: 'Pola nomor', max: 120 }, { key: 'place', label: 'Tempat', max: 80 },
  { key: 'dateLine', label: 'Baris tempat/tanggal', max: 140 }, { key: 'signer1', label: 'Penandatangan 1', max: 100 },
  { key: 'role1', label: 'Jabatan 1', max: 100 }, { key: 'signer2', label: 'Penandatangan 2', max: 100 },
  { key: 'role2', label: 'Jabatan 2', max: 100 }, { key: 'footer', label: 'Catatan bawah', max: 160 },
];
const IMAGE_KEYS = ['background', 'logo1', 'logo2', 'signature1', 'signature2'] as const;
const VARIABLES = new Set(['nama', 'grup', 'acara', 'penyelenggara', 'tanggal', 'tempat', 'nomor', 'tahun', 'urutan']);

export function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 24 || ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte) || String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') throw new Error('Gambar PNG tidak valid.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16), height = view.getUint32(20);
  if (!width || !height || width > 4096 || height > 4096 || width * height > 16000000) throw new Error('Dimensi gambar terlalu besar.');
  return { width, height };
}

function parseImage(value: unknown): CertificateImage | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object') throw new Error('Gambar dalam desain tidak valid.');
  const image = value as Record<string, unknown>;
  if (typeof image.data !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image.data) || image.data.length > 2800000) throw new Error('Desain hanya menerima gambar PNG tersemat, maksimal 2 MB.');
  const bytes = Uint8Array.from(atob(image.data.slice(image.data.indexOf(',') + 1)), char => char.charCodeAt(0));
  const dimensions = pngDimensions(bytes);
  if (image.width !== dimensions.width || image.height !== dimensions.height) throw new Error('Ukuran gambar dalam desain tidak sesuai.');
  return { data: image.data, ...dimensions };
}

/** Whitelist the design schema when reopening a user-saved JSON file. */
export function parseCertificateDesign(value: unknown): CertificateDesign {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('File bukan desain sertifikat yang valid.');
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || !CERTIFICATE_TEMPLATES.some(template => template.id === data.template)) throw new Error('Versi atau template desain belum didukung.');
  const design = defaultCertificateDesign();
  design.template = data.template as CertificateTemplate;
  for (const key of ['ink', 'accent'] as const) {
    if (typeof data[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(data[key])) throw new Error('Warna desain harus berupa kode hex 6 digit.');
    design[key] = data[key];
  }
  for (const field of CERTIFICATE_FIELDS) {
    if (typeof data[field.key] !== 'string' || (data[field.key] as string).length > field.max) throw new Error(`${field.label} tidak valid atau terlalu panjang (maks. ${field.max} karakter).`);
    Object.assign(design, { [field.key]: data[field.key] });
  }
  if (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(new Date(`${data.date}T12:00:00Z`).getTime()) || new Date(`${data.date}T12:00:00Z`).toISOString().slice(0, 10) !== data.date) throw new Error('Tanggal sertifikat tidak valid.');
  if (!Number.isInteger(data.startNumber) || Number(data.startNumber) < 1 || Number(data.startNumber) > 999999) throw new Error('Nomor awal harus 1–999999.');
  if (typeof data.showGroup !== 'boolean') throw new Error('Pengaturan grup tidak valid.');
  design.date = data.date; design.startNumber = Number(data.startNumber); design.showGroup = data.showGroup;
  if (!['sans', 'serif', 'mono'].includes(String(data.fontFamily ?? 'sans'))) throw new Error('Gaya font tidak didukung.');
  design.fontFamily = (data.fontFamily ?? 'sans') as CertificateDesign['fontFamily'];
  for (const key of ['fontScale', 'nameOffsetY', 'bodyOffsetY', 'signatureOffsetY'] as const) {
    const fallback = design[key]; const value = data[key] ?? fallback;
    const [minimum, maximum] = key === 'fontScale' ? [0.8, 1.2] : [-12, 12];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw new Error('Pengaturan tata letak tidak valid.');
    design[key] = value;
  }
  if (data.useTemplateFrame !== undefined && typeof data.useTemplateFrame !== 'boolean') throw new Error('Pengaturan bingkai tidak valid.');
  design.useTemplateFrame = data.useTemplateFrame ?? true;
  for (const key of IMAGE_KEYS) design[key] = parseImage(data[key]);
  if (!design.title.trim()) throw new Error('Isi judul sertifikat terlebih dahulu.');
  for (const field of CERTIFICATE_FIELDS) {
    const words = (design[field.key] as string).matchAll(/\{([^{}]+)\}/g);
    for (const match of words) if (!VARIABLES.has(match[1])) throw new Error(`Variabel {${match[1]}} pada ${field.label} tidak dikenal.`);
  }
  if (/\{(?!tahun\}|urutan\})[^{}]+\}/.test(design.numberPattern)) throw new Error('Pola nomor hanya mendukung {tahun} dan {urutan}.');
  return design;
}

export function certificateVariables(design: CertificateDesign, recipient: CertificateRecipient, index: number): Record<string, string> {
  const sequence = String(design.startNumber + index).padStart(3, '0');
  const year = design.date.slice(0, 4);
  const number = design.numberPattern.replace(/\{(tahun|urutan)\}/g, (_, key) => key === 'tahun' ? year : sequence);
  return { nama: recipient.name, grup: recipient.group, acara: design.event, penyelenggara: design.organizer, tempat: design.place,
    tanggal: new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${design.date}T12:00:00Z`)),
    tahun: year, urutan: sequence, nomor: number };
}
export function certificateText(text: string, variables: Record<string, string>): string {
  return text.replace(/\{([^{}]+)\}/g, (match, key) => variables[key] ?? match);
}
export function manualCertificateRecipients(text: string): CertificateRecipient[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const recipients = lines.map((line, index) => {
    const parts = line.split('|');
    const email = parts.length > 2 ? parts.pop()!.trim() : '';
    return { id: `manual-${index}`, name: parts.shift()!.trim(), group: parts.join('|').trim(), email };
  });
  validateCertificateRecipients(recipients);
  return recipients;
}
export function validateCertificateRecipients(recipients: CertificateRecipient[]): void {
  if (recipients.length > CERTIFICATE_LIMIT) throw new Error(`Maksimal ${CERTIFICATE_LIMIT} sertifikat per unduhan. Pilih kelompok yang lebih kecil.`);
  for (const row of recipients) {
    if (!row.name.trim() || row.name.length > 180 || row.group.length > 120) throw new Error('Setiap penerima perlu nama (maks. 180 karakter) dan grup maksimal 120 karakter.');
    if (row.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || row.email.length > 254)) throw new Error(`Email ${row.name} tidak valid.`);
  }
}
export function validateCertificateBatch(design: CertificateDesign, recipients: CertificateRecipient[]): void {
  validateCertificateRecipients(recipients);
  if (!recipients.length) throw new Error('Isi atau pilih minimal satu penerima sertifikat.');
  if (design.startNumber + recipients.length - 1 > 999999) throw new Error('Nomor sertifikat terakhir melebihi 999999.');
  if (recipients.length > 1 && design.numberPattern.trim() && !design.numberPattern.includes('{urutan}')) throw new Error('Tambahkan {urutan} pada pola nomor agar setiap sertifikat memiliki nomor berbeda, atau kosongkan pola nomor.');
}

export async function loadCertificateImage(file: File): Promise<CertificateImage> {
  if (file.size > 2 * 1024 * 1024) throw new Error('Gambar maksimal 2 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPNG = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const isJPEG = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!isPNG && !isJPEG) throw new Error('Gunakan gambar dalam format PNG atau JPG.');
  if (isPNG) pngDimensions(bytes);
  const url = URL.createObjectURL(new Blob([bytes], { type: isPNG ? 'image/png' : 'image/jpeg' }));
  try {
    const image = await decodeCertificateImage(url);
    if (image.naturalWidth * image.naturalHeight > 16000000) throw new Error('Resolusi gambar maksimal 16 megapiksel.');
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser tidak dapat memproses gambar.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png');
    if (data.length > 2800000) throw new Error('Gambar terlalu besar setelah diproses. Gunakan logo yang lebih kecil.');
    return { data, width: canvas.width, height: canvas.height };
  } finally { URL.revokeObjectURL(url); }
}
export function decodeCertificateImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image); image.onerror = () => reject(new Error('Gambar tidak dapat dibaca. Gunakan PNG atau JPG yang valid.'));
    image.src = url;
  });
}
