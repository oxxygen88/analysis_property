import Papa from 'papaparse';
import type { Analysis, Project, Property } from './domain';
import { areaKey, clusterKey } from './location';

export interface LandReference {
  id: string;
  title: string;
  area: string;
  cluster: string;
  lat: number | null;
  lng: number | null;
  land: number;
  price: number;
  source: string;
  url: string;
  observedAt: string;
  certificate: string;
  priceType: 'Penawaran' | 'Transaksi';
  verified: boolean;
  enabled: boolean;
}
export interface CostSettings {
  landMode: 'references' | 'manual';
  manualLandRate: number;
  manualLandSource: string;
  newBuildRate: number;
  buildSource: string;
  effectiveAge: number | null;
  annualDepreciation: number;
  residualPercent: number;
  conditionPercent: number;
  junction: 'unknown' | 'yes' | 'no';
  flood: 'unknown' | 'yes' | 'no';
  junctionDiscount: number;
  floodDiscount: number;
  saleDiscount: number;
  notes: string;
}
export const defaultCostSettings = (): CostSettings => ({
  landMode: 'references',
  manualLandRate: 0,
  manualLandSource: '',
  newBuildRate: 0,
  buildSource: '',
  effectiveAge: null,
  annualDepreciation: 2,
  residualPercent: 20,
  conditionPercent: 100,
  junction: 'unknown',
  flood: 'unknown',
  junctionDiscount: 5,
  floodDiscount: 10,
  saleDiscount: 0,
  notes: '',
});
export const LAND_CSV_COLUMNS = [
  'title',
  'area',
  'cluster',
  'lat',
  'lng',
  'land',
  'price',
  'certificate',
  'source',
  'url',
  'observedAt',
  'priceType',
] as const;
export const COST_LIMITATION =
  'Pendekatan biaya adalah simulasi nilai tanah + bangunan, bukan bukti harga transaksi atau jaminan laku dalam 180 hari. Default penyusutan 2%/tahun (1/50 per tahun sebelum batas nilai sisa), nilai sisa 20%, dan contoh koreksi tusuk sate 5%/banjir 10% adalah asumsi awal yang dapat diubah, bukan standar pasar Indonesia yang telah diverifikasi. Kalibrasikan dengan bukti lokal/penilai. Tanah tidak disusutkan.';
const positive = (n: number) => Number.isFinite(n) && n > 0;
const between = (n: number, a: number, b: number) => Number.isFinite(n) && n >= a && n <= b;
const validCoords = (a: number | null, b: number | null) =>
  a !== null && b !== null && between(a, -90, 90) && between(b, -180, 180);
const validDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  Number.isFinite(Date.parse(s)) &&
  new Date(s).toISOString().slice(0, 10) === s;
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const key = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
function urlKey(s: string) {
  try {
    const u = new URL(s);
    return `${u.host}${u.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch {
    return '';
  }
}
export function validateLandReference(r: LandReference) {
  if (!r.title.trim() || !r.area.trim() || !r.source.trim())
    return 'Nama, area, dan sumber tanah wajib diisi.';
  if (!positive(r.land) || !positive(r.price))
    return 'Luas tanah dan harga total kavling harus positif.';
  if (!['Penawaran', 'Transaksi'].includes(r.priceType)) return 'Jenis harga tanah tidak valid.';
  if (!validDate(r.observedAt) || r.observedAt > today())
    return 'Tanggal pengamatan tanah tidak valid atau di masa depan.';
  if (r.url) {
    try {
      if (!['http:', 'https:'].includes(new URL(r.url).protocol))
        return 'URL sumber harus http/https.';
    } catch {
      return 'URL sumber tidak valid.';
    }
  }
  if ((r.lat !== null || r.lng !== null) && !validCoords(r.lat, r.lng))
    return 'Isi kedua koordinat tanah dengan benar.';
  return '';
}
export function parseLandCsv(text: string): { records: LandReference[]; error: string } {
  const fail = (error: string) => ({ records: [] as LandReference[], error });
  if (new TextEncoder().encode(text).byteLength > 2e6) return fail('CSV maksimal 2 MB.');
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
  });
  if (parsed.errors.length) return fail(`CSV tidak valid: ${parsed.errors[0].message}`);
  if (parsed.meta.fields?.includes('building'))
    return fail(
      'Ini CSV rumah/bangunan. Gunakan CSV tanah murni; harga rumah tidak boleh dibagi LT sebagai harga tanah.',
    );
  const missing = ['title', 'area', 'land', 'price', 'source', 'observedAt'].filter(
    (k) => !parsed.meta.fields?.includes(k),
  );
  if (missing.length) return fail(`Kolom wajib tanah belum ada: ${missing.join(', ')}.`);
  if (!parsed.data.length || parsed.data.length > 500)
    return fail('CSV tanah harus berisi 1–500 baris.');
  const records: LandReference[] = [];
  for (const [i, r] of parsed.data.entries()) {
    const item: LandReference = {
      id: crypto.randomUUID(),
      title: r.title?.trim() || '',
      area: r.area?.trim() || '',
      cluster: r.cluster?.trim() || '',
      lat: r.lat?.trim() ? Number(r.lat) : null,
      lng: r.lng?.trim() ? Number(r.lng) : null,
      land: Number(r.land),
      price: Number(r.price),
      source: r.source?.trim() || '',
      url: r.url?.trim() || '',
      observedAt: r.observedAt?.trim() || '',
      certificate: r.certificate?.trim() || 'Belum diketahui',
      priceType: (r.priceType?.trim() || 'Penawaran') as LandReference['priceType'],
      verified: false,
      enabled: true,
    };
    const error = validateLandReference(item);
    if (error) return fail(`Baris ${i + 2}: ${error} Tidak ada data diimpor.`);
    records.push(item);
  }
  return { records, error: '' };
}
function km(p: Property, r: LandReference) {
  if (!validCoords(p.lat, p.lng) || !validCoords(r.lat, r.lng)) return null;
  const rad = (n: number) => (n * Math.PI) / 180;
  const v =
    Math.sin(rad(r.lat! - p.lat!) / 2) ** 2 +
    Math.cos(rad(p.lat!)) * Math.cos(rad(r.lat!)) * Math.sin(rad(r.lng! - p.lng!) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(Math.max(0, 1 - v)));
}
export function costValuation(project: Project) {
  const p = project.property;
  const s = { ...defaultCostSettings(), ...project.cost };
  const issues: string[] = [];
  const warnings: string[] = [];
  if (!['manual', 'references'].includes(s.landMode))
    issues.push('Pilih sumber harga tanah yang valid.');
  if (s.landMode === 'references' && project.settings.mode === 'radius') {
    if (!validCoords(p.lat, p.lng) || !positive(project.settings.radius))
      issues.push('Mode radius tanah memerlukan kedua koordinat subjek dan radius positif.');
  }
  const year = Number(today().slice(0, 4));
  const age = s.effectiveAge ?? (p.builtYear !== null ? year - p.builtYear : null);
  if (!p.title.trim() || !p.area.trim())
    issues.push('Isi nama properti dan area pada Detail properti.');
  if (p.kind && !['Rumah tapak', 'Ruko', 'Tanah kavling'].includes(p.kind))
    issues.push('Metode tanah + bangunan belum mendukung apartemen.');
  const bareLand = p.kind === 'Tanah kavling';
  if (!positive(p.land) || (!bareLand && !positive(p.building)))
    issues.push('Isi luas tanah dan luas bangunan yang positif.');
  if (!bareLand) {
    if (!positive(s.newBuildRate) || !s.buildSource.trim())
      issues.push('Isi biaya bangun baru per m² beserta sumber/asumsinya.');
    if (age === null || !between(age, 0, 200))
      issues.push('Isi umur efektif atau tahun bangunan yang valid; bangunan baru berumur 0.');
    if (
      !between(s.annualDepreciation, 0, 20) ||
      !between(s.residualPercent, 0, 100) ||
      !between(s.conditionPercent, 0, 100)
    )
      issues.push('Periksa penyusutan (0–20%), nilai sisa dan faktor kondisi (0–100%).');
    if (p.renovationYear)
      warnings.push(
        'Tahun renovasi tidak otomatis mereset umur. Isi umur efektif berdasarkan cakupan renovasi dan pemeriksaan fisik.',
      );
    if (p.condition === 'Belum diketahui')
      warnings.push(
        'Kondisi belum diketahui; faktor kondisi adalah asumsi pengguna yang perlu diverifikasi.',
      );
  }
  if (!['yes', 'no'].includes(s.junction) || !['yes', 'no'].includes(s.flood))
    issues.push(
      'Tentukan status tusuk sate dan banjir; jangan menganggap status belum diketahui sebagai tidak berisiko.',
    );
  if (![s.junctionDiscount, s.floodDiscount, s.saleDiscount].every((v) => between(v, 0, 50)))
    issues.push('Koreksi posisi, banjir, dan strategi jual masing-masing harus 0–50%.');
  if (p.certificate === 'Lainnya / belum diketahui')
    warnings.push(
      'Sertifikat subjek belum diketahui. Simulasi ini tidak menilai risiko atau premi legalitas.',
    );
  const addresses = new Set<string>(),
    urls = new Set<string>();
  const rows = (project.landReferences || []).map((reference) => {
    let reason = validateLandReference(reference);
    const k = `${key(reference.title)}:${key(reference.area)}:${key(reference.cluster)}:${reference.land}`;
    const u = urlKey(reference.url);
    if (!reference.enabled) reason = 'Tidak dipilih';
    else if (!reason && (addresses.has(k) || (u && urls.has(u)))) reason = 'Duplikat tanah';
    else if (!reason && (Date.parse(today()) - Date.parse(reference.observedAt)) / 86400000 > 180)
      reason = 'Data lebih dari 180 hari';
    else if (!reason && reference.priceType === 'Transaksi' && !reference.verified)
      reason = 'Transaksi belum diverifikasi';
    else if (
      !reason &&
      project.settings.mode === 'area' &&
      areaKey(reference.area) !== areaKey(p.area)
    )
      reason = 'Di luar area';
    else if (
      !reason &&
      project.settings.mode === 'cluster' &&
      (!p.cluster.trim() || clusterKey(reference.cluster) !== clusterKey(p.cluster))
    )
      reason = 'Cluster berbeda';
    else if (
      !reason &&
      project.settings.mode === 'radius' &&
      (km(p, reference) === null || km(p, reference)! > project.settings.radius)
    )
      reason = 'Di luar radius / koordinat belum tersedia';
    if (!reason) {
      addresses.add(k);
      if (u) urls.add(u);
    }
    return {
      reference,
      included: !reason,
      reason: reason || 'Lolos filter',
      rate: positive(reference.land) ? reference.price / reference.land : 0,
    };
  });
  const eligible = rows.filter((r) => r.included);
  const transactions = eligible.filter((r) => r.reference.priceType === 'Transaksi');
  const asking = eligible.filter((r) => r.reference.priceType === 'Penawaran');
  // Prefer a credible transaction group; never average asking and transaction groups together.
  const basis =
    s.landMode === 'manual'
      ? []
      : transactions.length >= 3
        ? transactions
        : asking.length
          ? asking
          : transactions;
  const rates = basis.map((r) => r.rate);
  let landRate: number | null = null;
  if (s.landMode === 'manual') {
    if (!positive(s.manualLandRate) || !s.manualLandSource.trim())
      issues.push('Isi harga tanah manual per m² dan sumber/asumsinya.');
    else landRate = s.manualLandRate;
    warnings.push(
      'Harga tanah manual adalah asumsi pengguna; bukan rata-rata referensi yang dihitung aplikasi.',
    );
  } else if (rates.length) {
    landRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    if (basis.length < 3)
      warnings.push(
        `Hanya ${basis.length} referensi tanah; simulasi awal dengan bukti terbatas. Tambahkan minimal 3 referensi relevan.`,
      );
    if (basis.some((r) => r.reference.certificate !== p.certificate))
      warnings.push(
        'Sertifikat referensi tanah berbeda/belum diketahui. Tidak diblokir, tetapi periksa kesetaraan hak dan koreksi legalitas secara terpisah.',
      );
    if (Math.max(...rates) / Math.min(...rates) > 1.5)
      warnings.push(
        'Sebaran harga tanah lebar; periksa ukuran, akses, lokasi, legalitas dan data ekstrem sebelum memakai rata-rata.',
      );
  } else
    issues.push(
      'Tambahkan referensi tanah yang lolos filter, atau isi harga tanah manual beserta sumbernya.',
    );
  const retained = bareLand
    ? 0
    : Math.max(s.residualPercent / 100, 1 - ((age ?? 0) * s.annualDepreciation) / 100);
  const buildingNew = bareLand ? 0 : p.building * s.newBuildRate;
  const buildingValue = (buildingNew * retained * s.conditionPercent) / 100;
  const landValue = (landRate ?? 0) * p.land;
  const positionFactor = s.junction === 'yes' ? 1 - s.junctionDiscount / 100 : 1;
  const floodFactor = s.flood === 'yes' ? 1 - s.floodDiscount / 100 : 1;
  const correction = positionFactor * floodFactor;
  const baseValue = (landValue + buildingValue) * correction;
  const saleFactor = 1 - s.saleDiscount / 100;
  const rawSuggested = baseValue * saleFactor;
  if (![landValue, buildingValue, baseValue, rawSuggested].every(Number.isFinite))
    issues.push('Nilai terlalu besar/tidak valid; periksa kembali input.');
  if (rawSuggested <= 0 && issues.length === 0)
    issues.push('Nilai indikatif harus lebih dari nol.');
  const round = (n: number) => Math.max(1, Math.round(n / 1e6)) * 1e6;
  const ready = issues.length === 0;
  const endpoints = s.landMode === 'references' && rates.length ? rates : [landRate ?? 0];
  return {
    settings: s,
    rows,
    basis,
    issues,
    warnings,
    age,
    retained,
    buildingNew,
    buildingValue,
    landRate,
    landValue,
    positionFactor,
    floodFactor,
    baseValue,
    rawSuggested,
    suggested: ready ? round(rawSuggested) : null,
    low: ready
      ? round((Math.min(...endpoints) * p.land + buildingValue) * correction * saleFactor)
      : null,
    high: ready
      ? round((Math.max(...endpoints) * p.land + buildingValue) * correction * saleFactor)
      : null,
    ready,
  };
}
export function costAnalysis(project: Project): Analysis {
  const c = costValuation(project);
  return {
    method: 'cost',
    cost: c,
    rows: [],
    count: c.settings.landMode === 'references' ? c.basis.length : 0,
    transactionCount: c.basis.filter((r) => r.reference.priceType === 'Transaksi').length,
    low: c.low,
    high: c.high,
    suggested: c.suggested,
    median: c.ready ? c.baseValue : null,
    confidence: c.ready ? 'Simulasi asumsi' : 'Belum cukup data',
    issues: c.issues,
  };
}
export function costReportLines(project: Project) {
  const c = costValuation(project),
    s = c.settings;
  const rp = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);
  return [
    COST_LIMITATION,
    `Dasar tanah: ${s.landMode === 'manual' ? `manual, ${s.manualLandSource}` : `rata-rata aritmetika ${c.basis.length} referensi tanah dalam satu kelompok harga`}. Harga/m2: ${c.landRate === null ? 'belum tersedia' : rp(c.landRate)}. Nilai tanah: ${rp(c.landValue)}.`,
    `Biaya bangun baru: ${rp(s.newBuildRate)}/m2. Sumber/asumsi: ${s.buildSource || 'belum diisi'}. Total baru: ${rp(c.buildingNew)}.`,
    `Umur efektif: ${c.age ?? 'belum diisi'} tahun; susut linear ${s.annualDepreciation}%/tahun; nilai sisa umur ${s.residualPercent}%; faktor kondisi ${s.conditionPercent}%. Nilai bangunan: ${rp(c.buildingValue)}.`,
    `Retensi umur = maks(nilai sisa, 1 - umur x susut tahunan). Penyusutan hanya pada bangunan. Kondisi dikalikan setelah retensi umur; hindari koreksi kerusakan dua kali melalui umur efektif dan kondisi.`,
    `Tusuk sate: ${s.junction}; faktor ${c.positionFactor}. Banjir: ${s.flood}; faktor ${c.floodFactor}. Keduanya diterapkan berurutan pada jumlah nilai tanah dan bangunan.`,
    `Nilai dasar terkoreksi: ${rp(c.baseValue)}. Koreksi strategi jual: -${s.saleDiscount}%. Harga indikatif dibulatkan Rp1 juta: ${c.suggested === null ? 'belum tersedia' : rp(c.suggested)}.`,
    'Rentang adalah skenario dari minimum–maksimum harga tanah referensi dengan asumsi bangunan/koreksi tetap; bukan interval keyakinan atau rentang harga transaksi. Manual/satu referensi menghasilkan satu nilai.',
    ...c.warnings,
    ...c.issues,
    ...c.rows.map(
      (r) =>
        `${r.reference.title} | ${rp(r.reference.price)} / ${r.reference.land} m2 = ${rp(r.rate)}/m2 | ${r.reference.priceType} | ${r.reference.certificate} | ${c.basis.includes(r) ? 'Dasar rata-rata' : r.reason} | ${r.reference.source} | ${r.reference.observedAt} | ${r.reference.url || 'Tanpa URL'}`,
    ),
  ];
}
