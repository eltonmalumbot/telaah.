"use client";

import { useId } from 'react';
import { Award, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { QUALITY_NOTE, QUALITY_SCOPE, QUALITY_PROMPT_EXAMPLE, qualityScore, qualityStatus, resetQuality, topicKeywords, updateQualityLevel, type QualityAssessment } from '@/lib/quality';

export function QualitySetup({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const id = useId();
  return <section className="quality-setup">
    <div className="quality-intro"><span className="quality-icon"><Award size={22}/></span><div><h2>Cari jawaban terbaik</h2><p>Tambahkan acuan tugas untuk menilai kualitas refleksi dan menyusun kandidat Top 10.</p><span className="quality-badge">Opsional · rubrik 4 aspek · bisa dikoreksi</span></div></div>
    <div className="quality-prompt"><label htmlFor={id}>Pertanyaan / tujuan tugas</label><Textarea id={id} value={value} onChange={event => onChange(event.target.value)} maxLength={1500} disabled={disabled} placeholder="Contoh: Apa pelajaran dari podcast dan tindakan yang akan Anda coba di pekerjaan?" aria-describedby={`${id}-help`}/><div className="quality-prompt-footer"><p id={`${id}-help`}>{value.trim() && !topicKeywords(value).length ? 'Tambahkan topik khusus, misalnya inovasi atau pelayanan.' : 'Berlaku saat klik Periksa. Dua jawaban peserta dinilai bersama sebagai satu refleksi.'}</p><button disabled={disabled} type="button" onClick={() => onChange(QUALITY_PROMPT_EXAMPLE)}>Contoh acuan</button></div></div>
  </section>;
}

export function QualityReviewCard({ quality, onChange }: { quality: QualityAssessment; onChange: (quality: QualityAssessment) => void }) {
  const id = useId();
  return <section className="quality-review" aria-label="Penilaian kualitas jawaban">
    <div className="quality-review-heading"><div><span className="eyebrow">KUALITAS ISI</span><h3>Rubrik jawaban</h3><span className={`quality-badge ${quality.confirmed ? 'confirmed' : ''}`}>{qualityStatus(quality)}</span></div><div className="quality-score"><strong>{qualityScore(quality)}</strong><span>/ 100</span></div></div>
    <p className="quality-context"><strong>Acuan:</strong> {quality.prompt}</p>
    <p className="quality-disclosure">{QUALITY_NOTE}</p>
    <div className="quality-criteria">{quality.criteria.map(item => <article key={item.id}>
      <div className="quality-criterion-heading"><div><h4>{item.title}</h4><span>Bobot 25 poin · saran awal {item.suggestedLevel}/4</span></div><label className="quality-level">Tingkat<select aria-label={`Tingkat ${item.title}`} value={item.level} onChange={event => onChange(updateQualityLevel(quality, item.id, Number(event.target.value)))}>{[0, 1, 2, 3, 4].map(level => <option key={level} value={level}>{level} / 4</option>)}</select></label></div>
      <p className="quality-guidance">{item.guidance}</p>
      <details><summary>Alasan &amp; kutipan saran awal</summary><p>{item.explanation}</p>{item.evidence.length ? item.evidence.map((quote, index) => <blockquote key={index}>{quote}</blockquote>) : <p>Belum ada petunjuk yang cocok dengan aturan. Ini bukan bukti bahwa aspek tersebut tidak ada.</p>}</details>
    </article>)}</div>
    <label className="quality-note-label" htmlFor={id}>Catatan reviewer (opsional)</label><Textarea id={id} value={quality.reviewerNote} maxLength={1500} placeholder="Jelaskan koreksi atau alasan memilih jawaban ini…" onChange={event => onChange({ ...quality, reviewerNote: event.target.value, confirmed: false })}/>
    <div className="quality-review-actions"><Button variant="outline" size="sm" onClick={() => onChange(resetQuality(quality))}><RotateCcw size={14}/>Reset saran</Button><Button size="sm" disabled={quality.confirmed} onClick={() => onChange({ ...quality, confirmed: true })}><Check size={15}/>{quality.confirmed ? 'Sudah dikonfirmasi' : 'Konfirmasi penilaian'}</Button></div>
    <p className="quality-disclosure">{QUALITY_SCOPE} Koreksi berlaku selama halaman terbuka; unduh PDF/CSV untuk menyimpannya.</p>
  </section>;
}
