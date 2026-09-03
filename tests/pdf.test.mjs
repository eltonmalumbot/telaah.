import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel } from '@tanstack/react-table';
import { analyzeBatch, analyzeText } from '../lib/analysis.ts';
import { buildBatchReport, buildTextReport, reportText } from '../lib/pdf-report.ts';
import { rankQuality, updateQualityLevel } from '../lib/quality.ts';

const options = {
  fontBase64: readFileSync(new URL('../public/fonts/DejaVuSans.ttf', import.meta.url)).toString('base64'),
  date: new Date('2026-09-03T10:15:00Z'),
};

test('PDF memuat semua baris hasil filter dan urutan sebelum paginasi', () => {
  const reviewed = analyzeBatch(Array.from({ length: 45 }, (_, index) => ({
    id: index + 1, name: `Peserta ${String(index + 1).padStart(2, '0')}`,
    group: index < 34 ? 'BJI' : 'BPA', response1: 'Refleksi identik.', response2: '', duration: '',
  })));
  const filtered = reviewed.filter(row => row.group === 'BJI');
  const table = createTable({
    data: filtered, columns: [{ id: 'name', accessorKey: 'name' }],
    state: { sorting: [{ id: 'name', desc: true }], pagination: { pageIndex: 1, pageSize: 10 } },
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  assert.equal(table.getRowModel().rows.length, 10);
  const pdf = buildBatchReport(table.getSortedRowModel().rows.map(row => row.original), {
    ...options, totalRows: reviewed.length, sourceName: 'contoh.xlsx', query: 'BJI',
    filterLabel: 'Semua hasil', sortLabel: 'Nama peserta (menurun)',
  });
  const body = pdf.lastAutoTable.body;
  assert.equal(body.length, 34);
  assert.equal(body[0].cells[1].raw, 'Peserta 34\nBJI');
  assert.equal(body.at(-1).cells[1].raw, 'Peserta 01\nBJI');
  assert.equal(body[0].cells[4].raw, '45 peserta'); // Counts retain the full source cohort.
  assert.ok(body.every(row => !row.cells[1].raw.includes('BPA')));
  assert.ok(pdf.getNumberOfPages() > 1);
  assert.match(pdf.output().slice(0, 8), /^%PDF-/);
});

test('laporan teks panjang dipaginasi; aksen didukung dan glyph lain diberi kode', () => {
  const text = 'Pengalaman José: “Saya mencoba hal kecil.” 😀 漢\n'.repeat(120);
  const pdf = buildTextReport(text, analyzeText(text), options);
  assert.ok(pdf.getNumberOfPages() > 1);
  assert.ok(pdf.getNumberOfPages() < 20);
  assert.equal(reportText('José 😀 漢\r\n'), 'José [U+1F600] [U+6F22]\n');
  assert.ok(pdf.output('arraybuffer').byteLength > 10000);
});

test('PDF kualitas memakai koreksi reviewer, peringkat filter, dan kolom rubrik', () => {
  const rows = analyzeBatch([
    { id: 1, name: 'Peserta Alfa', group: 'BJI', response1: 'Saya akan mencoba formulir besok.', response2: '', duration: '' },
    { id: 2, name: 'Peserta Beta', group: 'BJI', response1: 'Saya membuat formulir.', response2: '', duration: '' },
  ], 'Refleksi inovasi formulir');
  let corrected = rows[1].quality;
  for (const item of corrected.criteria) corrected = updateQualityLevel(corrected, item.id, 4);
  rows[1].quality = { ...corrected, confirmed: true, reviewerNote: 'Konteks telah diperiksa.' };
  const ranked = rankQuality(rows);
  const pdf = buildBatchReport([ranked[1]], {
    ...options, totalRows: 2, rankingCount: 2, sourceName: 'contoh.csv', query: '',
    filterLabel: 'Top 10 + nilai seri', sortLabel: 'Kualitas menurun',
  });
  const cells = pdf.lastAutoTable.body[0].cells;
  assert.equal(cells[1].raw, '1');
  assert.equal(cells[4].raw, '100\nDikonfirmasi reviewer');
  assert.match(cells[7].raw, /Relevansi dengan tugas: 4\/4/);
  assert.match(cells[7].raw, /Konteks telah diperiksa/);
  assert.equal(ranked[0].qualityRank, 2);
});
