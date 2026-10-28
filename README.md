# RuangNilai — V1 + Prompt AI

Dashboard V1 dipertahankan: detail properti, data pembanding, estimasi harga lokal, evaluasi pemasaran 180 hari, serta laporan PDF dan presentasi PowerPoint. Generator prompt menjadi **pendamping**, bukan pengganti dashboard.

## Dua generator prompt

Semua prompt memakai format **Role, Task, Context, Reasoning, Stop Condition, Output** dan dapat disalin ke ChatGPT atau Claude tanpa API key.

### 1. Cari pembanding, lalu impor CSV

1. Isi/simpan **Detail properti**. Di Ringkasan tanpa cukup data, klik **Cari pembanding dengan prompt AI**, atau di **Data pembanding** klik **Generate prompt pembanding**.
2. Pilih ChatGPT/Claude, lingkup area/cluster/radius, usia data, dan pilihan privasi. Klik **Generate prompt**, lalu salin atau unduh TXT.
3. Jalankan prompt di percakapan AI dengan pencarian web jika tersedia pada akun/sesi Anda. Aplikasi sendiri tidak mengambil iklan dari internet dan tidak mengirim data ke AI.
4. AI diminta mencari 5–10 properti nyata dan mengeluarkan CSV dengan kolom yang persis sesuai aplikasi. Salin **header dan baris CSV saja**, tanpa pagar kode atau penjelasan.
5. Kembali ke **Data pembanding → Tempel CSV dari AI → Impor data CSV**, atau unggah file melalui **Impor CSV**.
6. Periksa URL, tanggal, lokasi, ukuran, kondisi, sertifikat, harga, serta kemungkinan duplikat. Semua hasil impor berstatus **belum diverifikasi**, meskipun AI menambahkan kolom `verified`.
7. Minimal **3 pembanding unik yang relevan** dengan kelompok harga yang sama diperlukan untuk menghitung estimasi lokal. Disarankan 5 atau lebih. Filter yang digunakan terlihat pada tabel.

Jika AI tidak bisa mencari web atau bukti tidak lengkap, prompt melarang AI membuat data fiktif. Data dengan kondisi/sertifikat belum diketahui dapat disimpan, tetapi tidak digunakan untuk estimasi lokal sampai diperiksa. Baris tanpa luas, harga, sumber, alamat/area, atau tanggal yang wajib diminta ditempatkan AI di daftar perlu-verifikasi, bukan dipaksakan menjadi CSV.

### 2. Rekomendasi harga jual dengan acuan 180 hari

Buka **Analisis harga → Generate prompt harga 180 hari**. Prompt menyertakan spesifikasi, pembanding pilihan, dan performa pemasaran jika tersedia. AI diminta memberikan rentang indikasi, harga pembukaan yang kompetitif, ruang negosiasi, skenario percepatan, serta jadwal evaluasi hingga hari 180.

Target 180 hari adalah acuan menjual relatif cepat, bukan tenggat mutlak atau jaminan. Viewer kosong tidak otomatis berarti harga harus diturunkan; prompt meminta evaluasi distribusi, kualitas iklan, lokasi, kondisi, legalitas, jadwal, dan pembiayaan. Rasio survei/chat 50% adalah patokan yang bisa ditinjau, bukan bukti pasti harga tepat atau transaksi akan terjadi.

Hasil AI **tidak otomatis mengubah harga iklan atau estimasi lokal**. Tinjau bukti dan putuskan sendiri. Jika bukti belum cukup, AI diminta menahan angka final dan menjelaskan kekurangannya. Bagian Reasoning meminta ringkasan metode dan perhitungan yang dapat ditinjau, bukan proses berpikir internal AI.

## Format kamar tidur dan kamar mandi

- **KT 4+1** = 4 kamar keluarga/utama + 1 kamar ART. Tidak dianggap 5 kamar keluarga.
- **KM 3+1** = 3 kamar mandi utama + 1 kamar mandi ART/servis.
- Format angka biasa seperti `4` tetap didukung. Input negatif, desimal, `4++1`, atau beberapa tanda `+` ditolak.
- Data disimpan terpisah: `beds` dan `staffBeds`, serta `baths` dan `staffBaths`. Data lama berupa angka tetap dipertahankan; jumlah ART tidak ditebak dari jumlah kamar yang lama.
- Notasi yang sama dipakai pada detail properti, ringkasan, pembanding, prompt, PDF, dan PowerPoint. Jumlah kamar mandi ART tidak diasumsikan sama dengan jumlah kamar ART.

## Skema CSV

```csv
title,address,area,cluster,lat,lng,land,building,beds,baths,price,condition,certificate,source,url,observedAt,priceType
```

- Harga rupiah penuh tanpa `Rp` atau pemisah ribuan; luas dalam m²; koordinat opsional memakai titik desimal dan diisi berpasangan; tanggal `YYYY-MM-DD` yang tidak berada di masa depan.
- `beds` dan `baths` mendukung `4+1` / `3+1`. `baths` opsional untuk kompatibilitas CSV lama.
- `condition`: `Siap huni`, `Perlu renovasi ringan`, `Perlu renovasi besar`, atau `Belum diketahui`. Tidak diisi berarti belum diketahui, bukan dianggap siap huni.
- `certificate`: `SHM`, `HGB`, atau `Lainnya / belum diketahui`. Tidak diisi tidak dianggap SHM.
- `priceType`: `Penawaran` atau `Transaksi`. Iklan memakai Penawaran; iklan yang hilang bukan bukti transaksi.
- Impor maksimal 500 baris / 2 MB. Validasi bersifat atomik: jika satu baris tidak valid, tidak ada baris yang disimpan. Template hanya memuat header, tanpa pembanding contoh yang dapat disalahartikan sebagai data nyata.

## Analisis dan laporan V1

Estimasi lokal saat ini mendukung **rumah tapak**. Jenis ruko, tanah, dan apartemen dapat dimasukkan sebagai konteks prompt; estimasi lokal tidak dipaksakan untuk jenis tersebut.

- Memisahkan harga penawaran dan transaksi. Jika ada minimal 3 transaksi yang ditandai terverifikasi pengguna, gunakan kelompok transaksi; jika tidak, perlukan minimal 3 harga penawaran. Keduanya tidak dicampur.
- Filter area, cluster, atau radius garis lurus memerlukan data yang relevan. Radius memerlukan koordinat kedua properti. Nama area/cluster dinormalisasi, bukan dicocokkan dengan GIS.
- Faktor luas awal: `0.65 × LT_subjek/LT_pembanding + 0.35 × LB_subjek/LB_pembanding`. Faktor kondisi `1 + 0.04 × selisih tingkat`, gabungan dibatasi `0.8–1.2`. Ini asumsi awal, belum dikalibrasi dengan transaksi lokal. ART tidak digabung menjadi jumlah kamar keluarga atau diberi premi otomatis.
- Rentang indikasi adalah persentil 25–75, harga pembukaan persentil 35, dibulatkan Rp5 juta. Ini bukan interval keyakinan statistik atau penilaian resmi KJPP.
- Duplikat terdeteksi, data lebih dari 180 hari, kondisi/sertifikat tidak jelas, sertifikat berbeda, lokasi tidak sesuai, dan ukuran terlalu berbeda tidak menjadi dasar estimasi. Duplikat lintas agen dengan alamat dan URL berbeda perlu ditinjau manual.
- Catatan pemasaran memakai periode yang tidak tumpang tindih dan satu harga yang konsisten. Usulan perubahan harga lokal memerlukan bukti, batas evaluasi, dan persetujuan penjual; tidak memperbarui marketplace secara otomatis.
- Ekspor PDF/PPTX mengikuti analisis V1. Harga minimum internal dan anggaran penjual tidak masuk laporan berbagi. Hasil jawaban AI eksternal belum diimpor otomatis ke laporan.

## Privasi dan data lama

Penyimpanan tetap memakai `ruangnilai.project.v1`; detail, foto, pembanding, dan catatan dari V1/V2 pada browser serta alamat situs yang sama tidak dihapus. Preferensi prompt memakai `ruangnilai.prompt.v1`.

Prompt secara default tidak menyertakan alamat lengkap, koordinat, harga minimum, anggaran internal, atau catatan legal internal. Ada pilihan eksplisit untuk memasukkannya. Nama properti, URL, dan teks bebas tetap bisa memuat informasi pribadi; tinjau sebelum menyalin. Foto tidak tertanam dalam prompt dan harus diunggah terpisah jika diperlukan.

Tidak ada akun cloud atau sinkronisasi. Cadangkan JSON di Pengaturan workspace sebelum menghapus data browser, berpindah perangkat, atau membuat analisis baru. Cadangan berisi data internal. Pemulihan cadangan melalui UI belum tersedia.

## GitHub Pages dan pengembangan

`index.html` di root adalah hasil build mandiri. Source entry berada di `src/index.html`. GitHub Pages memakai **Deploy from a branch → main → / (root)**. Tunggu deployment pada Actions berhasil, lalu buka `https://oxxygen88.github.io/analysis_property/`.

Setelah update, gunakan **Ctrl+Shift+R** / **Command+Shift+R**. Jangan menghapus data situs hanya untuk memperbarui tampilan, karena itu juga menghapus data properti lokal.

Prasyarat Node.js 22.12+ (divalidasi Node 24), npm.

```sh
cd analysis_property
npm ci
npm run dev
npm test
npm run build
npm start
npm run build:standalone
npm run test:browser
npm run test:standalone
npm run format:check
```

Server default `127.0.0.1:3000`; `HOST` dan `PORT` opsional. Tidak memerlukan API key. Endpoint health menunjukkan mode `property-analysis-with-prompts`. Untuk suite browser, jalankan server lebih dahulu dan atur `TEST_BASE_URL` bila port berbeda. Chromium sistem default `/usr/bin/chromium`, dapat diganti dengan `CHROMIUM_PATH`.

**Setelah source diubah, buat ulang `npm run build:standalone` lalu commit `index.html` bersama source.** `.nojekyll` memungkinkan Pages menyajikan HTML tanpa Jekyll. Pengujian memakai data sintetis yang diberi label, bukan iklan nyata; artefak berada di `.local/checks/` dan diabaikan Git. File lokal `file://` diblokir kebijakan Chromium di mesin ini, sehingga validasi berfokus pada hosting HTTP dengan subpath seperti Pages.

Setiap cloud task sudah terisolasi. Gunakan checkout yang ada; jangan membuat Git worktree kecuali pengguna meminta.
