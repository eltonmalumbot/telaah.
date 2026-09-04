import { NextResponse } from 'next/server';
import { certificateFingerprint, verifyCertificateToken } from '@/lib/certificate-server';
import { registryStatus } from '@/lib/certificate-registry-server';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    const token = String(body.token ?? '').trim();
    if (!token || token.length > 12000) return NextResponse.json({ valid: false, error: 'Kode verifikasi tidak valid.' }, { status: 400 });
    const result = verifyCertificateToken(token);
    if (!result.valid || !result.claim) return NextResponse.json(result, { status: 400 });
    const registry = await registryStatus(result.claim.certificateId, token);
    if (registry.configured && registry.status === 'missing') return NextResponse.json({ valid: false, error: 'Sertifikat tidak ditemukan pada registri resmi.' }, { status: 404 });
    const revoked = registry.configured && registry.status === 'revoked';
    return NextResponse.json({
      ...result,
      valid: !revoked,
      revoked,
      registry: registry.configured ? registry.status : 'unavailable',
      revokedAt: 'revokedAt' in registry ? registry.revokedAt : undefined,
      fingerprint: registry.configured && 'fingerprint' in registry ? registry.fingerprint : certificateFingerprint(),
      error: revoked ? 'Sertifikat telah dicabut oleh penerbit.' : undefined,
    }, { status: revoked ? 410 : 200 });
  } catch {
    return NextResponse.json({ valid: false, error: 'Kode verifikasi tidak dapat dibaca.' }, { status: 400 });
  }
}
