"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Archive, BarChart3, Check, ChevronDown, GitCompareArrows, Save, Search, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { qualityScore, qualityStatus, rankQuality } from "@/lib/quality";
import type { Reviewed } from "@/lib/analysis";

type StoredAnalysis = { id: string; name: string; sourceName: string; updatedAt: string; rows: Reviewed[] };
const DB = "telaah-projects";
const STORE = "analyses";
const SEARCH_LIMIT = 80;

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function listProjects(): Promise<StoredAnalysis[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as StoredAnalysis[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    request.onerror = () => reject(request.error);
  });
}
async function putProject(project: StoredAnalysis) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(project);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
async function deleteProject(id: string) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}

function normalize(value: string) { return value.normalize("NFKC").toLocaleLowerCase("id").replace(/\s+/g, " ").trim(); }

function ParticipantPicker({ label, rows, value, excludedId, onChange }: { label: string; rows: Reviewed[]; value: string; excludedId?: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const deferredQuery = useDeferredValue(query);
  const selected = useMemo(() => rows.find((row) => String(row.id) === value), [rows, value]);
  const matches = useMemo(() => {
    const needle = normalize(deferredQuery);
    const available = rows.filter((row) => String(row.id) !== excludedId);
    if (!needle) return available.slice(0, SEARCH_LIMIT);
    return available.filter((row) => normalize(`${row.name} ${row.group} ${row.email ?? ""} ${row.id}`).includes(needle)).slice(0, SEARCH_LIMIT);
  }, [rows, deferredQuery, excludedId]);
  return <div className="participant-picker"><span>{label}</span><Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={`${label}: ${selected?.name ?? "belum dipilih"}`} className="participant-picker-trigger"><div>{selected ? <><strong>{selected.name}</strong><small>{selected.group} · Respons #{selected.id}</small></> : <span>Pilih peserta</span>}</div><ChevronDown size={16} /></Button></PopoverTrigger><PopoverContent className="participant-picker-popover" align="start"><Command shouldFilter={false}><CommandInput value={query} onValueChange={setQuery} placeholder="Cari nama, grup, email, atau nomor…" /><CommandList><CommandEmpty>Tidak ada peserta yang cocok.</CommandEmpty><CommandGroup heading={`${matches.length}${matches.length === SEARCH_LIMIT ? "+" : ""} hasil ditampilkan`}>
    {matches.map((row) => <CommandItem key={row.id} value={String(row.id)} onSelect={() => { onChange(String(row.id)); setOpen(false); setQuery(""); }}><Check className={String(row.id) === value ? "picker-check visible" : "picker-check"} /><div><strong>{row.name}</strong><small>{row.group} · Respons #{row.id}{row.quality ? ` · ${qualityScore(row.quality)}/100` : ""}</small></div></CommandItem>)}
  </CommandGroup></CommandList></Command></PopoverContent></Popover></div>;
}

function criterionLabel(id: string) { return ({ relevance: "Relevansi", reflection: "Refleksi", concrete: "Contoh konkret", action: "Rencana tindakan" } as Record<string, string>)[id] ?? id; }
function qualitySummary(row: Reviewed) {
  if (!row.quality) return "Belum ada penilaian karena acuan tugas belum diisi.";
  const sorted = [...row.quality.criteria].sort((a, b) => b.level - a.level);
  const strongest = sorted.filter((item) => item.level === sorted[0].level).map((item) => criterionLabel(item.id)).join(", ");
  const weakest = sorted.filter((item) => item.level === sorted[sorted.length - 1].level).map((item) => criterionLabel(item.id)).join(", ");
  return `Kekuatan tertinggi: ${strongest}. Area yang perlu ditinjau: ${weakest}.`;
}

function RubricScores({ row }: { row: Reviewed }) {
  if (!row.quality) return <p className="rubric-empty">Belum dinilai.</p>;
  return <div className="rubric-scores">{row.quality.criteria.map((criterion) => <div key={criterion.id}><span>{criterionLabel(criterion.id)}</span><div aria-hidden="true"><i style={{ width: `${criterion.level * 25}%` }} /></div><strong>{criterion.level}/4</strong></div>)}</div>;
}

function ComparisonCard({ row }: { row?: Reviewed }) {
  if (!row) return <p className="compare-empty">Pilih peserta untuk melihat perbandingan.</p>;
  return <article><div className="compare-person-heading"><div><h3>{row.name}</h3><small>{row.group} · Respons #{row.id}</small></div>{row.quality && <strong>{qualityScore(row.quality)}<small>/100</small></strong>}</div><RubricScores row={row} /><p className="quality-summary-text">{qualitySummary(row)}</p><dl><div><dt>Status penilaian</dt><dd>{row.quality ? qualityStatus(row.quality) : "Belum dinilai"}</dd></div><div><dt>Pola bahasa</dt><dd>{row.analysis.signals.length}</dd></div><div><dt>Jawaban identik</dt><dd>{row.exactCount > 1 ? `${row.exactCount} peserta` : "Tidak ditemukan"}</dd></div><div><dt>Jumlah kata</dt><dd>{row.analysis.words}</dd></div></dl><h4>Jawaban 1</h4><p className="compare-answer">{row.response1 || "Tidak ada jawaban."}</p>{row.response2 && <><h4>Jawaban 2</h4><p className="compare-answer">{row.response2}</p></>}</article>;
}

export function AnalysisTools({ rows, sourceName, onLoad }: { rows: Reviewed[]; sourceName: string; onLoad: (rows: Reviewed[], sourceName: string) => void }) {
  const [dashboardOpen, setDashboardOpen] = useState(false); const [compareOpen, setCompareOpen] = useState(false); const [topOpen, setTopOpen] = useState(false); const [projectsOpen, setProjectsOpen] = useState(false);
  const [first, setFirst] = useState(String(rows[0]?.id ?? "")); const [second, setSecond] = useState(String(rows[1]?.id ?? ""));
  const [projects, setProjects] = useState<StoredAnalysis[]>([]); const [projectName, setProjectName] = useState(""); const [message, setMessage] = useState("");
  const ranked = useMemo(() => rankQuality(rows).filter((row) => row.quality).sort((a, b) => (a.qualityRank ?? Infinity) - (b.qualityRank ?? Infinity) || a.id - b.id), [rows]);
  const top = useMemo(() => ranked.filter((row) => (row.qualityRank ?? Infinity) <= 10), [ranked]);
  const rowMap = useMemo(() => new Map(rows.map((row) => [String(row.id), row])), [rows]); const a = rowMap.get(first); const b = rowMap.get(second);
  useEffect(() => { if (projectsOpen) listProjects().then(setProjects).catch(() => setMessage("Proyek tersimpan belum dapat dibaca.")); }, [projectsOpen]);
  async function save() { const name = projectName.trim() || sourceName || "Analisis tanpa nama"; const project: StoredAnalysis = { id: crypto.randomUUID(), name: name.slice(0, 80), sourceName, updatedAt: new Date().toISOString(), rows }; await putProject(project); setProjects(await listProjects()); setProjectName(""); setMessage(`Proyek “${project.name}” disimpan.`); }
  function compareCandidate(row: Reviewed) { setFirst(String(row.id)); if (String(row.id) === second) setSecond(String(rows.find((item) => item.id !== row.id)?.id ?? "")); setTopOpen(false); setCompareOpen(true); }
  return <>
    <div className="analysis-summary">
      <button type="button" className="analysis-summary-stat" onClick={() => setTopOpen(true)} disabled={!top.length}><Trophy size={19} /><strong>{top.length}</strong><span>Kandidat Top 10</span><small>Lihat rincian penilaian</small></button>
      <div><Save size={19} /><strong>{rows.filter((row) => row.quality?.confirmed).length}</strong><span>Nilai dikonfirmasi</span></div>
      <div className="analysis-tool-actions"><Button size="sm" onClick={() => setDashboardOpen(true)}><BarChart3 size={15} />Dashboard analisis</Button><Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}><GitCompareArrows size={15} />Bandingkan 2 peserta</Button><Button size="sm" variant="outline" onClick={() => setProjectsOpen(true)}><Archive size={15} />Proyek analisis</Button></div>
    </div>

    <Dialog open={dashboardOpen} onOpenChange={setDashboardOpen}><DialogContent className="analysis-tools-dialog dashboard-dialog"><DialogHeader><DialogTitle>Dashboard Analisis</DialogTitle><DialogDescription>Ringkasan interaktif seluruh respons, kualitas jawaban, pola bahasa, duplikasi, grup, dan progres reviewer.</DialogDescription></DialogHeader><AnalysisDashboard rows={rows} sourceName={sourceName} /></DialogContent></Dialog>

    <Dialog open={topOpen} onOpenChange={setTopOpen}><DialogContent className="analysis-tools-dialog top-candidates-dialog"><DialogHeader><DialogTitle>Penilaian Kandidat Top 10</DialogTitle><DialogDescription>Peringkat berdasarkan rubrik kualitas saat ini. Skor awal otomatis perlu diperiksa dan dikonfirmasi reviewer.</DialogDescription></DialogHeader>{top.length ? <div className="top-candidate-list">{top.map((row) => <article key={row.id}><div className="candidate-rank"><span>#{row.qualityRank}</span><strong>{qualityScore(row.quality!)}</strong><small>/100</small></div><div className="candidate-content"><div className="candidate-heading"><div><h3>{row.name}</h3><p>{row.group} · Respons #{row.id}</p></div><span className={row.quality?.confirmed ? "review-status confirmed" : "review-status"}>{row.quality ? qualityStatus(row.quality) : "Belum dinilai"}</span></div><RubricScores row={row} /><p className="quality-summary-text">{qualitySummary(row)}</p></div><Button size="sm" variant="outline" onClick={() => compareCandidate(row)}><GitCompareArrows size={14} />Bandingkan</Button></article>)}</div> : <div className="tools-empty"><Search size={24} /><p>Belum ada kandidat. Isi acuan tugas lalu periksa file untuk membuat penilaian.</p></div>}</DialogContent></Dialog>

    <Dialog open={compareOpen} onOpenChange={setCompareOpen}><DialogContent className="analysis-tools-dialog"><DialogHeader><DialogTitle>Bandingkan dua peserta</DialogTitle><DialogDescription>Cari nama, grup, email, atau nomor respons. Penilaian dan jawaban ditampilkan berdampingan.</DialogDescription></DialogHeader><div className="compare-selects"><ParticipantPicker label="Peserta pertama" rows={rows} value={first} excludedId={second} onChange={setFirst} /><ParticipantPicker label="Peserta kedua" rows={rows} value={second} excludedId={first} onChange={setSecond} /></div><div className="compare-grid"><ComparisonCard row={a} /><ComparisonCard row={b} /></div></DialogContent></Dialog>

    <Dialog open={projectsOpen} onOpenChange={setProjectsOpen}><DialogContent className="analysis-tools-dialog project-dialog"><DialogHeader><DialogTitle>Proyek analisis tersimpan</DialogTitle><DialogDescription>Simpan seluruh hasil penilaian di browser ini dan lanjutkan nanti.</DialogDescription></DialogHeader><div className="project-save"><Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder={sourceName || "Nama proyek"} maxLength={80} /><Button onClick={save} disabled={!rows.length}><Save size={15} />Simpan saat ini</Button></div>{message && <p className="project-message">{message}</p>}<div className="project-list">{projects.map((project) => <article key={project.id}><button type="button" onClick={() => { onLoad(project.rows, project.sourceName); setProjectsOpen(false); }}><strong>{project.name}</strong><small>{project.rows.length.toLocaleString("id")} peserta · {new Date(project.updatedAt).toLocaleString("id-ID")}</small></button><Button variant="ghost" size="icon" aria-label={`Hapus ${project.name}`} onClick={async () => { await deleteProject(project.id); setProjects(await listProjects()); }}><Trash2 size={15} /></Button></article>)}{!projects.length && <p>Belum ada proyek tersimpan.</p>}</div></DialogContent></Dialog>
  </>;
}
