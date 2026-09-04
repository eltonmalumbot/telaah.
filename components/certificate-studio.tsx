"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Award, ChevronLeft, ChevronRight, Download, FileUp, ImagePlus, LoaderCircle, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CERTIFICATE_FIELDS, CERTIFICATE_LIMIT, CERTIFICATE_TEMPLATES, decodeCertificateImage, defaultCertificateDesign, loadCertificateImage, manualCertificateRecipients, parseCertificateDesign, validateCertificateBatch, type CertificateDesign, type CertificateRecipient } from '@/lib/certificate';
import { loadReportFont } from '@/lib/pdf-font';
import type { Reviewed } from '@/lib/analysis';
import type { CertificateScene } from '@/lib/certificate-render';

type AssetKey = 'logo1' | 'logo2' | 'signature1' | 'signature2';
const ASSETS: { key: AssetKey; label: string }[] = [{ key: 'logo1', label: 'Logo utama' }, { key: 'logo2', label: 'Logo kedua (opsional)' }, { key: 'signature1', label: 'Tanda tangan 1 (opsional)' }, { key: 'signature2', label: 'Tanda tangan 2 (opsional)' }];

function saveFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CertificatePreview({ scene, name }: { scene: CertificateScene; name: string }) {
  return <svg viewBox="0 0 297 210" className="certificate-preview" role="img" aria-label={`Pratinjau sertifikat untuk ${name}`}>
    {scene.nodes.map((node, i) => {
      if (node.kind === 'text') return <text key={i} x={node.x} y={node.y} fill={node.color} fontFamily="TelaahCertificate, sans-serif" fontSize={node.size * 25.4 / 72} textAnchor={node.align === 'center' ? 'middle' : 'start'} xmlSpace="preserve">{node.text}</text>;
      if (node.kind === 'image') return <image key={i} href={node.data} x={node.x} y={node.y} width={node.width} height={node.height}/>;
      if (node.kind === 'line') return <line key={i} x1={node.x} y1={node.y} x2={node.x2} y2={node.y2} stroke={node.stroke} strokeWidth={node.strokeWidth}/>;
      const paint = { fill: node.fill ?? 'none', stroke: node.stroke ?? 'none', strokeWidth: node.strokeWidth };
      if (node.kind === 'rect') return <rect key={i} x={node.x} y={node.y} width={node.width} height={node.height} {...paint}/>;
      if (node.kind === 'circle') return <circle key={i} cx={node.x} cy={node.y} r={node.radius} {...paint}/>;
      return <polygon key={i} points={node.points.map(point => point.join(',')).join(' ')} {...paint}/>;
    })}
  </svg>;
}

export default function CertificateStudio({ rows, datasetKey }: { rows: Reviewed[]; datasetKey: string }) {
  const id = useId();
  const [design, setDesign] = useState<CertificateDesign>(() => defaultCertificateDesign());
  const [mode, setMode] = useState<'manual' | 'file'>('manual');
  const [names, setNames] = useState('');
  const [selection, setSelection] = useState<{ datasetKey: string; ids: number[] }>({ datasetKey: '', ids: [] });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [working, setWorking] = useState<'pdf' | 'image' | 'design' | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const designFile = useRef<HTMLInputElement>(null);
  const assetRefs = useRef<Partial<Record<AssetKey, HTMLInputElement | null>>>({});
  const chosen = useMemo(() => new Set(selection.datasetKey === datasetKey ? selection.ids : []), [selection, datasetKey]);
  const matchingRows = useMemo(() => rows.filter(row => `${row.name} ${row.group}`.toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id'))), [rows, query]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(matchingRows.length / 20) - 1));
  const recipientsState = useMemo(() => {
    try {
      const recipients: CertificateRecipient[] = mode === 'manual' ? manualCertificateRecipients(names) : rows.filter(row => chosen.has(row.id)).map(row => ({ id: `file-${row.id}`, name: row.name, group: row.group }));
      return { recipients, error: '' };
    } catch (cause) { return { recipients: [], error: cause instanceof Error ? cause.message : 'Daftar penerima tidak valid.' }; }
  }, [mode, names, rows, chosen]);
  const recipients = recipientsState.recipients;
  const currentIndex = Math.min(previewIndex, Math.max(0, recipients.length - 1));
  const recipient = useMemo(() => recipients[currentIndex] ?? { id: 'example', name: 'Nama Peserta', group: 'Grup / bagian' }, [recipients, currentIndex]);
  const [retry, setRetry] = useState(0);
  const snapshot = useMemo(() => ({ design, recipient, index: currentIndex, retry }), [design, recipient, currentIndex, retry]);
  const [preview, setPreview] = useState<{ snapshot: typeof snapshot; scene?: CertificateScene; error?: string } | null>(null);
  const previewPending = preview?.snapshot !== snapshot;
  const previewError = preview?.snapshot === snapshot ? preview.error : '';

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const [{ previewCertificate }, font] = await Promise.all([import('@/lib/certificate-render'), loadReportFont()]);
        await document.fonts.load('16px TelaahCertificate');
        const scene = previewCertificate(snapshot.design, snapshot.recipient, snapshot.index, font);
        if (!cancelled) setPreview({ snapshot, scene });
      } catch (cause) { if (!cancelled) setPreview({ snapshot, error: cause instanceof Error ? cause.message : 'Pratinjau belum dapat dibuat.' }); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [snapshot]);

  function update<K extends keyof CertificateDesign>(key: K, value: CertificateDesign[K]) {
    setDesign(current => ({ ...current, [key]: value })); setError(''); setNotice('');
  }
  function field(key: keyof CertificateDesign, multiline = false) {
    const config = CERTIFICATE_FIELDS.find(item => item.key === key)!;
    const props = { id: `${id}-${key}`, value: String(design[key]), maxLength: config.max, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(key, event.target.value) };
    return <label className="certificate-field" htmlFor={props.id}><span>{config.label}</span>{multiline ? <Textarea {...props} rows={4}/> : <Input {...props}/>}</label>;
  }
  async function uploadImage(key: AssetKey, file?: File) {
    if (!file || working) return;
    setWorking('image'); setError('');
    try { update(key, await loadCertificateImage(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Gambar tidak dapat dimuat.'); }
    finally { setWorking(null); if (assetRefs.current[key]) assetRefs.current[key]!.value = ''; }
  }
  async function importDesign(file?: File) {
    if (!file || working) return;
    setWorking('design'); setError(''); setNotice('');
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error('File desain maksimal 12 MB.');
      const next = parseCertificateDesign(JSON.parse(await file.text()));
      await Promise.all(ASSETS.map(asset => next[asset.key] ? decodeCertificateImage(next[asset.key]!.data) : Promise.resolve()));
      setDesign(next); setNotice('Desain dimuat. Periksa penerima dan nomor awal sebelum mengunduh.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Desain tidak dapat dimuat.'); }
    finally { setWorking(null); if (designFile.current) designFile.current.value = ''; }
  }
  function exportDesign() {
    try { const valid = parseCertificateDesign(design); saveFile(JSON.stringify(valid, null, 2), `desain-sertifikat-${valid.template}.json`, 'application/json'); setNotice('Desain disimpan beserta teks, logo, dan gambar tanda tangan.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Desain tidak dapat disimpan.'); }
  }
  async function downloadPDF(single: boolean) {
    if (working) return;
    setError(''); setNotice('');
    try {
      if (recipientsState.error) throw new Error(recipientsState.error);
      const target = single ? recipients.slice(currentIndex, currentIndex + 1) : recipients;
      const config = single ? { ...design, startNumber: design.startNumber + currentIndex } : design;
      validateCertificateBatch(config, target);
      setWorking('pdf'); setProgress(0);
      const [{ buildCertificates }, font] = await Promise.all([import('@/lib/certificate-render'), loadReportFont()]);
      const pdf = await buildCertificates(config, target, font, setProgress);
      const name = single ? target[0].name.replace(/[^\p{L}\p{N}-]+/gu, '-').slice(0, 60) : `${target.length}-penerima`;
      pdf.save(`sertifikat-${name}-${config.date}.pdf`);
      setNotice(`${target.length} sertifikat berhasil dibuat. Setiap penerima mendapat satu halaman PDF.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'PDF belum dapat dibuat.'); }
    finally { setWorking(null); }
  }
  function selectIds(ids: number[]) {
    if (ids.length > CERTIFICATE_LIMIT) { setError(`Maksimal ${CERTIFICATE_LIMIT} penerima per unduhan. Persempit pencarian nama atau grup.`); return; }
    setSelection({ datasetKey, ids }); setError('');
  }

  return <section className="certificate-studio">
    <header className="certificate-studio-heading"><div><span className="eyebrow">STUDIO SERTIFIKAT</span><h2>Apresiasi yang bisa Anda sesuaikan.</h2><p>Pilih desain, atur isi, lalu unduh sertifikat yang siap dicetak.</p></div><div className="export-actions"><Button variant="outline" disabled={!!working} onClick={() => designFile.current?.click()}><FileUp size={16}/>Muat desain</Button><Button variant="outline" disabled={!!working} onClick={exportDesign}><Save size={16}/>Simpan desain</Button><input ref={designFile} type="file" accept=".json,application/json" className="sr-only" aria-label="Muat desain sertifikat" onChange={event => importDesign(event.target.files?.[0])}/></div></header>
    <div className="certificate-template-heading"><strong>{CERTIFICATE_TEMPLATES.length} pilihan desain</strong><span>Pilih gaya yang sesuai dengan acara Anda</span></div>
    <div className="certificate-templates" role="group" aria-label="Pilih template sertifikat">{CERTIFICATE_TEMPLATES.map(template => <button type="button" key={template.id} className={`certificate-template ${design.template === template.id ? 'selected' : ''}`} aria-pressed={design.template === template.id} disabled={!!working} onClick={() => setDesign(current => ({ ...current, template: template.id, ink: template.ink, accent: template.accent }))}><span className={`template-swatch swatch-${template.id}`} style={{ '--template-ink': template.ink, '--template-accent': template.accent } as React.CSSProperties}><Award size={23}/><i/><i/></span><strong>{template.name}</strong><small>{template.description}</small></button>)}</div>
    <div className="certificate-layout">
      <fieldset className="certificate-controls" disabled={!!working}>
        <details open className="certificate-panel"><summary>Penerima sertifikat <span>{recipients.length} dipilih</span></summary><div className="certificate-panel-body"><div className="certificate-mode" role="group" aria-label="Sumber nama penerima"><button type="button" aria-pressed={mode === 'manual'} onClick={() => { setMode('manual'); setPreviewIndex(0); }}>Isi manual</button><button type="button" aria-pressed={mode === 'file'} onClick={() => { setMode('file'); setPreviewIndex(0); }}>Dari file peserta</button></div>
          {mode === 'manual' ? <label className="certificate-field"><span>Nama penerima</span><Textarea rows={4} maxLength={50000} value={names} onChange={event => { setNames(event.target.value); setPreviewIndex(0); }} placeholder={'Nama Peserta\nNama Peserta Lain | BPA'}/><small>Satu nama per baris. Grup opsional: Nama | Grup. Maksimal {CERTIFICATE_LIMIT} penerima.</small></label> : !rows.length ? <p className="certificate-help">Unggah dan periksa file pada tab <strong>File peserta</strong>, lalu kembali ke sini. Desain tetap tersedia saat berpindah tab.</p> : <div className="certificate-recipient-picker"><Input aria-label="Cari penerima dari file" placeholder="Cari nama atau grup…" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }}/><div className="certificate-selection-actions"><button type="button" onClick={() => selectIds([...new Set([...chosen, ...matchingRows.map(row => row.id)])])}>Pilih hasil pencarian ({matchingRows.length})</button><button type="button" onClick={() => selectIds([])}>Kosongkan</button></div><div className="certificate-recipient-list">{matchingRows.slice(currentPage * 20, (currentPage + 1) * 20).map(row => <label key={row.id}><input type="checkbox" checked={chosen.has(row.id)} onChange={event => selectIds(event.target.checked ? [...chosen, row.id] : [...chosen].filter(item => item !== row.id))}/><span>{row.name}<small>{row.group} · Respons #{row.id}</small></span></label>)}{!matchingRows.length && <p>Tidak ada peserta yang cocok.</p>}</div>{matchingRows.length > 20 && <div className="certificate-picker-pages"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Sebelumnya</button><span>{currentPage + 1} / {Math.ceil(matchingRows.length / 20)}</span><button type="button" disabled={(currentPage + 1) * 20 >= matchingRows.length} onClick={() => setPage(currentPage + 1)}>Berikutnya</button></div>}<p className="certificate-help">Pilih penerima secara manual dari seluruh file. Nomor mengikuti urutan peserta dalam file, terpisah dari filter dan peringkat analisis.</p></div>}
          <label className="certificate-check"><input type="checkbox" checked={design.showGroup} onChange={event => update('showGroup', event.target.checked)}/>Tampilkan grup di bawah nama</label>
        </div></details>
        <details open className="certificate-panel"><summary>Isi sertifikat</summary><div className="certificate-panel-body">{field('organizer')}{field('title')}{field('subtitle')}{field('introduction')}{field('event')}{field('body', true)}<p className="certificate-help">Teks dinamis: {'{nama}'}, {'{grup}'}, {'{acara}'}, {'{penyelenggara}'}, {'{tanggal}'}, {'{tempat}'}, {'{nomor}'}. Ukuran huruf menyesuaikan panjang teks.</p></div></details>
        <details className="certificate-panel"><summary>Nomor, tanggal &amp; catatan</summary><div className="certificate-panel-body">{field('numberPattern')}<p className="certificate-help">Gunakan {'{tahun}'} dan {'{urutan}'} untuk nomor berurutan. Kosongkan pola bila tidak memakai nomor. Nomor tidak dicatat pada registri penerbitan.</p><label className="certificate-field"><span>Nomor awal</span><Input type="number" min={1} max={999999} value={design.startNumber} onChange={event => update('startNumber', Number(event.target.value))}/></label><label className="certificate-field"><span>Tanggal kegiatan</span><Input type="date" value={design.date} onChange={event => update('date', event.target.value)}/></label>{field('place')}{field('dateLine')}{field('footer')}</div></details>
        <details className="certificate-panel"><summary>Logo &amp; warna</summary><div className="certificate-panel-body"><div className="certificate-colors"><label>Warna teks<input type="color" value={design.ink} onChange={event => update('ink', event.target.value)}/></label><label>Warna aksen<input type="color" value={design.accent} onChange={event => update('accent', event.target.value)}/></label></div>{ASSETS.slice(0, 2).map(asset => <div className="certificate-asset" key={asset.key}><span>{asset.label}</span><div><Button type="button" variant="outline" size="sm" onClick={() => assetRefs.current[asset.key]?.click()}><ImagePlus size={15}/>{design[asset.key] ? 'Ganti gambar' : 'Unggah gambar'}</Button>{design[asset.key] && <Button type="button" variant="ghost" size="icon" aria-label={`Hapus ${asset.label}`} onClick={() => update(asset.key, null)}><Trash2 size={15}/></Button>}</div></div>)}<p className="certificate-help">PNG/JPG, maksimal 2 MB per gambar. Logo dipertahankan proporsinya; PNG transparan cocok untuk latar sertifikat.</p></div></details>
        <details className="certificate-panel"><summary>Penandatangan</summary><div className="certificate-panel-body">{field('signer1')}{field('role1')}{field('signer2')}{field('role2')}{ASSETS.slice(2).map(asset => <div className="certificate-asset" key={asset.key}><span>{asset.label}</span><div><Button type="button" variant="outline" size="sm" onClick={() => assetRefs.current[asset.key]?.click()}><ImagePlus size={15}/>{design[asset.key] ? 'Ganti gambar' : 'Unggah gambar'}</Button>{design[asset.key] && <Button type="button" variant="ghost" size="icon" aria-label={`Hapus ${asset.label}`} onClick={() => update(asset.key, null)}><Trash2 size={15}/></Button>}</div></div>)}<p className="certificate-help">Nama, jabatan, dan gambar tanda tangan kedua boleh dikosongkan. Gambar tanda tangan merupakan elemen visual, bukan tanda tangan digital tersertifikasi.</p></div></details>
        {ASSETS.map(asset => <input key={asset.key} ref={element => { assetRefs.current[asset.key] = element; }} type="file" accept="image/png,image/jpeg" className="sr-only" aria-label={`Pilih ${asset.label}`} onChange={event => uploadImage(asset.key, event.target.files?.[0])}/>)}
      </fieldset>
      <div className="certificate-preview-column"><div className="certificate-preview-card"><div className="certificate-preview-heading"><strong>Pratinjau langsung</strong><span>A4 · Mendatar</span></div><div className="certificate-paper">{preview?.scene && !previewError ? <CertificatePreview scene={preview.scene} name={recipient.name}/> : <div className="certificate-preview-empty"><Award size={40}/><p>{previewError || 'Menyiapkan pratinjau sertifikat…'}</p>{previewError && <Button variant="outline" disabled={!!working} onClick={() => setRetry(value => value + 1)}>Coba lagi</Button>}</div>}{previewPending && <div className="certificate-refresh" role="status"><LoaderCircle className="spin" size={16}/>Memperbarui pratinjau…</div>}</div><div className="certificate-preview-pages"><span>{recipients.length ? `${currentIndex + 1} dari ${recipients.length} penerima` : 'Contoh tampilan · isi penerima untuk mengunduh'}</span><div><Button variant="outline" size="icon" disabled={currentIndex === 0 || !!working} aria-label="Pratinjau penerima sebelumnya" onClick={() => setPreviewIndex(currentIndex - 1)}><ChevronLeft size={16}/></Button><Button variant="outline" size="icon" disabled={currentIndex + 1 >= recipients.length || !!working} aria-label="Pratinjau penerima berikutnya" onClick={() => setPreviewIndex(currentIndex + 1)}><ChevronRight size={16}/></Button></div></div></div>
        {(error || recipientsState.error) && <p className="error-message" role="alert">{error || recipientsState.error}</p>}{notice && <p className="certificate-notice" role="status">{notice}</p>}
        <div className="certificate-downloads"><Button variant="outline" disabled={!!working || !recipients.length || previewPending || !!previewError || !!recipientsState.error} onClick={() => downloadPDF(true)}><Download size={16}/>PDF penerima ini</Button><Button disabled={!!working || !recipients.length || previewPending || !!previewError || !!recipientsState.error} onClick={() => downloadPDF(false)}>{working === 'pdf' ? <LoaderCircle size={17} className="spin"/> : <Download size={17}/>} {working === 'pdf' ? `Membuat ${progress} sertifikat…` : `Unduh PDF (${recipients.length} sertifikat)`}</Button></div>
        <p className="certificate-help">Satu penerima per halaman. Logo dan isi diproses di perangkat Anda. Simpan desain untuk dipakai kembali; memuat ulang situs menghapus pekerjaan yang belum disimpan.</p>
      </div>
    </div>
  </section>;
}
