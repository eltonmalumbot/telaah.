import type { Metadata } from "next";
import "./globals.css";
import "./certificate.css";

export const metadata: Metadata = {
  title: "Telaah | Analisis Jawaban & Sertifikat",
  description: "Tinjau pola bahasa, duplikasi, dan kandidat jawaban terbaik dengan rubrik yang bisa dikoreksi. Pemeriksaan teks, Excel, laporan PDF, dan sertifikat dengan template, logo, serta teks yang dapat diedit.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
