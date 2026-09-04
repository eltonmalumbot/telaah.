export type AIReviewLevel = "low" | "medium" | "high" | "insufficient";

export type AIAuthorshipReview = {
  level: AIReviewLevel;
  summary: string;
  cues: string[];
  counterEvidence: string[];
  verificationQuestions: string[];
  model: string;
  analyzedAt: string;
};

export type AIReviewedRow<T> = T & { aiReview?: AIAuthorshipReview };

export const AI_REVIEW_LABELS: Record<AIReviewLevel, string> = {
  low: "Sedikit petunjuk",
  medium: "Perlu ditinjau",
  high: "Banyak petunjuk",
  insufficient: "Data belum cukup",
};

export const AI_REVIEW_NOTE =
  "Analisis AI ini menilai petunjuk dalam teks, bukan menentukan siapa penulisnya. Tidak ada persentase kepengarangan atau vonis penggunaan AI. Gunakan hasil hanya sebagai bahan verifikasi manusia.";
