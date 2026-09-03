export type CriterionId = 'relevance' | 'reflection' | 'concrete' | 'action';
export type QualityCriterion = {
  id: CriterionId;
  title: string;
  level: number;
  suggestedLevel: number;
  evidence: string[];
  explanation: string;
  guidance: string;
};
export type QualityAssessment = {
  version: 'rubrik-refleksi-1.0';
  prompt: string;
  keywords: string[];
  criteria: QualityCriterion[];
  confirmed: boolean;
  reviewerNote: string;
};

export const QUALITY_NOTE = 'Rubrik refleksi v1.0: skor awal berbasis aturan, bukan pemahaman makna atau nilai final. Empat aspek berbobot sama (25 poin), dinilai 0–4. Total dibulatkan ke 0–100. Reviewer perlu memeriksa isi dan dapat mengoreksi skor.';
export const QUALITY_SCOPE = 'Dirancang untuk refleksi dan rencana tindakan berbahasa Indonesia. Tidak memeriksa kebenaran fakta, sinonim, ironi, atau seluruh konteks tugas. Panjang teks, kerapian, durasi, duplikasi, dan indikasi AI tidak menambah atau mengurangi skor secara langsung.';
export const QUALITY_PROMPT_EXAMPLE = 'Bagaimana budaya inovasi membantu pekerjaan Anda? Ceritakan pengalaman konkret, pelajaran yang diperoleh, dan rencana tindakan yang akan dicoba.';
const STOP_WORDS = new Set('apa apakah bagaimana mengapa kenapa kapan siapa dimana di mana jelaskan ceritakan uraikan sebutkan berikan contoh tentang dari dalam untuk dengan atau dan yang pada ini itu sebuah suatu sebagai adalah merupakan menjadi dapat bisa akan sudah telah belum tidak bukan hanya saya kami kita anda kamu mereka peserta jawaban pertanyaan refleksi podcast setelah sebelum tersebut secara terhadap melalui agar supaya lebih paling juga saja setiap hal oleh ke pun nya menurut'.split(' '));
const tokens = (value: string) => value.normalize('NFKC').toLocaleLowerCase('id').match(/[\p{L}\p{N}]+/gu) ?? [];
export function topicKeywords(prompt: string): string[] {
  return [...new Set(tokens(prompt).filter(word => word.length > 2 && !STOP_WORDS.has(word)))];
}

const PERSONAL = /\b(saya|kami|tim kami|murid saya|siswa saya|rekan saya)\b/i;
const REASON = /\b(karena|sebab|akibatnya|sehingga|ternyata|namun|tetapi|meskipun|padahal)\b/i;
const LEARNING = /\b(menyadari|belajar|pelajaran|mengevaluasi|mengubah|memahami|sadar|belum berhasil|perlu diperbaiki)\b/i;
const PAST = /\b(kemarin|minggu lalu|bulan lalu|pernah|saat|ketika|sudah|telah)\b/i;
const DETAIL = /\b(\d+|senin|selasa|rabu|kamis|jumat|sabtu|minggu|kelas|perpustakaan|formulir|dashboard|laporan|buku|siswa|murid|pelanggan|rekan|menit|jam|hari)\b/i;
const ACTION = /\b(mencoba|membuat|mengukur|mencatat|membandingkan|meminta|mengajak|menjadwalkan|memperbaiki|menguji|mengumpulkan|meninjau|mengevaluasi|mengubah|membagikan|menyiapkan|menerapkan|mengurangi)\b/i;
const FUTURE = /\b(akan|berencana|berkomitmen|mulai besok|mulai minggu|minggu depan|bulan depan)\b/i;
const TIME = /\b(besok|minggu depan|bulan depan|senin|selasa|rabu|kamis|jumat|sabtu|setiap|\d+\s*(hari|minggu|bulan))\b/i;
const MEASURE = /\b(mengukur|membandingkan|mengevaluasi|meninjau|indikator|target|umpan balik|masukan|waktu penyelesaian|jumlah kesalahan)\b/i;
const NEGATED_ACTION = /\b(tidak|tak|enggan|batal|belum)\s+(?:(?:akan|ingin|mau|berencana|bisa|dapat)\s+){0,3}(?:mencoba|membuat|mengukur|mencatat|membandingkan|meminta|mengajak|menjadwalkan|memperbaiki|menguji|mengumpulkan|meninjau|mengevaluasi|mengubah|membagikan|menyiapkan|menerapkan|mengurangi)\b/i;
const EXCERPT_LENGTH = 300;

function criterion(id: CriterionId, title: string, level: number, evidence: string[], explanation: string, guidance: string): QualityCriterion {
  return { id, title, level, suggestedLevel: level, evidence: evidence.slice(0, 2).map(text => text.slice(0, EXCERPT_LENGTH)), explanation, guidance };
}

/** Transparent lexical cues, deliberately independent of AI flags and response metadata. */
export function assessQuality(input: string, prompt: string): QualityAssessment | null {
  const keywords = topicKeywords(prompt);
  if (!input.trim() || keywords.length === 0) return null;
  const parts = [...new Set(input.split(/(?:[.!?]+(?:\s|$)|\r?\n)+/u).map(part => part.trim()).filter(Boolean))];
  const textWords = new Set(tokens(input));
  const matched = keywords.filter(word => textWords.has(word));
  const relevance = matched.length === 0 ? 0 : Math.min(4, Math.ceil(matched.length / keywords.length * 4));
  const relevantParts = parts.filter(part => tokens(part).some(word => matched.includes(word)));

  const reasoning = parts.filter(part => REASON.test(part));
  const personalReasoning = reasoning.filter(part => PERSONAL.test(part));
  const learning = parts.filter(part => PERSONAL.test(part) && LEARNING.test(part));
  const reflection = Math.min(4, Number(reasoning.length > 0) + Number(personalReasoning.length > 0) + Number(learning.length > 0) + Number(learning.some(part => REASON.test(part))));

  const experiences = parts.filter(part => PERSONAL.test(part) && PAST.test(part) && ACTION.test(part) && !NEGATED_ACTION.test(part));
  const detailed = experiences.filter(part => DETAIL.test(part));
  const concrete = experiences.length ? 1 + Number(detailed.length > 0) + Number(detailed.some(part => /\d+/.test(part))) + Number(detailed.some(part => REASON.test(part))) : 0;

  const plans = parts.filter(part => PERSONAL.test(part) && FUTURE.test(part) && ACTION.test(part) && !NEGATED_ACTION.test(part));
  const action = plans.length ? 1 + Number(plans.some(part => DETAIL.test(part))) + Number(plans.some(part => TIME.test(part))) + Number(plans.some(part => MEASURE.test(part))) : 0;

  return {
    version: 'rubrik-refleksi-1.0', prompt: prompt.trim(), keywords, confirmed: false, reviewerNote: '',
    criteria: [
      criterion('relevance', 'Relevansi dengan tugas', relevance, relevantParts,
        `${matched.length} dari ${keywords.length} kata topik cocok secara literal${matched.length ? `: ${matched.join(', ')}` : ''}. Skor awal memakai proporsi kecocokan, bukan penilaian makna. Sinonim atau jawaban yang menyebut topik tanpa menjawabnya perlu dikoreksi reviewer.`,
        'Reviewer: 0 belum menjawab tugas; 1 menyebut topik; 2 menjawab sebagian; 3 menjawab inti tugas; 4 menjawab inti dan batas konteksnya dengan tepat.'),
      criterion('reflection', 'Kedalaman refleksi', reflection, [...personalReasoning, ...learning, ...reasoning].filter((part, index, all) => all.indexOf(part) === index),
        `Petunjuk yang diperiksa: alasan/kontras (${reasoning.length ? 'ada' : 'belum terlihat'}), alasan personal (${personalReasoning.length ? 'ada' : 'belum terlihat'}), pembelajaran personal (${learning.length ? 'ada' : 'belum terlihat'}), dan pembelajaran dengan alasan (${learning.some(part => REASON.test(part)) ? 'ada' : 'belum terlihat'}). Masing-masing memberi 1 tingkat awal.`,
        'Reviewer: 0 belum ada refleksi; 1 pernyataan umum; 2 menjelaskan alasan; 3 menghubungkan pengalaman dan pelajaran; 4 mengevaluasi asumsi, keterbatasan, atau perubahan pemahaman.'),
      criterion('concrete', 'Contoh konkret', concrete, [...detailed, ...experiences].filter((part, index, all) => all.indexOf(part) === index),
        `Petunjuk awal: pengalaman personal dengan tindakan (${experiences.length ? 'ada' : 'belum terlihat'}). Detail situasi, angka, dan hubungan sebab/kontras pada pengalaman menambah masing-masing 1 tingkat. Angka tidak membuktikan pengalaman itu benar.`,
        'Reviewer: 0 belum ada contoh; 1 ilustrasi umum; 2 situasi yang dapat dikenali; 3 tindakan dan pihak/kondisi jelas; 4 contoh mendukung argumen dan menunjukkan hasil atau batasannya.'),
      criterion('action', 'Rencana tindakan', action, plans,
        `Petunjuk awal: rencana personal dengan kata tindakan (${plans.length ? 'ada' : 'belum terlihat'}). Detail tindakan, waktu, dan evaluasi/ukuran hasil menambah masing-masing 1 tingkat. Kalimat dengan pola negasi tindakan yang dikenali tidak dihitung sebagai rencana.`,
        'Reviewer: 0 belum ada rencana; 1 niat umum; 2 tindakan spesifik; 3 pelaksana dan waktu jelas; 4 tindakan dapat dievaluasi melalui ukuran atau umpan balik.'),
    ],
  };
}

export function qualityScore(assessment: QualityAssessment): number {
  return Math.round(assessment.criteria.reduce((sum, item) => sum + item.level, 0) / 16 * 100);
}
export function qualityStatus(assessment: QualityAssessment): string {
  return assessment.confirmed ? 'Dikonfirmasi reviewer' : assessment.criteria.some(item => item.level !== item.suggestedLevel) ? 'Koreksi belum dikonfirmasi' : 'Skor awal otomatis';
}
export function updateQualityLevel(assessment: QualityAssessment, id: CriterionId, level: number): QualityAssessment {
  if (!Number.isInteger(level) || level < 0 || level > 4) throw new Error('Tingkat rubrik harus bilangan bulat 0–4.');
  return { ...assessment, confirmed: false, criteria: assessment.criteria.map(item => item.id === id ? { ...item, level } : item) };
}
export function resetQuality(assessment: QualityAssessment): QualityAssessment {
  return { ...assessment, confirmed: false, reviewerNote: '', criteria: assessment.criteria.map(item => ({ ...item, level: item.suggestedLevel })) };
}

/** Competition ranks: equal scores share rank; ties at the tenth place are retained. */
export function rankQuality<T extends { id: number; quality?: QualityAssessment | null }>(rows: T[]): (T & { qualityRank?: number })[] {
  const sorted = rows.filter(row => row.quality).map(row => ({ id: row.id, score: qualityScore(row.quality!) })).sort((a, b) => b.score - a.score || a.id - b.id);
  const ranks = new Map<number, number>();
  let rank = 0;
  sorted.forEach((row, index) => {
    if (index === 0 || row.score !== sorted[index - 1].score) rank = index + 1;
    ranks.set(row.id, rank);
  });
  return rows.map(row => ({ ...row, qualityRank: ranks.get(row.id) }));
}
