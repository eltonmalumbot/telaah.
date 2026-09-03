# Telaah

Website pemeriksaan pola bahasa dan duplikasi respons peserta, menggunakan **Next.js 16, React 19, dan TypeScript**. Siap diimpor dari GitHub ke Vercel.

> Repositori ini bernama `eltonmalumbot/telaah.` (ada titik pada akhir nama repo). Untuk nama proyek Vercel, gunakan `telaah` atau nama lain yang masih tersedia.

## Hubungkan ke Vercel

1. Buka [Vercel New Project](https://vercel.com/new).
2. Hubungkan akun GitHub dan pilih repositori **eltonmalumbot/telaah.**.
3. Gunakan pengaturan berikut, lalu klik **Deploy**.

| Pengaturan | Nilai |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `./` (root repositori) |
| Node.js Version | `24.x` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | Default Next.js; biarkan override mati |
| Production Branch | `main` |
| Environment Variables | Tidak diperlukan |

`vercel.json`, `package.json`, dan `.nvmrc` sudah menyiapkan framework, perintah build, serta Node.js. Tidak ada API key, database, atau layanan AI eksternal yang diperlukan. Setelah terhubung, push berikutnya ke `main` dapat membangun ulang deployment melalui integrasi Git Vercel.

Referensi: [Next.js di Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) dan [versi Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Jalankan lokal

Gunakan Node.js 24 dan npm.

```bash
git clone https://github.com/eltonmalumbot/telaah..git
cd telaah.
npm ci
npm run dev
```

Untuk pemeriksaan dan build produksi:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

`npm run dev` dan `npm start` membuka aplikasi pada port 3000 secara default. TypeScript dapat diperiksa setelah dependensi terpasang; build juga menjalankan validasi TypeScript.

## Fitur

- Tempel teks hingga 50.000 karakter; setiap penanda memiliki alasan, kutipan, dan batas interpretasi.
- Impor `.xlsx` atau `.csv` dengan pemetaan nama, grup, dua jawaban, dan durasi; mendukung ekspor Moodle.
- Batas impor: 10 MB file, 60 MB isi ZIP XLSX, 10.000 baris, 64 kolom, dan 50.000 karakter per sel. Hanya lembar pertama dibaca.
- Cari nama atau grup; filter dan urutkan hasil; buka rincian dua jawaban.
- Bandingkan pasangan jawaban secara persis, per jawaban, serta setelah normalisasi Unicode NFKC, huruf kecil, dan spasi. Jumlah mencakup peserta yang sedang diperiksa. Teks kosong tidak dihitung sebagai duplikat.
- Unduh hasil yang sedang difilter sebagai CSV, dengan penetralan awalan formula spreadsheet.

## Batas metode dan data

Telaah menggunakan aturan bahasa, **bukan model deteksi AI terkalibrasi**. Tidak ada klaim akurasi, probabilitas AI, vonis kepengarangan, atau peringkat kualitas. Aturan dapat menandai teks manusia dan melewatkan teks AI. Durasi, teks pendek, serta nada kritis tidak menjadi dasar pengurangan nilai.

Penanda meliputi penyebutan identitas asisten AI, sisa label percakapan/placeholder, pengantar jawaban, sedikitnya empat baris berpoin pada 80 kata, dan sedikitnya empat penghubung formal pada 100 kata. Ambang tersebut merupakan aturan praktis yang belum dikalibrasi terhadap dataset manusia/AI.

Isi teks dan file diproses di browser, tanpa dikirim ke layanan AI atau disimpan oleh aplikasi. Memuat ulang halaman menghapus data sesi. File jawaban peserta asli tidak disertakan dalam repositori ini. Aplikasi tidak memiliki login bawaan; akses deployment dikelola melalui pengaturan Vercel.

## Struktur kode

| Path | Fungsi |
| --- | --- |
| `app/page.tsx` | Workspace teks, impor, tabel, detail peserta, dan metode |
| `app/globals.css` | Tema dan tampilan responsif |
| `app/layout.tsx` | Metadata dan bahasa Indonesia |
| `lib/analysis.ts` | Penanda bahasa, pencocokan duplikat, dan ekspor |
| `lib/import.ts` | Pembacaan XLSX/CSV dan pemetaan kolom |
| `components/ui/` | Komponen antarmuka shadcn |
| `tests/analysis.test.mjs` | Pengujian logika, duplikasi, dan CSV |
| `vercel.json` | Konfigurasi Vercel |

Versi ini memakai perintah Next.js standar; tidak bergantung pada Vinext, Workers, D1, atau konfigurasi Sites.

## Validasi

Logika impor sebelumnya diuji pada 2.875 respons, dengan 31 peserta BPA/BTI/BJI serta kelompok pasangan identik 128 dan 25 peserta. Uji tersebut memvalidasi pembacaan dan pencocokan, bukan akurasi deteksi AI. Migrasi ini juga diperiksa melalui pengujian logika, TypeScript, dan build produksi Next.js.
