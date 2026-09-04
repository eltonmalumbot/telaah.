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

export async function issueCertificates(design: CertificateDesign, recipients: CertificateRecipient[], origin: string): Promise<{ recipients: CertificateRecipient[]; records: IssuanceRecord[] }> {
  const identity = await getIssuerIdentity(design.organizer);
  const privateKey = await crypto.subtle.importKey('jwk', identity.privateKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const issuedAt = new Date().toISOString(); const records: IssuanceRecord[] = [];
  for (let index = 0; index < recipients.length; index++) {
    const recipient = recipients[index]; const variables = certificateVariables(design, recipient, index);
    const id = crypto.randomUUID();
    const claim: CertificateClaim = { v: 1, id, name: recipient.name, group: recipient.group, event: design.event, organizer: design.organizer, date: design.date, number: variables.nomor, issuedAt, issuer: identity.name, publicKey: identity.publicKey };
    const payload = base64url(encoder.encode(JSON.stringify(claim)));
    const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoder.encode(payload)));
    const token = `${payload}.${base64url(signature)}`;
    records.push({ ...claim, email: recipient.email ?? '', token, fingerprint: identity.fingerprint, status: 'active' });
  }
  saveIssuances([...records, ...loadIssuances()]);
  return { records, recipients: recipients.map((recipient, index) => ({ ...recipient, verificationUrl: `${origin}/verify#${records[index].token}` })) };
}

export async function verifyCertificateToken(token: string): Promise<{ valid: boolean; claim?: CertificateClaim; fingerprint?: string; error?: string }> {
  try {
    const [payload, signature, extra] = token.split('.'); if (!payload || !signature || extra) throw new Error('Format kode verifikasi tidak valid.');
    const claim = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as CertificateClaim;
    if (claim.v !== 1 || !claim.id || !claim.name || !claim.publicKey?.x || !claim.publicKey?.y) throw new Error('Data sertifikat tidak lengkap.');
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
