import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telaah | Pemeriksa Indikasi AI",
  description: "Tinjau pola bahasa dan duplikasi jawaban dengan alasan yang terbuka. Pemeriksaan teks dan Excel di perangkat Anda.",
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
