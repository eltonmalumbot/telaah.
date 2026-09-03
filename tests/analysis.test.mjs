import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeText,analyzeBatch,exportCSV} from '../lib/analysis.ts';
import {parseCSV,autoMapping,toParticipants} from '../lib/import.ts';

const participant=(id,a,b='',duration='')=>({id,name:`Peserta ${id}`,group:'A',response1:a,response2:b,duration});
test('kritik singkat tidak dikenai dugaan AI atau skor kualitas',()=>{
 const r=analyzeText('Inovasi tanpa apresiasi = eksploitasi. Lebih baik saya diam karena tidak ada penghargaan.');
 assert.equal(r.limited,true);assert.equal(r.signals.length,0);assert.equal('score' in r,false);
});
test('durasi tidak mengubah analisis dan duplikat kosong tidak dihitung',()=>{
 const r=analyzeBatch([participant(1,'Tulisan sama','Tindakan sama','1 detik'),participant(2,'Tulisan sama','Tindakan sama','2 jam'),participant(3,''),participant(4,'')]);
 assert.deepEqual(r[0].analysis,r[1].analysis);assert.equal(r[0].exactCount,2);assert.equal(r[2].exactCount,0);
});
test('kecocokan persis dan normalisasi dipisahkan tanpa menyatukan kolom',()=>{
 const r=analyzeBatch([participant(1,'Satu  dua','Tiga'),participant(2,'satu dua','tiga'),participant(3,'Satu','dua Tiga')]);
 assert.equal(r[0].exactCount,1);assert.equal(r[0].similarCount,2);assert.equal(r[2].similarCount,1);
});
test('impor dan ekspor mempertahankan teks multiline dan menetralkan formula CSV',()=>{
 const values=parseCSV('Nama,Jawaban 1,Jawaban 2\r\n"Nama, Contoh","Baris satu\nBaris dua","Kata ""kutip"""');
 assert.deepEqual(values[1],['Nama, Contoh','Baris satu\nBaris dua','Kata "kutip"']);
 const data={headers:values[0],rows:values.slice(1),sheet:'CSV'};
 const r=analyzeBatch(toParticipants(data,autoMapping(data.headers)));r[0].name='=1+1';
 assert.match(exportCSV(r),/"'=1\+1"/);
 assert.equal(parseCSV(exportCSV(r))[1][11],values[1][1]);
});
test('sinyal menyertakan bukti dan batas penafsiran',()=>{
 const r=analyzeText('Sebagai model bahasa AI, saya tidak memiliki pengalaman pribadi.');
 assert.equal(r.signals[0].id,'identity');assert.ok(r.signals[0].evidence.length);assert.ok(r.signals[0].caution);
});
