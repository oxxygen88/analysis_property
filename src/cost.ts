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
  landMode: 'houses' | 'references' | 'manual';
  useSharedHouseAssumptions?: boolean;
  referenceBuiltYear?: number | null;
  referenceBuildRate?: number;
  referenceConditionPercent?: number;
  referenceEstimateSource?: string;
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
  landMode: 'houses',
  useSharedHouseAssumptions: false,
  referenceBuiltYear: null,
  referenceBuildRate: 0,
  referenceEstimateSource: '',
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
export function houseResiduals(project: Project, settings: CostSettings) {
  const p = project.property,
    s = settings;
  const year = Number(today().slice(0, 4));
  const seen = new Set<string>(),
    urls = new Set<string>();
  const rows = project.comparables.map((reference) => {
    const sharedYear = reference.builtYear == null && s.useSharedHouseAssumptions;
    const sharedRate = reference.newBuildRate === undefined && s.useSharedHouseAssumptions;
    const estimatedYear = reference.builtYear ?? (sharedYear ? s.referenceBuiltYear : null) ?? null;
    const newRate =
      reference.newBuildRate ?? (sharedRate ? s.referenceBuildRate : undefined) ?? null;
    const categoryPercent = {
      'Siap huni': 100,
      'Perlu renovasi ringan': 90,
      'Perlu renovasi besar': 70,
      'Belum diketahui': null,
    }[reference.condition];
    const sharedCondition =
      reference.buildingConditionPercent === undefined &&
      categoryPercent == null &&
      s.useSharedHouseAssumptions &&
      s.referenceConditionPercent !== undefined;
    const conditionPercent =
      reference.buildingConditionPercent ??
      categoryPercent ??
      (sharedCondition ? s.referenceConditionPercent : undefined) ??
      null;
    const conditionFromCategory =
      reference.buildingConditionPercent === undefined && categoryPercent != null;
    const usedShared = !!(sharedYear || sharedRate || sharedCondition);
    const age = estimatedYear === null ? null : year - estimatedYear;
    const retained =
      age === null
        ? null
        : Math.max(s.residualPercent / 100, 1 - (age * s.annualDepreciation) / 100);
    const buildingValue =
      retained !== null && newRate !== null && conditionPercent != null
        ? (reference.building * newRate * retained * conditionPercent) / 100
        : null;
    const currentBuildingRate = buildingValue === null ? null : buildingValue / reference.building;
    const residualLandValue = buildingValue === null ? null : reference.price - buildingValue;
    const rate = residualLandValue === null ? null : residualLandValue / reference.land;
    const k = `${key(reference.address)}:${reference.land}:${reference.building}`,
      u = urlKey(reference.url);
    let reason = '';
    if (!reference.enabled) reason = 'Tidak dipilih';
    else if (
      !reference.title.trim() ||
      !reference.address.trim() ||
      !reference.area.trim() ||
      !reference.source.trim() ||
      ![reference.land, reference.building, reference.price].every(positive) ||
      !validDate(reference.observedAt) ||
      reference.observedAt > today() ||
      !['Penawaran', 'Transaksi'].includes(reference.priceType)
    )
      reason = 'Data dasar pembanding belum valid';
    else if (reference.url && !/^https?:\/\//i.test(reference.url))
      reason = 'URL pembanding tidak valid';
    else if (seen.has(k) || (u && urls.has(u))) reason = 'Duplikat rumah';
    else if ((Date.parse(today()) - Date.parse(reference.observedAt)) / 86400000 > 180)
      reason = 'Data lebih dari 180 hari';
    else if (reference.priceType === 'Transaksi' && !reference.verified)
      reason = 'Transaksi belum diverifikasi';
    else if (project.settings.mode === 'area' && areaKey(reference.area) !== areaKey(p.area))
      reason = 'Di luar area';
    else if (
      project.settings.mode === 'cluster' &&
      (!p.cluster.trim() || clusterKey(reference.cluster) !== clusterKey(p.cluster))
    )
      reason = 'Cluster berbeda';
    else if (
      project.settings.mode === 'radius' &&
      (km(p, reference) === null || km(p, reference)! > project.settings.radius)
    )
      reason = 'Di luar radius / koordinat belum tersedia';
    else if (estimatedYear === null) reason = 'Isi estimasi tahun bangunan pembanding';
    else if (!Number.isInteger(estimatedYear) || estimatedYear > year || estimatedYear < year - 200)
      reason = 'Tahun bangunan pembanding tidak valid';
    else if (newRate === null || !positive(newRate))
      reason = 'Isi biaya bangun baru pembanding per m²';
    else if (conditionPercent == null || !between(conditionPercent, 0, 100))
      reason = 'Isi faktor kondisi pembanding (0–100%)';
    else if (usedShared && !s.referenceEstimateSource?.trim())
      reason = 'Isi dasar asumsi bersama pembanding';
    else if (!between(s.annualDepreciation, 0, 20) || !between(s.residualPercent, 0, 100))
      reason = 'Parameter penyusutan tidak valid';
    else if (
      residualLandValue === null ||
      !positive(residualLandValue) ||
      rate === null ||
      !positive(rate) ||
      buildingValue === null ||
      !Number.isFinite(buildingValue)
    )
      reason = 'Sisa nilai tanah nol/negatif/tidak valid; tinjau biaya dan umur';
    if (!reason) {
      seen.add(k);
      if (u) urls.add(u);
    }
    return {
      reference,
      included: !reason,
      reason: reason || 'Lolos ekstraksi',
      estimatedYear,
      newRate,
      conditionPercent,
      age,
      retained,
      buildingValue,
      currentBuildingRate,
      residualLandValue,
      rate,
      usedShared,
      conditionFromCategory,
    };
  });
  const eligible = rows.filter((r) => r.included),
    transactions = eligible.filter((r) => r.reference.priceType === 'Transaksi'),
    asking = eligible.filter((r) => r.reference.priceType === 'Penawaran');
  const basis = transactions.length >= 3 ? transactions : asking.length ? asking : transactions;
  const mean = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  return {
    rows,
    basis,
    landRate: mean(basis.map((r) => r.rate!)),
    newBuildRate: mean(basis.map((r) => r.newRate!)),
    currentBuildingRate: mean(basis.map((r) => r.currentBuildingRate!)),
  };
}
export function costValuation(project: Project) {
  const p = project.property;
  const s = { ...defaultCostSettings(), ...project.cost };
  const issues: string[] = [];
  const warnings: string[] = [];
  if (!['manual', 'references', 'houses'].includes(s.landMode))
    issues.push('Pilih sumber harga tanah yang valid.');
  if (s.landMode !== 'manual' && project.settings.mode === 'radius') {
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
  const houses = houseResiduals(project, s);
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
    s.landMode !== 'references'
      ? []
      : transactions.length >= 3
        ? transactions
        : asking.length
          ? asking
          : transactions;
  const rates =
    s.landMode === 'houses' ? houses.basis.map((r) => r.rate!) : basis.map((r) => r.rate);
  let landRate: number | null = null;
  if (s.landMode === 'manual') {
    if (!positive(s.manualLandRate) || !s.manualLandSource.trim())
      issues.push('Isi harga tanah manual per m² dan sumber/asumsinya.');
    else landRate = s.manualLandRate;
    warnings.push(
      'Harga tanah manual adalah asumsi pengguna; bukan rata-rata referensi yang dihitung aplikasi.',
    );
  } else if (s.landMode === 'houses') {
    landRate = houses.landRate;
    if (landRate === null)
      issues.push(
        'Lengkapi tahun bangunan, biaya bangun baru per m², dan faktor kondisi pembanding rumah yang relevan. Bisa per rumah atau memakai asumsi bersama yang Anda aktifkan.',
      );
    warnings.push(
      'Harga tanah hasil ekstraksi adalah estimasi sisa harga rumah dikurangi nilai bangunan tersusut, bukan observasi harga tanah murni. Biaya/asumsi bangunan mempengaruhi hasil langsung.',
    );
    if (houses.basis.length > 0 && houses.basis.length < 3)
      warnings.push(
        `Hanya ${houses.basis.length} rumah menjadi dasar ekstraksi; hasil adalah simulasi awal dengan bukti terbatas.`,
      );
    if (houses.basis.some((r) => r.usedShared))
      warnings.push(
        'Sebagian pembanding memakai asumsi bersama yang diaktifkan pengguna; bukan tahun/biaya terverifikasi pada sumber iklan.',
      );
    if (houses.basis.some((r) => r.reference.certificate !== p.certificate))
      warnings.push(
        'Sertifikat pembanding rumah berbeda/belum diketahui; periksa kesetaraan hak. Ekstraksi tidak menerapkan koreksi legalitas otomatis.',
      );
    if (houses.basis.some((r) => r.conditionFromCategory))
      warnings.push(
        'Faktor kondisi pembanding dari kategori memakai contoh 100/90/70%; dapat ditimpa dengan input per rumah atau asumsi bersama.',
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
  const endpoints = s.landMode !== 'manual' && rates.length ? rates : [landRate ?? 0];
  return {
    settings: s,
    houses,
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
    count:
      c.settings.landMode === 'houses'
        ? c.houses.basis.length
        : c.settings.landMode === 'references'
          ? c.basis.length
          : 0,
    transactionCount: (c.settings.landMode === 'houses' ? c.houses.basis : c.basis).filter(
      (r) => r.reference.priceType === 'Transaksi',
    ).length,
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
    ...(s.landMode === 'houses'
      ? [
          'Metode ekstraksi rumah: nilai bangunan pembanding = LB × biaya bangun baru/m2 × retensi umur × faktor kondisi. Nilai tanah pembanding = harga total rumah − nilai bangunan pembanding; harga tanah/m2 = nilai tanah pembanding ÷ LT. Rata-rata aritmetika hanya pada satu kelompok harga yang lolos filter.',
          `Rata-rata bangunan baru/m2 referensi: ${c.houses.newBuildRate === null ? 'belum tersedia' : rp(c.houses.newBuildRate)}; setelah susut/kondisi: ${c.houses.currentBuildingRate === null ? 'belum tersedia' : rp(c.houses.currentBuildingRate)}. Ini terpisah dari harga tanah/m2.`,
          ...(s.useSharedHouseAssumptions
            ? [
                `Asumsi bersama pembanding (hanya field kosong): tahun ${s.referenceBuiltYear ?? 'belum diisi'}, biaya baru ${s.referenceBuildRate ? rp(s.referenceBuildRate) : 'belum diisi'}/m2, faktor kondisi ${s.referenceConditionPercent ?? 'mengikuti kategori'}%; dasar: ${s.referenceEstimateSource || 'belum diisi'}.`,
              ]
            : []),
          ...c.houses.rows.map(
            (r) =>
              `${r.reference.title} | Harga rumah ${rp(r.reference.price)} | LT/LB ${r.reference.land}/${r.reference.building} m2 | Tahun ${r.estimatedYear ?? 'belum diisi'} | Biaya baru/m2 ${r.newRate === null ? 'belum diisi' : rp(r.newRate)} | Faktor kondisi ${r.conditionPercent ?? 'belum diisi'}% | Nilai bangunan ${r.buildingValue === null ? 'belum tersedia' : rp(r.buildingValue)} | Sisa tanah ${r.residualLandValue === null ? 'belum tersedia' : rp(r.residualLandValue)} | Tanah/m2 ${r.rate === null ? 'belum tersedia' : rp(r.rate)} | ${c.houses.basis.includes(r) ? 'Dasar rata-rata' : r.reason} | ${r.usedShared ? 'Ada asumsi bersama' : 'Input per rumah/kategori kondisi'} | Dasar estimasi bangunan: ${r.reference.buildingEstimateSource || (r.usedShared ? s.referenceEstimateSource : 'Belum dirinci')} | ${r.reference.source} | ${r.reference.observedAt} | ${r.reference.priceType} | ${r.reference.certificate} | ${r.reference.url || 'Tanpa URL'}`,
          ),
        ]
      : []),
    `Dasar tanah: ${s.landMode === 'manual' ? `manual, ${s.manualLandSource}` : s.landMode === 'houses' ? `rata-rata ekstraksi ${c.houses.basis.length} pembanding rumah` : `rata-rata aritmetika ${c.basis.length} referensi tanah dalam satu kelompok harga`}. Harga/m2: ${c.landRate === null ? 'belum tersedia' : rp(c.landRate)}. Nilai tanah: ${rp(c.landValue)}.`,
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
