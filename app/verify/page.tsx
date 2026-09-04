"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { verifyCertificateToken, loadIssuances, type CertificateClaim } from '@/lib/certificate-identity';

export default function VerifyPage() {
  const [state, setState] = useState<{ loading: boolean; valid: boolean; claim?: CertificateClaim; fingerprint?: string; error?: string; revoked?: boolean }>({ loading: true, valid: false });
  useEffect(() => {
    const token = location.hash.slice(1);
    verifyCertificateToken(token).then(result => setState({ loading: false, ...result, revoked: result.claim ? loadIssuances().some(item => item.id === result.claim!.id && item.status === 'revoked') : false }));
  }, []);
  return <main className="verify-page"><Link href="/" className="verify-brand">telaah.</Link><section className={`verify-card ${state.valid && !state.revoked ? 'valid' : 'invalid'}`}>
    {state.loading ? <ShieldCheck size={48}/> : state.valid && !state.revoked ? <CheckCircle2 size={52}/> : <ShieldAlert size={52}/>} 
    <span className="eyebrow">VERIFIKASI SERTIFIKAT</span><h1>{state.loading ? 'Memeriksa tanda tangan…' : state.valid ? state.revoked ? 'Sertifikat dicabut pada perangkat ini' : 'Tanda tangan digital valid' : 'Sertifikat tidak valid'}</h1>
    {state.error && <p>{state.error}</p>}
    {state.claim && <dl><div><dt>Penerima</dt><dd>{state.claim.name}</dd></div><div><dt>Kegiatan</dt><dd>{state.claim.event}</dd></div><div><dt>Penyelenggara</dt><dd>{state.claim.organizer}</dd></div><div><dt>Nomor</dt><dd>{state.claim.number || 'Tanpa nomor'}</dd></div><div><dt>Tanggal</dt><dd>{state.claim.date}</dd></div><div><dt>Sidik kunci penerbit</dt><dd>{state.fingerprint}</dd></div></dl>}
    <p className="verify-note">Tanda tangan digital membuktikan bahwa isi QR tidak berubah sejak diterbitkan. Identitas penerbit dikonfirmasi melalui sidik kunci di atas. Status pencabutan tersimpan lokal pada perangkat penerbit sampai registri daring dihubungkan.</p><Link href="/">Kembali ke Telaah</Link>
  </section></main>;
}
