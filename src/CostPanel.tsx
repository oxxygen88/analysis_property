import { useState } from 'react';
import type { Project, Comparable } from './domain';
import { HouseExtraction } from './HouseExtraction';
import { ComparableModal } from './inputs';
import { rupiah, today, safeUrl } from './domain';
import {
  costValuation,
  defaultCostSettings,
  LAND_CSV_COLUMNS,
  parseLandCsv,
  validateLandReference,
  COST_LIMITATION,
  type CostSettings,
  type LandReference,
} from './cost';
import { Button, Field, Modal, Notice, Tag, saveBlob } from './ui';

export function CostPanel({
  project,
  update,
  onPrompt,
  onProperty,
  onHousePrompt,
  notify,
}: {
  project: Project;
  update: React.Dispatch<React.SetStateAction<Project>>;
  onPrompt: () => void;
  onProperty: () => void;
  onHousePrompt: () => void;
  notify: (s: string) => void;
}) {
  const [draft, setDraft] = useState<CostSettings>(() => ({
    ...defaultCostSettings(),
    conditionPercent:
      project.property.condition === 'Perlu renovasi ringan'
        ? 90
        : project.property.condition === 'Perlu renovasi besar'
          ? 70
          : 100,
    ...project.cost,
  }));
  const [csv, setCsv] = useState('');
  const [csvError, setCsvError] = useState('');
  const [paste, setPaste] = useState(false);
  const [edit, setEdit] = useState<LandReference | null>(null);
  const [error, setError] = useState('');
  const [editingHouse, setEditingHouse] = useState<Comparable | null>(null);
  const preview = costValuation({ ...project, cost: draft });
  const active = project.valuationMethod === 'cost';
  const set = <K extends keyof CostSettings>(key: K, value: CostSettings[K]) =>
    setDraft((s) => ({ ...s, [key]: value }));
  const number = (
    label: string,
    key:
      | 'manualLandRate'
      | 'newBuildRate'
      | 'annualDepreciation'
      | 'residualPercent'
      | 'conditionPercent'
      | 'junctionDiscount'
      | 'floodDiscount'
      | 'saleDiscount',
    max?: number,
    hint?: string,
  ) => (
    <Field label={label} hint={hint}>
      <input
        type="number"
        min="0"
        max={max}
        step="any"
        required
        value={draft[key] || 0}
        onChange={(e) => set(key, Number(e.target.value))}
      />
    </Field>
  );
  const refs = project.landReferences || [];
  const importCsv = (value: string) => {
    const parsed = parseLandCsv(value);
    if (parsed.error) {
      setCsvError(parsed.error);
      return;
    }
    update((s) => ({ ...s, landReferences: [...(s.landReferences || []), ...parsed.records] }));
    setPaste(false);
    setCsv('');
    setCsvError('');
    notify(
      `${parsed.records.length} referensi tanah diimpor. Lihat status filter pada tabel tanah.`,
    );
  };
  return (
    <section className="card form-section cost-panel" aria-label="Metode tanah dan bangunan">
      <div className="card-heading">
        <div>
          <Tag tone={active ? 'green' : 'gray'}>
            {active ? 'METODE AKTIF' : 'METODE ALTERNATIF'}
          </Tag>
          <h2>Nilai tanah + bangunan</h2>
          <p>
            Masukkan asumsi, lihat rincian, lalu simpan untuk memakai hasilnya di Ringkasan,
            strategi, dan laporan.
          </p>
        </div>
        <Button variant="secondary" onClick={onProperty}>
          Edit detail properti
        </Button>
      </div>
      <Notice>{COST_LIMITATION}</Notice>
      {draft.landMode !== 'houses' && (
        <div className="cost-actions">
          <Button variant="secondary" onClick={() => set('landMode', 'houses')}>
            Gunakan pembanding rumah yang sudah diimpor
          </Button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update((s) => ({ ...s, valuationMethod: 'cost', cost: draft }));
          notify(
            preview.ready
              ? 'Metode tanah + bangunan aktif. Harga rekomendasi diperbarui.'
              : 'Asumsi disimpan dan metode aktif. Lengkapi bagian yang disebutkan agar harga muncul.',
          );
        }}
      >
        <h3>1. Dasar harga tanah</h3>
        <div className="form-grid">
          <Field label="Sumber harga tanah">
            <select
              value={draft.landMode}
              onChange={(e) => set('landMode', e.target.value as CostSettings['landMode'])}
            >
              <option value="houses">Ekstraksi dari pembanding rumah yang tersimpan</option>
              <option value="references">Rata-rata referensi tanah murni</option>
              <option value="manual">Harga per m² manual + sumber</option>
            </select>
          </Field>
          <Field label="Lingkup referensi tanah">
            <select
              value={project.settings.mode}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  settings: { ...s.settings, mode: e.target.value as Project['settings']['mode'] },
                }))
              }
            >
              <option value="area">Area / kecamatan</option>
              <option value="cluster">Cluster</option>
              <option value="radius">Radius</option>
            </select>
          </Field>
          {project.settings.mode === 'radius' && (
            <Field label="Radius tanah (km)">
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={project.settings.radius}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    settings: { ...s.settings, radius: Number(e.target.value) },
                  }))
                }
              />
            </Field>
          )}
          {draft.landMode === 'manual' && (
            <>
              {number(
                'Harga tanah manual (Rp/m²)',
                'manualLandRate',
                undefined,
                'Harus harga tanah murni; bukan harga rumah total dibagi luas tanah.',
              )}
              <Field label="Sumber/asumsi harga tanah">
                <input
                  required
                  value={draft.manualLandSource}
                  onChange={(e) => set('manualLandSource', e.target.value)}
                />
              </Field>
            </>
          )}
        </div>
        <p>
          Lingkup mengikuti Detail properti: area{' '}
          <strong>{project.property.area || 'belum diisi'}</strong>, cluster{' '}
          <strong>{project.property.cluster || 'belum diisi'}</strong>. Tidak ada syarat kesamaan
          kondisi bangunan pada referensi kavling. Sertifikat berbeda/belum diketahui diberi
          peringatan.
        </p>
        {draft.landMode === 'houses' && (
          <HouseExtraction
            project={project}
            settings={draft}
            change={setDraft}
            onEdit={setEditingHouse}
            onPrompt={onHousePrompt}
          />
        )}
        <h3>2. Biaya dan penyusutan bangunan</h3>
        <p>
          Kondisi menurut Detail properti: <strong>{project.property.condition}</strong>. Preset
          berikut mengisi faktor kondisi sebagai contoh asumsi; Anda tetap dapat menyesuaikannya.
        </p>
        <div className="cost-actions">
          <Button
            variant="secondary"
            onClick={() => setDraft((s) => ({ ...s, effectiveAge: 0, conditionPercent: 100 }))}
          >
            Bangunan baru: umur 0, kondisi 100%
          </Button>
          <Button variant="ghost" onClick={() => set('conditionPercent', 100)}>
            Siap huni: faktor 100%
          </Button>
          <Button variant="ghost" onClick={() => set('conditionPercent', 90)}>
            Renovasi ringan: contoh 90%
          </Button>
          <Button variant="ghost" onClick={() => set('conditionPercent', 70)}>
            Renovasi besar: contoh 70%
          </Button>
        </div>
        <div className="form-grid three">
          {number(
            'Biaya bangun baru (Rp/m²)',
            'newBuildRate',
            undefined,
            'Biaya pengganti bangunan sekelas saat ini, tanpa harga tanah. Untuk tanah kavling, isi 0.',
          )}
          <Field label="Sumber/asumsi biaya bangun">
            <input
              required={project.property.kind !== 'Tanah kavling'}
              value={draft.buildSource}
              onChange={(e) => set('buildSource', e.target.value)}
              placeholder="Penawaran kontraktor, tanggal, kelas spesifikasi"
            />
          </Field>
          <Field
            label="Umur efektif bangunan (tahun)"
            hint={`Kosong = tahun sekarang dikurangi tahun dibangun (${project.property.builtYear ?? 'belum diisi'}). Baru = 0. Renovasi tidak otomatis menghapus umur.`}
          >
            <input
              type="number"
              min="0"
              max="200"
              step="0.1"
              value={draft.effectiveAge ?? ''}
              onChange={(e) =>
                set('effectiveAge', e.target.value === '' ? null : Number(e.target.value))
              }
            />
          </Field>
          {number(
            'Penyusutan linear (%/tahun)',
            'annualDepreciation',
            20,
            'Default 2% = 1/50 per tahun sebelum batas nilai sisa, bukan tarif resmi. Ubah sesuai bukti; 5–10% tidak diterapkan otomatis.',
          )}
          {number(
            'Nilai sisa setelah susut umur (%)',
            'residualPercent',
            100,
            'Batas bawah akibat umur saja, sebelum koreksi kondisi; default asumsi 20%.',
          )}
          {number(
            'Faktor kondisi bangunan (%)',
            'conditionPercent',
            100,
            '100 = tanpa koreksi tambahan. Contoh asumsi: ringan 90, besar 70. Hindari menghitung kerusakan dua kali dengan umur efektif.',
          )}
        </div>
        <h3>3. Posisi, banjir, dan strategi jual</h3>
        <div className="form-grid three">
          <Field label="Posisi tusuk sate">
            <select
              value={draft.junction}
              onChange={(e) => set('junction', e.target.value as CostSettings['junction'])}
            >
              <option value="unknown">Belum diperiksa</option>
              <option value="no">Tidak</option>
              <option value="yes">Ya</option>
            </select>
          </Field>
          {number(
            'Koreksi tusuk sate (%)',
            'junctionDiscount',
            50,
            'Hanya aktif jika Ya. Default 5% adalah contoh asumsi, perlu bukti lokal.',
          )}
          <Field label="Risiko/riwayat banjir">
            <select
              value={draft.flood}
              onChange={(e) => set('flood', e.target.value as CostSettings['flood'])}
            >
              <option value="unknown">Belum diperiksa</option>
              <option value="no">Tidak, menurut informasi yang diperiksa</option>
              <option value="yes">Ya</option>
            </select>
          </Field>
          {number(
            'Koreksi banjir (%)',
            'floodDiscount',
            50,
            'Hanya aktif jika Ya. Default 10% adalah contoh asumsi; sesuaikan tinggi, frekuensi, dan akses.',
          )}
          {number(
            'Penyesuaian strategi jual (%)',
            'saleDiscount',
            50,
            'Pengurangan opsional dari nilai dasar untuk menguji pasar. Default 0%; tidak ada diskon otomatis karena target 180 hari.',
          )}
          <Field
            label="Catatan dasar koreksi"
            hint="Catat inspeksi, riwayat banjir, dan alasan pemilihan koefisien. Tersimpan sebagai catatan internal."
          >
            <textarea value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
        <div className="cost-preview" aria-label="Pratinjau perhitungan biaya">
          <h3>Pratinjau berdasarkan input saat ini</h3>
          <p>
            Tanah tidak disusutkan. Nilai bangunan = LB × biaya baru/m² × maks(nilai sisa, 1 − umur
            × penyusutan tahunan) × faktor kondisi.
          </p>
          <dl>
            <div>
              <dt>Harga tanah / m²</dt>
              <dd>{preview.landRate === null ? 'Belum tersedia' : rupiah(preview.landRate)}</dd>
            </div>
            <div>
              <dt>Nilai tanah</dt>
              <dd>{rupiah(preview.landValue)}</dd>
            </div>
            <div>
              <dt>Biaya bangunan baru</dt>
              <dd>{rupiah(preview.buildingNew)}</dd>
            </div>
            <div>
              <dt>Umur efektif / retensi umur</dt>
              <dd>
                {preview.age ?? '—'} tahun / {(preview.retained * 100).toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt>Nilai bangunan setelah umur dan kondisi</dt>
              <dd>{rupiah(preview.buildingValue)}</dd>
            </div>
            <div>
              <dt>Faktor posisi × banjir</dt>
              <dd>
                {preview.positionFactor.toFixed(3)} × {preview.floodFactor.toFixed(3)}
              </dd>
            </div>
            <div>
              <dt>Nilai dasar terkoreksi</dt>
              <dd>{rupiah(preview.baseValue)}</dd>
            </div>
            <div>
              <dt>Harga pembukaan indikatif (pembulatan Rp1 juta)</dt>
              <dd>
                {preview.suggested === null ? 'Lengkapi input di bawah' : rupiah(preview.suggested)}
              </dd>
            </div>
          </dl>
          <p>
            Koreksi posisi dan banjir diterapkan berurutan pada tanah + bangunan, lalu koreksi
            strategi jual. Biaya pengganti belum tentu sama dengan harga yang mau dibayar pembeli.
          </p>
          {preview.issues.length > 0 && (
            <div role="status">
              <strong>Yang masih perlu diisi:</strong>
              <ul>
                {preview.issues.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {preview.warnings.length > 0 && (
            <details>
              <summary>Peringatan dan asumsi ({preview.warnings.length})</summary>
              <ul>
                {preview.warnings.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <div className="cost-actions">
          <Button type="submit">Simpan & gunakan metode tanah + bangunan</Button>
          <Button
            variant="secondary"
            onClick={() => {
              update((s) => ({ ...s, valuationMethod: 'market' }));
              notify(
                'Metode pembanding rumah V1 aktif kembali. Data dan asumsi tanah tetap tersimpan.',
              );
            }}
          >
            Gunakan metode pembanding rumah V1
          </Button>
        </div>
      </form>
      <div className="card-heading cost-references">
        <div>
          <h3>Referensi tanah murni</h3>
          <p>
            {refs.length} tersimpan · {preview.rows.filter((r) => r.included).length} lolos filter ·{' '}
            {preview.basis.length} dalam kelompok harga dasar. Rata-rata dihitung per iklan (harga
            total ÷ LT), tanpa mencampur penawaran dan transaksi. Satu referensi dapat dipakai untuk
            simulasi awal.
          </p>
        </div>
      </div>
      <div className="cost-actions">
        <Button onClick={onPrompt}>Generate prompt riset tanah</Button>
        <Button
          variant="secondary"
          onClick={() =>
            setEdit({
              id: crypto.randomUUID(),
              title: '',
              area: project.property.area,
              cluster: project.property.cluster,
              lat: null,
              lng: null,
              land: 0,
              price: 0,
              source: '',
              url: '',
              observedAt: today(),
              certificate: 'Belum diketahui',
              priceType: 'Penawaran',
              enabled: true,
              verified: false,
            })
          }
        >
          Tambah referensi tanah
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setCsvError('');
            setPaste(true);
          }}
        >
          Tempel CSV tanah
        </Button>
        <label className="button secondary">
          Impor CSV tanah
          <input
            aria-label="File CSV tanah"
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) {
                if (f.size > 2e6) {
                  setCsvError('CSV maksimal 2 MB.');
                  return;
                }
                try {
                  importCsv(await f.text());
                } catch {
                  setCsvError('File tanah tidak dapat dibaca.');
                }
              }
            }}
          />
        </label>
        <Button
          variant="ghost"
          onClick={() =>
            saveBlob(
              LAND_CSV_COLUMNS.join(',') + '\n',
              'template-referensi-tanah.csv',
              'text/csv;charset=utf-8',
            )
          }
        >
          Template CSV tanah
        </Button>
      </div>
      {csvError && !paste && (
        <p className="error-message" role="alert">
          {csvError}
        </p>
      )}
      <p>
        Jangan masukkan harga rumah total sebagai harga tanah. Untuk memakai rumah V1, pilih
        Ekstraksi dari pembanding rumah lalu lengkapi asumsi bangunannya. Duplikat, data lama, dan
        lokasi tidak cocok tetap disaring. Untuk transaksi, periksa bukti lalu tandai pada Ubah.
      </p>
      {refs.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>REFERENSI TANAH</th>
                <th>LT / HARGA TOTAL</th>
                <th>HARGA/m²</th>
                <th>STATUS</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r) => (
                <tr key={r.reference.id}>
                  <td>
                    <strong>{r.reference.title}</strong>
                    <small>
                      {r.reference.area} · {r.reference.cluster || 'tanpa cluster'}
                    </small>
                    <small>
                      {r.reference.certificate} · {r.reference.priceType} · {r.reference.observedAt}
                    </small>
                    {safeUrl(r.reference.url) ? (
                      <a href={safeUrl(r.reference.url)} target="_blank" rel="noreferrer">
                        {r.reference.source}
                      </a>
                    ) : (
                      <small>{r.reference.source}</small>
                    )}
                  </td>
                  <td>
                    {r.reference.land} m²<small>{rupiah(r.reference.price)}</small>
                  </td>
                  <td>{rupiah(r.rate)}</td>
                  <td>
                    <Tag tone={r.included ? 'green' : 'amber'}>
                      {preview.basis.includes(r)
                        ? 'Dasar rata-rata'
                        : r.included
                          ? draft.landMode === 'manual'
                            ? 'Lolos filter; harga manual aktif'
                            : 'Kelompok harga terpisah'
                          : r.reason}
                    </Tag>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setError('');
                        setEdit({ ...r.reference });
                      }}
                    >
                      Ubah tanah {r.reference.title}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Hapus referensi tanah ${r.reference.title}?`))
                          update((s) => ({
                            ...s,
                            landReferences: (s.landReferences || []).filter(
                              (x) => x.id !== r.reference.id,
                            ),
                          }));
                      }}
                    >
                      Hapus tanah {r.reference.title}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editingHouse && (
        <ComparableModal
          property={project.property}
          initial={editingHouse}
          close={() => setEditingHouse(null)}
          save={(value) => {
            update((s) => ({
              ...s,
              comparables: s.comparables.map((c) => (c.id === value.id ? value : c)),
            }));
            setEditingHouse(null);
            notify('Asumsi bangunan pembanding diperbarui.');
          }}
        />
      )}
      {paste && (
        <Modal title="Tempel CSV referensi tanah" close={() => setPaste(false)}>
          <p>Gunakan hasil prompt riset tanah. Header: {LAND_CSV_COLUMNS.join(',')}</p>
          <Field label="CSV tanah dari AI">
            <textarea rows={10} value={csv} onChange={(e) => setCsv(e.target.value)} />
          </Field>
          {csvError && (
            <p className="error-message" role="alert">
              {csvError}
            </p>
          )}
          <Button onClick={() => importCsv(csv)}>Impor referensi tanah</Button>
        </Modal>
      )}
      {edit && (
        <Modal title="Referensi tanah murni" close={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const err = validateLandReference(edit);
              if (err) {
                setError(err);
                return;
              }
              update((s) => ({
                ...s,
                landReferences: (s.landReferences || []).some((x) => x.id === edit.id)
                  ? s.landReferences!.map((x) => (x.id === edit.id ? edit : x))
                  : [...(s.landReferences || []), edit],
              }));
              setEdit(null);
              setError('');
              notify('Referensi tanah disimpan.');
            }}
          >
            <div className="form-grid">
              {(
                ['title', 'area', 'cluster', 'source', 'url', 'certificate', 'observedAt'] as const
              ).map((k) => (
                <Field
                  key={k}
                  label={
                    {
                      title: 'Nama/lokasi kavling',
                      area: 'Area tanah',
                      cluster: 'Cluster tanah',
                      source: 'Sumber tanah',
                      url: 'URL sumber tanah',
                      certificate: 'Sertifikat tanah',
                      observedAt: 'Tanggal pengamatan tanah',
                    }[k]
                  }
                >
                  <input
                    required={['title', 'area', 'source', 'observedAt'].includes(k)}
                    type={k === 'observedAt' ? 'date' : k === 'url' ? 'url' : 'text'}
                    max={k === 'observedAt' ? today() : undefined}
                    value={edit[k]}
                    onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                  />
                </Field>
              ))}
              {(['land', 'price', 'lat', 'lng'] as const).map((k) => (
                <Field
                  key={k}
                  label={
                    {
                      land: 'Luas kavling (m²)',
                      price: 'Harga total tanah (Rp)',
                      lat: 'Latitude tanah',
                      lng: 'Longitude tanah',
                    }[k]
                  }
                >
                  <input
                    type="number"
                    step="any"
                    min={k === 'lat' ? -90 : k === 'lng' ? -180 : 1}
                    max={k === 'lat' ? 90 : k === 'lng' ? 180 : undefined}
                    required={k === 'land' || k === 'price'}
                    value={edit[k] ?? ''}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        [k]: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
              ))}
              <Field label="Jenis harga tanah">
                <select
                  value={edit.priceType}
                  onChange={(e) =>
                    setEdit({ ...edit, priceType: e.target.value as LandReference['priceType'] })
                  }
                >
                  <option>Penawaran</option>
                  <option>Transaksi</option>
                </select>
              </Field>
              <label>
                <input
                  type="checkbox"
                  checked={edit.enabled}
                  onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })}
                />{' '}
                Gunakan referensi tanah ini
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={edit.verified}
                  onChange={(e) => setEdit({ ...edit, verified: e.target.checked })}
                />{' '}
                Saya telah memeriksa sumber/bukti transaksi
              </label>
            </div>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <Button type="submit">Simpan referensi tanah</Button>
          </form>
        </Modal>
      )}
    </section>
  );
}
