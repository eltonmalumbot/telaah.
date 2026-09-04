import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBatch } from '../lib/analysis.ts';
import { decodeQualityPrompts, encodeQualityPrompts, qualityScore } from '../lib/quality.ts';

const prompts = [
  'Bagaimana inovasi membantu pekerjaan Anda? Berikan pengalaman konkret.',
  'Apa pelajaran dari pelayanan pelanggan yang Anda alami?',
  'Apa rencana tindakan yang akan Anda lakukan minggu depan untuk kolaborasi tim?',
];
const responses = [
  'Kemarin saya mencoba formulir inovasi bersama tiga rekan. Proses menjadi lebih mudah tetapi masih ada permintaan terlambat.',
  'Saya belajar bahwa pelayanan pelanggan perlu mendengar alasan keluhan karena sebelumnya saya terlalu cepat memberi solusi.',
  'Minggu depan saya akan menjadwalkan evaluasi kolaborasi tim, meminta masukan rekan, lalu membandingkan waktu penyelesaian.',
];

test('multi-prompt dapat disimpan dan dibaca kembali', () => {
  const encoded = encodeQualityPrompts(prompts);
  assert.deepEqual(decodeQualityPrompts(encoded), prompts);
  assert.equal(decodeQualityPrompts('Pertanyaan tunggal')[0], 'Pertanyaan tunggal');
});

test('Response 1-N dinilai terhadap pertanyaan masing-masing lalu dirata-ratakan', () => {
  const [row] = analyzeBatch([{
    id: 1,
    name: 'Peserta Uji',
    group: 'BPA',
    email: 'uji@example.com',
    response1: responses[0],
    response2: responses[1],
    responses,
    duration: '5 menit',
  }], encodeQualityPrompts(prompts));

  assert.equal(row.quality.componentScores.length, 3);
  assert.deepEqual(row.quality.componentScores.map(item => item.prompt), prompts);
  const mean = row.quality.componentScores.reduce((sum, item) => sum + item.score, 0) / 3;
  assert.equal(qualityScore(row.quality), Math.round(mean));
  assert.match(row.quality.prompt, /Response 1:/);
  assert.match(row.quality.prompt, /Response 3:/);
});

test('prompt kosong pada salah satu Response tidak menggagalkan Response lain', () => {
  const mixed = [prompts[0], '', prompts[2]];
  const [row] = analyzeBatch([{
    id: 2,
    name: 'Peserta Uji 2',
    group: 'BTI',
    response1: responses[0],
    response2: responses[1],
    responses,
    duration: '',
  }], encodeQualityPrompts(mixed));
  assert.equal(row.quality.componentScores.length, 2);
  assert.deepEqual(row.quality.componentScores.map(item => item.response), [1, 3]);
});
