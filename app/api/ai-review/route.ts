import { NextResponse } from "next/server";
import type { AIAuthorshipReview, AIReviewLevel } from "@/lib/ai-review";

export const runtime = "nodejs";

const MAX_TEXT = 30000;
const LEVELS = new Set<AIReviewLevel>(["low", "medium", "high", "insufficient"]);

function readOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const output = (payload as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return "";
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const typed = part as { type?: string; text?: string };
      if (typed.type === "output_text" && typeof typed.text === "string") return typed.text;
    }
  }
  return "";
}

function cleanList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, limit);
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Mode AI belum dikonfigurasi. Tambahkan OPENAI_API_KEY pada Environment Variables Vercel." },
      { status: 503 },
    );
  }

  let body: { text?: string; prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";
  const prompt = body.prompt?.trim().slice(0, 3000) ?? "";
  if (!text) return NextResponse.json({ error: "Teks jawaban kosong." }, { status: 400 });
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: `Teks maksimal ${MAX_TEXT.toLocaleString("id-ID")} karakter untuk Mode AI.` }, { status: 400 });
  }

  const model = process.env.OPENAI_AI_REVIEW_MODEL || "gpt-5-mini";
  const instruction = `Anda membantu reviewer manusia menelaah sebuah jawaban peserta. Tugas Anda BUKAN mendeteksi kepengarangan secara pasti dan BUKAN memberi probabilitas AI.\n\nKlasifikasikan hanya sebagai:\n- low: sedikit petunjuk tekstual yang layak ditinjau terkait bantuan AI\n- medium: beberapa petunjuk tekstual layak ditinjau\n- high: banyak petunjuk tekstual layak ditinjau\n- insufficient: teks terlalu sedikit / tidak memadai untuk telaah\n\nPertimbangkan secara seimbang: bahasa generik/template, struktur yang terlalu seragam, sisa instruksi/placeholder, repetisi formulaik, detail pengalaman personal, kekhususan konteks, konsistensi internal, dan bukti tandingan yang menunjukkan pengalaman atau proses individual. Jangan menjadikan tata bahasa rapi, panjang tulisan, atau gaya formal sebagai bukti tunggal. Jangan mengklaim teks pasti AI atau pasti manusia. Berikan pertanyaan verifikasi yang dapat ditanyakan reviewer kepada peserta. Jawab dalam Bahasa Indonesia.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: instruction,
      input: `Acuan tugas (bila ada):\n${prompt || "Tidak diberikan"}\n\nJawaban peserta:\n${text}`,
      text: {
        format: {
          type: "json_schema",
          name: "authorship_review",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              level: { type: "string", enum: ["low", "medium", "high", "insufficient"] },
              summary: { type: "string" },
              cues: { type: "array", items: { type: "string" }, maxItems: 5 },
              counterEvidence: { type: "array", items: { type: "string" }, maxItems: 5 },
              verificationQuestions: { type: "array", items: { type: "string" }, maxItems: 4 },
            },
            required: ["level", "summary", "cues", "counterEvidence", "verificationQuestions"],
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ error: "Layanan AI belum dapat memproses teks ini.", detail: payload }, { status: 502 });
  }

  const outputText = readOutputText(payload);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(outputText) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Format hasil AI tidak dapat dibaca." }, { status: 502 });
  }

  const level = typeof parsed.level === "string" && LEVELS.has(parsed.level as AIReviewLevel)
    ? (parsed.level as AIReviewLevel)
    : "insufficient";
  const review: AIAuthorshipReview = {
    level,
    summary: typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 1200) : "Hasil perlu ditinjau reviewer.",
    cues: cleanList(parsed.cues, 5),
    counterEvidence: cleanList(parsed.counterEvidence, 5),
    verificationQuestions: cleanList(parsed.verificationQuestions, 4),
    model,
    analyzedAt: new Date().toISOString(),
  };
  return NextResponse.json(review);
}
