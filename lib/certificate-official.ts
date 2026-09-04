import { certificateVariables, type CertificateDesign, type CertificateRecipient } from './certificate.ts';

export type OfficialCertificateClaim = {
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

export type OfficialIssuanceRecord = OfficialCertificateClaim & {
  email: string;
  token: string;
  fingerprint: string;
  status: 'active' | 'revoked';
  revokedAt?: string;
};

const ISSUANCE_KEY = 'telaah-certificate-official-issuances-v1';

export function loadOfficialIssuances(): OfficialIssuanceRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(ISSUANCE_KEY) ?? '[]');
    return Array.isArray(value) ? value.slice(0, 2000) : [];
  } catch {
    return [];
  }
}

export function saveOfficialIssuances(records: OfficialIssuanceRecord[]) {
  localStorage.setItem(ISSUANCE_KEY, JSON.stringify(records.slice(0, 2000)));
}

export function setOfficialIssuanceStatus(id: string, status: 'active' | 'revoked'): OfficialIssuanceRecord[] {
  const records = loadOfficialIssuances().map(item => item.id === id
    ? { ...item, status, revokedAt: status === 'revoked' ? new Date().toISOString() : undefined }
    : item);
  saveOfficialIssuances(records);
  return records;
}

export async function issueOfficialCertificates(
  design: CertificateDesign,
  recipients: CertificateRecipient[],
  origin: string,
  adminKey: string,
  sequenceIndexes?: number[],
): Promise<{ recipients: CertificateRecipient[]; records: OfficialIssuanceRecord[] }> {
  if (!adminKey.trim()) throw new Error('Masukkan kunci admin sertifikat untuk membuat QR verifikasi resmi.');
  const items = recipients.map((recipient, index) => ({
    clientId: recipient.id,
    name: recipient.name,
    group: recipient.group,
    email: recipient.email ?? '',
    number: certificateVariables(design, recipient, sequenceIndexes?.[index] ?? index).nomor,
  }));
  const response = await fetch('/api/certificates/issue', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-key': adminKey },
    body: JSON.stringify({
      organizer: design.organizer,
      event: design.event,
      date: design.date,
      recipients: items,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'QR verifikasi resmi belum dapat diterbitkan.');
  const records = body.records as OfficialIssuanceRecord[];
  saveOfficialIssuances([...records, ...loadOfficialIssuances()]);
  return {
    records,
    recipients: recipients.map((recipient, index) => ({
      ...recipient,
      verificationUrl: `${origin}/verify?token=${encodeURIComponent(records[index].token)}`,
    })),
  };
}

export function exportOfficialIssuerBackup(): string {
  return JSON.stringify({ version: 2, issuances: loadOfficialIssuances() }, null, 2);
}
