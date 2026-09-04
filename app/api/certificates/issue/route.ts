import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { certificateFingerprint, certificateId, signCertificateClaim, type TrustedCertificateClaim } from '@/lib/certificate-server';

const MAX_RECIPIENTS = 200;

export async function POST(request: Request) {
  const adminKey = request.headers.get('x-admin-key') ?? '';
  const expectedAdminKey = process.env.CERTIFICATE_ADMIN_KEY ?? '';
  if (!expectedAdminKey || adminKey !== expectedAdminKey) {
    return NextResponse.json({ error: 'Kunci admin sertifikat tidak valid.' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      organizer?: string;
      event?: string;
      date?: string;
      recipients?: Array<{ clientId?: string; name?: string; group?: string; email?: string; number?: string }>;
    };
    const organizer = String(body.organizer ?? '').trim();
    const event = String(body.event ?? '').trim();
    const date = String(body.date ?? '').trim();
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];
    if (!organizer || !event || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Data kegiatan sertifikat belum lengkap.' }, { status: 400 });
    }
    if (!recipients.length || recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json({ error: `Penerima harus 1–${MAX_RECIPIENTS} orang.` }, { status: 400 });
    }

    const issuedAt = new Date().toISOString();
    const fingerprint = certificateFingerprint();
    const records = recipients.map((recipient) => {
      const name = String(recipient.name ?? '').trim();
      if (!name || name.length > 180) throw new Error('Nama penerima tidak valid.');
      const id = randomUUID();
      const claim: TrustedCertificateClaim = {
        v: 2,
        id,
        certificateId: certificateId(id, issuedAt),
        name,
        group: String(recipient.group ?? '').trim().slice(0, 160),
        event: event.slice(0, 220),
        organizer: organizer.slice(0, 180),
        date,
        number: String(recipient.number ?? '').trim().slice(0, 160),
        issuedAt,
      };
      return {
        ...claim,
        email: String(recipient.email ?? '').trim().slice(0, 320),
        token: signCertificateClaim(claim),
        fingerprint,
        status: 'active' as const,
      };
    });
    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sertifikat belum dapat diterbitkan.' }, { status: 400 });
  }
}
