import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CERTIFICATE_FROM_EMAIL;
  const adminKey = process.env.CERTIFICATE_ADMIN_KEY;
  if (!apiKey || !from || !adminKey) return NextResponse.json({ error: "Layanan email belum dikonfigurasi di Vercel." }, { status: 503 });
  if (request.headers.get("x-admin-key") !== adminKey) return NextResponse.json({ error: "Kunci admin email tidak cocok." }, { status: 401 });
  let body: { to?: string; name?: string; subject?: string; filename?: string; pdfBase64?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 }); }
  if (!body.to || !EMAIL.test(body.to) || !body.pdfBase64 || body.pdfBase64.length > 14_000_000) return NextResponse.json({ error: "Email atau lampiran PDF tidak valid." }, { status: 400 });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [body.to],
      subject: body.subject?.slice(0, 140) || "Sertifikat Anda",
      html: `<p>Halo ${escapeHtml(body.name || "Peserta")},</p><p>Sertifikat Anda terlampir pada email ini. Pindai kode QR pada sertifikat untuk memeriksa tanda tangan digitalnya.</p><p>Salam,<br>Telaah</p>`,
      attachments: [{ filename: (body.filename || "sertifikat.pdf").replace(/[^a-zA-Z0-9._-]/g, "-"), content: body.pdfBase64 }],
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: "Penyedia email menolak pengiriman.", detail: result }, { status: 502 });
  return NextResponse.json({ ok: true, id: result.id });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
