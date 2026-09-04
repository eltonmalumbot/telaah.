import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeText,analyzeBatch,exportCSV,matchingParticipants,participantResponses} from '../lib/analysis.ts';
import {parseCSV,autoMapping,toParticipants,detectedResponseColumns} from '../lib/import.ts';

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
 assert.equal(parseCSV(exportCSV(r))[1][12],values[1][1]);
});
test('sinyal menyertakan bukti dan batas penafsiran',()=>{
 const r=analyzeText('Sebagai model bahasa AI, saya tidak memiliki pengalaman pribadi.');
 assert.equal(r.signals[0].id,'identity');assert.ok(r.signals[0].evidence.length);assert.ok(r.signals[0].caution);
});

test('daftar peserta mengikuti empat jenis kecocokan dan jumlah yang ditampilkan',()=>{
 const rows=analyzeBatch([
  participant(1,'Buku  A','Rencana'),participant(2,'Buku  A','Rencana'),
  participant(3,'ｂｕｋｕ a','rencana'),participant(4,'Buku  A','Lain'),
  participant(5,'Lain','Rencana'),participant(6,''),participant(7,'   ')
 ]);
 const counts={exact:'exactCount',normalized:'similarCount',response1:'response1Count',response2:'response2Count'};
 for(const row of rows)for(const [kind,key] of Object.entries(counts)) {
  const matches=matchingParticipants(rows,row,kind);
  assert.equal(matches.length,row[key]);
  if(row[key])assert.ok(matches.some(match=>match.id===row.id));
 }
 const ids=kind=>matchingParticipants(rows,rows[0],kind).map(row=>row.id);
 assert.deepEqual(ids('exact'),[1,2]);
 assert.deepEqual(ids('normalized'),[1,2,3]);
 assert.deepEqual(ids('response1'),[1,2,4]);
 assert.deepEqual(ids('response2'),[1,2,5]);
});

test('peserta di luar filter tetap dapat dibuka dan nama sama tidak digabung',()=>{
 const rows=analyzeBatch(Array.from({length:185},(_,index)=>({
  ...participant(index+1,'Jawaban bersama','Rencana bersama'),
  name:index<2?'Nama yang sama':`Peserta ${index+1}`,group:index===0?'BJI':'BPA'
 })));
 const selected=rows.filter(row=>row.group==='BJI')[0];
 const matches=matchingParticipants(rows,selected,'exact');
 assert.equal(matches.length,185);
 assert.equal(matches[1].group,'BPA');
 assert.notEqual(matches[0].id,matches[1].id);
 assert.equal(matches[0].name,matches[1].name);
 assert.equal(rows.find(row=>row.id===matches.at(-1).id)?.name,'Peserta 185');
});

test('Response 1 sampai N terdeteksi, dipetakan, dianalisis, dan diekspor',()=>{
 const headers=['Last name','First name','Email address','Duration','Response 4','Response 2','Response 1','Response 3'];
 assert.deepEqual(detectedResponseColumns(headers),['6','5','7','4']);
 const mapping=autoMapping(headers);
 assert.deepEqual(mapping.responses,['6','5','7','4']);
 const data={headers,rows:[['Budi','BPA','budi@example.com','5 menit','Empat','Dua','Satu','Tiga']],sheet:'CSV'};
 const participants=toParticipants(data,mapping);
 assert.deepEqual(participantResponses(participants[0]),['Satu','Dua','Tiga','Empat']);
 const reviewed=analyzeBatch(participants,'Satu Dua Tiga Empat');
 assert.equal(reviewed[0].analysis.words,4);
 const exported=parseCSV(exportCSV(reviewed));
 assert.equal(exported[0].includes('Jawaban 3'),true);
 assert.equal(exported[0].includes('Jawaban 4'),true);
 assert.equal(exported[1][12],'Satu');
 assert.equal(exported[1][13],'Dua');
 assert.equal(exported[1][14],'Tiga');
 assert.equal(exported[1][15],'Empat');
});
