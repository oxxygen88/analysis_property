import { validateComparable, type Analysis, type Project } from './domain';

export interface ExclusionGroup {
  reason: string;
  count: number;
  guidance: string;
  facts: string[];
}

export function analysisReadiness(project: Project, analysis: Analysis) {
  const selected = analysis.rows.filter((row) => row.included);
  const grouped = new Map<string, typeof analysis.rows>();
  for (const row of analysis.rows.filter((row) => !row.included)) {
    grouped.set(row.reason, [...(grouped.get(row.reason) || []), row]);
  }
  const unique = (items: string[]) => [...new Set(items)].slice(0, 6);
  const p = project.property;
  const guidance: Record<string, string> = {
    'Kondisi / sertifikat perlu diverifikasi':
      'Periksa kondisi dan status sertifikat pada sumber iklan atau konfirmasikan ke agen/pemilik. Gunakan tombol Ubah pada baris setelah informasinya diketahui. Mencentang verifikasi saja tidak mengisi kondisi atau sertifikat yang kosong; jangan menggantinya dengan tebakan.',
    'Sertifikat berbeda':
      'Bandingkan status sertifikat properti Anda dan pembanding. Gunakan pembanding dengan status yang sesuai atau perbaiki data hanya jika sumber mendukungnya.',
    'Di luar area':
      'Filter area memakai nama area/kecamatan yang dinormalisasi, termasuk awalan Kec./Kecamatan, bukan pencocokan peta. Nama kawasan seperti Kota Wisata tidak otomatis dianggap sama dengan kecamatan. Periksa apakah nilai-nilai ini memang merujuk wilayah yang sama. Perbaiki field area berdasarkan sumber atau pilih lingkup cluster/radius yang relevan.',
    'Cluster berbeda':
      'Periksa nama cluster/perumahan pada properti dan pembanding. Awalan Cluster/Klaster dinormalisasi, tetapi nama kawasan besar dan nama cluster tidak otomatis dianggap sama. Perbaiki penulisan berdasarkan lokasi sebenarnya atau pilih lingkup area yang sesuai.',
    'Koordinat belum tersedia':
      'Filter radius memerlukan latitude dan longitude pada properti serta pembanding. Lengkapi dengan koordinat yang benar atau gunakan filter area/cluster yang relevan; jangan membuat koordinat perkiraan seolah pasti.',
    'Di luar radius':
      'Pembanding berada di luar radius garis lurus yang dipilih. Tinjau lokasi dan kesebandingan lingkungan sebelum mengubah lingkup pencarian.',
    'Ukuran terlalu berbeda':
      'Ukuran berada di luar batas kemiripan model lokal. Gunakan pembanding dengan ukuran lebih dekat atau tinjau melalui prompt harga AI; jangan mengubah ukuran sebenarnya hanya agar lolos.',
    'Data lebih dari 180 hari':
      'Periksa kembali apakah iklan masih aktif dan harganya masih sama. Perbarui tanggal pengamatan hanya setelah sumber benar-benar diperiksa, atau cari data yang lebih baru.',
    'Duplikat properti':
      'Satu rumah yang diiklankan beberapa agen tetap dihitung sebagai satu properti. Periksa identitas alamat, ukuran, dan tautan; jangan menambah jumlah bukti dengan iklan duplikat.',
    'Transaksi belum diverifikasi':
      'Jika sumbernya iklan, jenis harga yang tepat adalah Penawaran. Gunakan Transaksi hanya jika ada bukti kesepakatan dan telah Anda periksa. Jangan mencentang verifikasi untuk sekadar membuka estimasi.',
    'Tidak dipilih':
      'Baris ini tersimpan, tetapi tidak dicentang untuk analisis. Pilih hanya pembanding yang memang ingin digunakan.',
    'Data belum valid':
      'Buka tombol Ubah dan perbaiki field yang tidak valid berdasarkan sumber. Data tetap tersimpan, tetapi belum digunakan untuk perhitungan.',
  };
  const exclusions: ExclusionGroup[] = [...grouped].map(([reason, rows]) => {
    let facts: string[] = [];
    if (reason === 'Kondisi / sertifikat perlu diverifikasi')
      facts = [
        ...unique(rows.map((r) => r.comparable.condition)).map(
          (value) => `Kondisi pada data: ${value}`,
        ),
        ...unique(rows.map((r) => r.comparable.certificate)).map(
          (value) => `Sertifikat pada data: ${value}`,
        ),
      ];
    else if (reason === 'Sertifikat berbeda')
      facts = [
        `Sertifikat properti Anda: ${p.certificate}`,
        ...unique(rows.map((r) => r.comparable.certificate)).map((value) => `Pembanding: ${value}`),
      ];
    else if (reason === 'Di luar area')
      facts = [
        `Area properti Anda: ${p.area || 'belum diisi'}`,
        ...unique(rows.map((r) => r.comparable.area)).map(
          (value) => `Area pembanding: ${value || 'belum diisi'}`,
        ),
      ];
    else if (reason === 'Cluster berbeda')
      facts = [
        `Cluster properti Anda: ${p.cluster || 'belum diisi'}`,
        ...unique(rows.map((r) => r.comparable.cluster)).map(
          (value) => `Cluster pembanding: ${value || 'belum diisi'}`,
        ),
      ];
    else if (reason === 'Di luar radius' || reason === 'Koordinat belum tersedia')
      facts = [
        `Radius dipilih: ${project.settings.radius} km`,
        ...rows
          .slice(0, 4)
          .map(
            (r) =>
              `${r.comparable.title}: ${r.distance === null ? 'koordinat belum lengkap' : `${r.distance.toFixed(2)} km`}`,
          ),
      ];
    else if (reason === 'Ukuran terlalu berbeda')
      facts = [
        `Properti Anda: LT ${p.land} m² / LB ${p.building} m²`,
        ...rows
          .slice(0, 4)
          .map(
            (r) =>
              `${r.comparable.title}: LT ${r.comparable.land} / LB ${r.comparable.building} m²`,
          ),
      ];
    else if (reason === 'Data belum valid')
      facts = unique(rows.map((r) => validateComparable(r.comparable)).filter(Boolean));
    else
      facts = rows
        .slice(0, 4)
        .map(
          (r) =>
            `${r.comparable.title}${reason === 'Data lebih dari 180 hari' ? ` · diamati ${r.comparable.observedAt}` : ''}`,
        );
    return {
      reason,
      count: rows.length,
      guidance:
        guidance[reason] || 'Tinjau data pembanding dan lingkup analisis berdasarkan sumbernya.',
      facts,
    };
  });
  const askingCount = selected.filter((row) => row.comparable.priceType === 'Penawaran').length;
  const transactionCount = selected.filter(
    (row) => row.comparable.priceType === 'Transaksi',
  ).length;
  return {
    stored: project.comparables.length,
    eligible: selected.length,
    basis: analysis.count,
    excluded: project.comparables.length - selected.length,
    missing: Math.max(0, 3 - analysis.count),
    askingCount,
    transactionCount,
    mixedShortfall: selected.length >= 3 && analysis.count < 3,
    propertyIssues: analysis.issues.filter((issue) => !issue.startsWith('Minimal 3 pembanding')),
    exclusions,
    ready: analysis.suggested !== null,
  };
}
