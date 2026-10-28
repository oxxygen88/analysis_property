# RuangNilai Prompt Studio

Generator prompt analisis properti Indonesia untuk **ChatGPT** dan **Claude**. Format tetap: **Role, Task, Context, Reasoning, Stop Condition, Output**.

Versi 2 mengganti dashboard rekomendasi harga otomatis dengan alur **isi properti → pilih tujuan → generate prompt → salin → jalankan pada percakapan AI**. Aplikasi menyusun teks secara lokal, tidak menghubungi AI, tidak memerlukan kunci API, dan tidak mengklaim telah melakukan riset pasar.

## Cara menggunakan

1. Buka aplikasi. Data properti versi sebelumnya pada browser dan alamat situs yang sama tetap digunakan.
2. Isi **Detail properti**, lalu klik **Simpan & buat prompt**. Rumah tapak, ruko, tanah kavling, dan apartemen dapat dijadikan konteks prompt. Status sertifikat boleh belum diketahui; AI diminta memperlakukannya sebagai keterbatasan.
3. Pilih **Generator prompt**, platform ChatGPT/Claude, dan tujuan: analisis lengkap, riset pembanding/harga, evaluasi iklan, strategi marketing 180 hari, materi iklan, atau laporan/outline presentasi.
4. Atur lingkup area/cluster/radius, usia data, permintaan riset web, serta konteks yang ingin disertakan. Pembanding dan performa pemasaran **opsional**; tidak perlu 3 pembanding untuk menghasilkan prompt.
5. Klik **Generate prompt**. Tinjau enam bagian, lalu **Salin prompt** atau **Unduh TXT**. Format Markdown tersedia di **Data & pengaturan**. Jika izin clipboard ditolak, aplikasi menampilkan teks yang dipilih untuk disalin manual.
6. Klik **Buka ChatGPT** atau **Buka Claude**, aktifkan fitur pencarian web jika tersedia pada akun/sesi tersebut, tempel prompt, dan kirim. Tombol membuka situs AI; tidak mengirim prompt secara otomatis.
7. Jika diperlukan, unggah foto secara terpisah ke percakapan AI. Teks prompt hanya menyebut jumlah foto, tidak menyertakan gambar.
8. Tinjau bukti dan asumsi jawaban AI. Hasil AI tidak otomatis diimpor kembali ke aplikasi. Saat iklan berjalan, catat hasil di **Performa pemasaran**, lalu buat prompt evaluasi baru.

## Apa yang diminta prompt

- Riset hanya bila sesi AI benar-benar memiliki akses web. Jika tidak, AI harus menyatakan keterbatasannya dan meminta data, bukan mengarang akses atau sumber.
- Pisahkan harga penawaran dan transaksi. Periksa duplikat, lokasi perkiraan, usia, legalitas, serta kesesuaian jenis/ukuran properti.
- Untuk rekomendasi angka harga, minta minimal 3 pembanding unik yang relevan dan dapat ditelusuri; disarankan 5–10. Jika bukti kurang, jangan memberi angka final. Ini batas analisis AI, **bukan syarat pembuatan prompt di aplikasi**.
- Viewer kosong memicu pemeriksaan distribusi; bukan penurunan harga otomatis. Bedakan chat unik, survei terjadwal/terlaksana, penawaran, serta ukuran sampel. Sasaran survei/chat 50% bukan bukti harga pasti tepat.
- Harga kompetitif dan strategi bertahap selama 180 hari tanpa menjamin transaksi. Perubahan harga perlu bukti dan persetujuan penjual.
- Bagian **Reasoning** meminta ringkasan metode, asumsi, dan perhitungan yang dapat ditinjau, bukan proses berpikir internal AI.
- Untuk PDF/PPTX, AI diminta membuat file hanya jika fitur percakapannya mendukung. Jika tidak, keluarkan Markdown/outline slide; jangan mengarang tautan unduhan.

## Privasi dan penyimpanan

- Data proyek tetap menggunakan `localStorage` key `ruangnilai.project.v1`, sehingga detail properti, foto, pembanding, dan metrik dari versi sebelumnya tidak dihapus saat aplikasi diperbarui. Preferensi prompt menggunakan `ruangnilai.prompt.v1`.
- Pengguna baru mulai dari properti kosong; simulasi hanya dimuat melalui pilihan yang jelas.
- Secara default prompt menyertakan **area dan cluster**, tetapi tidak alamat lengkap, koordinat, harga minimum, anggaran marketing internal, atau catatan legal internal. Terdapat pilihan eksplisit untuk menyertakan data tersebut.
- Pilihan privasi tidak menyamarkan seluruh teks bebas: nama properti, deskripsi, URL, catatan, dan data performa tetap perlu ditinjau sendiri. Catatan kampanye dapat memuat biaya pemasaran.
- Tidak ada sinkronisasi akun/database cloud. Cadangkan JSON melalui **Data & pengaturan** sebelum menghapus data browser, berpindah perangkat, atau membuat properti baru. Cadangan JSON memuat data internal. Pemulihan cadangan melalui UI belum tersedia.
- Pembanding CSV tetap didukung untuk data rumah (maksimal 500 baris / 2 MB). Data pembanding jenis lain dapat ditulis pada arahan tambahan. Tanda verifikasi adalah penandaan pengguna, bukan pemeriksaan independen.

## GitHub Pages

`index.html` di folder utama adalah hasil build mandiri yang siap tayang. Source entry ada di `src/index.html`.

1. Buka repository → **Settings → Pages**.
2. Pilih **Deploy from a branch → main → / (root)**, lalu **Save**.
3. Tunggu **pages build and deployment** berhasil di tab Actions. Gunakan **Visit site**.

Alamat default: `https://oxxygen88.github.io/analysis_property/`. Tautan hanya berfungsi setelah deployment GitHub berhasil. Tampilan kode `/blob/main/index.html` tidak menjalankan aplikasi.

Setelah update, refresh paksa dengan **Ctrl+Shift+R** (atau **Command+Shift+R**). Jangan menghapus data situs hanya untuk memperbarui tampilan, karena itu juga menghapus data properti lokal.

Versi mandiri juga dapat diunduh melalui **Code → Download ZIP**, diekstrak, lalu `index.html` dibuka di browser yang mendukung file lokal. Perilaku penyimpanan dapat berbeda antarbrowser; data file lokal dan situs Pages berada di tempat terpisah. File lokal diblokir oleh kebijakan Chromium pada mesin pengujian ini, sehingga alur tersebut dilaporkan SKIP; hosting HTTP pada subpath tetap diuji.

## Pengembangan

Prasyarat: Node.js 22.12+ (divalidasi dengan Node 24), npm.

```sh
cd analysis_property
npm ci
npm run dev
```

Server bind `127.0.0.1` port `3000`; opsi `PORT` dan `HOST` ada di `.env.example`. Server hanya melayani aplikasi. `GET /api/health` menunjukkan mode `prompt-generator` dan `requiresApiKey: false`. Tidak ada endpoint AI atau biaya API.

```sh
npm test                 # logika prompt, privasi, kompatibilitas, dan helper pembanding
npm run build            # build server ke dist/
npm start                # jalankan build server
npm run build:standalone # buat ulang index.html root untuk GitHub Pages
npm run test:browser     # alur UI; server harus sudah berjalan
npm run test:standalone  # pengujian HTML pada subpath tanpa backend
npm run format:check
```

**Setelah source berubah, jalankan `npm run build:standalone` dan commit `index.html` hasilnya bersama source.** Jangan mengedit HTML hasil build secara manual. `.nojekyll` memungkinkan Pages melayani HTML siap tayang tanpa Jekyll.

Suite browser menggunakan `/usr/bin/chromium`; atur `CHROMIUM_PATH` dan `TEST_BASE_URL` bila berbeda. Artefak pengujian berada di `.local/checks/`, diabaikan Git. Setiap cloud task sudah terisolasi; gunakan checkout yang ada dan jangan membuat worktree kecuali pengguna meminta.
