export type CertificateTemplate = 'gold' | 'blue' | 'green' | 'minimal' | 'academic' | 'executive' | 'teal' | 'purple' | 'coral' | 'tech' | 'monochrome' | 'celebration';
export type CertificateImage = { data: string; width: number; height: number };
export type CertificateRecipient = { id: string; name: string; group: string; email?: string; verificationUrl?: string; certificateId?: string };
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
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Pengaturan tata letak tidak valid.');
    if (key === 'fontScale' && (value < 0.8 || value > 1.2)) throw new Error('Skala huruf harus 80–120%.');
    if (key !== 'fontScale' && (value < -12 || value > 12)) throw new Error('Offset tata letak harus -12 sampai 12.');
    Object.assign(design, { [key]: value });
  }
  design.useTemplateFrame = typeof data.useTemplateFrame === 'boolean' ? data.useTemplateFrame : true;
  for (const key of IMAGE_KEYS) design[key] = parseImage(data[key] ?? null);
  return design;
}

export async function loadCertificateImage(file: File): Promise<CertificateImage> {
  if (file.size > 2 * 1024 * 1024) throw new Error('Gambar maksimal 2 MB.');
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Gunakan gambar PNG atau JPEG.');
  const bitmap = await createImageBitmap(file); const ratio = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio)), height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Browser tidak mendukung konversi gambar.');
  context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  return { data: canvas.toDataURL('image/png'), width, height };
}

export async function decodeCertificateImage(data: string): Promise<void> {
  const response = await fetch(data); const blob = await response.blob(); const bitmap = await createImageBitmap(blob); bitmap.close();
}

export function certificateVariables(design: CertificateDesign, recipient: CertificateRecipient, index: number) {
  const order = design.startNumber + index;
  const date = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${design.date}T12:00:00`));
  const values: Record<string, string> = { nama: recipient.name, grup: recipient.group, acara: design.event, penyelenggara: design.organizer, tanggal: date, tempat: design.place, tahun: design.date.slice(0, 4), urutan: String(order).padStart(4, '0'), nomor: '' };
  values.nomor = certificateText(design.numberPattern, values);
  return values;
}

export function certificateText(value: string, variables: Record<string, string>): string {
  return value.replace(/\{([^{}]+)\}/g, (match, raw) => VARIABLES.has(String(raw).toLowerCase()) ? variables[String(raw).toLowerCase()] ?? '' : match);
}

export function manualCertificateRecipients(value: string): CertificateRecipient[] {
  return value.split(/\r?\n/).map((line, index) => {
    const [name = '', group = '', email = ''] = line.split(/\t|\s*\|\s*/);
    return { id: `manual-${index}`, name: name.trim(), group: group.trim(), email: email.trim() };
  }).filter(item => item.name);
}

export function validateCertificateBatch(design: CertificateDesign, recipients: CertificateRecipient[]) {
  if (!recipients.length) throw new Error('Tambahkan sedikitnya satu penerima sertifikat.');
  if (recipients.length > CERTIFICATE_LIMIT) throw new Error(`Maksimal ${CERTIFICATE_LIMIT} penerima per proses.`);
  if (!design.organizer.trim() || !design.title.trim() || !design.event.trim()) throw new Error('Penyelenggara, judul, dan nama kegiatan wajib diisi.');
  if (recipients.some(item => !item.name.trim())) throw new Error('Ada nama penerima yang kosong.');
  if (design.startNumber + recipients.length - 1 > 999999) throw new Error('Rentang nomor sertifikat melewati batas 999999.');
}
