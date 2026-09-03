# Telaah

Website pemeriksaan pola bahasa, duplikasi, dan kualitas refleksi peserta, menggunakan **Next.js 16, React 19, dan TypeScript**. Siap diimpor dari GitHub ke Vercel.

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
- Unduh hasil yang sedang difilter dan diurutkan sebagai CSV, dengan penetralan awalan formula spreadsheet.
- Unduh PDF teks tunggal: ringkasan, alasan, kutipan, batas interpretasi, dan seluruh teks yang diperiksa.
- Unduh PDF peserta: seluruh hasil pencarian/filter dalam urutan tabel, termasuk halaman selanjutnya, dengan nama/grup, jumlah kata, pola, dan jumlah pasangan identik. Nomor baris bukan peringkat. Laporan mencatat sumber file, waktu, filter, cakupan data, dan batas metode.

## Analisis kualitas dan kandidat jawaban terbaik

1. Isi **Pertanyaan / tujuan tugas** di bagian **Cari jawaban terbaik**. Gunakan topik yang sesuai dengan tugas; tombol **Contoh acuan** menyediakan contoh refleksi podcast. Acuan kosong tidak menghasilkan nilai kualitas.
2. Klik **Periksa teks** atau **Periksa respons** setelah mengimpor file. Kedua kolom jawaban dinilai bersama sebagai satu refleksi; bukan nilai terpisah per pertanyaan. Mengubah acuan berlaku pada pemeriksaan berikutnya. Pemeriksaan ulang mengganti saran/koreksi sebelumnya.
3. Untuk file peserta, gunakan pencarian/grup dan filter, lalu **Urutkan kualitas** atau **Kandidat Top 10**. Peringkat dihitung dalam filter aktif. Nilai sama berbagi peringkat; peserta yang seri di batas kesepuluh ikut ditampilkan, sehingga jumlahnya dapat melebihi 10. Teks kosong tidak diberi peringkat.
4. Buka detail peserta atau rubrik teks tunggal. Periksa kutipan dan panduan setiap aspek, koreksi tingkat 0–4, tambahkan catatan, lalu **Konfirmasi penilaian**. Perubahan langsung memperbarui skor dan peringkat. Filter **Penilaian dikonfirmasi** memisahkan hasil yang sudah ditinjau. Konfirmasi merupakan penanda lokal, bukan tanda tangan atau verifikasi identitas reviewer.
5. **Unduh PDF/CSV** menyertakan skor, peringkat file sesuai filter, acuan, status penilaian, dan catatan reviewer. Memuat ulang halaman menghapus data dan koreksi; unduh laporan untuk menyimpannya.

### Rubrik refleksi v1.0

Empat aspek berbobot sama, masing-masing 25 poin: **relevansi dengan tugas, kedalaman refleksi, contoh konkret, dan rencana tindakan**. Reviewer memilih tingkat 0–4. Total adalah jumlah tingkat dibagi 16 × 100, dibulatkan ke bilangan bulat.

Saran awal merupakan heuristik bahasa Indonesia yang terbuka dalam `lib/quality.ts`, bukan model penilaian semantik:

- Relevansi: proporsi kata topik unik yang cocok secara literal setelah normalisasi Unicode dan huruf kecil, tanpa stopword; nol jika tidak ada kecocokan, selain itu `ceil(proporsi × 4)`. Tidak memahami sinonim, ketepatan argumen, atau kebenaran fakta.
- Refleksi: masing-masing satu tingkat untuk petunjuk alasan/kontras, alasan personal, pembelajaran personal, serta pembelajaran personal dengan alasan.
- Contoh: satu tingkat untuk pengalaman personal dengan tindakan; masing-masing tambahan untuk detail situasi, angka, dan hubungan alasan/kontras dalam pengalaman tersebut.
- Tindakan: satu tingkat untuk rencana personal dengan kata tindakan; masing-masing tambahan untuk detail, waktu, dan evaluasi/ukuran. Pola negasi tindakan yang dikenali dikecualikan.

Kamus petunjuk terbatas dan dapat melewatkan jawaban bagus maupun tertipu teks yang sekadar menyebut kata kunci. **Skor awal bukan nilai final dan belum divalidasi pada dataset berlabel.** Gunakan panduan rubrik dan koreksi reviewer untuk menilai substansi. Tidak ada penalti atau bonus langsung karena durasi, panjang teks, kerapian, kritik, duplikasi, atau indikator AI; pengulangan kalimat tidak menambah tingkat. Jawaban singkat dan kritis bisa mendapat skor lebih tinggi daripada tulisan panjang yang umum.

Rubrik ini ditujukan untuk refleksi dengan rencana tindakan; jangan menggunakannya sebagai penilai universal soal faktual, matematika, atau semua genre tulisan. Jika kedua kolom berisi pertanyaan berbeda, rumuskan acuan gabungan yang adil atau periksa setiap jawaban secara terpisah.

## Laporan PDF

Klik **Unduh PDF** setelah memeriksa teks atau file peserta. PDF dibuat langsung di browser dengan jsPDF dan AutoTable; tidak memerlukan API key atau konfigurasi Vercel tambahan. Pembuat PDF dan font dimuat saat ekspor pertama agar tidak membebani pembukaan awal halaman. Isi respons tidak dikirim ke server saat ekspor.

Laporan peserta merangkum semua baris yang cocok dengan pencarian/filter dan pilihan Top 10 bila aktif, termasuk seluruh halaman tabel hasil. Urutan mengikuti tabel; jumlah pasangan identik tetap dihitung terhadap seluruh file sumber. PDF peserta berisi ringkasan temuan per peserta dan rubrik ringkas bila penilaian aktif, sementara PDF teks tunggal menyertakan seluruh teks masukan serta alasan/kutipan tiap aspek. PDF mencatat apakah skor masih awal, sudah dikoreksi, atau dikonfirmasi reviewer. Unduhan dapat memuat data pribadi sesuai file masukan.

Font DejaVu Sans disertakan beserta lisensinya. Karakter di luar cakupan font, misalnya sebagian emoji atau aksara, ditulis sebagai kode Unicode seperti `[U+1F600]` agar tidak hilang tanpa penjelasan. Teks asli di aplikasi tidak berubah.

## Batas metode dan data

Telaah menggunakan aturan bahasa, **bukan model deteksi AI terkalibrasi**. Tidak ada klaim akurasi deteksi, probabilitas AI, atau vonis kepengarangan. Peringkat kualitas berasal dari rubrik terpisah dan tetap memerlukan tinjauan reviewer. Aturan dapat menandai teks manusia dan melewatkan teks AI. Durasi, teks pendek, serta nada kritis tidak menjadi dasar pengurangan nilai.

Penanda meliputi penyebutan identitas asisten AI, sisa label percakapan/placeholder, pengantar jawaban, sedikitnya empat baris berpoin pada 80 kata, dan sedikitnya empat penghubung formal pada 100 kata. Ambang tersebut merupakan aturan praktis yang belum dikalibrasi terhadap dataset manusia/AI.

Isi teks dan file diproses di browser, tanpa dikirim ke layanan AI atau disimpan oleh aplikasi. Memuat ulang halaman menghapus data sesi. File jawaban peserta asli tidak disertakan dalam repositori ini. Aplikasi tidak memiliki login bawaan; akses deployment dikelola melalui pengaturan Vercel.

## Struktur kode

| Path | Fungsi |
| --- | --- |
| `app/page.tsx` | Workspace teks, impor, tabel, detail peserta, dan metode |
| `app/globals.css` | Tema dan tampilan responsif |
| `app/layout.tsx` | Metadata dan bahasa Indonesia |
| `lib/analysis.ts` | Penanda bahasa, pencocokan duplikat, dan ekspor |
| `lib/quality.ts` | Saran rubrik, koreksi nilai, dan peringkat seri |
| `components/quality-review.tsx` | Acuan tugas dan formulir penilaian reviewer |
| `lib/import.ts` | Pembacaan XLSX/CSV dan pemetaan kolom |
| `lib/pdf-report.ts` | Laporan PDF teks dan peserta di browser |
| `public/fonts/` | Font PDF dan lisensi |
| `components/ui/` | Komponen antarmuka shadcn |
| `tests/analysis.test.mjs` | Pengujian logika, duplikasi, dan CSV |
| `tests/pdf.test.mjs` | Ekspor hasil filter/urutan, paginasi, karakter, dan rubrik PDF |
| `tests/quality.test.mjs` | Batas heuristik, kritik singkat, seri peringkat, koreksi, dan ekspor |
| `vercel.json` | Konfigurasi Vercel |

Versi ini memakai perintah Next.js standar; tidak bergantung pada Vinext, Workers, D1, atau konfigurasi Sites.

## Validasi

Logika impor sebelumnya diuji pada 2.875 respons, dengan 31 peserta BPA/BTI/BJI serta kelompok pasangan identik 128 dan 25 peserta. Uji tersebut memvalidasi pembacaan dan pencocokan, bukan akurasi deteksi AI. Migrasi ini juga diperiksa melalui pengujian logika, TypeScript, dan build produksi Next.js.
