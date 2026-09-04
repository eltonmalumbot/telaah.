import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import type { TrustedCertificateClaim } from './certificate-server';

export type RegistryStatus = 'active' | 'revoked';
export type RegistryRecord = TrustedCertificateClaim & {
  fingerprint: string;
  status: RegistryStatus;
  revokedAt?: string | null;
};

function client() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? neon(url) : null;
}

export function certificateTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function registerCertificate(claim: TrustedCertificateClaim, token: string, fingerprint: string) {
  const sql = client();
  if (!sql) return { configured: false as const };
  await sql`
    INSERT INTO certificate_registry (
      certificate_id, token_hash, recipient_name, recipient_group, event_name,
      organizer, certificate_number, event_date, issuer_fingerprint, status, issued_at
    ) VALUES (
      ${claim.certificateId}, ${certificateTokenHash(token)}, ${claim.name}, ${claim.group}, ${claim.event},
      ${claim.organizer}, ${claim.number}, ${claim.date}, ${fingerprint}, 'active', ${claim.issuedAt}
    )
    ON CONFLICT (certificate_id) DO UPDATE SET
      token_hash = EXCLUDED.token_hash,
      recipient_name = EXCLUDED.recipient_name,
      recipient_group = EXCLUDED.recipient_group,
      event_name = EXCLUDED.event_name,
      organizer = EXCLUDED.organizer,
      certificate_number = EXCLUDED.certificate_number,
      event_date = EXCLUDED.event_date,
      issuer_fingerprint = EXCLUDED.issuer_fingerprint,
      status = 'active',
      issued_at = EXCLUDED.issued_at,
      revoked_at = NULL
  `;
  return { configured: true as const };
}

export async function registryStatus(certificateId: string, token: string) {
  const sql = client();
  if (!sql) return { configured: false as const, status: null };
  const rows = await sql`
    SELECT status, revoked_at, token_hash, issuer_fingerprint
    FROM certificate_registry
    WHERE certificate_id = ${certificateId}
    LIMIT 1
  ` as Array<{ status: RegistryStatus; revoked_at: string | null; token_hash: string; issuer_fingerprint: string }>;
  const row = rows[0];
  if (!row || row.token_hash !== certificateTokenHash(token)) return { configured: true as const, status: 'missing' as const };
  return { configured: true as const, status: row.status, revokedAt: row.revoked_at, fingerprint: row.issuer_fingerprint };
}

export async function setRegistryStatus(certificateId: string, status: RegistryStatus) {
  const sql = client();
  if (!sql) return { configured: false as const, updated: false };
  const rows = await sql`
    UPDATE certificate_registry
    SET status = ${status}, revoked_at = ${status === 'revoked' ? new Date().toISOString() : null}
    WHERE certificate_id = ${certificateId}
    RETURNING certificate_id
  ` as Array<{ certificate_id: string }>;
  return { configured: true as const, updated: rows.length > 0 };
}
