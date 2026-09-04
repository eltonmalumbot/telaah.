import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultCertificateDesign } from '../lib/certificate.ts';
import { previewCertificate } from '../lib/certificate-render.ts';

const font = readFileSync(new URL('../public/fonts/DejaVuSans.ttf', import.meta.url)).toString('base64');

test('Certificate ID tercetak pada scene PDF ketika QR aktif', () => {
  const design = defaultCertificateDesign(new Date('2026-09-04T00:00:00Z'));
  const certificateId = 'TLH-2026-A1B2C3D4E5';
  const scene = previewCertificate(design, {
    id: '1',
    name: 'Peserta Uji',
    group: 'BPA',
    verificationUrl: 'https://telaah.example/verify#token',
    certificateId,
  }, 0, font);
  assert.ok(scene.nodes.some(node => node.kind === 'text' && node.text === certificateId));
  assert.ok(scene.nodes.some(node => node.kind === 'image'));
});
