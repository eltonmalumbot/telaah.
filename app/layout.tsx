import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telaah | Indikasi AI & Kualitas Jawaban",
  description: "Tinjau pola bahasa, duplikasi, dan kandidat jawaban terbaik dengan rubrik yang bisa dikoreksi. Pemeriksaan teks, Excel, dan laporan PDF di perangkat Anda.",
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
