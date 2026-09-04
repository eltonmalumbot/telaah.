# Telaah.

Telaah. adalah workspace lokal untuk memeriksa pola bahasa, duplikasi jawaban, menilai kualitas refleksi dengan rubrik transparan, membandingkan peserta, menyusun kandidat Top 10, membuat laporan PDF/CSV, dan menerbitkan sertifikat ber-QR.

> Nama repositori GitHub adalah **`eltonmalumbot/telaah.`** — titik di akhir nama repo adalah bagian dari nama.

## Prinsip utama

- **Tidak memakai OpenAI API untuk analisis.** Isi jawaban peserta dianalisis di browser dengan aturan yang dapat diperiksa.
- Penanda bahasa **bukan probabilitas AI dan bukan vonis kepengarangan**.
- Skor kualitas memakai rubrik 4 aspek dan tetap dapat dikoreksi reviewer.
- File peserta, analisis, PDF, ZIP, dan mode sertifikat lokal tidak memerlukan API key.

## Stack

- Next.js 16.2.6
- React 19.2.6
- TypeScript 5.9
- Node.js 24.x
- Vercel
- Neon Postgres opsional untuk registry sertifikat online

## Menjalankan secara lokal

```bash
git clone https://github.com/eltonmalumbot/telaah..git
cd telaah.
npm install
npm run dev
```

Pemeriksaan sebelum deploy:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

CI GitHub menjalankan empat pemeriksaan tersebut pada pull request dan push ke `main`.

## Impor peserta dan Response 1–N

Telaah. membaca `.xlsx` atau `.csv`. Kolom Moodle seperti:

```text
Last name | First name | Email address | Response 1 | Response 2 | Response 3 | ... | Duration
```

dideteksi otomatis. Bagian **Sesuaikan kolom** menampilkan **Jawaban 1…N** sebanyak kolom Response yang ditemukan. File lama dengan dua Response tetap kompatibel.

Batas impor: 10 MB file, 60 MB isi XLSX setelah dibuka, 10.000 baris data, 64 kolom, 50.000 karakter per sel, dan hanya sheet pertama yang dibaca.

## Pertanyaan 1–N dan penilaian jawaban terbaik

Jika file memiliki beberapa Response, bagian **Cari jawaban terbaik** otomatis membuat acuan yang sejajar:

```text
Pertanyaan / tujuan Response 1 → Response 1
Pertanyaan / tujuan Response 2 → Response 2
Pertanyaan / tujuan Response 3 → Response 3
...
```

Masing-masing jawaban dinilai **secara terpisah** terhadap pertanyaannya sendiri. Skor akhir peserta adalah **rata-rata aritmetika skor Response yang memiliki acuan valid**. Detail penilaian menampilkan skor tiap Response serta ringkasan gabungan untuk Top 10.

Rubrik v1.0 terdiri dari empat aspek berbobot sama:

1. Relevansi dengan tugas
2. Kedalaman refleksi
3. Contoh konkret
4. Rencana tindakan

Setiap aspek 0–4. Skor satu jawaban = jumlah tingkat ÷ 16 × 100. Saran awal adalah heuristik bahasa Indonesia, bukan model semantik; reviewer dapat mengubah tingkat dan mengonfirmasi hasil.

## Duplikasi dan perbandingan

Telaah. memeriksa:

- tuple seluruh Response yang identik;
- tuple setelah normalisasi Unicode NFKC, huruf kecil, dan spasi;
- jumlah identik untuk Response 1, Response 2, dan Response berikutnya;
- daftar peserta yang cocok;
- perbandingan dua peserta melalui pencarian nama, grup, email, atau nomor peserta.

Teks kosong tidak dianggap duplikat.

## Laporan dan penyimpanan

- PDF teks tunggal
- PDF hasil peserta
- CSV hasil analisis
- proyek analisis lokal melalui IndexedDB/localStorage
- desain sertifikat dalam JSON
- backup registry sertifikat

Perangkat bersama harus dikelola dengan hati-hati karena proyek lokal dapat berisi data peserta.

## Studio Sertifikat

Studio mendukung 12 template, latar kustom, dua logo, dua tanda tangan, nomor sertifikat, PDF individual, PDF gabungan, ZIP massal, dan QR verifikasi.

### Mode sederhana — default

Tidak perlu environment variable.

Alur:

```text
Pilih peserta → buat sertifikat → Certificate ID + QR otomatis → download
```

Certificate ID menggunakan pola seperti:

```text
TLH-2026-A1B2C3D4E5
```

Mode lokal menandatangani QR dengan ECDSA P-256 di browser. Private key lokal tidak dimasukkan ke QR; public key dipakai untuk memeriksa integritas token dari perangkat lain.

### Trusted Issuer — opsional, aktivasi sekali

Untuk organisasi yang membutuhkan registry resmi dan status pencabutan lintas perangkat, aktifkan trusted issuer pada:

```text
/issuer
```

Pengelola memasukkan `CERTIFICATE_ADMIN_KEY` **satu kali**. Browser menerima cookie HttpOnly tepercaya selama satu tahun. Setelah itu pembuatan sertifikat tetap sama sederhananya dan tidak meminta password setiap kali.

Trusted issuer memerlukan:

```text
CERTIFICATE_ADMIN_KEY=
CERTIFICATE_SIGNING_SECRET=
DATABASE_URL=
```

`CERTIFICATE_SIGNING_SECRET` sebaiknya random minimal 32 karakter dan tidak boleh disimpan di GitHub. `DATABASE_URL` mengarah ke Neon/Postgres yang memiliki tabel `certificate_registry` dari `scripts/certificate-registry.sql`.

Jika trusted issuer atau database tidak tersedia, Telaah. tetap dapat membuat sertifikat dengan mode lokal sehingga workflow harian tidak terblokir.

## Registry sertifikat online

Trusted certificate yang berhasil diterbitkan dicatat dengan:

- Certificate ID
- hash token
- nama penerima dan grup
- kegiatan dan penyelenggara
- nomor serta tanggal sertifikat
- fingerprint penerbit
- status `active` / `revoked`
- waktu penerbitan/pencabutan

Halaman `/verify` memeriksa signature server dan, bila registry online tersedia, juga status publik. Sertifikat yang dicabut tidak lagi tampil sebagai valid.

Schema tersedia di:

```text
scripts/certificate-registry.sql
```

## Backup sertifikat

Registry publik dapat diekspor tanpa private key. Untuk pemulihan identitas penerbit lokal tersedia backup recovery yang **mengandung private key**; file recovery harus disimpan offline dan jangan pernah dibagikan atau diunggah ke repositori.

Jika browser dihapus sebelum private key lokal dibackup, identitas penerbit lokal lama tidak dapat dibuat ulang, walaupun QR yang sudah terbit tetap dapat diverifikasi dari public key yang tertanam.

## Email sertifikat — opsional

Pengiriman melalui Resend membutuhkan:

```text
RESEND_API_KEY=
CERTIFICATE_FROM_EMAIL=Sertifikat <sertifikat@domain-anda.com>
CERTIFICATE_ADMIN_KEY=
```

Domain pengirim harus diverifikasi di Resend. Tanpa konfigurasi email seluruh fitur utama tetap berjalan.

## Environment variables

Lihat `.env.example`.

| Variable | Kebutuhan |
| --- | --- |
| `DATABASE_URL` | Hanya registry online |
| `CERTIFICATE_ADMIN_KEY` | Aktivasi trusted issuer / email |
| `CERTIFICATE_SIGNING_SECRET` | Signature trusted issuer |
| `RESEND_API_KEY` | Hanya pengiriman email |
| `CERTIFICATE_FROM_EMAIL` | Hanya pengiriman email |

## Deploy Vercel

| Pengaturan | Nilai |
| --- | --- |
| Framework | Next.js |
| Root Directory | `./` |
| Node.js | 24.x |
| Install | `npm install` |
| Build | `npm run build` |
| Production Branch | `main` |

Production saat ini menggunakan integrasi GitHub → Vercel. Push ke `main` memicu deployment baru.

## Quality gate dan dependency maintenance

GitHub Actions memeriksa test, TypeScript, ESLint, dan production build. Dependabot dijadwalkan mingguan untuk membuka PR dependency sehingga update dapat diuji satu per satu. Hindari menjalankan `npm audit fix --force` langsung di production karena upgrade transitif dapat membawa breaking change.

## Batas interpretasi

Telaah. bukan alat forensik kepengarangan dan tidak boleh dipakai sebagai satu-satunya dasar menuduh peserta menggunakan AI. Penanda seperti penyebutan identitas asisten, placeholder, struktur poin, atau penghubung formal juga dapat muncul pada tulisan manusia. Untuk keputusan penting, baca isi respons, konteks tugas, duplikasi, bukti pengalaman, serta hasil tinjauan reviewer.

## Struktur penting

| Path | Fungsi |
| --- | --- |
| `app/page.tsx` | Workspace utama |
| `app/verify/page.tsx` | Verifikasi QR |
| `app/issuer/page.tsx` | Aktivasi trusted issuer sekali per perangkat |
| `lib/analysis.ts` | Analisis bahasa dan duplikasi |
| `lib/quality.ts` | Rubrik dan multi-prompt 1–N |
| `lib/import.ts` | Impor dan mapping Response 1–N |
| `lib/certificate-identity.ts` | Penerbit lokal + pemilihan trusted issuer |
| `lib/certificate-server.ts` | Signature trusted server |
| `lib/certificate-registry-server.ts` | Registry Neon/Postgres |
| `scripts/certificate-registry.sql` | Schema registry |
| `.github/workflows/ci.yml` | Quality gate CI |
| `.github/dependabot.yml` | Update dependency berkala |

## Sebelum penggunaan resmi

- tetapkan domain permanen sebelum menerbitkan sertifikat dalam jumlah besar;
- simpan salinan file sumber dan laporan penting;
- aktifkan trusted issuer jika sertifikat akan dipakai sebagai bukti resmi lintas organisasi;
- cadangkan identitas penerbit lokal secara aman;
- jangan menyimpan secret atau file recovery di GitHub.
