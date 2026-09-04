import { createHmac, timingSafeEqual } from 'node:crypto';

export const TRUSTED_DEVICE_COOKIE = 'telaah_certificate_device';
const ONE_YEAR = 60 * 60 * 24 * 365;

function secret() {
  const value = process.env.CERTIFICATE_SIGNING_SECRET || process.env.CERTIFICATE_ADMIN_KEY;
  if (!value || value.length < 16) throw new Error('Konfigurasi penerbit tepercaya belum lengkap.');
  return value;
}
function sign(payload: string) {
  return createHmac('sha256', secret()).update(`device|${payload}`).digest('base64url');
}
export function createTrustedDeviceToken() {
  const payload = Buffer.from(JSON.stringify({ v: 1, exp: Math.floor(Date.now() / 1000) + ONE_YEAR })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export function verifyTrustedDeviceToken(token: string) {
  try {
    const [payload, supplied, extra] = token.split('.');
    if (!payload || !supplied || extra) return false;
    const expected = sign(payload);
    const a = Buffer.from(supplied), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { v?: number; exp?: number };
    return value.v === 1 && typeof value.exp === 'number' && value.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
export function trustedDeviceCookie(token: string) {
  return `${TRUSTED_DEVICE_COOKIE}=${token}; Path=/; Max-Age=${ONE_YEAR}; HttpOnly; Secure; SameSite=Strict`;
}
export function clearTrustedDeviceCookie() {
  return `${TRUSTED_DEVICE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
export function requestHasTrustedDevice(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';
  const value = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${TRUSTED_DEVICE_COOKIE}=`))?.slice(TRUSTED_DEVICE_COOKIE.length + 1) ?? '';
  return !!value && verifyTrustedDeviceToken(value);
}
