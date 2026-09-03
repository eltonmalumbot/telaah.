import { assessQuality, qualityScore, qualityStatus, type QualityAssessment } from './quality.ts';
export type Signal = { id: string; title: string; explanation: string; evidence: string[]; caution: string };
export type TextAnalysis = { words: number; characters: number; sentences: number; signals: Signal[]; limited: boolean; label: string };
export type Participant = { id: number; name: string; group: string; response1: string; response2: string; duration: string };
export type Reviewed = Participant & { analysis: TextAnalysis; exactCount: number; similarCount: number; response1Count: number; response2Count: number; quality?: QualityAssessment | null; qualityRank?: number };
export const MODEL_NOTE = 'Metode aturan bahasa v1.0. Belum menggunakan model deteksi AI yang terkalibrasi. Hasil bukan probabilitas penggunaan AI.';
export function countWords(text: string): number { return text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0; }

export function analyzeText(input: string): TextAnalysis {
  const text = input.trim();
  const words = countWords(text);
  const signals: Signal[] = [];
  const identity = text.match(/(?:sebagai (?:sebuah )?(?:model bahasa(?: besar)?(?: ai)?|asisten ai|kecerdasan buatan)|as an ai(?: language model)?|i (?:am|['’]m) an ai|saya (?:adalah )?(?:model bahasa ai|chatgpt))/gi) ?? [];
  if (identity.length) signals.push({ id: 'identity', title: 'Penyebutan identitas asisten AI', explanation: 'Ada frasa yang menyebut pembicara sebagai AI. Periksa apakah ini bagian kutipan, contoh, atau teks yang tertempel.', evidence: [...new Set(identity)].slice(0, 3), caution: 'Frasa tersebut dapat dikutip oleh manusia; tidak membuktikan sumber seluruh tulisan.' });
  const remnants = text.match(/(?:chatgpt (?:said|bilang)|regenerate response|as a large language model|\[insert (?:your|name|text)[^\]]*\]|\[masukkan (?:nama|jawaban|konteks)[^\]]*\])/gi) ?? [];
  if (remnants.length) signals.push({ id: 'remnants', title: 'Sisa label atau placeholder', explanation: 'Ada label percakapan atau isian template yang mungkin belum dibersihkan.', evidence: [...new Set(remnants)].slice(0,3), caution: 'Template juga dapat disusun manusia. Konfirmasikan konteks sebelum menyimpulkan.' });
  const openings = text.match(/(?:berikut (?:adalah |ini )?(?:contoh |beberapa )?(?:jawaban|refleksi|poin|langkah)|semoga (?:jawaban|penjelasan) ini membantu|jawaban cepat)/gi) ?? [];
  if (openings.length) signals.push({ id: 'openings', title: 'Frasa pengantar jawaban', explanation: 'Tulisan memakai pengantar yang umum pada jawaban siap pakai atau teks bantuan.', evidence: [...new Set(openings)].slice(0,3), caution: 'Sinyal lemah: frasa seperti ini juga lazim dipakai manusia.' });
  const formatted = text.split(/\r?\n/).filter(l => /^\s*(?:#{1,6}\s|[-*•]\s|\d+[.)]\s|\*\*[^*]+\*\*)/.test(l));
  if (words >= 80 && formatted.length >= 4) signals.push({ id: 'structure', title: 'Struktur poin yang dominan', explanation: `${formatted.length} baris memakai poin, penomoran, atau judul Markdown. Ini menunjukkan penyajian yang sangat terstruktur.`, evidence: formatted.slice(0,3).map(l=>l.trim().slice(0,180)), caution: 'Sinyal lemah: format rapi adalah kebiasaan menulis, bukan ciri eksklusif AI.' });
  const transitions = text.match(/\b(?:selain itu|lebih lanjut|oleh karena itu|dengan demikian|pada akhirnya|secara keseluruhan|di sisi lain|in conclusion|furthermore|moreover)\b/gi) ?? [];
  if (words >= 100 && transitions.length >= 4) signals.push({ id: 'transitions', title: 'Penghubung formal berulang', explanation: `${transitions.length} penghubung formal ditemukan. Tinjau apakah kalimat menyampaikan pengalaman konkret atau mengulang gagasan.`, evidence: [...new Set(transitions.map(s=>s.toLowerCase()))].slice(0,5), caution: 'Sinyal lemah: tulisan akademik dan profesional sering memakai pola yang sama.' });
  return { words, characters: input.length, sentences: text ? text.split(/[.!?]+(?:\s|$)/).filter(s=>s.trim()).length : 0, signals, limited: words < 80, label: !words ? 'Belum ada teks' : words < 80 ? 'Teks singkat, analisis terbatas' : signals.length ? 'Ada pola untuk ditinjau' : 'Tidak ada pola yang ditandai' };
}

const normalized = (s: string) => s.normalize('NFKC').toLocaleLowerCase('id').replace(/\s+/g,' ').trim();
const pair = (r: Participant, norm=false) => JSON.stringify(norm ? [normalized(r.response1),normalized(r.response2)] : [r.response1,r.response2]);
function increment(m: Map<string,number>, key: string) { m.set(key,(m.get(key)??0)+1); }
export type MatchKind = 'exact' | 'normalized' | 'response1' | 'response2';
/** Pass the complete imported file, before table filtering or pagination. Includes the selected response. */
export function matchingParticipants<T extends Participant>(rows: T[], selected: Participant, kind: MatchKind): T[] {
  if (kind === 'response1' || kind === 'response2') {
    if (!selected[kind].trim()) return [];
    return rows.filter(row => row[kind] === selected[kind]);
  }
  if (!selected.response1.trim() && !selected.response2.trim()) return [];
  const key = pair(selected, kind === 'normalized');
  return rows.filter(row => (row.response1.trim() || row.response2.trim()) && pair(row, kind === 'normalized') === key);
}
export function analyzeBatch(rows: Participant[], prompt = ''): Reviewed[] {
  const exact=new Map<string,number>(), similar=new Map<string,number>(), a=new Map<string,number>(),b=new Map<string,number>();
  for(const r of rows) {
    if(r.response1.trim() || r.response2.trim()) { increment(exact,pair(r)); increment(similar,pair(r,true)); }
    if(r.response1.trim()) increment(a,r.response1);
    if(r.response2.trim()) increment(b,r.response2);
  }
  return rows.map(r=>({...r, quality:assessQuality([r.response1,r.response2].filter(Boolean).join('\n\n'),prompt), analysis:analyzeText([r.response1,r.response2].filter(Boolean).join('\n\n')), exactCount:exact.get(pair(r))??0, similarCount:similar.get(pair(r,true))??0, response1Count:r.response1.trim()?(a.get(r.response1)??0):0, response2Count:r.response2.trim()?(b.get(r.response2)??0):0}));
}

export function csvSafe(value: unknown) {
 const s=String(value??'');
 const safe=/^[\s\u0000-\u001f]*[=+@-]/.test(s)?"'"+s:s;
 return '"'+safe.replace(/"/g,'""')+'"';
}
export function exportCSV(rows: Reviewed[]) {
 const header=['Nama','Grup','Jumlah kata','Jumlah pola bahasa','Pola ditandai','Status AI','Pasangan identik (termasuk peserta)','Sama setelah normalisasi (termasuk peserta)','Jawaban 1 identik','Jawaban 2 identik','Durasi sumber','Jawaban 1','Jawaban 2','Peringkat kualitas dalam filter','Skor rubrik /100','Status penilaian kualitas','Acuan tugas','Relevansi /4','Refleksi /4','Contoh konkret /4','Rencana tindakan /4','Catatan reviewer','Alasan dan kutipan saran awal'];
 return '\ufeff'+[header,...rows.map(r=>[r.name,r.group,r.analysis.words,r.analysis.signals.length,r.analysis.signals.map(s=>s.title).join('; '),'Tidak dapat ditentukan',r.exactCount,r.similarCount,r.response1Count,r.response2Count,r.duration,r.response1,r.response2,r.qualityRank??'',r.quality?qualityScore(r.quality):'',r.quality?qualityStatus(r.quality):'Belum dinilai',r.quality?.prompt??'',...(['relevance','reflection','concrete','action'].map(id=>r.quality?.criteria.find(item=>item.id===id)?.level??'')),r.quality?.reviewerNote??'',r.quality?.criteria.map(item=>`${item.title}: ${item.explanation} Kutipan: ${item.evidence.join(' | ')}`).join('\n')??''])].map(row=>row.map(csvSafe).join(',')).join('\r\n');
}
