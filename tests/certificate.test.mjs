import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CERTIFICATE_TEMPLATES, certificateText, certificateVariables, defaultCertificateDesign, manualCertificateRecipients, parseCertificateDesign, validateCertificateBatch } from '../lib/certificate.ts';
import { buildCertificates, previewCertificate } from '../lib/certificate-render.ts';

const font = readFileSync(new URL('../public/fonts/DejaVuSans.ttf', import.meta.url)).toString('base64');
const base = { ...defaultCertificateDesign(new Date('2026-09-03T12:00:00Z')), date: '2026-09-03' };
const recipients = manualCertificateRecipients('José Contoh | BPA\nNama Penerima Kedua | BJI');
const image = { data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQMQr4DwACigGWbdwAgAAAAABJRU5ErkJggg==', width: 1, height: 1 };

test('desain tersimpan mempertahankan isi dan gambar, serta menolak format rusak atau URL eksternal', () => {
  const design = { ...base, title: 'PIAGAM PENGHARGAAN', logo1: image, signature2: image, accent: '#123456' };
  assert.deepEqual(parseCertificateDesign(JSON.parse(JSON.stringify(design))), design);
  assert.equal('untrusted' in parseCertificateDesign({ ...design, untrusted: 'ignored' }), false);
  for (const invalid of [
    { version: 2 }, { date: '2026-02-30' }, { startNumber: 0 }, { accent: 'url(https://example.com)' },
    { logo1: { ...image, data: 'https://example.com/logo.png' } },
    { logo1: { ...image, width: 200 } }, { title: '' }, { body: '{variabel_tidak_dikenal}' },
    { numberPattern: '{nama}' },
  ]) assert.throws(() => parseCertificateDesign({ ...design, ...invalid }));
});

test('penerima dan nomor berurutan konsisten antara pratinjau, unduhan satuan, dan massal', () => {
  const names = manualCertificateRecipients('Nama Sama | BPA\n\nNama Sama | BTI');
  assert.equal(names.length, 2);
  assert.notEqual(names[0].id, names[1].id);
  assert.equal(names[1].group, 'BTI');
  assert.throws(() => manualCertificateRecipients('| BPA'), /nama/i);
  assert.throws(() => manualCertificateRecipients('Peserta\n'.repeat(201)), /200/);
  const design = { ...base, startNumber: 7 };
  const second = certificateVariables(design, recipients[1], 1);
  assert.equal(second.nomor, 'Nomor: CERT/2026/008');
  assert.equal(second.tanggal, '3 September 2026');
  assert.equal(certificateVariables({ ...design, startNumber: 8 }, recipients[1], 0).nomor, second.nomor);
  assert.equal(certificateText('{nama} — {nomor}', { ...second, nama: 'Nama {tahun}' }), 'Nama {tahun} — Nomor: CERT/2026/008');
  assert.throws(() => validateCertificateBatch({ ...design, numberPattern: 'CERT/2026' }, names), /urutan/);
  assert.throws(() => validateCertificateBatch({ ...design, startNumber: 999999 }, names), /999999/);
  assert.throws(() => validateCertificateBatch(design, []), /minimal satu/);
  assert.doesNotThrow(() => validateCertificateBatch({ ...design, numberPattern: '' }, names));
});

test('empat template membuat PDF A4 mendatar per penerima dengan teks, logo, dan penandatangan yang diedit', async () => {
  for (const template of CERTIFICATE_TEMPLATES) {
    const design = { ...base, template: template.id, ink: template.ink, accent: template.accent,
      title: 'PIAGAM PENGHARGAAN', organizer: 'Komunitas Contoh', event: 'Lokakarya Pelayanan',
      body: 'Terima kasih {nama} atas kontribusi dalam {acara}.', logo1: image, logo2: image,
      signature1: image, signer1: 'Ketua Pelaksana', signer2: 'Kepala Program', footer: 'Catatan contoh' };
    const scene = previewCertificate(design, recipients[0], 0, font);
    const text = scene.nodes.filter(node => node.kind === 'text').map(node => node.text).join(' ');
    for (const expected of ['PIAGAM PENGHARGAAN', 'José Contoh', 'Lokakarya Pelayanan', 'Komunitas Contoh', 'Ketua Pelaksana', 'Kepala Program', 'Catatan contoh']) assert.ok(text.includes(expected), `${template.id}: ${expected}`);
    assert.ok(!text.includes('{nama}'));
    const images = scene.nodes.filter(node => node.kind === 'image');
    assert.equal(images.length, 3);
    assert.ok(images.every(node => node.width === node.height));
    const progress = [];
    const pdf = await buildCertificates(design, recipients, font, done => progress.push(done));
    assert.deepEqual(progress, [1, 2]);
    assert.equal(pdf.getNumberOfPages(), 2);
    assert.ok(Math.abs(pdf.internal.pageSize.getWidth() - 297) < 0.1);
    assert.ok(Math.abs(pdf.internal.pageSize.getHeight() - 210) < 0.1);
    assert.match(pdf.output().slice(0, 8), /^%PDF-/);
  }
});

test('teks panjang menyesuaikan ruang; karakter tak didukung atau isi yang meluap menghentikan ekspor', async () => {
  const long = { id: 'long', name: 'José Alexander Nama Penerima Panjang untuk Pemeriksaan Tata Letak Sertifikat', group: '' };
  const scene = previewCertificate(base, long, 0, font);
  const nameLines = scene.nodes.filter(node => node.kind === 'text' && node.y > 99 && node.y < 119);
  assert.ok(nameLines.length > 1);
  assert.equal(nameLines.map(node => node.text).join(' '), long.name);
  await assert.rejects(buildCertificates(base, [...recipients, { id: 'unsupported', name: 'Peserta 漢', group: '' }], font), /Peserta 漢: Nama penerima.*karakter/);
  await assert.rejects(buildCertificates({ ...base, body: 'Baris pendek\n'.repeat(60) }, recipients, font), /Isi sertifikat terlalu panjang/);
});
