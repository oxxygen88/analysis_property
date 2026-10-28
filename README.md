# RuangNilai — V1 + tanah/bangunan + Prompt AI

Dashboard V1 dipertahankan: detail properti, data pembanding, estimasi harga lokal, evaluasi pemasaran 180 hari, serta laporan PDF dan presentasi PowerPoint. Generator prompt menjadi **pendamping**, bukan pengganti dashboard.

## Metode baru: nilai tanah + bangunan

Buka **Analisis harga** atau klik **Atur metode tanah + bangunan** di Ringkasan.

1. Pilih **Harga per m² manual + sumber** untuk simulasi cepat, atau **Rata-rata referensi tanah murni**. Harga tanah tidak diperoleh dengan membagi harga rumah total dengan luas tanah.
2. Isi biaya pengganti bangunan baru per m² dan sumber/asumsinya (misalnya penawaran kontraktor dengan spesifikasi setara).
3. Isi umur efektif. Kosong berarti tahun sekarang dikurangi tahun dibangun; bangunan baru = 0. Tahun renovasi tidak otomatis menghapus umur bangunan. Gunakan umur efektif berdasarkan cakupan renovasi dan inspeksi.
4. Tinjau penyusutan linear tahunan, nilai sisa akibat umur, dan faktor kondisi. Preset kondisi adalah contoh asumsi dan dapat diubah. Jangan menghitung kerusakan dua kali lewat umur efektif dan faktor kondisi.
5. Pilih status tusuk sate dan banjir setelah memeriksa informasi. Tentukan koreksi sesuai bukti lokal. Jika risiko yang sama sudah tercermin pada harga tanah acuan, hindari koreksi dua kali. Isi penyesuaian strategi jual bila memang diperlukan; default 0%.
6. Pratinjau langsung memperlihatkan komponen dan kekurangan input. Klik **Simpan & gunakan metode tanah + bangunan**. Harga pada Ringkasan, strategi, PDF, PPTX, dan konteks prompt mengikuti metode aktif. Harga iklan tidak diubah otomatis; tombol penerapan tetap memerlukan konfirmasi dan menjaga harga minimum.
7. **Gunakan metode pembanding rumah V1** mengaktifkan kembali metode lama tanpa menghapus referensi tanah, asumsi, atau pembanding rumah yang tersimpan.

```text
Harga tanah/m² = rata-rata aritmetika (harga total kavling ÷ LT kavling) dalam satu kelompok harga
Nilai tanah = LT subjek × harga tanah/m²
Retensi umur = maks(nilai sisa, 1 − umur efektif × susut linear tahunan)
Nilai bangunan = LB subjek × biaya bangun baru/m² × retensi umur × faktor kondisi
Nilai dasar = (nilai tanah + nilai bangunan) × faktor tusuk sate × faktor banjir
Harga pembukaan indikatif = nilai dasar × (1 − penyesuaian strategi jual)
```

Tanah **tidak disusutkan**. Contoh uji: LT 100 m² × Rp10 juta + LB 100 m² × Rp5 juta × (1 − 10 tahun × 2%) = Rp1,4 miliar, sebelum koreksi posisi/banjir. Contoh ini bukan harga pasar nyata.

Default 2%/tahun adalah skenario `1/50` sebelum batas nilai sisa 20%, **bukan tarif penyusutan resmi atau standar pasar Indonesia yang telah diverifikasi**. Nilai sisa membatasi penyusutan akibat umur; faktor kondisi dapat menurunkannya lebih lanjut. Contoh koreksi tusuk sate 5%, banjir 10%, dan preset kondisi 100/90/70% juga merupakan asumsi yang dapat diubah. Tidak ada diskon 180 hari otomatis. Penyusutan 5–10% dapat dimasukkan pengguna bila beralasan; tidak dipaksakan untuk semua bangunan. Pendekatan biaya perlu kalibrasi dengan inspeksi dan bukti pasar; hasil diberi label **Simulasi asumsi**, bukan penilaian KJPP atau jaminan harga transaksi.

Metode ini mendukung rumah tapak/ruko serta tanah kavling tanpa komponen bangunan. Apartemen belum didukung. Sertifikat tanah yang berbeda/belum diketahui diberi peringatan, bukan diblokir seperti pembanding rumah V1; aplikasi belum menghitung koreksi legalitas. Data yang tidak lengkap atau risiko belum ditentukan tetap menghasilkan penjelasan, bukan angka tebakan.

### Riset dan CSV referensi tanah

Klik **Generate prompt riset tanah**, jalankan pada ChatGPT/Claude dengan pencarian web yang tersedia, lalu salin hasilnya ke **Analisis harga → Tempel CSV tanah** atau gunakan **Impor CSV tanah**. CSV tanah mempunyai skema tersendiri:

```csv
title,area,cluster,lat,lng,land,price,certificate,source,url,observedAt,priceType
```

`price` adalah **harga total tanah**, `land` luas kavling, bukan harga per m². Kolom wajib: `title,area,land,price,source,observedAt`. Sumber, tanggal aktual, dan URL yang diperiksa diminta dalam prompt; jangan membuat iklan fiktif. Sertifikat yang belum diketahui tetap ditulis demikian. Tanggal harus valid dan tidak di masa depan; koordinat opsional berpasangan. Batas impor 500 baris / 2 MB, atomik. CSV rumah dengan kolom `building` ditolak pada impor tanah agar tidak keliru dianggap harga tanah murni.

Referensi tanah disimpan terpisah di `landReferences`, asumsi di `cost`, metode aktif di `valuationMethod`, dengan kunci penyimpanan V1 yang sama. Pembanding rumah lama tidak dihapus atau dikonversi otomatis. Data lokasi memakai filter area/cluster/radius yang sama. Duplikat, data lebih dari 180 hari, dan transaksi belum diperiksa dikeluarkan. Status sumber dan alasan pengecualian terlihat per baris. Impor tidak menetapkan verifikasi otomatis; transaksi harus diperiksa lewat **Ubah tanah**.

Rata-rata tidak mencampur penawaran dengan transaksi: minimal tiga transaksi diperiksa mendapat prioritas; jika belum ada, gunakan penawaran bila tersedia, atau kelompok transaksi yang ada dengan peringatan bukti terbatas. Satu/dua referensi dapat menghasilkan **simulasi awal**, disertai peringatan; disarankan setidaknya tiga referensi relevan. Legalitas, ukuran, akses, risiko dan data ekstrem perlu ditinjau pengguna. Rentang skenario memakai minimum–maksimum harga tanah dengan bangunan dan faktor koreksi tetap; bukan interval keyakinan atau rentang transaksi. Manual/satu referensi memberi satu nilai. Hasil dibulatkan Rp1 juta.

Proyek lama tetap memakai metode V1 sampai pengguna menyimpan metode baru. Ini mencegah perubahan rekomendasi tanpa pilihan pengguna.

## Generator prompt

Semua prompt memakai format **Role, Task, Context, Reasoning, Stop Condition, Output** dan dapat disalin ke ChatGPT atau Claude tanpa API key.

### 1. Cari pembanding rumah, lalu impor CSV

1. Isi/simpan **Detail properti**. Di Ringkasan tanpa cukup data, klik **Cari pembanding dengan prompt AI**, atau di **Data pembanding** klik **Generate prompt pembanding**.
2. Pilih ChatGPT/Claude, lingkup area/cluster/radius, usia data, dan pilihan privasi. Klik **Generate prompt**, lalu salin atau unduh TXT.
3. Jalankan prompt di percakapan AI dengan pencarian web jika tersedia pada akun/sesi Anda. Aplikasi sendiri tidak mengambil iklan dari internet dan tidak mengirim data ke AI.
4. AI diminta mencari 5–10 properti nyata dan mengeluarkan CSV dengan kolom yang persis sesuai aplikasi. Salin **header dan baris CSV saja**, tanpa pagar kode atau penjelasan.
5. Kembali ke **Data pembanding → Tempel CSV dari AI → Impor data CSV**, atau unggah file melalui **Impor CSV**.
6. Periksa URL, tanggal, lokasi, ukuran, kondisi, sertifikat, harga, serta kemungkinan duplikat. Semua hasil impor berstatus **belum diverifikasi**, meskipun AI menambahkan kolom `verified`.
7. Minimal **3 pembanding unik yang relevan** dengan kelompok harga yang sama diperlukan untuk menghitung estimasi lokal. Disarankan 5 atau lebih. Filter yang digunakan terlihat pada tabel.

Jika AI tidak bisa mencari web atau bukti tidak lengkap, prompt melarang AI membuat data fiktif. Data dengan kondisi/sertifikat belum diketahui dapat disimpan, tetapi tidak digunakan untuk estimasi lokal sampai diperiksa. Baris tanpa luas, harga, sumber, alamat/area, atau tanggal yang wajib diminta ditempatkan AI di daftar perlu-verifikasi, bukan dipaksakan menjadi CSV.

### CSV sudah diimpor, tetapi harga belum muncul

Jumlah **tersimpan** dan jumlah **pembanding relevan** berbeda. Enam data yang tersimpan dengan nol data relevan berarti impor berhasil, tetapi data belum memenuhi aturan estimasi. Jangan mengimpor ulang untuk memperbaiki keadaan ini.

Panel **Kesiapan analisis pembanding** pada Ringkasan, Data pembanding, dan Analisis harga memperlihatkan jumlah tersimpan/lolos filter/dasar harga, alasan pengecualian, nilai area atau cluster yang dibandingkan, serta langkah peninjauan. Data tetap terlihat pada tabel meskipun tidak digunakan untuk harga.

- Mode area membandingkan nama area/kecamatan. `Kec. Gunung Putri`, `Kecamatan Gunung Putri`, dan `Gunung Putri` kini dianggap variasi label yang sama. `Gunung Putri`, `Cileungsi`, dan nama kawasan `Kota Wisata` tidak otomatis disamakan.
- Mode cluster mengabaikan awalan `Cluster` / `Klaster`, tetapi tetap membedakan nama cluster yang berbeda dan nama kawasan besar.
- Mode radius memerlukan koordinat yang benar pada kedua properti dan jarak dalam radius terpilih.
- Perbaiki nama/field berdasarkan sumber hanya jika memang wilayah yang sama, atau pilih lingkup yang sesuai. Aplikasi tidak memperluas wilayah secara diam-diam atau mencentang verifikasi agar harga muncul.
- Jika data lolos filter tetapi harga belum muncul, panel juga memeriksa detail properti yang belum lengkap serta kecukupan kelompok penawaran/transaksi. Dua transaksi dan satu penawaran tidak digabung menjadi tiga bukti harga yang sebanding.

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

Metode **pembanding rumah V1** mendukung rumah tapak. Metode tanah + bangunan dijelaskan terpisah di atas. Semua jenis dapat dimasukkan sebagai konteks prompt.

- Memisahkan harga penawaran dan transaksi. Jika ada minimal 3 transaksi yang ditandai terverifikasi pengguna, gunakan kelompok transaksi; jika tidak, perlukan minimal 3 harga penawaran. Keduanya tidak dicampur.
- Filter area, cluster, atau radius garis lurus memerlukan data yang relevan. Radius memerlukan koordinat kedua properti. Nama area/cluster dinormalisasi, bukan dicocokkan dengan GIS.
- Faktor luas awal: `0.65 × LT_subjek/LT_pembanding + 0.35 × LB_subjek/LB_pembanding`. Faktor kondisi `1 + 0.04 × selisih tingkat`, gabungan dibatasi `0.8–1.2`. Ini asumsi awal, belum dikalibrasi dengan transaksi lokal. ART tidak digabung menjadi jumlah kamar keluarga atau diberi premi otomatis.
- Rentang indikasi adalah persentil 25–75, harga pembukaan persentil 35, dibulatkan Rp5 juta. Ini bukan interval keyakinan statistik atau penilaian resmi KJPP.
- Duplikat terdeteksi, data lebih dari 180 hari, kondisi/sertifikat tidak jelas, sertifikat berbeda, lokasi tidak sesuai, dan ukuran terlalu berbeda tidak menjadi dasar estimasi. Duplikat lintas agen dengan alamat dan URL berbeda perlu ditinjau manual.
- Catatan pemasaran memakai periode yang tidak tumpang tindih dan satu harga yang konsisten. Usulan perubahan harga lokal memerlukan bukti, batas evaluasi, dan persetujuan penjual; tidak memperbarui marketplace secara otomatis.
- Ekspor PDF/PPTX mengikuti metode analisis yang aktif; metode biaya menyertakan rincian tanah, biaya bangun, penyusutan, koefisien, sumber, serta batasannya. Harga minimum internal dan anggaran penjual tidak masuk laporan berbagi. Hasil jawaban AI eksternal belum diimpor otomatis ke laporan.

## Privasi dan data lama

Penyimpanan tetap memakai `ruangnilai.project.v1`; detail, foto, pembanding, dan catatan dari V1/V2 pada browser serta alamat situs yang sama tidak dihapus. Preferensi prompt memakai `ruangnilai.prompt.v1`.

Prompt secara default tidak menyertakan alamat lengkap, koordinat (termasuk referensi tanah), harga minimum, anggaran internal, catatan koreksi internal, atau catatan legal internal. Catatan koreksi internal tidak disertakan dalam PDF/PPTX berbagi. Ada pilihan eksplisit untuk memasukkannya. Nama properti, URL, dan teks bebas tetap bisa memuat informasi pribadi; tinjau sebelum menyalin. Foto tidak tertanam dalam prompt dan harus diunggah terpisah jika diperlukan.

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
