import type { Comparable, Project } from './domain';
import { rupiah, today } from './domain';
import { houseResiduals, type CostSettings } from './cost';
import { Button, Field, Tag } from './ui';

export function HouseExtraction({
  project,
  settings,
  change,
  onEdit,
  onPrompt,
}: {
  project: Project;
  settings: CostSettings;
  change: (s: CostSettings) => void;
  onEdit: (c: Comparable) => void;
  onPrompt: () => void;
}) {
  const result = houseResiduals(project, settings);
  const set = <K extends keyof CostSettings>(key: K, value: CostSettings[K]) =>
    change({ ...settings, [key]: value });
  const rp = (value: number | null) => (value === null ? 'Belum tersedia' : rupiah(value));
  return (
    <div className="house-extraction" aria-label="Ekstraksi tanah dari pembanding rumah">
      <h3>Harga tanah dari pembanding rumah yang sudah tersimpan</h3>
      <p>
        <strong>
          {project.comparables.length} rumah tersimpan · {result.basis.length} rumah menjadi dasar
          rata-rata.
        </strong>{' '}
        Tidak perlu mencari kavling atau mengimpor ulang. Lengkapi tahun bangunan dan biaya bangun
        baru per m² melalui <strong>Lengkapi bangunan</strong>. Jika kondisi belum diketahui, isi
        faktor kondisi atau aktifkan asumsi bersama.
      </p>
      <p>
        Untuk setiap rumah:{' '}
        <strong>
          harga tanah/m² = (harga rumah − estimasi nilai bangunan setelah penyusutan) ÷ luas tanah
        </strong>
        . Estimasi tanah ini bergantung pada asumsi biaya bangunan; bukan harga tanah yang diamati
        langsung.
      </p>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={!!settings.useSharedHouseAssumptions}
          onChange={(e) => set('useSharedHouseAssumptions', e.target.checked)}
        />{' '}
        Gunakan asumsi bersama untuk field pembanding yang kosong
      </label>
      {settings.useSharedHouseAssumptions && (
        <div className="form-grid">
          <Field
            label="Estimasi tahun bangunan bersama"
            hint="Hanya mengisi asumsi tahun yang kosong; tidak menimpa tahun per rumah."
          >
            <input
              type="number"
              min={Number(today().slice(0, 4)) - 200}
              max={Number(today().slice(0, 4))}
              value={settings.referenceBuiltYear ?? ''}
              onChange={(e) =>
                set('referenceBuiltYear', e.target.value === '' ? null : Number(e.target.value))
              }
            />
          </Field>
          <Field
            label="Biaya bangun baru bersama (Rp/m²)"
            hint="Pengganti bangunan baru sekelas, bukan harga rumah dibagi LB."
          >
            <input
              type="number"
              min="1"
              step="any"
              value={settings.referenceBuildRate || ''}
              onChange={(e) =>
                set(
                  'referenceBuildRate',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
            />
          </Field>
          <Field
            label="Faktor kondisi bersama (%)"
            hint="Untuk kondisi iklan yang belum diketahui. Kondisi yang sudah diketahui tetap memakai kategori 100/90/70%; input faktor per rumah selalu diprioritaskan."
          >
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={settings.referenceConditionPercent ?? ''}
              onChange={(e) =>
                set(
                  'referenceConditionPercent',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
            />
          </Field>
          <Field
            label="Dasar asumsi bersama"
            hint="Wajib bila ada field yang memakai asumsi bersama. Ini tidak mengubah data asli atau status verifikasi iklan."
          >
            <input
              value={settings.referenceEstimateSource || ''}
              onChange={(e) => set('referenceEstimateSource', e.target.value)}
            />
          </Field>
        </div>
      )}
      <div className="cost-preview" aria-label="Rata-rata hasil ekstraksi">
        <dl>
          <div>
            <dt>Rata-rata estimasi harga tanah / m²</dt>
            <dd>{rp(result.landRate)}</dd>
          </div>
          <div>
            <dt>Rata-rata biaya bangunan baru / m²</dt>
            <dd>{rp(result.newBuildRate)}</dd>
          </div>
          <div>
            <dt>Rata-rata nilai bangunan setelah susut / m²</dt>
            <dd>{rp(result.currentBuildingRate)}</dd>
          </div>
        </dl>
        <p>
          Rata-rata aritmetika per rumah dalam satu kelompok harga. Nilai bangunan baru dan nilai
          bangunan setelah susut ditampilkan terpisah. Kondisi/sertifikat tidak lagi menjadi
          penghalang seperti metode V1 bila asumsi ekstraksi telah dilengkapi; perbedaan legalitas
          tetap perlu diperiksa.
        </p>
        <div className="cost-actions">
          <Button
            disabled={result.newBuildRate === null}
            variant="secondary"
            onClick={() =>
              change({
                ...settings,
                newBuildRate: result.newBuildRate!,
                buildSource: `Rata-rata biaya bangun baru dari ${result.basis.length} pembanding rumah; sesuaikan kelas bangunan subjek.`,
              })
            }
          >
            Gunakan rata-rata biaya bangun untuk properti saya
          </Button>
          <Button variant="ghost" onClick={onPrompt}>
            Prompt lengkapi pembanding rumah
          </Button>
        </div>
      </div>
      {project.comparables.length > 0 && (
        <div className="table-scroll extraction-table">
          <table>
            <thead>
              <tr>
                <th>RUMAH / HARGA</th>
                <th>TAHUN / BIAYA BARU</th>
                <th>NILAI BANGUNAN SETELAH SUSUT</th>
                <th>SISA NILAI TANAH / m²</th>
                <th>STATUS / AKSI</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.reference.id}>
                  <td>
                    <strong>{r.reference.title}</strong>
                    <small>
                      {rupiah(r.reference.price)} · {r.reference.priceType}
                    </small>
                    <small>
                      LT {r.reference.land} m² · LB {r.reference.building} m²
                    </small>
                    <small>
                      {r.reference.area} · {r.reference.cluster}
                    </small>
                  </td>
                  <td>
                    <strong>{r.estimatedYear ?? 'Tahun belum diisi'}</strong>
                    <small>
                      {r.newRate === null ? 'Biaya belum diisi' : `${rupiah(r.newRate)}/m²`}
                    </small>
                    <small>Faktor kondisi {r.conditionPercent ?? 'belum diisi'}%</small>
                    <small>
                      {r.usedShared ? 'Ada asumsi bersama' : 'Input per rumah/kategori kondisi'}
                    </small>
                  </td>
                  <td>
                    {rp(r.buildingValue)}
                    <small>{rp(r.currentBuildingRate)}/m²</small>
                    <small>
                      Retensi umur {r.retained === null ? '—' : `${(r.retained * 100).toFixed(1)}%`}
                    </small>
                  </td>
                  <td>
                    {rp(r.residualLandValue)}
                    <small>{rp(r.rate)}/m² tanah</small>
                  </td>
                  <td>
                    <Tag tone={r.included ? 'green' : 'amber'}>
                      {result.basis.includes(r)
                        ? 'Dasar rata-rata'
                        : r.included
                          ? 'Kelompok harga terpisah'
                          : r.reason}
                    </Tag>
                    <Button variant="ghost" onClick={() => onEdit(r.reference)}>
                      Lengkapi bangunan {r.reference.title}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
