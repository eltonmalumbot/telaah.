"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BadgeCheck, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';

export default function IssuerPage() {
  const [trusted, setTrusted] = useState<boolean | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function refresh() {
    try { const response = await fetch('/api/certificates/device', { credentials: 'same-origin' }); const body = await response.json(); setTrusted(!!body.trusted); }
    catch { setTrusted(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function activate() {
    if (!key.trim() || busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/certificates/device', { method: 'POST', credentials: 'same-origin', headers: { 'x-admin-key': key.trim() } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Aktivasi gagal.');
      setKey(''); setTrusted(true); setMessage('Perangkat ini sudah menjadi penerbit tepercaya. Sertifikat berikutnya otomatis memakai registri resmi jika database online aktif.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Aktivasi gagal.'); }
    finally { setBusy(false); }
  }
  async function deactivate() {
    setBusy(true); await fetch('/api/certificates/device', { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined); setTrusted(false); setMessage('Status penerbit tepercaya di perangkat ini dinonaktifkan. Sertifikat tetap dapat dibuat dengan mode lokal.'); setBusy(false);
  }
  return <main className="verify-page">
    <Link href="/" className="verify-brand">telaah.</Link>
    <section className={`verify-card ${trusted ? 'valid' : ''}`}>
      {trusted ? <BadgeCheck size={52}/> : <ShieldCheck size={52}/>}<span className="eyebrow">PENERBIT TEPERCAYA</span>
      <h1>{trusted === null ? 'Memeriksa perangkat…' : trusted ? 'Perangkat sudah dipercaya' : 'Aktifkan sekali di perangkat ini'}</h1>
      <p className="verify-note">Aktivasi ini hanya dilakukan satu kali. Setelah aktif, pembuatan sertifikat tetap sederhana: pilih peserta → buat PDF. Sistem otomatis memilih verifikasi resmi; jika layanan registry tidak tersedia, mode lokal tetap menjadi cadangan.</p>
      {!trusted && <div className="issuer-setup"><label htmlFor="issuer-key">Kunci admin sertifikat</label><input id="issuer-key" type="password" autoComplete="off" value={key} onChange={event => setKey(event.target.value)} placeholder="CERTIFICATE_ADMIN_KEY"/><button type="button" disabled={busy || !key.trim()} onClick={activate}><KeyRound size={16}/>{busy ? 'Mengaktifkan…' : 'Aktifkan perangkat'}</button></div>}
      {trusted && <button type="button" className="verify-link-button" disabled={busy} onClick={deactivate}><ShieldOff size={16}/>Nonaktifkan perangkat ini</button>}
      {message && <p className="verify-note">{message}</p>}
      <Link href="/">Kembali ke Telaah</Link>
    </section>
  </main>;
}
