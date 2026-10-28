import { formatRooms, validRoomCounts } from './rooms';
import { areaKey, clusterKey } from './location';
import { costAnalysis, type CostSettings, type LandReference, type costValuation } from './cost';
export type Condition =
  'Siap huni' | 'Perlu renovasi ringan' | 'Perlu renovasi besar' | 'Belum diketahui';
export interface Property {
  kind?: 'Rumah tapak' | 'Ruko' | 'Tanah kavling' | 'Apartemen';
  city?: string;
  province?: string;
  title: string;
  address: string;
  area: string;
  cluster: string;
  lat: number | null;
  lng: number | null;
  land: number;
  building: number;
  frontage: number;
  road: number;
  floors: number;
  beds: number;
  baths: number;
  staffBeds?: number;
  staffBaths?: number;
  carport: number;
  garage: number;
  certificate: 'SHM' | 'HGB' | 'Lainnya / belum diketahui';
  condition: Condition;
  builtYear: number | null;
  renovationYear: number | null;
  electricity: number;
  water: string;
  facilities: string;
  risks: string;
  permits: string;
  occupancy: string;
  handover: string;
  shape: string;
  position: string;
  fee: number;
  legalNotes: string;
  asking: number;
  minimum: number;
  budget: number;
  photos: string[];
}
export interface Comparable {
  id: string;
  title: string;
  address: string;
  area: string;
  cluster: string;
  lat: number | null;
  lng: number | null;
  land: number;
  building: number;
  beds: number;
  staffBeds?: number;
  baths?: number;
  staffBaths?: number;
  price: number;
  condition: Condition;
  certificate: Property['certificate'];
  source: string;
  url: string;
  observedAt: string;
  verified: boolean;
  enabled: boolean;
  priceType: 'Penawaran' | 'Transaksi';
}
export interface Campaign {
  id: string;
  start: string;
  end: string;
  channel: string;
  price: number;
  views: number;
  chats: number;
  scheduled: number;
  visits: number;
  offers: number;
  spend: number;
  objection: string;
  notes: string;
}
export interface Settings {
  mode: 'area' | 'cluster' | 'radius';
  radius: number;
  visitTarget: number;
}
export interface Project {
  valuationMethod?: 'market' | 'cost';
  cost?: CostSettings;
  landReferences?: LandReference[];
  version: 1;
  demo: boolean;
  property: Property;
  comparables: Comparable[];
  campaigns: Campaign[];
  settings: Settings;
  priceHistory: { at: string; from: number; to: number; reason: string }[];
}
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function dateOffset(days: number) {
  const d = new Date(`${today()}T00:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
export const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
export const compact = (n: number) =>
  n >= 1e9
    ? `Rp ${(n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`
    : n >= 1e6
      ? `Rp ${(n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
      : rupiah(n);
export const shortDate = (s: string) =>
  s
    ? new Date(`${s}T00:00:00+07:00`).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      })
    : '—';
const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
export const validCoords = (lat: number | null, lng: number | null): boolean =>
  lat !== null &&
  lng !== null &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;
export function distance(a: Property, b: Comparable) {
  if (!validCoords(a.lat, a.lng) || !validCoords(b.lat, b.lng)) return null;
  const rad = (n: number) => (n * Math.PI) / 180;
  const x =
    Math.sin(rad(b.lat! - a.lat!) / 2) ** 2 +
    Math.cos(rad(a.lat!)) * Math.cos(rad(b.lat!)) * Math.sin(rad(b.lng! - a.lng!) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
function urlKey(s: string) {
  try {
    const u = new URL(s);
    return `${u.host}${u.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch {
    return '';
  }
}
export const safeUrl = (url: string) => {
  try {
    const u = new URL(url);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
};
const validDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  Number.isFinite(Date.parse(s)) &&
  new Date(s).toISOString().slice(0, 10) === s;
export function validateProperty(p: Property) {
  const issues: string[] = [];
  if (!p.title.trim()) issues.push('Nama properti wajib diisi.');
  if (!p.address.trim() || !p.area.trim()) issues.push('Alamat dan area wajib diisi.');
  if (!positive(p.land) || !positive(p.building))
    issues.push('Luas tanah dan bangunan harus lebih dari 0.');
  if (!validRoomCounts(p.beds, p.staffBeds) || !validRoomCounts(p.baths, p.staffBaths))
    issues.push('Format kamar harus seperti 4 atau 4+1; angka setelah + menunjukkan ART/servis.');
  if (p.condition === 'Belum diketahui')
    issues.push('Kondisi bangunan perlu dipastikan sebelum estimasi lokal.');
  if (p.certificate === 'Lainnya / belum diketahui')
    issues.push('Status sertifikat perlu dipastikan sebelum estimasi harga.');
  if ((p.lat !== null || p.lng !== null) && !validCoords(p.lat, p.lng))
    issues.push('Isi kedua koordinat dengan latitude -90–90 dan longitude -180–180.');
  return issues;
}
export function validateComparable(c: Comparable) {
  if (!c.title.trim() || !c.address.trim() || !c.area.trim() || !c.source.trim())
    return 'Nama, alamat, area, dan sumber wajib diisi.';
  if (![c.price, c.land, c.building].every(positive))
    return 'Harga, luas tanah, dan luas bangunan harus lebih dari 0.';
  if (
    !validRoomCounts(c.beds, c.staffBeds) ||
    (c.baths !== undefined && !validRoomCounts(c.baths, c.staffBaths))
  )
    return 'Jumlah kamar harus seperti 4 atau 4+1, dengan bagian utama dan ART/servis yang valid.';
  if (
    !['Siap huni', 'Perlu renovasi ringan', 'Perlu renovasi besar', 'Belum diketahui'].includes(
      c.condition,
    )
  )
    return 'Kondisi bangunan tidak valid.';
  if (!['SHM', 'HGB', 'Lainnya / belum diketahui'].includes(c.certificate))
    return 'Jenis sertifikat tidak valid.';
  if (!['Penawaran', 'Transaksi'].includes(c.priceType))
    return 'Jenis harga harus Penawaran atau Transaksi.';
  if (!validDate(c.observedAt) || c.observedAt > today())
    return 'Tanggal pengamatan tidak valid atau berada di masa depan.';
  if (c.url && !safeUrl(c.url)) return 'Tautan harus menggunakan http atau https.';
  if ((c.lat !== null || c.lng !== null) && !validCoords(c.lat, c.lng))
    return 'Koordinat pembanding tidak valid.';
  return '';
}
export interface Matched {
  comparable: Comparable;
  included: boolean;
  reason: string;
  adjusted: number;
  adjustment: number;
  distance: number | null;
}
export interface Analysis {
  method?: 'market' | 'cost';
  cost?: ReturnType<typeof costValuation>;
  rows: Matched[];
  count: number;
  low: number | null;
  high: number | null;
  suggested: number | null;
  median: number | null;
  confidence: string;
  issues: string[];
  transactionCount: number;
}
function quantile(values: number[], q: number) {
  const a = [...values].sort((a, b) => a - b);
  const p = (a.length - 1) * q;
  const i = Math.floor(p);
  return a[i] + (a[Math.ceil(p)] - a[i]) * (p - i);
}
export function analyze(project: Project): Analysis {
  return project.valuationMethod === 'cost' ? costAnalysis(project) : analyzeMarket(project);
}
export function analyzeMarket(project: Project): Analysis {
  const p = project.property;
  const issues = validateProperty(p);
  if (p.kind && p.kind !== 'Rumah tapak')
    issues.push(
      'Estimasi lokal V1 mendukung rumah tapak. Gunakan prompt harga 180 hari untuk jenis properti lainnya.',
    );
  if (project.settings.mode === 'radius' && !validCoords(p.lat, p.lng))
    issues.push('Pencarian radius memerlukan koordinat properti.');
  if (project.settings.mode === 'cluster' && !p.cluster.trim())
    issues.push('Isi nama cluster untuk menggunakan filter cluster.');
  const seenAddress = new Set<string>();
  const seenUrl = new Set<string>();
  const conditionScore = {
    'Siap huni': 2,
    'Perlu renovasi ringan': 1,
    'Perlu renovasi besar': 0,
    'Belum diketahui': 0,
  };
  const rows: Matched[] = project.comparables.map((c) => {
    let reason = '';
    const key = `${norm(c.address)}:${c.land}:${c.building}`;
    const url = urlKey(c.url);
    const d = distance(p, c);
    if (!c.enabled) reason = 'Tidak dipilih';
    else if (validateComparable(c)) reason = 'Data belum valid';
    else if (seenAddress.has(key) || (url && seenUrl.has(url))) reason = 'Duplikat properti';
    else if (Math.floor((Date.parse(today()) - Date.parse(c.observedAt)) / 86400000) > 180)
      reason = 'Data lebih dari 180 hari';
    else if (c.priceType === 'Transaksi' && !c.verified) reason = 'Transaksi belum diverifikasi';
    else if (c.condition === 'Belum diketahui' || c.certificate === 'Lainnya / belum diketahui')
      reason = 'Kondisi / sertifikat perlu diverifikasi';
    else if (c.certificate !== p.certificate) reason = 'Sertifikat berbeda';
    else if (project.settings.mode === 'area' && areaKey(c.area) !== areaKey(p.area))
      reason = 'Di luar area';
    else if (
      project.settings.mode === 'cluster' &&
      (!p.cluster.trim() || clusterKey(c.cluster) !== clusterKey(p.cluster))
    )
      reason = 'Cluster berbeda';
    else if (project.settings.mode === 'radius' && (d === null || d > project.settings.radius))
      reason = d === null ? 'Koordinat belum tersedia' : 'Di luar radius';
    else if (
      c.land / p.land < 0.65 ||
      c.land / p.land > 1.5 ||
      c.building / p.building < 0.6 ||
      c.building / p.building > 1.6
    )
      reason = 'Ukuran terlalu berbeda';
    if (!reason) {
      seenAddress.add(key);
      if (url) seenUrl.add(url);
    }
    const sizeFactor =
      positive(p.land) && positive(p.building) && positive(c.land) && positive(c.building)
        ? (0.65 * p.land) / c.land + (0.35 * p.building) / c.building
        : 1;
    const conditionFactor = 1 + 0.04 * (conditionScore[p.condition] - conditionScore[c.condition]);
    const factor = Math.min(1.2, Math.max(0.8, sizeFactor * conditionFactor));
    return {
      comparable: c,
      included: !reason,
      reason: reason || 'Sesuai kriteria',
      adjusted: c.price * factor,
      adjustment: (factor - 1) * 100,
      distance: d,
    };
  });
  const selected = rows.filter((r) => r.included);
  // Keep asking and verified transaction prices separate; do not silently mix them.
  const transactions = selected.filter((r) => r.comparable.priceType === 'Transaksi');
  const asking = selected.filter((r) => r.comparable.priceType === 'Penawaran');
  const basis = transactions.length >= 3 ? transactions : asking;
  const ready = basis.length >= 3 && issues.length === 0;
  const values = basis.map((r) => r.adjusted);
  const round = (n: number) => Math.round(n / 5e6) * 5e6;
  const median = ready ? quantile(values, 0.5) : null;
  return {
    rows,
    count: basis.length,
    transactionCount: transactions.length,
    low: ready ? round(quantile(values, 0.25)) : null,
    high: ready ? round(quantile(values, 0.75)) : null,
    median,
    suggested: ready ? round(quantile(values, 0.35)) : null,
    confidence: !ready
      ? 'Belum cukup data'
      : basis.length < 5 || (quantile(values, 0.75) - quantile(values, 0.25)) / median! > 0.3
        ? 'Terbatas'
        : 'Sedang',
    issues: [
      ...issues,
      ...(basis.length < 3
        ? ['Minimal 3 pembanding unik sejenis dengan jenis harga yang sama diperlukan.']
        : []),
    ],
  };
}
export function validateCampaign(c: Campaign, previous: Campaign[]) {
  if (!c.channel.trim()) return 'Isi kanal pemasaran.';
  if (!validDate(c.start) || !validDate(c.end) || c.end < c.start || c.end > today())
    return 'Rentang tanggal tidak valid atau belum selesai.';
  if (!positive(c.price)) return 'Harga yang diuji harus lebih dari 0.';
  if (
    ![c.views, c.chats, c.scheduled, c.visits, c.offers].every(
      (n) => Number.isInteger(n) && n >= 0,
    ) ||
    !Number.isFinite(c.spend) ||
    c.spend < 0
  )
    return 'Metrik harus berupa bilangan bulat nonnegatif dan biaya tidak boleh negatif.';
  if (c.visits > c.chats || c.scheduled > c.chats || c.offers > c.chats)
    return 'Survei, jadwal, dan pemberi penawaran tidak boleh melebihi prospek chat unik.';
  if (previous.some((x) => c.start <= x.end && c.end >= x.start))
    return 'Periode tumpang tindih. Gunakan satu catatan gabungan semua kanal untuk setiap periode agar prospek tidak terhitung ganda.';
  return '';
}
export function evaluate(project: Project, analysis: Analysis) {
  const current = [...project.campaigns].sort((a, b) => b.end.localeCompare(a.end))[0];
  const empty = {
    title: 'Mulai ukur respons pasar',
    description: 'Catat satu periode pemasaran lengkap untuk mendapatkan rekomendasi berikutnya.',
    action: 'Catat performa',
    nextPrice: null as number | null,
    ratio: null as number | null,
    current,
  };
  if (!current) return empty;
  const ratio = current.chats ? current.visits / current.chats : null;
  const result = { ...empty, current, ratio };
  if (current.views === 0 && current.chats === 0)
    return {
      ...result,
      title: 'Periksa jangkauan iklan terlebih dahulu',
      description:
        'Belum ada bukti untuk menilai harga. Pastikan iklan aktif, distribusi berjalan, dan metrik kanal tercatat.',
      action: 'Perbaiki distribusi',
    };
  if (current.chats < 10 && current.views < 200)
    return {
      ...result,
      title: 'Minat mulai terukur, data masih terbatas',
      description:
        'Kumpulkan respons tambahan dan alasan calon pembeli belum menjadwalkan survei. Harga belum perlu otomatis diturunkan.',
      action: 'Lanjutkan observasi',
    };
  if (current.chats >= 10 && ratio !== null && ratio >= project.settings.visitTarget)
    return {
      ...result,
      title: 'Pertahankan harga, fokus pada tindak lanjut',
      description:
        'Rasio survei mencapai sasaran pada periode ini. Periksa keberatan setelah survei, kesiapan pembiayaan, dan peluang negosiasi; ini belum membuktikan harga transaksi.',
      action: 'Tindak lanjuti prospek',
    };
  const priceSignal = current.objection === 'Harga' || (current.views >= 200 && current.chats < 2);
  const floor = Math.max(analysis.low || 0, project.property.minimum || 0);
  const candidate = Math.floor((current.price * 0.97) / 5e6) * 5e6;
  const nextPrice =
    analysis.suggested !== null &&
    current.price === project.property.asking &&
    current.price > analysis.suggested &&
    priceSignal &&
    candidate >= floor &&
    candidate < current.price
      ? candidate
      : null;
  if (nextPrice)
    return {
      ...result,
      title: 'Uji penyesuaian harga secara terukur',
      description:
        'Ada sinyal hambatan harga. Usulan langkah awal sekitar 3% (dibulatkan Rp5 juta), tetap di atas batas evaluasi. Periksa materi dan pembanding sebelum menyetujui.',
      action: 'Tinjau harga berikutnya',
      nextPrice,
    };
  return {
    ...result,
    title: 'Cari hambatan sebelum mengubah harga',
    description:
      'Tinjau alasan belum survei, akurasi informasi, akses, jadwal, dan pembiayaan. Data saat ini belum mendukung penurunan harga yang aman.',
    action: 'Evaluasi prospek',
  };
}
export function insights(p: Property) {
  const strengths = [
    p.beds >= 3
      ? `${formatRooms(p.beds, p.staffBeds)} kamar: ${p.beds} untuk keluarga${p.staffBeds ? ` dan ${p.staffBeds} kamar ART terpisah` : ''}.`
      : 'Kebutuhan ruang dapat dinilai melalui denah dan kunjungan.',
    p.road >= 6
      ? `Lebar jalan ${p.road} m menurut input pemilik; verifikasi akses di lokasi.`
      : 'Periksa akses kendaraan melalui survei lokasi.',
    p.condition === 'Siap huni'
      ? 'Kondisi dinyatakan siap huni oleh pemilik; foto dan survei tetap diperlukan.'
      : 'Potensi penataan ulang sesuai kebutuhan pembeli.',
  ];
  const weaknesses = [
    p.condition !== 'Siap huni'
      ? 'Perkirakan biaya renovasi sebelum negosiasi.'
      : 'Kondisi fisik belum diperiksa secara independen.',
    p.risks.trim() ? `Catatan pemilik: ${p.risks}` : 'Risiko lingkungan belum diverifikasi.',
    'Status dokumen dan harga transaksi pembanding perlu diperiksa.',
  ];
  return {
    strengths,
    weaknesses,
    audience:
      p.beds >= 3
        ? 'Pembeli yang membutuhkan beberapa kamar, ruang kerja, dan kapasitas parkir sesuai spesifikasi rumah.'
        : 'Pembeli yang kebutuhan ruang dan anggarannya sesuai dengan spesifikasi rumah.',
  };
}
export const phases = [
  {
    days: '01–14',
    title: 'Siapkan fondasi',
    text: 'Periksa dokumen, kondisi rumah, foto, denah, dan pembanding. Tetapkan harga pembukaan.',
    tasks: [
      'Verifikasi legalitas dan informasi pemilik',
      'Ambil foto terang dan susun deskripsi faktual',
      'Periksa pembanding dan sepakati harga pembukaan',
    ],
  },
  {
    days: '15–30',
    title: 'Luncurkan & ukur',
    text: 'Publikasikan iklan dan aktifkan jaringan agen. Catat jangkauan serta prospek unik.',
    tasks: [
      'Publikasikan di kanal yang dipilih',
      'Catat viewer, chat unik, dan biaya per periode',
      'Tanggapi prospek dan tawarkan jadwal survei',
    ],
  },
  {
    days: '31–60',
    title: 'Optimalkan minat',
    text: 'Uji materi iklan, tindak lanjuti pertanyaan, dan kumpulkan alasan belum survei.',
    tasks: [
      'Evaluasi foto utama dan informasi iklan',
      'Tanyakan alasan belum menjadwalkan survei',
      'Catat survei terlaksana dan keberatan pengunjung',
    ],
  },
  {
    days: '61–90',
    title: 'Evaluasi posisi',
    text: 'Perbarui pembanding dan uji harga jika respons serta data pasar mendukung.',
    tasks: [
      'Perbarui pembanding yang sudah lama',
      'Bandingkan respons pada harga yang diuji',
      'Setujui atau tolak usulan harga berdasarkan bukti',
    ],
  },
  {
    days: '91–120',
    title: 'Perkuat penawaran',
    text: 'Sesuaikan kanal, pesan, atau insentif berdasarkan hambatan yang ditemukan.',
    tasks: [
      'Prioritaskan kanal dengan prospek relevan',
      'Evaluasi kebutuhan perbaikan rumah',
      'Ukur dampak setiap perubahan secara terpisah',
    ],
  },
  {
    days: '121–150',
    title: 'Fokus prospek serius',
    text: 'Diskusikan penawaran, kemampuan pembiayaan, dan syarat serah terima.',
    tasks: [
      'Tindak lanjuti pengunjung yang berminat',
      'Periksa kesiapan pembiayaan',
      'Dokumentasikan penawaran dan syarat transaksi',
    ],
  },
  {
    days: '151–180',
    title: 'Tuntaskan atau tinjau ulang',
    text: 'Koordinasikan proses transaksi atau lakukan evaluasi ulang bersama penjual.',
    tasks: [
      'Koordinasikan pemeriksaan dokumen dengan profesional',
      'Evaluasi kesepakatan harga dan pembayaran',
      'Tinjau ulang strategi jika belum ada kesepakatan',
    ],
  },
];
export function emptyProject(): Project {
  return {
    version: 1,
    demo: false,
    property: {
      title: '',
      address: '',
      area: '',
      cluster: '',
      lat: null,
      lng: null,
      land: 0,
      building: 0,
      frontage: 0,
      road: 0,
      floors: 1,
      beds: 0,
      baths: 0,
      carport: 0,
      garage: 0,
      certificate: 'Lainnya / belum diketahui',
      condition: 'Siap huni',
      builtYear: null,
      renovationYear: null,
      electricity: 0,
      water: '',
      facilities: '',
      risks: '',
      permits: '',
      occupancy: 'Dihuni pemilik',
      handover: '',
      shape: '',
      position: '',
      fee: 0,
      legalNotes: '',
      asking: 0,
      minimum: 0,
      budget: 0,
      photos: [],
    },
    comparables: [],
    campaigns: [],
    settings: { mode: 'area', radius: 3, visitTarget: 0.5 },
    priceHistory: [],
  };
}
export function demoProject(): Project {
  const s = emptyProject();
  s.demo = true;
  s.property = {
    ...s.property,
    title: 'Rumah keluarga di Bintaro',
    address: 'Contoh: Jl. Taman Bintaro, Pondok Aren, Tangerang Selatan',
    area: 'Pondok Aren',
    cluster: 'Taman Bintaro (contoh)',
    lat: -6.279,
    lng: 106.713,
    land: 180,
    building: 150,
    frontage: 9,
    road: 7,
    floors: 2,
    beds: 3,
    baths: 3,
    carport: 2,
    certificate: 'SHM',
    builtYear: 2018,
    electricity: 3500,
    water: 'PAM',
    facilities: 'Contoh: taman lingkungan dan akses fasilitas harian.',
    risks: 'Belum diverifikasi; perlu pemeriksaan riwayat banjir.',
    asking: 3e9,
    budget: 3e6,
  };
  s.comparables = [
    ['Rumah dua lantai, taman depan', 175, 145, 2.75e9, 'Siap huni'],
    ['Rumah keluarga, akses dua mobil', 185, 155, 2.95e9, 'Siap huni'],
    ['Rumah dengan ruang kerja', 180, 160, 2.85e9, 'Siap huni'],
    ['Rumah sudut lingkungan tenang', 200, 165, 3.15e9, 'Siap huni'],
    ['Rumah dengan halaman belakang', 170, 140, 2.6e9, 'Perlu renovasi ringan'],
    ['Rumah dua lantai dekat taman', 190, 150, 2.9e9, 'Siap huni'],
  ].map((r, i) => ({
    id: `demo-${i}`,
    title: r[0] as string,
    address: `Alamat simulasi ${i + 1}, Pondok Aren`,
    area: s.property.area,
    cluster: s.property.cluster,
    lat: -6.279 + i * 0.001,
    lng: 106.713 + i * 0.001,
    land: r[1] as number,
    building: r[2] as number,
    beds: 3,
    price: r[3] as number,
    condition: r[4] as Condition,
    certificate: 'SHM',
    source: 'Data simulasi',
    url: '',
    observedAt: dateOffset(-i * 3),
    verified: false,
    enabled: true,
    priceType: 'Penawaran',
  }));
  s.campaigns = [
    {
      id: 'demo-campaign',
      start: dateOffset(-7),
      end: dateOffset(-1),
      channel: 'Simulasi · gabungan kanal',
      price: 3e9,
      views: 128,
      chats: 8,
      scheduled: 3,
      visits: 2,
      offers: 0,
      spend: 250000,
      objection: 'Belum diketahui',
      notes: 'Contoh pencatatan, bukan performa iklan nyata.',
    },
  ];
  return s;
}
