import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCertificateDesign} from '../lib/certificate.ts';
import {issueCertificates,verifyCertificateToken,loadIssuances,setIssuanceStatus} from '../lib/certificate-identity.ts';
import {qrDataUrl} from '../lib/qr-code.ts';
import {readFileSync} from 'node:fs';
import {buildCertificates} from '../lib/certificate-render.ts';

function localStorageMock(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),clear:()=>values.clear()};}

test('QR verifikasi ditandatangani, dapat diperiksa, dan manipulasi ditolak',async()=>{
 globalThis.localStorage=localStorageMock();
 const design=defaultCertificateDesign();
 const issued=await issueCertificates(design,[{id:'1',name:'Peserta Uji',group:'BPA',email:'uji@example.com'}],'https://telaah.example');
 assert.equal(issued.records.length,1);
 assert.match(issued.recipients[0].verificationUrl,/\/verify#/);
 const verified=await verifyCertificateToken(issued.records[0].token);
 assert.equal(verified.valid,true);assert.equal(verified.claim.name,'Peserta Uji');
 const token=issued.records[0].token;const changed=`${token.slice(0,-2)}AA`;
 assert.equal((await verifyCertificateToken(changed)).valid,false);
 assert.equal(loadIssuances()[0].status,'active');
 assert.equal(setIssuanceStatus(issued.records[0].id,'revoked')[0].status,'revoked');
});

test('encoder QR menghasilkan gambar data URL tanpa layanan eksternal',()=>{
 assert.match(qrDataUrl('https://telaah.example/verify#contoh'),/^data:image\/gif;base64,/);
});

test('QR bertanda tangan dapat ditanam pada PDF sertifikat',async()=>{
 globalThis.localStorage=localStorageMock();
 const design=defaultCertificateDesign();
 const issued=await issueCertificates(design,[{id:'pdf',name:'Peserta PDF',group:'BJI'}],'https://telaah.example');
 const font=readFileSync(new URL('../public/fonts/DejaVuSans.ttf',import.meta.url)).toString('base64');
 const pdf=await buildCertificates(design,issued.recipients,font);
 assert.ok(pdf.output('arraybuffer').byteLength>10000);
 assert.equal(pdf.getNumberOfPages(),1);
});
