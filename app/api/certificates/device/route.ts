import { NextResponse } from 'next/server';
import { clearTrustedDeviceCookie, createTrustedDeviceToken, requestHasTrustedDevice, trustedDeviceCookie } from '@/lib/certificate-device-server';

export async function GET(request: Request) {
  return NextResponse.json({ trusted: requestHasTrustedDevice(request) });
}

export async function POST(request: Request) {
  const adminKey = request.headers.get('x-admin-key') ?? '';
  const expected = process.env.CERTIFICATE_ADMIN_KEY ?? '';
  if (!expected || adminKey !== expected) return NextResponse.json({ error: 'Kunci admin sertifikat tidak valid.' }, { status: 401 });
  try {
    const response = NextResponse.json({ trusted: true });
    response.headers.set('set-cookie', trustedDeviceCookie(createTrustedDeviceToken()));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Penerbit tepercaya belum dapat diaktifkan.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ trusted: false });
  response.headers.set('set-cookie', clearTrustedDeviceCookie());
  return response;
}
