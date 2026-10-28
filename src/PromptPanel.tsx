import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  House,
  MapPin,
  MessageCircle,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { today, type Project } from './domain';
import {
  buildPrompt,
  defaultPromptOptions,
  promptGoals,
  type PromptOptions,
  type PromptGoal,
} from './prompts';
import { Button, Field, Modal, Notice, Tag, saveBlob } from './ui';

const OPTIONS_STORAGE = 'ruangnilai.prompt.v1';
function loadOptions(): PromptOptions {
  try {
    const stored = JSON.parse(localStorage.getItem(OPTIONS_STORAGE) || 'null');
    if (!stored) return defaultPromptOptions;
    const options = { ...defaultPromptOptions };
    if (stored.platform === 'ChatGPT' || stored.platform === 'Claude')
      options.platform = stored.platform;
    if (promptGoals.some((g) => g.id === stored.goal)) options.goal = stored.goal;
    for (const key of [
      'browsing',
      'includeAddress',
      'includePrivate',
      'includeComparables',
      'includeCampaigns',
    ] as const)
      if (typeof stored[key] === 'boolean') options[key] = stored[key];
    if ([30, 90, 180, 365].includes(stored.freshnessDays))
      options.freshnessDays = stored.freshnessDays;
    if (typeof stored.notes === 'string') options.notes = stored.notes;
    return options;
  } catch {
    return defaultPromptOptions;
  }
}
const sectionDescriptions = [
  'Sudut pandang & keahlian AI',
  'Pekerjaan yang harus dilakukan',
  'Detail properti & data pendukung',
  'Metode, asumsi & kriteria analisis',
  'Batas kecukupan bukti & selesai',
  'Struktur jawaban yang diharapkan',
];

export function PromptPanel({
  project,
  setProject,
  initialGoal = 'research',
  onEditProperty,
  onComparables,
  notify,
}: {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  initialGoal?: PromptGoal;
  onEditProperty: () => void;
  onComparables: (goal?: PromptGoal) => void;
  notify: (message: string) => void;
}) {
  const [options, setOptions] = useState<PromptOptions>(() => ({
    ...loadOptions(),
    goal: initialGoal,
  }));
  const [view, setView] = useState<'sections' | 'text'>('sections');
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [copyFallback, setCopyFallback] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const manualCopy = useRef<HTMLTextAreaElement>(null);
  const result = useMemo(() => buildPrompt(project, options), [project, options]);
  const p = project.property;
  const selectedGoal = promptGoals.find((g) => g.id === options.goal)!;
  const selectedComparables = project.comparables.filter((c) => c.enabled).length;
  const setToast = notify;
  const go = (_target: string) => onEditProperty();
  useEffect(() => {
    try {
      localStorage.setItem(OPTIONS_STORAGE, JSON.stringify(options));
    } catch {
      notify('Preferensi prompt belum dapat disimpan pada browser.');
    }
    setGeneratedAt(null);
    setCopyFallback(false);
  }, [project, options]);
  useEffect(() => {
    if (copyFallback) {
      manualCopy.current?.focus();
      manualCopy.current?.select();
    }
  }, [copyFallback]);
  const change = <K extends keyof PromptOptions>(key: K, value: PromptOptions[K]) =>
    setOptions((o) => ({ ...o, [key]: value }));
  const generate = () => {
    setGeneratedAt(
      new Date().toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
    preview.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setToast('Prompt siap. Salin, lalu tempel ke percakapan ChatGPT atau Claude.');
  };
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(result.text);
      setToast('Prompt berhasil disalin. Tempel ke percakapan AI Anda.');
    } catch {
      setCopyFallback(true);
      setToast('Izin clipboard tidak tersedia. Teks sudah dipilih; tekan Ctrl+C atau Command+C.');
    }
  };
  const download = (extension: 'txt' | 'md') => {
    saveBlob(
      result.text,
      `RuangNilai-prompt-${options.goal}-${today()}.${extension}`,
      'text/plain;charset=utf-8',
    );
    setToast(`Prompt ${extension.toUpperCase()} diunduh. Tinjau isinya sebelum dibagikan.`);
  };

  return (
    <div className="prompt-app prompt-integration">
      <Notice>
        {options.goal === 'land'
          ? 'Cari kavling nyata → salin CSV tanah → Analisis harga → Tempel CSV tanah. Format ini terpisah dari CSV rumah V1.'
          : options.goal === 'research'
            ? 'Gunakan prompt ini di ChatGPT/Claude dengan pencarian web. Salin hasil CSV tanpa pagar kode, lalu tempel melalui Data pembanding → Tempel CSV dari AI. Data impor tetap perlu ditinjau; bukan otomatis terverifikasi.'
            : options.goal === 'pricing'
              ? 'Prompt meminta rekomendasi harga yang kompetitif untuk acuan 180 hari, bukan jaminan terjual. Hasil AI tidak otomatis mengganti harga iklan atau estimasi lokal.'
              : 'Generator prompt adalah pendamping analisis V1. Salin prompt ke percakapan AI Anda; hasilnya tidak otomatis masuk ke aplikasi.'}
      </Notice>
      <div className="button-row prompt-bridge-actions">
        <Button variant="secondary" onClick={() => change('goal', 'research')}>
          Prompt riset pembanding
        </Button>
        <Button variant="secondary" onClick={() => change('goal', 'land')}>
          Prompt riset tanah
        </Button>
        <Button variant="secondary" onClick={() => change('goal', 'pricing')}>
          Prompt harga 180 hari
        </Button>
        <Button variant="ghost" onClick={() => onComparables(options.goal)}>
          {options.goal === 'land' ? 'Buka referensi tanah' : 'Buka data pembanding'}
          <ArrowRight size={15} />
        </Button>
      </div>
      <>
        <div className="prompt-workflow">
          <span>
            <i>1</i>Isi detail properti
          </span>
          <ChevronRight size={15} />
          <span className="current">
            <i>2</i>Susun & salin prompt
          </span>
          <ChevronRight size={15} />
          <span>
            <i>3</i>Jalankan di AI pilihan Anda
          </span>
          <Tag tone="gray">Pembanding tidak wajib</Tag>
        </div>
        <div className="prompt-layout">
          <div className="prompt-controls">
            <section className="card prompt-config">
              <div className="card-heading">
                <div>
                  <h2>
                    <SlidersHorizontal size={19} />
                    Atur prompt Anda
                  </h2>
                  <p>Sesuaikan pekerjaan yang ingin Anda berikan kepada AI.</p>
                </div>
                <span className="config-step">01</span>
              </div>
              <div className="prompt-config-body">
                <div className="control-label">Jalankan prompt di</div>
                <div className="platform-picker" aria-label="Platform AI">
                  {(['ChatGPT', 'Claude'] as const).map((platform) => (
                    <button
                      key={platform}
                      onClick={() => change('platform', platform)}
                      className={options.platform === platform ? 'chosen' : ''}
                      aria-pressed={options.platform === platform}
                      aria-label={platform}
                    >
                      <span className={`platform-symbol ${platform.toLowerCase()}`}>
                        {platform === 'ChatGPT' ? <Sparkles size={19} /> : <span>✳</span>}
                      </span>
                      <span>{platform}</span>
                      {options.platform === platform && <CheckCircle2 size={15} />}
                    </button>
                  ))}
                </div>
                <Field label="Tujuan prompt">
                  <select
                    value={options.goal}
                    onChange={(e) => change('goal', e.target.value as PromptOptions['goal'])}
                  >
                    {promptGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="goal-description">{selectedGoal.description}</p>
                <div className="prompt-subheading">Lingkup riset</div>
                <div className="prompt-scope-row">
                  <Field label="Wilayah pembanding">
                    <select
                      value={project.settings.mode}
                      onChange={(e) =>
                        setProject((s) => ({
                          ...s,
                          settings: {
                            ...s.settings,
                            mode: e.target.value as Project['settings']['mode'],
                          },
                        }))
                      }
                    >
                      <option value="area">Area / kecamatan</option>
                      <option value="cluster">Cluster / perumahan</option>
                      <option value="radius">Radius</option>
                    </select>
                  </Field>
                  {project.settings.mode === 'radius' ? (
                    <Field label="Radius (km)">
                      <select
                        value={project.settings.radius}
                        onChange={(e) =>
                          setProject((s) => ({
                            ...s,
                            settings: { ...s.settings, radius: Number(e.target.value) },
                          }))
                        }
                      >
                        {[1, 2, 3, 5, 10].map((n) => (
                          <option key={n} value={n}>
                            {n} km
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <Field label="Usia data maksimal">
                      <select
                        value={options.freshnessDays}
                        onChange={(e) => change('freshnessDays', Number(e.target.value))}
                      >
                        {[30, 90, 180, 365].map((n) => (
                          <option key={n} value={n}>
                            {n} hari
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
                {project.settings.mode === 'radius' && (
                  <Field label="Usia data maksimal">
                    <select
                      value={options.freshnessDays}
                      onChange={(e) => change('freshnessDays', Number(e.target.value))}
                    >
                      {[30, 90, 180, 365].map((n) => (
                        <option key={n} value={n}>
                          {n} hari
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <label className="prompt-check">
                  <input
                    type="checkbox"
                    checked={options.browsing}
                    onChange={(e) => change('browsing', e.target.checked)}
                  />
                  <span>
                    <strong>Minta AI melakukan riset web</strong>
                    <small>Hanya jika fitur pencarian tersedia dalam percakapan AI Anda.</small>
                  </span>
                </label>
                <div className="prompt-subheading">Konteks yang disertakan</div>
                <label className="prompt-check">
                  <input
                    type="checkbox"
                    checked={options.includeComparables}
                    onChange={(e) => change('includeComparables', e.target.checked)}
                  />
                  <span>
                    <strong>
                      Pembanding pilihan <Tag tone="gray">{selectedComparables} data</Tag>
                    </strong>
                    <small>
                      Opsional. AI diminta mencari atau meminta bukti jika belum tersedia.
                    </small>
                  </span>
                </label>
                <label className="prompt-check">
                  <input
                    type="checkbox"
                    checked={options.includeCampaigns}
                    onChange={(e) => change('includeCampaigns', e.target.checked)}
                  />
                  <span>
                    <strong>
                      Performa pemasaran <Tag tone="gray">{project.campaigns.length} periode</Tag>
                    </strong>
                    <small>Viewer, chat unik, survei, penawaran, dan catatan hambatan.</small>
                  </span>
                </label>
                <details className="privacy-options">
                  <summary>
                    <ShieldCheck size={15} />
                    Pengaturan data sensitif
                    <ChevronRight size={14} />
                  </summary>
                  <label className="prompt-check">
                    <input
                      type="checkbox"
                      checked={options.includeAddress}
                      onChange={(e) => change('includeAddress', e.target.checked)}
                    />
                    <span>
                      <strong>Sertakan alamat lengkap & koordinat</strong>
                      <small>Default hanya area dan cluster. Tinjau sebelum menyalin.</small>
                    </span>
                  </label>
                  <label className="prompt-check">
                    <input
                      type="checkbox"
                      checked={options.includePrivate}
                      onChange={(e) => change('includePrivate', e.target.checked)}
                    />
                    <span>
                      <strong>Sertakan data internal penjual</strong>
                      <small>Harga minimum, anggaran marketing, dan catatan legal internal.</small>
                    </span>
                  </label>
                  <small className="privacy-footnote">
                    Nama properti, catatan bebas, dan URL dapat tetap memuat informasi pribadi.
                    Selalu periksa teks prompt.
                  </small>
                </details>
                <Field label="Arahan tambahan (opsional)">
                  <textarea
                    value={options.notes}
                    onChange={(e) => change('notes', e.target.value)}
                    placeholder="Contoh: fokus pada Cluster Nashville, prioritaskan harga yang mengundang survei."
                    maxLength={4000}
                  />
                </Field>
                <Button onClick={generate} className="generate-button">
                  <WandSparkles size={18} />
                  Generate prompt
                  <ArrowRight size={17} />
                </Button>
                <p className="local-generation">
                  <ShieldCheck size={12} />
                  Dibuat di browser. Tidak memanggil API AI.
                </p>
              </div>
            </section>
            <section className="card prompt-property-summary">
              <div className="summary-icon">
                <House size={21} />
              </div>
              <div>
                <small>PROPERTI DALAM KONTEKS</small>
                <h3>{p.title || 'Belum ada detail properti'}</h3>
                <p>
                  <MapPin size={12} />
                  {[p.area, p.cluster].filter(Boolean).join(' · ') ||
                    'Isi area untuk riset yang lebih terarah'}
                </p>
                <div className="property-summary-stats">
                  <span>{p.kind || 'Rumah tapak'}</span>
                  {p.land > 0 && <span>LT {p.land} m²</span>}
                  {p.building > 0 && <span>LB {p.building} m²</span>}
                </div>
                <button className="text-link" onClick={() => go('property')}>
                  {p.title ? 'Ubah detail properti' : 'Isi detail properti'}
                  <ArrowRight size={14} />
                </button>
              </div>
            </section>
          </div>

          <div ref={preview} className="prompt-preview-column">
            <section className="card prompt-preview">
              <div className="prompt-preview-heading">
                <div>
                  <span className="preview-eyebrow">
                    <span className="tiny-dot" />
                    {generatedAt ? `SIAP DISALIN · ${generatedAt} WIB` : 'PRATINJAU OTOMATIS'}
                  </span>
                  <h2>Prompt Anda, siap digunakan.</h2>
                  <p>Enam bagian yang jelas untuk jawaban AI yang lebih terarah.</p>
                </div>
                <div className="prompt-badge">
                  <FileText size={22} />
                </div>
              </div>
              <div className="prompt-preview-toolbar">
                <div className="preview-tabs" role="tablist" aria-label="Tampilan prompt">
                  <button
                    role="tab"
                    aria-selected={view === 'sections'}
                    onClick={() => setView('sections')}
                  >
                    Terstruktur
                  </button>
                  <button
                    role="tab"
                    aria-selected={view === 'text'}
                    onClick={() => setView('text')}
                  >
                    Teks lengkap
                  </button>
                </div>
                <span>
                  {result.text.split(/\s+/).length.toLocaleString('id-ID')} kata · 6 bagian
                </span>
              </div>
              <div
                className="prompt-document"
                role="tabpanel"
                aria-label={view === 'sections' ? 'Prompt terstruktur' : 'Teks prompt lengkap'}
              >
                {view === 'sections' ? (
                  result.sections.map((s, i) => (
                    <section className="prompt-section" key={s.title}>
                      <div className="prompt-section-title">
                        <span>{String(i + 1).padStart(2, '0')}</span>
                        <h3>{s.title}</h3>
                        <small>{sectionDescriptions[i]}</small>
                      </div>
                      <div
                        className={`prompt-section-body ${s.title === 'Context' ? 'context-code' : ''}`}
                      >
                        {s.body}
                      </div>
                    </section>
                  ))
                ) : (
                  <textarea
                    aria-label="Teks prompt lengkap"
                    className="full-prompt"
                    value={result.text}
                    readOnly
                    spellCheck={false}
                  />
                )}
              </div>
              <div className="prompt-export-bar">
                <div>
                  <CheckCheck size={15} />
                  <span>Siap untuk {options.platform}</span>
                </div>
                <Button variant="secondary" onClick={() => download('txt')}>
                  <ArrowDownToLine size={15} />
                  Unduh TXT
                </Button>
                <Button onClick={copy}>
                  <Copy size={16} />
                  Salin prompt
                </Button>
              </div>
            </section>
            {result.warnings.length > 0 && (
              <div className="prompt-warnings">
                <ShieldCheck size={17} />
                <div>
                  <strong>Tinjau sebelum digunakan</strong>
                  <ul>
                    {result.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <section className="handoff-card">
              <span className="handoff-icon">
                <MessageCircle size={23} />
              </span>
              <div>
                <h3>Lanjutkan di {options.platform}</h3>
                <p>
                  Salin prompt → buka percakapan baru → aktifkan pencarian web bila tersedia →
                  tempel dan kirim.
                </p>
              </div>
              <a
                className="button secondary"
                href={
                  options.platform === 'ChatGPT' ? 'https://chatgpt.com/' : 'https://claude.ai/new'
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka {options.platform}
                <ExternalLink size={14} />
              </a>
            </section>
            <p className="handoff-note">
              Membuka AI tidak mengirim prompt secara otomatis. Foto diunggah terpisah, dan hasil AI
              tidak otomatis kembali ke aplikasi.
            </p>
          </div>
        </div>
      </>{' '}
      {copyFallback && (
        <Modal
          title="Salin prompt secara manual"
          subtitle="Tekan Ctrl+C (Windows) atau Command+C (Mac), lalu tempel ke percakapan AI."
          close={() => setCopyFallback(false)}
        >
          <textarea
            ref={manualCopy}
            aria-label="Prompt untuk disalin manual"
            className="manual-copy"
            readOnly
            value={result.text}
          />
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => download('txt')}>
              <ArrowDownToLine size={16} />
              Unduh TXT
            </Button>
            <Button onClick={() => setCopyFallback(false)}>Selesai</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
