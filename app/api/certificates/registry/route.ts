import { NextResponse } from 'next/server';
import { requestHasTrustedDevice } from '@/lib/certificate-device-server';
import { setRegistryStatus } from '@/lib/certificate-registry-server';

export async function PATCH(request: Request) {
  if (!requestHasTrustedDevice(request)) return NextResponse.json({ error: 'Perangkat belum terdaftar sebagai penerbit tepercaya.' }, { status: 401 });
  try {
    const body = await request.json() as { certificateId?: string; status?: 'active' | 'revoked' };
    const certificateId = String(body.certificateId ?? '').trim();
    if (!/^TLH-\d{4}-[A-F0-9]{10}$/.test(certificateId) || !['active', 'revoked'].includes(String(body.status))) {
      return NextResponse.json({ error: 'Perubahan status tidak valid.' }, { status: 400 });
    }
    const result = await setRegistryStatus(certificateId, body.status!);
    if (!result.configured) return NextResponse.json({ error: 'Database registry belum dikonfigurasi.' }, { status: 503 });
    if (!result.updated) return NextResponse.json({ error: 'Certificate ID tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ certificateId, status: body.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Status sertifikat belum dapat diubah.' }, { status: 500 });
  }
}
