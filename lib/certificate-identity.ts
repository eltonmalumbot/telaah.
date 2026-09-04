import { certificateVariables, type CertificateDesign, type CertificateRecipient } from './certificate.ts';

export type CertificateClaim = { v: 1; id: string; name: string; group: string; event: string; organizer: string; date: string; number: string; issuedAt: string; issuer: string; publicKey: JsonWebKey };
export type IssuanceRecord = CertificateClaim & { email: string; token: string; fingerprint: string; status: 'active' | 'revoked'; revokedAt?: string };
type StoredIdentity = { name: string; publicKey: JsonWebKey; privateKey: JsonWebKey };
const IDENTITY_KEY = 'telaah-certificate-identity-v1';
const ISSUANCE_KEY = 'telaah-certificate-issuances-v1';
const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64url(value: string): ArrayBuffer {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='));
  return Uint8Array.from(binary, char => char.charCodeAt(0)).buffer;
}
async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return Array.from(bytes.slice(0, 10), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{1,4}/g)!.join('-');
}
function publicMaterial(key: JsonWebKey) { return JSON.stringify({ kty: key.kty, crv: key.crv, x: key.x, y: key.y }); }

export async function getIssuerIdentity(name: string): Promise<StoredIdentity & { fingerprint: string }> {
  const saved = localStorage.getItem(IDENTITY_KEY);
  let identity: StoredIdentity | null = null;
  if (saved) {
    try { const parsed = JSON.parse(saved); if (parsed?.publicKey?.x && parsed?.privateKey?.d) identity = parsed; } catch { /* Regenerate invalid local data. */ }
  }
  if (!identity) {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    identity = { name: name.trim() || 'Penerbit Telaah', publicKey: await crypto.subtle.exportKey('jwk', pair.publicKey), privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey) };
  } else if (name.trim()) identity.name = name.trim();
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return { ...identity, fingerprint: await digest(publicMaterial(identity.publicKey)) };
}

/**
 * New certificates use the trusted Telaah server signer. The admin key is only
 * sent to the issuance endpoint and is never embedded into the QR token.
 * Existing v1 local certificates remain verifiable through verifyCertificateToken.
 */
export async function issueCertificates(design: CertificateDesign, recipients: CertificateRecipient[], origin: string): Promise<{ recipients: CertificateRecipient[]; records: IssuanceRecord[] }> {
  let adminKey = sessionStorage.getItem('telaah-certificate-admin-key') ?? '';
  if (!adminKey) {
    adminKey = window.prompt('Masukkan kunci admin sertifikat untuk membuat QR verifikasi resmi.')?.trim() ?? '';
    if (!adminKey) throw new Error('Penerbitan QR dibatalkan. Masukkan kunci admin sertifikat untuk membuat QR resmi.');
    sessionStorage.setItem('telaah-certificate-admin-key', adminKey);
  }
  const items = recipients.map((recipient, index) => ({
    clientId: recipient.id,
    name: recipient.name,
    group: recipient.group,
    email: recipient.email ?? '',
    number: certificateVariables(design, recipient, index).nomor,
  }));
  const response = await fetch('/api/certificates/issue', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-key': adminKey },
    body: JSON.stringify({ organizer: design.organizer, event: design.event, date: design.date, recipients: items }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) sessionStorage.removeItem('telaah-certificate-admin-key');
    throw new Error(body.error || 'QR verifikasi resmi belum dapat diterbitkan.');
  }
  const official = body.records as Array<{ id: string; certificateId: string; name: string; group: string; event: string; organizer: string; date: string; number: string; issuedAt: string; email: string; token: string; fingerprint: string; status: 'active' }>;
  const records = official.map((item) => ({
    v: 1 as const,
    id: item.id,
    name: item.name,
    group: item.group,
    event: item.event,
    organizer: item.organizer,
    date: item.date,
    number: item.number,
    issuedAt: item.issuedAt,
    issuer: 'Telaah Official',
    publicKey: {},
    email: item.email,
    token: item.token,
    fingerprint: item.fingerprint,
    status: 'active' as const,
  }));
  saveIssuances([...records, ...loadIssuances()]);
  return {
    records,
    recipients: recipients.map((recipient, index) => ({ ...recipient, verificationUrl: `${origin}/verify?token=${encodeURIComponent(official[index].token)}` })),
  };
}

/** Verify legacy v1 self-signed certificate tokens. */
export async function verifyCertificateToken(token: string): Promise<{ valid: boolean; claim?: CertificateClaim; fingerprint?: string; error?: string }> {
  try {
    const [payload, signature, extra] = token.split('.'); if (!payload || !signature || extra) throw new Error('Format kode verifikasi tidak valid.');
    const claim = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as CertificateClaim;
    if (claim.v !== 1 || !claim.id || !claim.name || !claim.publicKey?.x || !claim.publicKey?.y) throw new Error('Bukan token sertifikat lokal versi lama.');
    const publicKey = await crypto.subtle.importKey('jwk', claim.publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, fromBase64url(signature), encoder.encode(payload));
    return { valid, claim, fingerprint: await digest(publicMaterial(claim.publicKey)), error: valid ? undefined : 'Tanda tangan digital tidak cocok.' };
  } catch (error) { return { valid: false, error: error instanceof Error ? error.message : 'Kode verifikasi tidak dapat dibaca.' }; }
}

export function loadIssuances(): IssuanceRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try { const value = JSON.parse(localStorage.getItem(ISSUANCE_KEY) ?? '[]'); return Array.isArray(value) ? value.slice(0, 2000) : []; } catch { return []; }
}
export function saveIssuances(records: IssuanceRecord[]) { localStorage.setItem(ISSUANCE_KEY, JSON.stringify(records.slice(0, 2000))); }
export function setIssuanceStatus(id: string, status: 'active' | 'revoked'): IssuanceRecord[] {
  const records = loadIssuances().map(item => item.id === id ? { ...item, status, revokedAt: status === 'revoked' ? new Date().toISOString() : undefined } : item);
  saveIssuances(records); return records;
}
export function exportIssuerBackup(): string {
  const stored = JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? 'null') as StoredIdentity | null;
  const identity = stored ? { name: stored.name, publicKey: stored.publicKey } : null;
  return JSON.stringify({ identity, issuances: loadIssuances() }, null, 2);
}
