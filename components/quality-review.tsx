"use client";

import { useEffect, useId, useState } from 'react';
import { Award, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { QUALITY_NOTE, QUALITY_SCOPE, QUALITY_PROMPT_EXAMPLE, decodeQualityPrompts, encodeQualityPrompts, qualityScore, qualityStatus, resetQuality, topicKeywords, updateQualityLevel, type QualityAssessment } from '@/lib/quality';

export function QualitySetup({ value, onChange, disabled, responseCount }: { value: string; onChange: (value: string) => void; disabled: boolean; responseCount?: number }) {
  const id = useId();
  const [detectedCount, setDetectedCount] = useState(1);
  useEffect(() => {
    const stored = Number(localStorage.getItem('telaah-response-count') || 1);
    if (Number.isFinite(stored)) setDetectedCount(Math.max(1, Math.min(64, stored)));
    const handler = (event: Event) => {
      const count = Number((event as CustomEvent<{ count?: number }>).detail?.count ?? 1);
      if (Number.isFinite(count)) setDetectedCount(Math.max(1, Math.min(64, count)));
    };
    window.addEventListener('telaah:response-count', handler);
    return () => window.removeEventListener('telaah:response-count', handler);
  }, []);
  const count = Math.max(1, Math.min(64, responseCount ?? detectedCount));
  const decoded = decodeQualityPrompts(value);
  const prompts = Array.from({ length: count }, (_, index) => decoded[index] ?? (decoded.length === 1 && count === 1 ? decoded[0] : ''));
  function updatePrompt(index: number, prompt: string) {
    const next = [...prompts]; next[index] = prompt;
    onChange(encodeQualityPrompts(next));
  }
  return <section className="quality-setup">
    <div className="quality-intro"><span className="quality-icon"><Award size={22}/></span><div><h2>Cari jawaban terbaik</h2><p>{count > 1 ? `Tambahkan acuan untuk masing-masing Response 1–${count}. Setiap jawaban dinilai terhadap pertanyaannya sendiri, lalu skor peserta dirata-ratakan.` : 'Tambahkan acuan tugas untuk menilai kualitas refleksi dan menyusun kandidat Top 10.'}</p><span className="quality-badge">Opsional · rubrik 4 aspek · bisa dikoreksi</span></div></div>
    <div className="quality-prompt-stack">{prompts.map((prompt, index) => {
      const fieldId = `${id}-${index}`;
      return <div className="quality-prompt" key={fieldId}><label htmlFor={fieldId}>{count > 1 ? `Pertanyaan / tujuan Response ${index + 1}` : 'Pertanyaan / tujuan tugas'}</label><Textarea id={fieldId} value={prompt} onChange={event => updatePrompt(index, event.target.value)} maxLength={1500} disabled={disabled} placeholder={count > 1 ? `Masukkan pertanyaan yang dijawab oleh Response ${index + 1}` : 'Contoh: Apa pelajaran dari podcast dan tindakan yang akan Anda coba di pekerjaan?'} aria-describedby={`${fieldId}-help`}/><div className="quality-prompt-footer"><p id={`${fieldId}-help`}>{prompt.trim() && !topicKeywords(prompt).length ? 'Tambahkan topik khusus, misalnya inovasi atau pelayanan.' : count > 1 ? `Acuan ini hanya digunakan untuk Response ${index + 1}.` : 'Berlaku saat klik Periksa.'}</p>{index === 0 && <button disabled={disabled} type="button" onClick={() => updatePrompt(index, QUALITY_PROMPT_EXAMPLE)}>Contoh acuan</button>}</div></div>;
    })}</div>
  </section>;
}

export function QualityReviewCard({ quality, onChange }: { quality: QualityAssessment; onChange: (quality: QualityAssessment) => void }) {
  const id = useId();
  return <section className="quality-review" aria-label="Penilaian kualitas jawaban">
    <div className="quality-review-heading"><div><span className="eyebrow">KUALITAS ISI</span><h3>Rubrik jawaban</h3><span className={`quality-badge ${quality.confirmed ? 'confirmed' : ''}`}>{qualityStatus(quality)}</span></div><div className="quality-score"><strong>{qualityScore(quality)}</strong><span>/ 100</span></div></div>
    <p className="quality-context"><strong>Acuan:</strong> {quality.prompt}</p>
    {quality.componentScores?.length ? <div className="quality-component-scores">{quality.componentScores.map(item => <span key={item.response}>Response {item.response}: <strong>{item.score}</strong>/100</span>)}</div> : null}
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
