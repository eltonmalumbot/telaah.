"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BadgeCheck, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { verifyCertificateToken, loadIssuances, type CertificateClaim } from '@/lib/certificate-identity';

type OfficialClaim = {
  v: 2;
  id: string;
  certificateId: string;
  name: string;
  group: string;
  event: string;
  organizer: string;
  date: string;
  number: string;
  issuedAt: string;
};

type VerifyState = {
  loading: boolean;
  valid: boolean;
  official?: boolean;
  claim?: OfficialClaim | CertificateClaim;
  fingerprint?: string;
  error?: string;
  revoked?: boolean;
};

export default function VerifyPage() {
  const [state, setState] = useState<VerifyState>({ loading: true, valid: false });

  useEffect(() => {
    async function verify() {
      const params = new URLSearchParams(location.search);
      const officialToken = params.get('token')?.trim() ?? '';
      if (officialToken) {
        try {
          const response = await fetch('/api/certificates/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token: officialToken }),
          });
          const result = await response.json();
          setState({ loading: false, valid: !!result.valid, official: !!result.valid, claim: result.claim, fingerprint: result.fingerprint, error: result.error });
          return;
        } catch {
          setState({ loading: false, valid: false, error: 'Layanan verifikasi resmi belum dapat dihubungi.' });
          return;
        }
      }

      const token = location.hash.slice(1);
      if (!token) {
        setState({ loading: false, valid: false, error: 'Kode verifikasi tidak ditemukan.' });
        return;
      }
      const result = await verifyCertificateToken(token);
      setState({
        loading: false,
        ...result,
        official: false,
        revoked: result.claim ? loadIssuances().some(item => item.id === result.claim!.id && item.status === 'revoked') : false,
      });
    }
    verify();
  }, []);

  const claim = state.claim;
  const currentLocal = !!claim && 'certificateId' in claim && !!claim.certificateId;
  const certificateId = claim && 'certificateId' in claim && claim.certificateId
    ? claim.certificateId
    : claim?.id
      ? `LEGACY-${claim.id.slice(0, 8).toUpperCase()}`
      : '';
  const valid = state.valid && !state.revoked;

  return <main className="verify-page">
    <Link href="/" className="verify-brand">telaah.</Link>
    <section className={`verify-card ${valid ? 'valid' : 'invalid'}`}>
      {state.loading ? <ShieldCheck size={48}/> : valid ? <CheckCircle2 size={52}/> : <ShieldAlert size={52}/>} 
      <span className="eyebrow">VERIFIKASI SERTIFIKAT</span>
      <h1>{state.loading ? 'Memeriksa sertifikat…' : valid ? 'Sertifikat valid' : state.revoked ? 'Sertifikat dicabut pada perangkat penerbit' : 'Sertifikat tidak valid'}</h1>
      {valid && <p className="verify-note"><BadgeCheck size={16}/> Tanda tangan digital cocok. Data QR tidak berubah sejak sertifikat diterbitkan.</p>}
      {state.error && <p>{state.error}</p>}
      {claim && <dl>
        <div><dt>Penerima</dt><dd>{claim.name}</dd></div>
        {'group' in claim && claim.group && <div><dt>Grup</dt><dd>{claim.group}</dd></div>}
        <div><dt>Kegiatan</dt><dd>{claim.event}</dd></div>
        <div><dt>Penyelenggara</dt><dd>{claim.organizer}</dd></div>
        <div><dt>Certificate ID</dt><dd>{certificateId}</dd></div>
        <div><dt>Nomor</dt><dd>{claim.number || 'Tanpa nomor'}</dd></div>
        <div><dt>Tanggal</dt><dd>{claim.date}</dd></div>
        <div><dt>Sidik penerbit</dt><dd>{state.fingerprint || '—'}</dd></div>
      </dl>}
      <p className="verify-note">Cocokkan nama, kegiatan, nomor, dan Certificate ID pada halaman ini dengan sertifikat yang diperiksa. Perubahan pada data QR akan membuat verifikasi gagal.</p>
      {!state.official && state.valid && !currentLocal && <p className="verify-note">Sertifikat ini dibuat dengan format generasi lama Telaah dan belum memiliki Certificate ID baru.</p>}
      <Link href="/">Kembali ke Telaah</Link>
    </section>
  </main>;
}
