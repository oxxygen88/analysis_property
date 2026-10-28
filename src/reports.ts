import { formatRooms } from './rooms';
import { costReportLines } from './cost';
import {
  analyze,
  evaluate,
  insights,
  phases,
  rupiah,
  shortDate,
  today,
  type Project,
} from './domain';

export function reportSections(project: Project) {
  const a = analyze(project);
  const p = project.property;
  const insight = insights(p);
  const e = evaluate(project, a);
  return [
    {
      title: 'Profil properti',
      lines: [
        project.demo
          ? 'SIMULASI — seluruh data contoh, bukan rekomendasi untuk transaksi nyata.'
          : 'Analisis berdasarkan data yang dimasukkan pengguna.',
        p.title || 'Properti belum diberi nama',
        p.address || 'Alamat belum diisi',
        `${p.kind || 'Rumah tapak'} | LT ${p.land} m2 | LB ${p.building} m2 | KT ${formatRooms(p.beds, p.staffBeds)} | KM ${formatRooms(p.baths, p.staffBaths)}`,
        `${p.certificate} (keterangan pemilik) | ${p.condition}`,
        `Kamar tidur: ${p.beds} keluarga${p.staffBeds === undefined ? '; ART belum dirinci' : ` + ${p.staffBeds} ART`}. Kamar mandi: ${p.baths} utama${p.staffBaths === undefined ? '; ART/servis belum dirinci' : ` + ${p.staffBaths} ART/servis`}.`,
        `Carport ${p.carport} mobil | Garasi ${p.garage} mobil | Jalan ${p.road} m`,
        `Fasilitas menurut pemilik: ${p.facilities || 'Belum diisi'}`,
        `Risiko menurut pemilik: ${p.risks || 'Belum diverifikasi'}`,
      ],
    },
    {
      title: 'Indikasi harga',
      lines: [
        a.suggested
          ? `Harga pembukaan yang disarankan: ${rupiah(a.suggested)}`
          : a.method === 'cost'
            ? 'Simulasi belum tersedia: lengkapi asumsi tanah, bangunan, dan risiko.'
            : 'Rekomendasi belum tersedia: lengkapi properti dan minimal 3 pembanding yang memenuhi kriteria.',
        a.low
          ? `${a.method === 'cost' ? 'Rentang skenario biaya (bukan transaksi)' : 'Rentang indikasi'}: ${rupiah(a.low)} - ${rupiah(a.high!)}`
          : '',
        `Harga iklan saat ini: ${p.asking ? rupiah(p.asking) : 'Belum ditetapkan'}`,
        `Kualitas bukti: ${a.confidence} | ${a.method === 'cost' ? 'Referensi tanah dasar' : 'Pembanding dasar harga'}: ${a.count}${a.method === 'cost' && project.cost?.landMode === 'manual' ? ' (harga tanah manual, lihat sumber/asumsi)' : ''}`,
        `Dasar: ${a.method === 'cost' ? 'Simulasi nilai tanah + biaya bangunan tersusut, bukan bukti transaksi' : a.transactionCount >= 3 ? 'transaksi yang ditandai terverifikasi oleh pengguna' : 'harga penawaran, bukan bukti transaksi'}.`,
        ...a.issues,
      ],
    },
    ...(a.method === 'cost'
      ? [{ title: 'Rincian tanah + bangunan dan jejak sumber', lines: costReportLines(project) }]
      : []),
    { title: 'Kekuatan', lines: insight.strengths },
    { title: 'Kelemahan dan hal yang perlu diverifikasi', lines: insight.weaknesses },
    { title: 'Kebutuhan calon pembeli', lines: [insight.audience] },
    {
      title: 'Pembanding dan jejak sumber',
      lines: a.rows.length
        ? a.rows.map(
            (r) =>
              `${r.comparable.title} | ${rupiah(r.comparable.price)} | ${r.comparable.priceType} | ${r.included ? 'Lolos filter' : r.reason} | ${r.comparable.source} | ${shortDate(r.comparable.observedAt)}${r.comparable.url ? ` | ${r.comparable.url}` : ' | Tanpa tautan sumber'}`,
          )
        : ['Belum ada pembanding.'],
    },
    {
      title: 'Respons pemasaran',
      lines: e.current
        ? [
            `Periode ${shortDate(e.current.start)} - ${shortDate(e.current.end)} | ${e.current.channel}`,
            `Harga diuji ${rupiah(e.current.price)} | Viewer ${e.current.views} | Chat unik ${e.current.chats} | Survei terlaksana ${e.current.visits} | Pemberi penawaran ${e.current.offers}`,
            `Rasio survei/chat: ${e.ratio === null ? 'Belum dapat dihitung' : `${Math.round(e.ratio * 100)}%`}`,
            e.title,
            e.description,
            ...(e.nextPrice
              ? [`Usulan harga berikutnya (belum disetujui): ${rupiah(e.nextPrice)}`]
              : []),
          ]
        : ['Belum ada catatan pemasaran.'],
    },
    ...phases.map((p) => ({ title: `Hari ${p.days}: ${p.title}`, lines: [p.text, ...p.tasks] })),
    {
      title: 'Metode dan keterbatasan',
      lines:
        a.method === 'cost'
          ? [
              ...costReportLines(project).slice(0, 7),
              '180 hari adalah panduan evaluasi, bukan jaminan penjualan. Laporan bukan penilaian resmi KJPP. Harga minimum dan catatan internal tidak disertakan.',
              `Dibuat ${shortDate(today())}.`,
            ]
          : [
              'Penyesuaian luas: 65% rasio luas tanah + 35% rasio luas bangunan. Penyesuaian kondisi 4% per tingkat; gabungan dibatasi -20% sampai +20%. Bobot ini merupakan asumsi awal, belum dikalibrasi dengan transaksi lokal.',
              'Rentang adalah kuartil 25-75% harga pembanding setelah penyesuaian. Harga pembukaan memakai persentil 35, dibulatkan Rp5 juta. Ini rentang indikatif, bukan interval keyakinan statistik.',
              'Minimal 3 pembanding unik dengan jenis harga yang sama. Transaksi terverifikasi digunakan jika tersedia minimal 3; selain itu digunakan harga penawaran. Kedua kelompok tidak dicampur.',
              'Data lebih dari 180 hari, duplikat yang terdeteksi, ukuran terlalu berbeda, serta sertifikat berbeda dikeluarkan. Duplikat lintas agen dengan alamat berbeda tetap perlu diperiksa pengguna.',
              'Status verifikasi adalah penandaan pengguna, bukan pemeriksaan independen. Risiko, dokumen, dan fasilitas belum diverifikasi oleh aplikasi.',
              '180 hari adalah panduan evaluasi, bukan jaminan penjualan. Laporan ini bukan penilaian resmi KJPP. Angka konversi tidak menjamin kesepakatan.',
              `Dibuat ${shortDate(today())}. Harga minimum internal dan anggaran penjual tidak disertakan.`,
            ],
    },
  ];
}
export async function exportPdf(project: Project) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 0;
  const header = () => {
    doc.setFillColor(23, 76, 66);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text('RuangNilai', 16, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Analisis harga & strategi penjualan rumah', 16, 23);
    y = 43;
  };
  header();
  for (const section of reportSections(project)) {
    if (y > 245) {
      doc.addPage();
      header();
    }
    doc.setTextColor(23, 76, 66);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(section.title, 16, y);
    y += 8;
    doc.setTextColor(67, 75, 73);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const line of section.lines.filter(Boolean)) {
      const wrapped: string[] = doc.splitTextToSize(
        line.replace(/[–—]/g, '-').replace(/•/g, '|'),
        176,
      );
      for (const text of wrapped) {
        if (y > 275) {
          doc.addPage();
          header();
          doc.setTextColor(67, 75, 73);
          doc.setFontSize(10);
        }
        doc.text(text, 16, y);
        y += 5.2;
      }
      y += 3;
    }
    y += 5;
  }
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(
      `${project.demo ? 'SIMULASI | ' : ''}RuangNilai | ${shortDate(today())} | ${i}/${total}`,
      16,
      289,
    );
  }
  doc.save(`RuangNilai-${project.demo ? 'simulasi-' : ''}${today()}.pdf`);
}
export async function exportSlides(project: Project) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const ppt = new PptxGenJS();
  ppt.layout = 'LAYOUT_WIDE';
  ppt.author = 'RuangNilai';
  ppt.subject = 'Analisis properti';
  ppt.title = project.property.title || 'Analisis rumah';
  for (const section of reportSections(project)) {
    // Short slide pages keep source lists and long notes readable without clipping.
    const lines = section.lines
      .filter(Boolean)
      .flatMap((line) => line.match(/.{1,170}(?:\s|$)|.{1,170}/g)?.map((s) => s.trim()) || [line]);
    for (let start = 0; start < Math.max(1, lines.length); start += 7) {
      const slide = ppt.addSlide();
      slide.background = { color: 'F6F7F3' };
      slide.addText('RUANGNILAI  /  LAPORAN PROPERTI', {
        x: 0.6,
        y: 0.3,
        w: 11,
        h: 0.3,
        fontSize: 11,
        color: '65766E',
        bold: true,
      });
      slide.addText(section.title + (start ? ' (lanjutan)' : ''), {
        x: 0.6,
        y: 0.95,
        w: 12,
        h: 0.65,
        fontSize: 27,
        color: '174C42',
        bold: true,
        breakLine: false,
      });
      lines.slice(start, start + 7).forEach((line, i) =>
        slide.addText(line, {
          x: 0.65,
          y: 1.95 + i * 0.61,
          w: 11.95,
          h: 0.55,
          fontSize: 15,
          color: '3D4B45',
          margin: 0,
          valign: 'middle',
          fit: 'shrink',
        }),
      );
      slide.addText(
        `${project.demo ? 'SIMULASI | ' : ''}${shortDate(today())} | Bukan penilaian resmi / jaminan penjualan`,
        { x: 0.6, y: 7.02, w: 12, h: 0.2, fontSize: 9, color: '65766E' },
      );
    }
  }
  await ppt.writeFile({ fileName: `RuangNilai-${project.demo ? 'simulasi-' : ''}${today()}.pptx` });
}
