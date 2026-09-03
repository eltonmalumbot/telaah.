import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBatch, exportCSV } from '../lib/analysis.ts';
import { parseCSV } from '../lib/import.ts';
import { assessQuality, qualityScore, rankQuality, resetQuality, updateQualityLevel } from '../lib/quality.ts';

const prompt = 'Evaluasi inovasi melalui pengalaman dan rencana tindakan.';
const specific = 'Inovasi tanpa apresiasi bisa membebani tim. Kemarin saya mencoba formulir untuk 3 rekan, tetapi laporan tetap terlambat. Saya menyadari target perlu diperbaiki karena beban kerja tidak merata. Minggu depan saya akan membandingkan waktu penyelesaian laporan dan meminta masukan rekan.';
const generic = 'Inovasi sangat penting dalam dunia kerja. Kita harus selalu berusaha menjadi lebih baik. Semua orang perlu memberikan kontribusi yang positif untuk kemajuan bersama.';
const participant = (id, response1 = specific) => ({ id, name: `Peserta ${id}`, group: 'BJI', response1, response2: '', duration: '' });

test('kualitas memerlukan acuan bermakna dan teks; pencocokan literal tidak mengklaim makna', () => {
  assert.equal(assessQuality(specific, ''), null);
  assert.equal(assessQuality(specific, 'apa dan bagaimana'), null);
  assert.equal(assessQuality('   ', prompt), null);
  const q = assessQuality(specific, 'perpustakaan');
  assert.equal(q.criteria.find(item => item.id === 'relevance').level, 0);
  assert.match(q.criteria[0].explanation, /bukan penilaian makna/);
});

test('kritik konkret yang singkat dapat melampaui jawaban panjang; repetisi tidak menambah skor', () => {
  const strong = assessQuality(specific, prompt);
  const weak = assessQuality(generic, prompt);
  assert.ok(specific.split(' ').length < 80);
  assert.ok(qualityScore(strong) > qualityScore(assessQuality((generic + '\n').repeat(30), prompt)));
  assert.equal(qualityScore(weak), qualityScore(assessQuality((generic + '\n').repeat(30), prompt)));
  assert.equal(qualityScore(strong), qualityScore(assessQuality((specific + '\n').repeat(5), prompt)));
  assert.ok(strong.criteria.every(item => item.evidence.every(quote => specific.includes(quote))));
});

test('indikasi AI, durasi, dan duplikasi tidak memberi penalti otomatis pada kualitas', () => {
  const rows = analyzeBatch([
    { ...participant(1), duration: '1 detik' },
    { ...participant(2), duration: '2 jam' },
    participant(3, 'Sebagai model bahasa AI. ' + specific),
  ], prompt);
  assert.equal(rows[0].exactCount, 2);
  assert.equal(rows[2].exactCount, 1);
  assert.ok(rows[2].analysis.signals.length > rows[0].analysis.signals.length);
  assert.ok(rows.every(row => qualityScore(row.quality) === qualityScore(rows[0].quality)));
});

test('rencana yang dinegasikan tidak ditafsirkan sebagai tindakan yang akan dilakukan', () => {
  const q = assessQuality('Saya tidak akan membuat formulir besok. Saya belum akan membandingkan waktu penyelesaian. Saya enggan mencoba laporan.', prompt);
  assert.equal(q.criteria.find(item => item.id === 'action').level, 0);
});

test('peringkat mengikuti kelompok yang difilter, mempertahankan seri di posisi kesepuluh, dan mengecualikan teks kosong', () => {
  const scores = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 7, 6];
  const rows = scores.map((points, index) => {
    let quality = assessQuality(specific, prompt);
    quality.criteria.forEach(item => {
      const level = Math.min(4, points); points -= level;
      quality = updateQualityLevel(quality, item.id, level);
    });
    return { ...participant(index + 1), quality };
  });
  const ranked = rankQuality([...rows, { ...participant(13, ''), quality: null }]);
  assert.equal(ranked[9].qualityRank, 10);
  assert.equal(ranked[10].qualityRank, 10);
  assert.equal(ranked[11].qualityRank, 12);
  assert.equal(ranked[12].qualityRank, undefined);
  assert.equal(ranked.filter(row => row.qualityRank <= 10).length, 11);
  assert.equal(rankQuality(rows.slice(9))[0].qualityRank, 1);
});

test('koreksi reviewer mengubah peringkat dan ekspor tanpa menghapus saran awal', () => {
  const rows = analyzeBatch([participant(1), participant(2, generic)], prompt);
  const original = rows[1].quality;
  let corrected = original;
  for (const item of original.criteria) corrected = updateQualityLevel(corrected, item.id, 4);
  assert.equal(original.criteria[0].level, original.criteria[0].suggestedLevel);
  rows[1].quality = { ...corrected, confirmed: true, reviewerNote: '=Catatan reviewer' };
  const ranked = rankQuality(rows);
  assert.equal(ranked[1].qualityRank, 1);
  assert.equal(qualityScore(ranked[1].quality), 100);
  const data = parseCSV(exportCSV(ranked));
  const col = header => data[0].indexOf(header);
  assert.equal(data[2][col('Skor rubrik /100')], '100');
  assert.equal(data[2][col('Status penilaian kualitas')], 'Dikonfirmasi reviewer');
  assert.equal(data[2][col('Catatan reviewer')], "'=Catatan reviewer");
  assert.equal(data[2][col('Acuan tugas')], prompt);
  assert.equal(updateQualityLevel(rows[1].quality, 'action', 3).confirmed, false);
  assert.deepEqual(resetQuality(rows[1].quality), original);
  assert.throws(() => updateQualityLevel(original, 'relevance', 5));
});
