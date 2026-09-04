import { readFileSync, writeFileSync } from 'node:fs';
import { defaultCertificateDesign } from '../lib/certificate.ts';
import { buildCertificates } from '../lib/certificate-render.ts';
import { issueCertificates } from '../lib/certificate-identity.ts';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
const design = { ...defaultCertificateDesign(), template: 'academic', title: 'SERTIFIKAT APRESIASI', event: 'Refleksi Podcast', signer1: 'Elton Malumbot', role1: 'Penyelenggara' };
const recipient = { id: 'preview', name: 'Peserta Contoh', group: 'BPA', email: 'peserta@example.com' };
const issued = await issueCertificates(design, [recipient], 'https://telaah-lyart.vercel.app');
const font = readFileSync(new URL('../public/fonts/DejaVuSans.ttf', import.meta.url)).toString('base64');
const pdf = await buildCertificates(design, issued.recipients, font);
writeFileSync('artifacts/sample-certificate-qr.pdf', Buffer.from(pdf.output('arraybuffer')));
