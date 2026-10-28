import { CheckCircle2, CircleHelp, Layers3, Search } from 'lucide-react';
import type { Analysis, Project } from './domain';
import { analysisReadiness } from './readiness';
import { Button, Tag } from './ui';

export function AnalysisReadiness({
  project,
  analysis,
  onReview,
}: {
  project: Project;
  analysis: Analysis;
  onReview?: () => void;
}) {
  const info = analysisReadiness(project, analysis);
  if (!info.stored) return null;
  return (
    <section className="card analysis-readiness" aria-label="Kesiapan analisis pembanding">
      <div className="readiness-heading">
        <span className="readiness-icon">
          {info.ready ? <CheckCircle2 size={21} /> : <CircleHelp size={21} />}
        </span>
        <div>
          <h2>
            {info.ready
              ? `${info.stored} data tersimpan; ${info.basis} digunakan untuk estimasi.`
              : `${info.stored} data tersimpan; harga belum dapat dihitung.`}
          </h2>
          <p>
            Data yang tersimpan berbeda dari data yang memenuhi kriteria perhitungan. Anda tidak
            perlu mengimpor ulang untuk melihat data ini.
          </p>
        </div>
        {onReview && (
          <Button variant="secondary" onClick={onReview}>
            <Search size={15} />
            Tinjau data pembanding
          </Button>
        )}
      </div>
      <div className="readiness-counts">
        <span>
          <Layers3 size={15} />
          <strong>{info.stored}</strong> tersimpan
        </span>
        <span>
          <strong>{info.eligible}</strong> lolos filter
        </span>
        <span>
          <strong>{info.basis}</strong> dalam kelompok harga yang digunakan
        </span>
        <span>
          <strong>{info.excluded}</strong> belum memenuhi filter
        </span>
      </div>
      <p className="readiness-scope">
        Lingkup aktif:{' '}
        <strong>
          {project.settings.mode === 'radius'
            ? `radius ${project.settings.radius} km`
            : project.settings.mode === 'cluster'
              ? `cluster ${project.property.cluster || '(belum diisi)'}`
              : `area ${project.property.area || '(belum diisi)'}`}
        </strong>
        . Minimal 3 pembanding unik sejenis pada kelompok harga yang sama diperlukan.
      </p>
      {info.propertyIssues.length > 0 && (
        <div className="readiness-property">
          <strong>Detail properti yang perlu dilengkapi</strong>
          <ul>
            {info.propertyIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      {info.mixedShortfall && (
        <div className="readiness-property">
          <strong>Kelompok harga belum mencukupi</strong>
          <p>
            {info.askingCount} harga penawaran dan {info.transactionCount} transaksi lolos filter.
            Minimal 3 dalam satu kelompok diperlukan; harga penawaran dan transaksi tidak digabung
            untuk mengejar jumlah.
          </p>
        </div>
      )}
      {info.exclusions.length > 0 && (
        <div className="readiness-reasons">
          <h3>Mengapa data belum digunakan?</h3>
          {info.exclusions.map((group) => (
            <details key={group.reason} open={info.exclusions.length === 1}>
              <summary>
                <Tag tone="amber">{group.count} data</Tag>
                <strong>{group.reason}</strong>
                <span>Lihat penyebab & langkah perbaikan</span>
              </summary>
              <div>
                <p>{group.guidance}</p>
                <ul>
                  {group.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      )}
      {!info.ready && (
        <p className="readiness-footnote">
          Gunakan tombol <strong>Ubah</strong> pada baris pembanding untuk memperbaiki informasi
          yang sudah diperiksa. Jangan mengganti data dengan tebakan hanya agar harga muncul.
        </p>
      )}
    </section>
  );
}
