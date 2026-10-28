# RuangNilai

Aplikasi MVP berbahasa Indonesia untuk analisis harga rumah tapak, pembanding yang dapat ditelusuri, dan evaluasi pemasaran bertahap. Dibangun dengan React, TypeScript, Vite, dan Express. PDF dan PPTX dibuat di browser.

## Buka melalui GitHub Pages

`index.html` di folder utama adalah aplikasi hasil build satu file, sudah berisi JavaScript, CSS, dan font. Tidak memerlukan npm atau backend untuk fitur lokal.

1. Buka repository GitHub → **Settings → Pages**.
2. Pada **Build and deployment**, pilih **Deploy from a branch**.
3. Pilih branch **main**, folder **/ (root)**, kemudian **Save**.
4. Tunggu deployment GitHub Pages berstatus selesai. Gunakan tautan **Visit site** yang ditampilkan GitHub.

Untuk repository bernama `oxxygen88/analysis_property`, alamat default yang diharapkan adalah `https://oxxygen88.github.io/analysis_property/`. Alamat ini hanya aktif setelah Pages diaktifkan dan deployment berhasil. Menampilkan `index.html` di halaman kode GitHub atau melalui Raw bukan cara menjalankan aplikasi.

GitHub Pages hanya menjalankan fitur lokal (input, pembanding, analisis, penyimpanan browser, PDF/PPTX). Ringkasan AI memerlukan versi server di bawah. Versi Pages tidak mengirim permintaan API dan tidak mengandung kunci rahasia. Jika pengaturan Pages saat ini memakai GitHub Actions atau folder lain, ubah ke konfigurasi di atas agar memakai HTML siap tayang ini.

## Buka langsung tanpa instalasi

Unduh repository melalui **Code → Download ZIP**, ekstrak ZIP, lalu klik dua kali `index.html` di folder utama. File itu juga dapat disalin sendiri ke komputer lain. Gunakan Chrome atau Edge terbaru.

Tidak perlu Node.js, npm, koneksi internet, atau server untuk fitur lokal, termasuk unduhan PDF/PPTX. Data tetap berada di browser. Perilaku penyimpanan file lokal dapat berbeda antarbrowser, jadi cadangkan data penting. Data dari file lokal dan GitHub Pages tersimpan pada tempat terpisah.

Source entry untuk pengembangan berada di `src/index.html`. Setelah mengubah source, jalankan `npm ci` lalu `npm run build:standalone`, dan commit ulang **index.html** hasil build. Jangan mengedit file hasil build secara manual. `npm run build` tetap menghasilkan versi server di `dist/` secara terpisah. Uji file lokal dan hosting pada subpath dengan `npm run test:standalone` (membutuhkan Chromium sistem).

## Menjalankan versi server

Prasyarat: Node.js 22.12+ (divalidasi dengan Node 24), npm.

```sh
cd analysis_property
npm ci
npm run dev
```

Server menggunakan port `3000` dan bind `127.0.0.1`. Ubah `PORT` / `HOST` bila lingkungan memerlukannya. Untuk build produksi lokal:

```sh
npm run build
npm start
```

`GET /api/health` mengembalikan status server dan apakah AI dikonfigurasi. `npm test` menguji kalkulasi harga, filter, deduplikasi, pemisahan penawaran/transaksi, evaluasi pemasaran, validasi periode, dan privasi laporan.

## Alur penggunaan

1. Tampilan awal menggunakan **data simulasi yang diberi label**. Pilih **Analisis baru** untuk menggantinya dengan formulir kosong; cadangkan proyek yang sudah ada terlebih dahulu.
2. Lengkapi lokasi, luas, kondisi, sertifikat, fasilitas, risiko, dan rencana penjualan. Foto JPEG/PNG/WebP opsional diperkecil lokal; maksimal 4 foto.
3. Tambahkan pembanding manual atau unduh template CSV lalu impor. Kolom angka memakai satuan rupiah penuh / m², tanpa pemisah ribuan. Nama area dan cluster harus konsisten. Impor maksimal 500 baris / 2 MB, bersifat atomik: satu baris tidak valid membatalkan seluruh impor. Status verifikasi impor selalu false; buka tombol ubah untuk menandai verifikasi setelah memeriksa buktinya.
4. Pilih filter area, cluster, atau radius garis lurus. Tidak ada pencarian peta/geocoding otomatis; koordinat perlu dipastikan sendiri.
5. Tinjau dasar perhitungan pada Analisis harga; usulan harga harus disetujui pengguna.
6. Masukkan metrik pemasaran gabungan kanal per periode yang tidak tumpang tindih, dengan satu harga yang konsisten. Prospek dihitung unik per periode; survei adalah prospek yang benar-benar datang. Catat harga yang benar-benar dipakai, bukan harga rekomendasi yang belum diterapkan.
7. Unduh laporan PDF dan slide PowerPoint editable. Laporan berbagi mengecualikan harga minimum internal dan anggaran penjual, tetapi tetap memuat alamat, catatan properti, dan sumber: periksa sebelum membagikan.

## AI opsional

Salin `.env.example` menjadi `.env` secara lokal lalu isi kunci lewat mekanisme aman lingkungan. **Jangan commit kunci atau memasukkannya ke variabel `VITE_*`.** Server membaca `.env` dengan fitur bawaan Node.

```dotenv
PROPERTY_AI_API_KEY=<isi secara aman di server>
OPENAI_MODEL=gpt-4.1-mini
```

API menggunakan HTTPS `api.openai.com` melalui proxy lingkungan jika tersedia, verifikasi TLS tetap aktif. Kunci `OPENAI_API_KEY` yang sudah tersedia juga didukung sebagai fallback. Untuk environment cloud dengan nama `OPENAI_*` yang dicadangkan platform, gunakan `PROPERTY_AI_API_KEY` dengan tujuan HTTPS `api.openai.com`. Model dapat diubah ke model Chat Completions yang tersedia untuk akun Anda. Setelah konfigurasi, restart server. Kunci tidak dikirim ke browser. Status terkonfigurasi bukan jaminan kuota atau izin model. Ringkasan dibuat setelah persetujuan pengguna; area, spesifikasi, catatan fasilitas/risiko pemilik, dan hasil analisis dikirim ke penyedia. Alamat lengkap, koordinat, harga minimum, dan identitas tidak dikirim. Catatan bebas tetap dapat memuat informasi sensitif yang dimasukkan pengguna sendiri; periksa isinya.

Ringkasan AI adalah tambahan untuk ditinjau di layar dan belum dimasukkan ke PDF/PPTX. Penilaian harga tidak bergantung pada AI. Tanpa kunci, endpoint ringkasan memberi 503 yang jelas dan seluruh alur lokal tetap berfungsi. Akses API langsung belum dapat divalidasi tanpa kredensial yang tersedia. Pembatasan sederhana 5 permintaan/menit/IP, batas payload, timeout, dan pemeriksaan origin tersedia; ini **belum** pengganti autentikasi dan kontrol biaya untuk layanan publik.

## Metode harga dan batas penggunaan

- Mendukung **rumah tapak**. Ruko, tanah, apartemen belum didukung.
- Minimum 3 pembanding unik sejenis per kelompok harga. Jika ada minimal 3 transaksi yang ditandai terverifikasi oleh pengguna, gunakan kelompok transaksi; jika tidak, gunakan minimal 3 harga penawaran. Kedua kelompok tidak dicampur.
- Faktor luas: `0.65 × LT_subjek/LT_pembanding + 0.35 × LB_subjek/LB_pembanding`.
- Faktor kondisi: `1 + 0.04 × selisih tingkat kondisi`. Faktor gabungan dibatasi `0.8–1.2`. Bobot adalah asumsi awal, belum dikalibrasi terhadap transaksi lokal.
- Rentang indikasi adalah persentil 25–75, harga pembukaan persentil 35; dibulatkan Rp5 juta. Rentang bukan interval keyakinan statistik. Label kualitas bukti adalah heuristik, bukan probabilitas akurasi.
- Sertifikat berbeda, data lebih dari 180 hari, ukuran tanah di luar 0.65–1.5 kali subjek, bangunan di luar 0.6–1.6 kali subjek, data tidak valid, dan transaksi belum diverifikasi dikeluarkan. Deduplikasi memakai alamat+ukuran atau host/path tautan. Satu rumah dengan alamat dan URL berbeda tetap perlu ditinjau manual.
- Radius memerlukan koordinat kedua properti. Filter area/cluster menggunakan nama yang dinormalisasi, bukan batas administrasi GIS.
- Viewer kosong memicu pemeriksaan distribusi. Sampel kecil tidak dianggap bukti kuat. Sasaran survei/chat default 50% dapat diubah. Minimal 10 chat atau 200 viewer merupakan ambang operasional awal, **belum tolok ukur pasar**.
- Usulan penyesuaian harga sekitar 3% (dibulatkan Rp5 juta) hanya jika ada sinyal harga, harga periode sama dengan harga iklan sekarang, harga sekarang di atas saran pembukaan, dan usulan tidak di bawah kuartil bawah atau minimum penjual. Memerlukan persetujuan pengguna, tidak memperbarui marketplace eksternal.
- 180 hari adalah panduan evaluasi. Aplikasi tidak menjamin transaksi, tidak mengklaim akses semua iklan, dan bukan penilaian resmi KJPP. Legalitas, banjir, kondisi, dan fasilitas belum diverifikasi independen.

## Penyimpanan dan pengembangan berikutnya

Data proyek dan foto tersimpan pada `localStorage` browser, bukan database server. Peringatan muncul jika penyimpanan gagal. Unduh cadangan JSON melalui Pengaturan (berisi **data internal**). Pemulihan cadangan, akun, kolaborasi, riwayat multi-proyek, scraping marketplace/media sosial, dan data transaksi mitra belum tersedia.

Sebelum digunakan sebagai layanan publik: tambahkan autentikasi, database dan backup, kebijakan privasi/retensi, pembatasan biaya per akun, audit akses, integrasi sumber dengan izin yang sesuai, serta kalibrasi dan validasi penilaian dengan data transaksi lokal. Jangan mengaktifkan akses publik berbayar AI hanya dengan konfigurasi localhost ini.

Setiap cloud task sudah terisolasi. Gunakan checkout yang ada; tidak perlu membuat Git worktree kecuali pengguna meminta.

## Pengujian browser

Jalankan server lebih dahulu, lalu `npm run test:browser`. Suite menggunakan Chromium sistem di `/usr/bin/chromium`; atur `CHROMIUM_PATH` dan `TEST_BASE_URL` jika berbeda. Mencakup input properti, pembanding manual/CSV, koreksi data, penghapusan simulasi, evaluasi metrik, persistensi browser, unduhan PDF/PPTX, dan navigasi ponsel. Artefak uji berada di `.local/checks/` dan diabaikan Git.

`npm run test:standalone` menguji HTML siap tayang pada subpath seperti GitHub Pages, termasuk ekspor ketika jaringan dimatikan setelah halaman dimuat. Pengujian `file://` dilaporkan `SKIP` jika kebijakan Chromium terkelola memblokir file lokal; pengujian HTTP tetap harus lulus. Pembatasan tersebut terjadi pada mesin pengujian ini, sehingga pembukaan file lokal belum diverifikasi di sini. Status deployment pada layanan GitHub Pages perlu diperiksa terpisah melalui Settings → Pages.
