"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, GitCompareArrows, Save, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { qualityScore, rankQuality } from "@/lib/quality";
import type { Reviewed } from "@/lib/analysis";

type StoredAnalysis = { id: string; name: string; sourceName: string; updatedAt: string; rows: Reviewed[] };
const DB = "telaah-projects";
const STORE = "analyses";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function listProjects(): Promise<StoredAnalysis[]> {
  const db = await database();
  return new Promise((resolve, reject) => { const request = db.transaction(STORE).objectStore(STORE).getAll(); request.onsuccess = () => resolve((request.result as StoredAnalysis[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); request.onerror = () => reject(request.error); });
}
async function putProject(project: StoredAnalysis) { const db = await database(); return new Promise<void>((resolve, reject) => { const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(project); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }
async function deleteProject(id: string) { const db = await database(); return new Promise<void>((resolve, reject) => { const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }

export function AnalysisTools({ rows, sourceName, onLoad }: { rows: Reviewed[]; sourceName: string; onLoad: (rows: Reviewed[], sourceName: string) => void }) {
  const [compareOpen, setCompareOpen] = useState(false); const [projectsOpen, setProjectsOpen] = useState(false);
  const [first, setFirst] = useState(String(rows[0]?.id ?? "")); const [second, setSecond] = useState(String(rows[1]?.id ?? ""));
  const [projects, setProjects] = useState<StoredAnalysis[]>([]); const [projectName, setProjectName] = useState(""); const [message, setMessage] = useState("");
  const ranked = useMemo(() => rankQuality(rows), [rows]);
  const top = ranked.filter((row) => row.qualityRank !== undefined && row.qualityRank <= 10);
  const a = rows.find((row) => String(row.id) === first); const b = rows.find((row) => String(row.id) === second);
  useEffect(() => { if (projectsOpen) listProjects().then(setProjects).catch(() => setMessage("Proyek tersimpan belum dapat dibaca.")); }, [projectsOpen]);
  async function save() { const name = projectName.trim() || sourceName || "Analisis tanpa nama"; const project: StoredAnalysis = { id: crypto.randomUUID(), name: name.slice(0, 80), sourceName, updatedAt: new Date().toISOString(), rows }; await putProject(project); setProjects(await listProjects()); setProjectName(""); setMessage(`Proyek “${project.name}” disimpan.`); }
  return <>
    <div className="analysis-summary">
      <div><Trophy size={19} /><strong>{top.length}</strong><span>Kandidat Top 10</span></div>
      <div><Save size={19} /><strong>{rows.filter((row) => row.quality?.confirmed).length}</strong><span>Nilai dikonfirmasi</span></div>
      <div className="analysis-tool-actions"><Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}><GitCompareArrows size={15} />Bandingkan 2 peserta</Button><Button size="sm" variant="outline" onClick={() => setProjectsOpen(true)}><Archive size={15} />Proyek analisis</Button></div>
    </div>
    <Dialog open={compareOpen} onOpenChange={setCompareOpen}><DialogContent className="analysis-tools-dialog"><DialogHeader><DialogTitle>Bandingkan dua peserta</DialogTitle><DialogDescription>Periksa kualitas, pola bahasa, duplikasi, dan jawaban secara berdampingan.</DialogDescription></DialogHeader><div className="compare-selects"><select value={first} onChange={(event) => setFirst(event.target.value)}>{rows.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.group}</option>)}</select><select value={second} onChange={(event) => setSecond(event.target.value)}>{rows.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.group}</option>)}</select></div><div className="compare-grid">{[a, b].map((row, index) => row ? <article key={row.id}><h3>{row.name}</h3><small>{row.group}</small><dl><div><dt>Kualitas</dt><dd>{row.quality ? `${qualityScore(row.quality)}/100` : "Belum dinilai"}</dd></div><div><dt>Pola bahasa</dt><dd>{row.analysis.signals.length}</dd></div><div><dt>Jawaban identik</dt><dd>{row.exactCount || "Tidak ada"}</dd></div><div><dt>Jumlah kata</dt><dd>{row.analysis.words}</dd></div></dl><h4>Jawaban 1</h4><p>{row.response1 || "Tidak ada jawaban."}</p>{row.response2 && <><h4>Jawaban 2</h4><p>{row.response2}</p></>}</article> : <p key={index}>Pilih peserta.</p>)}</div></DialogContent></Dialog>
    <Dialog open={projectsOpen} onOpenChange={setProjectsOpen}><DialogContent className="analysis-tools-dialog project-dialog"><DialogHeader><DialogTitle>Proyek analisis tersimpan</DialogTitle><DialogDescription>Simpan seluruh hasil penilaian di browser ini dan lanjutkan nanti.</DialogDescription></DialogHeader><div className="project-save"><Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder={sourceName || "Nama proyek"} maxLength={80} /><Button onClick={save} disabled={!rows.length}><Save size={15} />Simpan saat ini</Button></div>{message && <p className="project-message">{message}</p>}<div className="project-list">{projects.map((project) => <article key={project.id}><button type="button" onClick={() => { onLoad(project.rows, project.sourceName); setProjectsOpen(false); }}><strong>{project.name}</strong><small>{project.rows.length.toLocaleString("id")} peserta · {new Date(project.updatedAt).toLocaleString("id-ID")}</small></button><Button variant="ghost" size="icon" aria-label={`Hapus ${project.name}`} onClick={async () => { await deleteProject(project.id); setProjects(await listProjects()); }}><Trash2 size={15} /></Button></article>)}{!projects.length && <p>Belum ada proyek tersimpan.</p>}</div></DialogContent></Dialog>
  </>;
}
