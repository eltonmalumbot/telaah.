import { createHmac, timingSafeEqual } from 'node:crypto';

export type TrustedCertificateClaim = {
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

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function secret() {
  const value = process.env.CERTIFICATE_SIGNING_SECRET || process.env.CERTIFICATE_ADMIN_KEY;
  if (!value || value.length < 16) throw new Error('CERTIFICATE_SIGNING_SECRET belum dikonfigurasi dengan aman.');
  return value;
}

function signature(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function certificateFingerprint() {
  return createHmac('sha256', secret()).update('telaah-certificate-issuer-v2').digest('hex').slice(0, 20).toUpperCase().match(/.{1,4}/g)!.join('-');
}

export function certificateId(id: string, issuedAt: string) {
  const digest = createHmac('sha256', secret()).update(`${id}|${issuedAt}`).digest('hex').slice(0, 10).toUpperCase();
  const year = new Date(issuedAt).getUTCFullYear();
  return `TLH-${year}-${digest}`;
}

export function signCertificateClaim(claim: TrustedCertificateClaim) {
  const payload = base64url(JSON.stringify(claim));
  return `${payload}.${signature(payload)}`;
}

export function verifyCertificateToken(token: string): { valid: boolean; claim?: TrustedCertificateClaim; error?: string } {
  try {
    const [payload, supplied, extra] = token.split('.');
    if (!payload || !supplied || extra) return { valid: false, error: 'Format kode verifikasi tidak valid.' };
    const expected = signature(payload);
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return { valid: false, error: 'Tanda tangan sertifikat tidak cocok.' };
    const claim = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TrustedCertificateClaim;
    if (claim.v !== 2 || !claim.id || !claim.certificateId || !claim.name || !claim.issuedAt) return { valid: false, error: 'Data sertifikat tidak lengkap.' };
    if (claim.certificateId !== certificateId(claim.id, claim.issuedAt)) return { valid: false, error: 'Certificate ID tidak cocok.' };
    return { valid: true, claim };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Kode verifikasi tidak dapat dibaca.' };
  }
}
