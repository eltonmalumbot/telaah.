"use client";

import { useId, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { matchingParticipants, type MatchKind, type Reviewed } from '@/lib/analysis';

const MATCH_TYPES: { kind: MatchKind; label: string; count: 'exactCount' | 'similarCount' | 'response1Count' | 'response2Count' }[] = [
  { kind: 'exact', label: 'Pasangan sama persis', count: 'exactCount' },
  { kind: 'normalized', label: 'Setelah huruf kecil & spasi diseragamkan', count: 'similarCount' },
  { kind: 'response1', label: 'Jawaban 1 sama persis', count: 'response1Count' },
  { kind: 'response2', label: 'Jawaban 2 sama persis', count: 'response2Count' },
];
const PAGE_SIZE = 20;

export function DuplicateMatches({ rows, selected, onSelect }: { rows: Reviewed[]; selected: Reviewed; onSelect: (id: number) => void }) {
  const id = useId();
  const [active, setActive] = useState<MatchKind | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const matches = useMemo(() => active ? matchingParticipants(rows, selected, active).sort((a, b) => Number(b.id === selected.id) - Number(a.id === selected.id)) : [], [rows, selected, active]);
  const filtered = useMemo(() => matches.filter(row => `${row.name} ${row.group}`.toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id'))), [matches, query]);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const label = MATCH_TYPES.find(type => type.kind === active)?.label;

  return <section className="duplicate-details">
    <h3>Kecocokan dalam file</h3>
    <dl>{MATCH_TYPES.map(type => <div key={type.kind}>
      <dt>{type.label}</dt>
      <dd>{selected[type.count] > 0 ? <button type="button" className="match-count" aria-expanded={active === type.kind} aria-controls={`${id}-list`} aria-label={`Lihat ${selected[type.count]} peserta: ${type.label}`} onClick={() => { setActive(current => current === type.kind ? null : type.kind); setQuery(''); setPage(0); }}><span>{selected[type.count].toLocaleString('id')} peserta</span><ChevronDown size={14} aria-hidden="true"/></button> : <span className="muted">0 peserta</span>}</dd>
    </div>)}</dl>
    <p>Klik jumlah peserta untuk melihat nama dan grupnya. Jumlah mencakup peserta ini; 1 berarti tidak ada peserta lain yang cocok, dan 0 berarti teks kosong.</p>
    {active && <section id={`${id}-list`} className="match-list" aria-labelledby={`${id}-heading`}>
      <div className="match-list-heading"><Users size={17} aria-hidden="true"/><h4 id={`${id}-heading`}>{label}</h4></div>
      <p className="match-list-note">{matches.length.toLocaleString('id')} peserta dari seluruh file, termasuk peserta yang sedang dibuka. Filter tabel dan pilihan Top 10 tidak membatasi daftar ini.</p>
      {matches.length > PAGE_SIZE && <Input className="match-search" aria-label="Cari nama atau grup dalam daftar kecocokan" placeholder="Cari nama atau grup…" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }}/>}
      <ul>{visible.map(row => <li key={row.id}>
        <div className="match-person"><strong>{row.name}</strong><span>{row.group || 'Tanpa grup'} · Respons #{row.id}</span>{row.id === selected.id && <small>Peserta ini</small>}</div>
        {row.id !== selected.id && <Button variant="ghost" size="sm" className="match-open" aria-label={`Buka detail ${row.name}, respons ${row.id}`} onClick={() => onSelect(row.id)}>Buka detail<ArrowRight size={14} aria-hidden="true"/></Button>}
      </li>)}</ul>
      {!visible.length && <p className="match-list-note" role="status">Tidak ada nama atau grup yang cocok dengan pencarian.</p>}
      {filtered.length > PAGE_SIZE && <div className="match-pagination"><span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} dari {filtered.length.toLocaleString('id')}</span><div><Button variant="outline" size="icon" aria-label="Halaman kecocokan sebelumnya" disabled={page === 0} onClick={() => setPage(current => current - 1)}><ChevronLeft size={15}/></Button><Button variant="outline" size="icon" aria-label="Halaman kecocokan berikutnya" disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(current => current + 1)}><ChevronRight size={15}/></Button></div></div>}
    </section>}
    <p>Kecocokan teks tidak membuktikan penggunaan AI. Pemeriksaan tidak mencakup kemiripan makna.</p>
    {selected.duration && <p><strong>Durasi sumber:</strong> {selected.duration}. Tidak digunakan untuk menebak kecepatan mengetik atau penggunaan AI.</p>}
  </section>;
}
