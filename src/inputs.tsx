import { useState, type FormEvent } from 'react';
import {
  Check,
  ExternalLink,
  FileDown,
  MapPin,
  Plus,
  Pencil,
  ScanLine,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  compact,
  dateOffset,
  safeUrl,
  shortDate,
  today,
  validateCampaign,
  validateComparable,
  type Analysis,
  type Campaign,
  type Comparable,
  type Project,
  type Property,
} from './domain';
import { Button, Field, Tag, Empty, Notice, Modal, RoomInput, saveBlob } from './ui';
import { COMPARABLE_CSV_COLUMNS, parseComparableCsv } from './comparable-csv';
import { formatRooms } from './rooms';
import { AnalysisReadiness } from './AnalysisReadiness';
import { validatePromptProperty } from './prompts';
export function PropertyForm({
  property,
  save,
}: {
  property: Property;
  save: (p: Property) => void;
}) {
  const [draft, setDraft] = useState<Property>(property);
  const [error, setError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const text = (
    key: keyof Property,
    label: string,
    placeholder = '',
    required = false,
    wide = false,
  ) => (
    <Field label={label} wide={wide}>
      <input
        value={String(draft[key] ?? '')}
        onChange={(ev) => setDraft((s) => ({ ...s, [key]: ev.target.value }))}
        placeholder={placeholder}
        required={required}
      />
    </Field>
  );
  const num = (key: keyof Property, label: string, required = false, nullable = false) => (
    <Field label={label}>
      <input
        type="number"
        min={key === 'lat' ? -90 : key === 'lng' ? -180 : 0}
        max={key === 'lat' ? 90 : key === 'lng' ? 180 : undefined}
        step={key === 'lat' || key === 'lng' ? 'any' : '1'}
        value={draft[key] === null || draft[key] === 0 ? '' : String(draft[key])}
        required={required}
        onChange={(ev) =>
          setDraft((s) => ({
            ...s,
            [key]: ev.target.value === '' && nullable ? null : Number(ev.target.value),
          }))
        }
        placeholder={nullable ? 'Opsional' : '0'}
      />
    </Field>
  );
  const select = (key: keyof Property, label: string, options: string[]) => (
    <Field label={label}>
      <select
        value={String(draft[key])}
        onChange={(ev) => setDraft((s) => ({ ...s, [key]: ev.target.value }))}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </Field>
  );
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const issues = validatePromptProperty(draft);
    if (issues.length) {
      setError(issues.join(' '));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    save(draft);
  };
  const photos = async (files: FileList | null) => {
    if (!files) return;
    setPhotoBusy(true);
    try {
      const selected = Array.from(files);
      if (selected.length + draft.photos.length > 4) throw new Error('Maksimal 4 foto.');
      const processed = await Promise.all(selected.map(resizePhoto));
      setDraft((s) => ({ ...s, photos: [...s.photos, ...processed] }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foto gagal diproses.');
    } finally {
      setPhotoBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="property-form">
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <section className="card form-section">
        <div className="form-section-heading">
          <span>01</span>
          <div>
            <h2>Lokasi & identitas</h2>
            <p>Mulai dari rumah yang ingin Anda jual. Tanda * wajib diisi.</p>
          </div>
          <MapPin size={20} />
        </div>
        <div className="form-grid">
          {text('title', 'Nama properti *', 'Contoh: Rumah keluarga di Bintaro', true)}
          <Field label="Jenis properti">
            <select
              value={draft.kind || 'Rumah tapak'}
              onChange={(ev) =>
                setDraft((s) => ({ ...s, kind: ev.target.value as Property['kind'] }))
              }
            >
              <option>Rumah tapak</option>
              <option>Ruko</option>
              <option>Tanah kavling</option>
              <option>Apartemen</option>
            </select>
          </Field>
          {text('address', 'Alamat lengkap *', 'Jalan, nomor, kelurahan, kota', true, true)}
          {text('city', 'Kota / kabupaten', 'Contoh: Kabupaten Bogor')}
          {text('province', 'Provinsi', 'Contoh: Jawa Barat')}
          {text(
            'area',
            'Area / kecamatan *',
            'Gunakan nama yang konsisten dengan pembanding',
            true,
          )}
          {text('cluster', 'Nama cluster / perumahan', 'Opsional')}
          {num('lat', 'Latitude', false, true)}
          {num('lng', 'Longitude', false, true)}
        </div>
        <Notice>
          Pastikan koordinat sesuai alamat. Versi ini belum menyediakan pencarian alamat atau peta
          otomatis.
        </Notice>
      </section>
      <section className="card form-section">
        <div className="form-section-heading">
          <span>02</span>
          <div>
            <h2>Spesifikasi rumah</h2>
            <p>Isi sesuai kondisi fisik yang sebenarnya.</p>
          </div>
          <ScanLine size={20} />
        </div>
        <div className="form-grid three">
          {num(
            'land',
            draft.kind === 'Apartemen' ? 'Luas tanah (opsional)' : 'Luas tanah (m²) *',
            draft.kind !== 'Apartemen',
          )}
          {num(
            'building',
            draft.kind === 'Tanah kavling' ? 'Luas bangunan (opsional)' : 'Luas bangunan (m²) *',
            draft.kind !== 'Tanah kavling',
          )}
          {num('frontage', 'Lebar muka tanah / bangunan (m)')}
          {num('road', 'Lebar jalan (m)')}
          {num('floors', 'Jumlah lantai')}
          <RoomInput
            label="Kamar tidur"
            main={draft.beds}
            staff={draft.staffBeds}
            onChange={(beds, staffBeds) => setDraft((s) => ({ ...s, beds, staffBeds }))}
          />
          <RoomInput
            label="Kamar mandi"
            main={draft.baths}
            staff={draft.staffBaths}
            bathroom
            onChange={(baths, staffBaths) => setDraft((s) => ({ ...s, baths, staffBaths }))}
          />
          {num('carport', 'Kapasitas carport (mobil)')}
          {num('garage', 'Kapasitas garasi (mobil)')}
          {num('electricity', 'Daya listrik (VA)')}
          {text('water', 'Sumber air', 'PAM / sumur')}
          {text('shape', 'Bentuk / kontur tanah', 'Persegi, datar, dll.')}
          {text('position', 'Posisi rumah', 'Interior / hoek / jalan buntu')}
        </div>
      </section>
      <section className="card form-section">
        <div className="form-section-heading">
          <span>03</span>
          <div>
            <h2>Kondisi, lingkungan & dokumen</h2>
            <p>Semua keterangan pemilik perlu diverifikasi sebelum transaksi.</p>
          </div>
          <ShieldCheck size={20} />
        </div>
        <div className="form-grid">
          {select('condition', 'Kondisi bangunan', [
            'Siap huni',
            'Perlu renovasi ringan',
            'Perlu renovasi besar',
            'Belum diketahui',
          ])}
          {select('certificate', 'Status sertifikat (boleh belum diketahui)', [
            'Lainnya / belum diketahui',
            'SHM',
            'HGB',
          ])}
          {num('builtYear', 'Tahun dibangun', false, true)}
          {num('renovationYear', 'Tahun renovasi', false, true)}
          {text('permits', 'PBG / IMB dan masa berlaku hak', 'Tuliskan status yang diketahui')}
          {text(
            'legalNotes',
            'Agunan / sengketa / catatan legalitas',
            'Belum diperiksa / detail yang diketahui',
          )}
          {select('occupancy', 'Status hunian', ['Dihuni pemilik', 'Kosong', 'Disewakan'])}
          {text('handover', 'Rencana serah terima', 'Contoh: 30 hari setelah pelunasan')}
          {num('fee', 'Biaya lingkungan per bulan (Rp)')}
          <Field label="Fasilitas lingkungan" wide>
            <textarea
              value={draft.facilities}
              onChange={(ev) => setDraft((s) => ({ ...s, facilities: ev.target.value }))}
              placeholder="Fasilitas dan perkiraan aksesnya. Sebutkan sumber jika tersedia."
            />
          </Field>
          <Field
            label="Risiko lingkungan / riwayat banjir"
            wide
            hint="Jangan menulis bebas banjir jika belum memiliki bukti."
          >
            <textarea
              value={draft.risks}
              onChange={(ev) => setDraft((s) => ({ ...s, risks: ev.target.value }))}
              placeholder="Keterangan pemilik, sumber, tanggal, dan hal yang belum diverifikasi."
            />
          </Field>
        </div>
        <div className="photo-heading">
          <h3>
            Foto properti <small>Opsional · maksimal 4 foto</small>
          </h3>
          <label className="button secondary file-label">
            <Upload size={15} />
            {photoBusy ? 'Memproses…' : 'Unggah foto'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(ev) => {
                photos(ev.target.files);
                ev.target.value = '';
              }}
              disabled={photoBusy}
            />
          </label>
        </div>
        <div className="photo-list">
          {draft.photos.map((src, i) => (
            <div key={i}>
              <img src={src} alt={`Foto properti ${i + 1}`} />
              <button
                type="button"
                aria-label={`Hapus foto ${i + 1}`}
                onClick={() =>
                  setDraft((s) => ({ ...s, photos: s.photos.filter((_, j) => i !== j) }))
                }
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="card form-section">
        <div className="form-section-heading">
          <span>04</span>
          <div>
            <h2>Rencana penjualan</h2>
            <p>
              Harga minimum, anggaran, dan catatan internal hanya masuk prompt jika Anda
              mengizinkannya.
            </p>
          </div>
          <Target size={20} />
        </div>
        <div className="form-grid three">
          {num('asking', 'Harga iklan saat ini (Rp)')}
          {num('minimum', 'Harga minimum internal (Rp)')}
          {num('budget', 'Anggaran pemasaran (Rp)')}
        </div>
      </section>
      <div className="form-save">
        <span>
          <ShieldCheck size={15} />
          Disimpan di browser perangkat Anda.
        </span>
        <Button type="submit" disabled={photoBusy}>
          <Check size={17} />
          Simpan & perbarui analisis
        </Button>
      </div>
    </form>
  );
}

export function Comparables({
  project,
  analysis,
  update,
  notify,
}: {
  project: Project;
  analysis: Analysis;
  update: React.Dispatch<React.SetStateAction<Project>>;
  notify: (s: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Comparable | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const filtered = analysis.rows.filter((r) =>
    `${r.comparable.title} ${r.comparable.address} ${r.comparable.source}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const consumeCsv = (text: string) => {
    const result = parseComparableCsv(text);
    if (result.error) {
      setError(result.error);
      return false;
    }
    update((s) => ({ ...s, comparables: [...s.comparables, ...result.records] }));
    setError('');
    notify(`${result.records.length} pembanding diimpor. Tinjau sumber dan verifikasinya.`);
    return true;
  };
  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2e6) {
      setError('File maksimal 2 MB.');
      return;
    }
    try {
      consumeCsv(await file.text());
    } catch {
      setError('File tidak dapat dibaca.');
    }
  };
  const template = () =>
    saveBlob(
      COMPARABLE_CSV_COLUMNS.join(',') + '\n',
      'template-pembanding.csv',
      'text/csv;charset=utf-8',
    );
  return (
    <>
      <section className="card filters-card">
        <div className="card-heading">
          <div>
            <h2>
              <SlidersHorizontal size={19} />
              Lingkup pencarian pembanding
            </h2>
            <p>
              Pembanding dapat dilampirkan ke prompt. AI diminta menilai ulang relevansi dan
              sumbernya.
            </p>
          </div>
          <Tag tone="gray">Manual & CSV</Tag>
        </div>
        <div className="filter-controls">
          <div className="segmented">
            {(
              [
                { id: 'area', label: 'Area / kecamatan' },
                { id: 'cluster', label: 'Cluster' },
                { id: 'radius', label: 'Radius' },
              ] as const
            ).map((x) => (
              <button
                key={x.id}
                className={project.settings.mode === x.id ? 'selected' : ''}
                onClick={() => update((s) => ({ ...s, settings: { ...s.settings, mode: x.id } }))}
              >
                {x.id === 'radius' && <MapPin size={14} />} {x.label}
              </button>
            ))}
          </div>
          {project.settings.mode === 'radius' ? (
            <select
              aria-label="Radius pencarian"
              value={project.settings.radius}
              onChange={(ev) =>
                update((s) => ({
                  ...s,
                  settings: { ...s.settings, radius: Number(ev.target.value) },
                }))
              }
            >
              {[1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n} km
                </option>
              ))}
            </select>
          ) : (
            <span className="filter-location">
              <MapPin size={15} />
              {(project.settings.mode === 'area'
                ? project.property.area
                : project.property.cluster) || 'Belum diisi di detail properti'}
            </span>
          )}
        </div>
        {project.settings.mode === 'radius' && (
          <Notice>
            Radius menggunakan jarak garis lurus. Kedua koordinat harus tersedia; akses jalan dan
            batas lingkungan tetap perlu ditinjau manual.
          </Notice>
        )}
      </section>
      {project.valuationMethod !== 'cost' && (
        <AnalysisReadiness project={project} analysis={analysis} />
      )}
      <section className="card comparables-card">
        <div className="card-heading">
          <div>
            <h2>
              Data pembanding <Tag tone="gray">{project.comparables.length} data</Tag>
            </h2>
            <p>
              {analysis.count} pembanding menjadi dasar metode pembanding rumah V1. Lengkapi dengan
              prompt riset, lalu impor dan tinjau hasil CSV.
            </p>
          </div>
          <div className="button-row">
            <Button
              variant="secondary"
              onClick={() => {
                setError('');
                setPasteOpen(true);
              }}
            >
              Tempel CSV dari AI
            </Button>
            <Button variant="secondary" onClick={template}>
              <FileDown size={15} />
              Template
            </Button>
            <label className="button secondary file-label">
              <Upload size={15} />
              Impor CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(ev) => {
                  importCsv(ev.target.files?.[0]);
                  ev.target.value = '';
                }}
              />
            </label>
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={16} />
              Tambah pembanding
            </Button>
          </div>
        </div>
        {error && !pasteOpen && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              aria-label="Cari pembanding"
              placeholder="Cari nama, alamat, atau sumber…"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
            />
          </div>
          <span>
            <span className="tiny-dot" />
            {analysis.rows.filter((r) => r.included).length} lolos filter
          </span>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th aria-label="Dipilih" />
                  <th>PROPERTI & SUMBER</th>
                  <th>LT / LB</th>
                  <th>HARGA</th>
                  <th>CATATAN RELEVANSI</th>
                  <th aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.comparable.id} className={!r.included ? 'excluded-row' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${r.comparable.title}`}
                        checked={r.comparable.enabled}
                        onChange={(ev) =>
                          update((s) => ({
                            ...s,
                            comparables: s.comparables.map((c) =>
                              c.id === r.comparable.id ? { ...c, enabled: ev.target.checked } : c,
                            ),
                          }))
                        }
                      />
                    </td>
                    <td>
                      <strong>{r.comparable.title}</strong>
                      <small>{r.comparable.address}</small>
                      <span className="source-line">
                        {safeUrl(r.comparable.url) ? (
                          <a
                            href={safeUrl(r.comparable.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {r.comparable.source}
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          r.comparable.source
                        )}
                        <i /> {shortDate(r.comparable.observedAt)}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {r.comparable.land} / {r.comparable.building}
                      </strong>
                      <small>m² · {r.comparable.certificate}</small>
                      <small>
                        KT {formatRooms(r.comparable.beds, r.comparable.staffBeds)} · KM{' '}
                        {formatRooms(r.comparable.baths, r.comparable.staffBaths)}
                      </small>
                    </td>
                    <td>
                      <strong>{compact(r.comparable.price)}</strong>
                      <small>
                        {r.comparable.priceType}
                        {r.comparable.verified ? ' · ditandai terverifikasi' : ''}
                      </small>
                    </td>
                    <td>
                      <Tag tone={r.included ? 'green' : 'amber'}>
                        {r.included ? 'Sesuai kriteria' : r.reason}
                      </Tag>
                      <small>
                        {r.included
                          ? `Penyesuaian ${r.adjustment >= 0 ? '+' : ''}${r.adjustment.toFixed(1)}%`
                          : 'Tidak dipakai dalam estimasi lokal'}
                      </small>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Ubah ${r.comparable.title}`}
                        onClick={() => setEditing(r.comparable)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button delete"
                        aria-label={`Hapus ${r.comparable.title}`}
                        onClick={() => {
                          if (window.confirm(`Hapus pembanding “${r.comparable.title}”?`))
                            update((s) => ({
                              ...s,
                              comparables: s.comparables.filter((c) => c.id !== r.comparable.id),
                            }));
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={query ? 'Pembanding tidak ditemukan' : 'Mulai dengan pembanding pertama'}
            text={
              query
                ? 'Coba kata pencarian lainnya.'
                : 'Masukkan rumah sejenis di lingkungan yang relevan, beserta harga dan sumbernya.'
            }
            action={
              !query && (
                <Button onClick={() => setShowAdd(true)}>
                  <Plus size={16} />
                  Tambah pembanding
                </Button>
              )
            }
          />
        )}
        <div className="table-bottom">
          <ShieldCheck size={15} />
          Harga penawaran bukan harga transaksi. Duplikat lintas agen tetap perlu diperiksa manual.
        </div>
      </section>
      {pasteOpen && (
        <Modal
          title="Tempel CSV dari AI"
          subtitle="Salin header dan baris CSV saja, tanpa pagar kode atau penjelasan AI."
          close={() => setPasteOpen(false)}
        >
          <textarea
            aria-label="CSV pembanding dari AI"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="manual-copy"
            placeholder={COMPARABLE_CSV_COLUMNS.join(',')}
          />
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          <Notice>
            Harga tetap berupa rupiah penuh. Kamar 4+1 dipisahkan menjadi 4 kamar keluarga dan 1
            ART. Seluruh data impor berstatus belum diverifikasi.
          </Notice>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setPasteOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (consumeCsv(pasteText)) {
                  setPasteOpen(false);
                  setPasteText('');
                }
              }}
            >
              Impor data CSV
            </Button>
          </div>
        </Modal>
      )}
      {(showAdd || editing) && (
        <ComparableModal
          initial={editing || undefined}
          close={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          property={project.property}
          save={(c) => {
            update((s) => ({
              ...s,
              comparables: editing
                ? s.comparables.map((item) => (item.id === c.id ? c : item))
                : [...s.comparables, c],
            }));
            setShowAdd(false);
            setEditing(null);
            notify('Pembanding disimpan dan siap disertakan ke prompt.');
          }}
        />
      )}
    </>
  );
}

export function ComparableModal({
  close,
  save,
  property,
  initial,
}: {
  close: () => void;
  save: (c: Comparable) => void;
  property: Property;
  initial?: Comparable;
}) {
  const [c, setC] = useState<Comparable>(
    initial || {
      id: crypto.randomUUID(),
      title: '',
      address: '',
      area: property.area,
      cluster: property.cluster,
      lat: null,
      lng: null,
      land: 0,
      building: 0,
      beds: 3,
      price: 0,
      condition: 'Siap huni',
      certificate: property.certificate,
      source: '',
      url: '',
      observedAt: today(),
      verified: false,
      enabled: true,
      priceType: 'Penawaran',
    },
  );
  const [error, setError] = useState('');
  const field = (key: keyof Comparable, label: string, type = 'text', required = false) => (
    <Field label={label}>
      <input
        type={type}
        required={required}
        step={['lat', 'lng'].includes(key) ? 'any' : undefined}
        min={type === 'number' && !['lat', 'lng'].includes(key) ? 0 : undefined}
        max={type === 'date' ? today() : undefined}
        value={
          c[key] == null || (c[key] === 0 && key !== 'buildingConditionPercent')
            ? ''
            : String(c[key])
        }
        onChange={(ev) =>
          setC((s) => ({
            ...s,
            [key]:
              type === 'number'
                ? ev.target.value === '' &&
                  ['builtYear', 'newBuildRate', 'buildingConditionPercent'].includes(key)
                  ? undefined
                  : ev.target.value === '' && ['lat', 'lng'].includes(key)
                    ? null
                    : Number(ev.target.value)
                : ev.target.value,
          }))
        }
      />
    </Field>
  );
  return (
    <Modal
      title={initial ? 'Ubah data pembanding' : 'Tambah data pembanding'}
      subtitle="Gunakan sumber nyata dan hindari satu rumah tercatat beberapa kali."
      close={close}
    >
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          const err = validateComparable(c);
          if (err) setError(err);
          else save(c);
        }}
      >
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <div className="form-grid">
          {field('title', 'Nama / judul iklan *', 'text', true)}
          {field('address', 'Alamat pembanding *', 'text', true)}
          {field('area', 'Area / kecamatan *', 'text', true)}
          {field('cluster', 'Nama cluster')}
          {field('land', 'Luas tanah (m²) *', 'number', true)}
          {field('building', 'Luas bangunan (m²) *', 'number', true)}
          {field('price', 'Harga (Rp) *', 'number', true)}
          {field('builtYear', 'Estimasi tahun bangunan pembanding', 'number')}
          {field('newBuildRate', 'Biaya bangun baru pembanding (Rp/m²)', 'number')}
          {field('buildingConditionPercent', 'Faktor kondisi pembanding (%)', 'number')}
          {field('buildingEstimateSource', 'Dasar estimasi bangunan pembanding')}
          <p>
            Kosongkan informasi yang belum diketahui. Biaya di atas adalah pengganti bangunan baru
            sekelas; nilai setelah susut dihitung dari tahun dan kondisi. Untuk perhitungan tanah
            hasil ekstraksi, field kosong dapat memakai asumsi bersama yang Anda aktifkan pada
            Analisis harga.
          </p>
          <RoomInput
            label="Kamar tidur"
            main={c.beds}
            staff={c.staffBeds}
            onChange={(beds, staffBeds) => setC((s) => ({ ...s, beds, staffBeds }))}
          />
          <RoomInput
            label="Kamar mandi"
            main={c.baths ?? 0}
            staff={c.staffBaths}
            bathroom
            onChange={(baths, staffBaths) => setC((s) => ({ ...s, baths, staffBaths }))}
          />
          <Field label="Kondisi bangunan">
            <select
              value={c.condition}
              onChange={(ev) =>
                setC((s) => ({ ...s, condition: ev.target.value as Comparable['condition'] }))
              }
            >
              {[
                'Siap huni',
                'Perlu renovasi ringan',
                'Perlu renovasi besar',
                'Belum diketahui',
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Sertifikat">
            <select
              value={c.certificate}
              onChange={(ev) =>
                setC((s) => ({ ...s, certificate: ev.target.value as Comparable['certificate'] }))
              }
            >
              {['SHM', 'HGB', 'Lainnya / belum diketahui'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          {field('source', 'Nama sumber *', 'text', true)}
          {field('url', 'Tautan iklan / sumber', 'url')}
          {field('observedAt', 'Tanggal pengamatan *', 'date', true)}
          <Field label="Jenis harga">
            <select
              value={c.priceType}
              onChange={(ev) =>
                setC((s) => ({ ...s, priceType: ev.target.value as Comparable['priceType'] }))
              }
            >
              <option>Penawaran</option>
              <option>Transaksi</option>
            </select>
          </Field>
          {field('lat', 'Latitude (opsional)', 'number')}
          {field('lng', 'Longitude (opsional)', 'number')}
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={c.verified}
            onChange={(ev) => setC((s) => ({ ...s, verified: ev.target.checked }))}
          />
          Saya telah memeriksa sumber dan bukti harga ini. Data yang belum diperiksa tetap perlu
          diverifikasi sebelum digunakan sebagai dasar harga oleh AI.
        </label>
        <div className="modal-actions">
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
          <Button type="submit">
            <Check size={16} />
            {initial ? 'Simpan perubahan' : 'Simpan pembanding'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CampaignModal({
  project,
  save,
  close,
}: {
  project: Project;
  save: (c: Campaign) => void;
  close: () => void;
}) {
  const [c, setC] = useState<Campaign>({
    id: crypto.randomUUID(),
    start: dateOffset(-6),
    end: today(),
    channel: '',
    price: project.property.asking,
    views: 0,
    chats: 0,
    scheduled: 0,
    visits: 0,
    offers: 0,
    spend: 0,
    objection: 'Belum diketahui',
    notes: '',
  });
  const [error, setError] = useState('');
  const num = (
    key: 'price' | 'views' | 'chats' | 'scheduled' | 'visits' | 'offers' | 'spend',
    label: string,
  ) => (
    <Field label={label}>
      <input
        type="number"
        min="0"
        step="1"
        required
        value={c[key]}
        onChange={(ev) => setC((s) => ({ ...s, [key]: Number(ev.target.value) }))}
      />
    </Field>
  );
  return (
    <Modal
      title="Catat performa iklan"
      subtitle="Gunakan satu periode dengan harga yang konsisten. Pisahkan saat harga berubah."
      close={close}
    >
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          const err = validateCampaign(c, project.campaigns);
          if (err) setError(err);
          else save(c);
        }}
      >
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <div className="form-grid">
          <Field label="Tanggal mulai *">
            <input
              type="date"
              max={today()}
              value={c.start}
              onChange={(ev) => setC((s) => ({ ...s, start: ev.target.value }))}
              required
            />
          </Field>
          <Field label="Tanggal selesai *">
            <input
              type="date"
              max={today()}
              value={c.end}
              onChange={(ev) => setC((s) => ({ ...s, end: ev.target.value }))}
              required
            />
          </Field>
          <Field label="Kanal pemasaran *">
            <input
              placeholder="Contoh: gabungan marketplace & agen"
              value={c.channel}
              onChange={(ev) => setC((s) => ({ ...s, channel: ev.target.value }))}
              required
            />
          </Field>
          {num('price', 'Harga yang diuji (Rp) *')}
          {num('views', 'Viewer / jangkauan tercatat')}
          {num('chats', 'Prospek chat unik')}
          {num('scheduled', 'Prospek dijadwalkan survei')}
          {num('visits', 'Prospek sudah survei')}
          {num('offers', 'Prospek memberikan penawaran')}
          {num('spend', 'Biaya pemasaran (Rp)')}
          <Field label="Hambatan utama yang diketahui">
            <select
              value={c.objection}
              onChange={(ev) => setC((s) => ({ ...s, objection: ev.target.value }))}
            >
              {[
                'Belum diketahui',
                'Harga',
                'Lokasi / akses',
                'Kondisi bangunan',
                'Legalitas',
                'Pembiayaan',
                'Jadwal survei',
                'Jangkauan iklan',
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Catatan tindak lanjut" wide>
            <textarea
              value={c.notes}
              onChange={(ev) => setC((s) => ({ ...s, notes: ev.target.value }))}
              placeholder="Alasan calon pembeli, materi yang diubah, dan tindak lanjut."
            />
          </Field>
        </div>
        <Notice>
          Survei dihitung berdasarkan calon pembeli unik yang benar-benar datang, bukan jumlah
          kunjungan berulang. Pisahkan chat spam dan agen penawar jasa. Rasio tidak membuktikan
          harga pasti tepat.
        </Notice>
        <div className="modal-actions">
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
          <Button type="submit">
            <Check size={16} />
            Simpan periode
          </Button>
        </div>
      </form>
    </Modal>
  );
}
async function resizePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Gunakan foto JPG, PNG, atau WebP.');
  if (file.size > 10e6) throw new Error('Ukuran maksimal setiap foto 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Browser tidak mendukung pemrosesan foto.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}
