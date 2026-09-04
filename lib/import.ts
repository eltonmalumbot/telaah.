import type { Participant } from './analysis';
export type Imported = { headers: string[]; rows: string[][]; sheet: string };
export type Mapping = {
 name: string;
 group: string;
 email: string;
 response1: string;
 response2: string;
 responses: string[];
 duration: string;
};

export function parseCSV(input: string): string[][] {
 const text=input.replace(/^\ufeff/,'');
 const first=text.split(/\r?\n/)[0]??'';
 const delimiter=['\t',';',','].map(d=>({d,n:first.split(d).length})).sort((a,b)=>b.n-a.n)[0].d;
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++) {
  const c=text[i];
  if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted || cell.length===0) quoted=!quoted;else cell+=c;}
  else if(!quoted&&c===delimiter){row.push(cell);cell='';}
  else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw new Error('Tanda kutip pada CSV tidak tertutup. Periksa format file.');
 row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
 return rows;
}

function checkZipSize(bytes: ArrayBuffer) {
 const view=new DataView(bytes);let end=-1;
 for(let p=view.byteLength-22;p>=Math.max(0,view.byteLength-65557);p--) if(view.getUint32(p,true)===0x06054b50){end=p;break;}
 if(end<0)throw new Error('File Excel tidak valid atau terenkripsi. Simpan ulang sebagai .xlsx tanpa kata sandi.');
 let pos=view.getUint32(end+16,true),total=0;const count=view.getUint16(end+10,true);
 if(count===65535)throw new Error('Ukuran workbook tidak didukung. Pisahkan menjadi beberapa file.');
 for(let i=0;i<count;i++) {
  if(pos+46>view.byteLength || view.getUint32(pos,true)!==0x02014b50)throw new Error('Struktur file Excel tidak valid.');
  total+=view.getUint32(pos+24,true);
  if(total>60*1024*1024)throw new Error('Isi workbook terlalu besar setelah dibuka. Batas isi: 60 MB.');
  pos+=46+view.getUint16(pos+28,true)+view.getUint16(pos+30,true)+view.getUint16(pos+32,true);
 }
}

export async function readFile(file: File): Promise<Imported> {
 if(file.size>10*1024*1024)throw new Error('Ukuran maksimum file adalah 10 MB.');
 const extension=file.name.split('.').pop()?.toLowerCase();let all:string[][]=[];let sheet='CSV';
 if(extension==='csv') all=parseCSV(await file.text());
 else if(extension==='xlsx') {
  const bytes=await file.arrayBuffer();checkZipSize(bytes);
  const ExcelJS=(await import('exceljs')).default;
  const wb=new ExcelJS.Workbook();
  await wb.xlsx.load(bytes);
  const ws=wb.worksheets[0];if(!ws)throw new Error('Workbook tidak memiliki lembar.');
  sheet=ws.name;
  if(ws.rowCount>10001||ws.columnCount>64)throw new Error('Batas impor: 10.000 baris data dan 64 kolom.');
  ws.eachRow(row=>{ const values:string[]=[];for(let c=1;c<=ws.columnCount;c++)values.push(row.getCell(c).text??'');if(values.some(v=>v.trim()))all.push(values); });
 }else throw new Error('Gunakan file .xlsx atau .csv. File .xls lama perlu disimpan ulang sebagai .xlsx.');
 if(all.length<2)throw new Error('File harus berisi judul kolom dan sedikitnya satu baris data.');
 if(all.length>10001||all.some(r=>r.length>64))throw new Error('Batas impor: 10.000 baris data dan 64 kolom.');
 if(all.some(r=>r.some(c=>c.length>50000)))throw new Error('Ada sel yang melebihi 50.000 karakter. Ringkas atau pisahkan teks tersebut.');
 const headers=Array.from({length:Math.max(...all.map(r=>r.length))},(_,i)=>all[0][i]?.trim()||`Kolom ${i+1}`);
 return {headers, rows:all.slice(1),sheet};
}

function responseNumber(header: string): number | null {
 const normalized=header.normalize('NFKC').toLocaleLowerCase('id').trim();
 const match=normalized.match(/^(?:response|jawaban|answer)\s*[-_.:]?\s*(\d+)$/i);
 return match ? Number(match[1]) : null;
}

export function detectedResponseColumns(headers:string[]):string[] {
 const numbered=headers
  .map((header,index)=>({index,number:responseNumber(header)}))
  .filter((item):item is {index:number;number:number}=>item.number!==null)
  .sort((a,b)=>a.number-b.number||a.index-b.index)
  .map(item=>String(item.index));
 if(numbered.length)return numbered;
 const generic=headers.findIndex(h=>['jawaban','response','answer','text','teks','refleksi'].includes(h.toLowerCase().trim()));
 return generic>=0?[String(generic)]:[];
}

export function autoMapping(headers:string[]):Mapping {
 const locate=(names:string[])=>{ const i=headers.findIndex(h=>names.includes(h.toLowerCase().trim()));return i<0?'':String(i); };
 const detected=detectedResponseColumns(headers);
 const responses=detected.length>=2?detected:[detected[0]??'', ''];
 return {
  name:locate(['last name','nama','name','nama peserta','peserta']),
  group:locate(['first name','grup','group','unit','bagian']),
  email:locate(['email','email address','alamat email','e-mail']),
  response1:responses[0]??'',
  response2:responses[1]??'',
  responses,
  duration:locate(['duration','durasi'])
 };
}

export function toParticipants(data:Imported,m:Mapping):Participant[] {
 const mapped=(m.responses?.length?m.responses:[m.response1,m.response2]).map(value=>value??'');
 if(!mapped[0])throw new Error('Pilih kolom Jawaban 1 terlebih dahulu.');
 const selected=mapped.filter(Boolean);
 if(new Set(selected).size!==selected.length)throw new Error('Setiap Jawaban harus memakai kolom yang berbeda.');
 const getColumn=(r:string[],column:string)=>column!==''?(r[Number(column)]??''):'';
 const getStatic=(r:string[],key:'name'|'group'|'email'|'duration')=>getColumn(r,m[key]);
 return data.rows.map((r,i)=>{
  const responses=mapped.map(column=>getColumn(r,column));
  return {
   id:i+1,
   name:getStatic(r,'name').trim()||`Peserta baris ${i+2}`,
   group:getStatic(r,'group').trim()||'Tanpa grup',
   email:getStatic(r,'email').trim(),
   response1:responses[0]??'',
   response2:responses[1]??'',
   responses,
   duration:getStatic(r,'duration')
  };
 });
}
