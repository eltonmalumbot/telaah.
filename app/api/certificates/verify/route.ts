import { NextResponse } from 'next/server';
import { certificateFingerprint, verifyCertificateToken } from '@/lib/certificate-server';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    const token = String(body.token ?? '').trim();
    if (!token || token.length > 12000) {
      return NextResponse.json({ valid: false, error: 'Kode verifikasi tidak valid.' }, { status: 400 });
    }
    const result = verifyCertificateToken(token);
    return NextResponse.json({ ...result, fingerprint: result.valid ? certificateFingerprint() : undefined }, { status: result.valid ? 200 : 400 });
  } catch {
    return NextResponse.json({ valid: false, error: 'Kode verifikasi tidak dapat dibaca.' }, { status: 400 });
  }
}
