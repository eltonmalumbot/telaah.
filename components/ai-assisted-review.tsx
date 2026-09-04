"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, HelpCircle, LoaderCircle, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Reviewed } from "@/lib/analysis";
import { AI_REVIEW_LABELS, AI_REVIEW_NOTE, type AIAuthorshipReview } from "@/lib/ai-review";

const STORAGE_PREFIX = "telaah-ai-review:";

function key(sourceName: string, id: number) {
  return `${STORAGE_PREFIX}${sourceName || "project"}:${id}`;
}

function readStored(sourceName: string, id: number): AIAuthorshipReview | null {
  try {
    const raw = localStorage.getItem(key(sourceName, id));
    return raw ? (JSON.parse(raw) as AIAuthorshipReview) : null;
  } catch {
    return null;
  }
}

export function AIAssistedReview({ rows, sourceName }: { rows: Reviewed[]; sourceName: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(rows[0]?.id ?? null);
  const [review, setReview] = useState<AIAuthorshipReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id");
    if (!needle) return rows.slice(0, 60);
    return rows.filter((row) => `${row.name} ${row.group} ${row.email ?? ""} ${row.id}`.toLocaleLowerCase("id").includes(needle)).slice(0, 60);
  }, [rows, query]);

  useEffect(() => {
    if (!selectedId || !open) return;
    setReview(readStored(sourceName, selectedId));
    setError("");
  }, [selectedId, sourceName, open]);

  async function analyze() {
    if (!selected || busy) return;
    const text = [selected.response1, selected.response2].filter(Boolean).join("\n\n").trim();
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, prompt: selected.quality?.prompt ?? "" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Analisis AI gagal.");
      const next = payload as AIAuthorshipReview;
      localStorage.setItem(key(sourceName, selected.id), JSON.stringify(next));
      setReview(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Analisis AI gagal.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Bot size={15}/>Analisis dengan AI</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="analysis-tools-dialog">
        <DialogHeader>
          <DialogTitle>Analisis AI opsional</DialogTitle>
          <DialogDescription>Teks peserta dikirim ke layanan AI hanya setelah Anda menekan tombol analisis. Hasilnya adalah bahan review, bukan vonis kepengarangan.</DialogDescription>
        </DialogHeader>
        <div className="ai-review-layout">
          <aside className="ai-review-picker">
            <div className="search-box"><Search size={16}/><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, grup, email…" /></div>
            <div className="ai-review-list">
              {matches.map((row) => <button type="button" key={row.id} className={row.id === selectedId ? "active" : ""} onClick={() => setSelectedId(row.id)}><strong>{row.name}</strong><small>{row.group || "Tanpa grup"} · Respons #{row.id}</small></button>)}
            </div>
          </aside>
          <section className="ai-review-result">
            {selected ? <>
              <div className="ai-review-person"><div><h3>{selected.name}</h3><p>{selected.group || "Tanpa grup"} · {selected.analysis.words} kata</p></div><Button onClick={analyze} disabled={busy || (!selected.response1.trim() && !selected.response2.trim())}>{busy ? <LoaderCircle className="spin" size={16}/> : <Bot size={16}/>} {review ? "Analisis ulang" : "Mulai analisis AI"}</Button></div>
              <div className="ai-review-privacy"><ShieldAlert size={17}/><p>Mode ini mengirim isi jawaban peserta ke penyedia AI. Nama, grup, dan email tidak dikirim oleh fitur ini.</p></div>
              {error && <div className="error-message" role="alert"><p>{error}</p></div>}
              {review ? <div className="ai-review-card">
                <div className={`ai-review-level ${review.level}`}><span>TINGKAT TINJAUAN</span><strong>{AI_REVIEW_LABELS[review.level]}</strong></div>
                <p className="ai-review-summary">{review.summary}</p>
                <div className="ai-review-columns">
                  <section><h4><ShieldAlert size={15}/>Petunjuk yang perlu ditinjau</h4>{review.cues.length ? <ul>{review.cues.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>Tidak ada petunjuk khusus yang dicatat.</p>}</section>
                  <section><h4><CheckCircle2 size={15}/>Bukti tandingan / konteks personal</h4>{review.counterEvidence.length ? <ul>{review.counterEvidence.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>Tidak ada bukti tandingan khusus yang dicatat.</p>}</section>
                </div>
                <section className="ai-review-questions"><h4><HelpCircle size={15}/>Pertanyaan verifikasi</h4><ol>{review.verificationQuestions.map((item, index) => <li key={index}>{item}</li>)}</ol></section>
                <p className="ai-review-meta">Model: {review.model} · {new Date(review.analyzedAt).toLocaleString("id-ID")}</p>
                <p className="ai-review-note">{AI_REVIEW_NOTE}</p>
              </div> : <div className="tools-empty"><Bot size={28}/><p>Pilih peserta lalu tekan <strong>Mulai analisis AI</strong>. Tidak ada jawaban yang dikirim sebelum tombol ditekan.</p></div>}
            </> : <div className="tools-empty"><p>Pilih peserta untuk memulai.</p></div>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
