import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  House,
  Layers3,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  analyze,
  compact,
  demoProject,
  emptyProject,
  shortDate,
  today,
  type Project,
} from './domain';
import {
  buildPrompt,
  defaultPromptOptions,
  promptGoals,
  sectionNames,
  type PromptOptions,
} from './prompts';
import { Button, Empty, Field, Modal, Notice, Tag, saveBlob } from './ui';
import { CampaignModal, Comparables, PropertyForm } from './inputs';

type Page = 'generator' | 'property' | 'comparables' | 'campaigns' | 'guide';
const navigation = [
  { id: 'generator', label: 'Generator prompt', icon: WandSparkles },
  { id: 'property', label: 'Detail properti', icon: House },
  { id: 'comparables', label: 'Pembanding opsional', icon: Layers3 },
  { id: 'campaigns', label: 'Performa pemasaran', icon: Target },
  { id: 'guide', label: 'Cara menggunakan', icon: BookOpen },
] as const;
const STORAGE = 'ruangnilai.project.v1';
const OPTIONS_STORAGE = 'ruangnilai.prompt.v1';
function loadProject(): Project {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    if (
      p?.version === 1 &&
      typeof p.demo === 'boolean' &&
      typeof p.property?.title === 'string' &&
      Array.isArray(p.comparables) &&
      Array.isArray(p.campaigns) &&
      p.settings &&
      Array.isArray(p.priceHistory)
    )
      return { ...p, property: { ...emptyProject().property, ...p.property } };
  } catch {
    /* A missing or damaged record never becomes invented property data. */
  }
  return emptyProject();
}
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

export default function App() {
  const [project, setProject] = useState<Project>(loadProject);
  const [options, setOptions] = useState<PromptOptions>(loadOptions);
  const [page, setPage] = useState<Page>('generator');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modal, setModal] = useState<'new' | 'settings' | 'privacy' | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [view, setView] = useState<'sections' | 'text'>('sections');
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [copyFallback, setCopyFallback] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const manualCopy = useRef<HTMLTextAreaElement>(null);
  const result = useMemo(() => buildPrompt(project, options), [project, options]);
  const p = project.property;
  const selectedGoal = promptGoals.find((g) => g.id === options.goal)!;
  const selectedComparables = project.comparables.filter((c) => c.enabled).length;
  const latest = [...project.campaigns].sort((a, b) => b.end.localeCompare(a.end))[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(project));
      localStorage.setItem(OPTIONS_STORAGE, JSON.stringify(options));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    setGeneratedAt(null);
    setCopyFallback(false);
  }, [project, options]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 5500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (copyFallback) {
      manualCopy.current?.focus();
      manualCopy.current?.select();
    }
  }, [copyFallback]);

  const go = (target: Page) => {
    setPage(target);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
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
  const openEvaluation = () => {
    change('goal', 'evaluation');
    go('generator');
  };

  return (
    <div className="app-shell prompt-app">
      {mobileMenu && <div className="sidebar-scrim" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go('generator');
          }}
        >
          <span className="brand-mark">
            <House size={25} strokeWidth={1.8} />
          </span>
          <span>
            ruang<span className="brand-light">nilai</span>
            <small>PROPERTY PROMPT STUDIO</small>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE ANDA</div>
        <button className="workspace-switch" onClick={() => setModal('settings')}>
          <span className="workspace-icon">
            <Sparkles size={17} />
          </span>
          <span>
            Prompt Studio<small>Untuk ChatGPT & Claude</small>
          </span>
          <Tag tone="green">V2</Tag>
        </button>
        <div className="nav-label">DARI DATA MENJADI PROMPT</div>
        <nav aria-label="Navigasi utama">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              aria-current={page === id ? 'page' : undefined}
              onClick={() => go(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === 'comparables' && project.comparables.length > 0 && (
                <span className="nav-count">{project.comparables.length}</span>
              )}
              {page === id && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon">
              <MessageCircle size={21} />
            </div>
            <h4>AI pilihan Anda. Konteks tepat.</h4>
            <p>Siapkan prompt di sini, lalu jalankan analisis di percakapan AI Anda.</p>
            <button onClick={() => go('guide')}>
              Lihat cara menggunakan <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setModal('settings')}>
            <Settings2 size={18} />
            Data & pengaturan
          </button>
          <button className="nav-item" onClick={() => setModal('privacy')}>
            <ShieldCheck size={18} />
            Privasi prompt
          </button>
          <div className="sidebar-footer">
            <span className="status-dot" />
            Tanpa API key · Data di browser
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-toggle"
              aria-label="Buka navigasi"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <House size={15} />
            <span>Prompt Studio</span>
            <ChevronRight size={13} />
            <strong>{navigation.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="top-date">
              <CalendarDays size={15} />
              {shortDate(today())}
            </span>
            <Tag tone="green">PROMPT GENERATOR · V2</Tag>
            <button
              className="avatar"
              aria-label="Pengaturan data lokal"
              onClick={() => setModal('settings')}
            >
              <ShieldCheck size={15} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading prompt-page-heading">
            <div>
              <div className="eyebrow">
                <span /> RUANGNILAI / PROPERTY PROMPT STUDIO
              </div>
              <h1>
                {
                  {
                    generator: 'Konteks lengkap. Prompt yang tepat.',
                    property: 'Ceritakan properti Anda.',
                    comparables: 'Tambahkan bukti jika tersedia.',
                    campaigns: 'Ubah respons pasar menjadi konteks.',
                    guide: 'Dari detail rumah ke percakapan AI.',
                  }[page]
                }
              </h1>
              <p>
                {
                  {
                    generator:
                      'Susun instruksi analisis properti, siap disalin ke ChatGPT atau Claude.',
                    property:
                      'Detail ini menjadi Context dalam prompt, bukan permintaan pencarian otomatis.',
                    comparables:
                      'Pembanding bersifat opsional. Anda tetap bisa membuat prompt tanpa mengisinya.',
                    campaigns:
                      'Catat performa untuk menyusun prompt evaluasi dan strategi berikutnya.',
                    guide:
                      'Aplikasi menyusun prompt. AI pilihan Anda yang menjalankan riset dan analisisnya.',
                  }[page]
                }
              </p>
            </div>
            <div className="heading-actions">
              <Button variant="secondary" onClick={() => setModal('new')}>
                <Plus size={16} />
                Properti baru
              </Button>
              <Button
                variant="secondary"
                onClick={() => go(page === 'guide' ? 'generator' : 'guide')}
              >
                <BookOpen size={16} />
                {page === 'guide' ? 'Buka generator' : 'Panduan'}
              </Button>
            </div>
          </div>
          {storageError && (
            <div className="error-message" role="alert">
              Penyimpanan browser tidak tersedia atau penuh. Data belum tersimpan. Cadangkan lewat
              Data & pengaturan sebelum menutup halaman.
            </div>
          )}
          {project.demo && (
            <div className="demo-banner">
              <span>
                <Sparkles size={15} />
                <strong>Data contoh / simulasi.</strong> Prompt akan memberi label simulasi; ganti
                dengan data properti nyata untuk analisis Anda.
              </span>
              <button onClick={() => setModal('new')}>
                Isi properti Anda <ArrowRight size={14} />
              </button>
            </div>
          )}

          {page === 'generator' && (
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
                          <small>
                            Hanya jika fitur pencarian tersedia dalam percakapan AI Anda.
                          </small>
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
                            Performa pemasaran{' '}
                            <Tag tone="gray">{project.campaigns.length} periode</Tag>
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
                            <small>
                              Harga minimum, anggaran marketing, dan catatan legal internal.
                            </small>
                          </span>
                        </label>
                        <small className="privacy-footnote">
                          Nama properti, catatan bebas, dan URL dapat tetap memuat informasi
                          pribadi. Selalu periksa teks prompt.
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
                      aria-label={
                        view === 'sections' ? 'Prompt terstruktur' : 'Teks prompt lengkap'
                      }
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
                        options.platform === 'ChatGPT'
                          ? 'https://chatgpt.com/'
                          : 'https://claude.ai/new'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Buka {options.platform}
                      <ExternalLink size={14} />
                    </a>
                  </section>
                  <p className="handoff-note">
                    Membuka AI tidak mengirim prompt secara otomatis. Foto diunggah terpisah, dan
                    hasil AI tidak otomatis kembali ke aplikasi.
                  </p>
                </div>
              </div>
            </>
          )}

          {page === 'property' && (
            <PropertyForm
              key={JSON.stringify(p)}
              property={p}
              save={(value) => {
                setProject((s) => ({ ...s, property: value }));
                go('generator');
                setToast('Detail properti disimpan. Context dalam prompt sudah diperbarui.');
              }}
            />
          )}
          {page === 'comparables' && (
            <>
              <Notice>
                Tidak wajib mengisi pembanding untuk membuat prompt. Jika belum ada, aktifkan
                permintaan riset web di generator; kemampuan dan akses sumber mengikuti ChatGPT atau
                Claude yang Anda gunakan. Form pembanding terstruktur ini untuk rumah; data jenis
                lain dapat Anda tuliskan di arahan tambahan.
              </Notice>
              <div className="optional-comparables">
                <Comparables
                  project={project}
                  analysis={analyze(project)}
                  update={setProject}
                  notify={setToast}
                />
              </div>
            </>
          )}
          {page === 'campaigns' && (
            <>
              <section className="card campaign-intro">
                <div>
                  <span className="section-icon">
                    <Target size={23} />
                  </span>
                  <h2>Berikan respons nyata kepada AI.</h2>
                  <p>
                    Tidak ada harga otomatis yang perlu ditunggu. Data ini akan masuk ke bagian
                    Context saat Anda membuat prompt evaluasi.
                  </p>
                </div>
                <div className="button-row">
                  <Button variant="secondary" onClick={() => setShowLog(true)}>
                    <Plus size={16} />
                    Catat performa
                  </Button>
                  <Button onClick={openEvaluation}>
                    <WandSparkles size={16} />
                    Buat prompt evaluasi
                  </Button>
                </div>
              </section>
              <div className="campaign-metrics">
                {[
                  { label: 'Periode tercatat', value: project.campaigns.length },
                  { label: 'Viewer periode terakhir', value: latest ? latest.views : '—' },
                  { label: 'Chat unik terakhir', value: latest ? latest.chats : '—' },
                  { label: 'Survei terlaksana terakhir', value: latest ? latest.visits : '—' },
                ].map((m) => (
                  <div className="card" key={m.label}>
                    <span>{m.label}</span>
                    <strong>{m.value}</strong>
                  </div>
                ))}
              </div>
              <section className="card">
                <div className="card-heading">
                  <div>
                    <h2>Catatan per periode</h2>
                    <p>Periode tidak tumpang tindih dan menggunakan satu harga yang konsisten.</p>
                  </div>
                  <Button variant="secondary" onClick={() => setShowLog(true)}>
                    <Plus size={16} />
                    Tambah periode
                  </Button>
                </div>
                {project.campaigns.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>PERIODE / KANAL</th>
                          <th>HARGA DIUJI</th>
                          <th>VIEWER</th>
                          <th>CHAT</th>
                          <th>SURVEI</th>
                          <th>PENAWARAN</th>
                          <th aria-label="Hapus" />
                        </tr>
                      </thead>
                      <tbody>
                        {[...project.campaigns]
                          .sort((a, b) => b.end.localeCompare(a.end))
                          .map((c) => (
                            <tr key={c.id}>
                              <td>
                                <strong>
                                  {shortDate(c.start)} – {shortDate(c.end)}
                                </strong>
                                <small>
                                  {c.channel} · {c.objection}
                                </small>
                                {c.notes && <small>{c.notes}</small>}
                              </td>
                              <td>{compact(c.price)}</td>
                              <td>{c.views}</td>
                              <td>{c.chats}</td>
                              <td>
                                <strong>{c.visits} terlaksana</strong>
                                <small>{c.scheduled} dijadwalkan</small>
                              </td>
                              <td>{c.offers}</td>
                              <td>
                                <button
                                  className="icon-button delete"
                                  aria-label="Hapus periode"
                                  onClick={() => {
                                    if (window.confirm('Hapus catatan periode ini?'))
                                      setProject((s) => ({
                                        ...s,
                                        campaigns: s.campaigns.filter((x) => x.id !== c.id),
                                      }));
                                  }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Belum ada catatan performa"
                    text="Anda tetap bisa membuat prompt strategi. Untuk evaluasi respons nyata, tambahkan hasil periode pemasaran terlebih dahulu."
                  />
                )}
              </section>
              <div className="campaign-settings card">
                <Field label="Sasaran survei per chat">
                  <select
                    value={project.settings.visitTarget}
                    onChange={(e) =>
                      setProject((s) => ({
                        ...s,
                        settings: { ...s.settings, visitTarget: Number(e.target.value) },
                      }))
                    }
                  >
                    {[0.25, 0.4, 0.5, 0.6, 0.75].map((n) => (
                      <option key={n} value={n}>
                        {Math.round(n * 100)}%
                      </option>
                    ))}
                  </select>
                </Field>
                <p>
                  Patokan operasional, bukan bukti harga pasti tepat. Prompt meminta AI
                  mempertimbangkan ukuran sampel, alasan penolakan, dan kesiapan pembeli.
                </p>
              </div>
            </>
          )}
          {page === 'guide' && (
            <>
              <section className="card guide-hero">
                <span className="section-icon">
                  <WandSparkles size={25} />
                </span>
                <h2>Anda membawa data. Prompt memberi arah.</h2>
                <p>
                  RuangNilai kini menyusun instruksi untuk AI pilihan Anda. Tidak perlu API key atau
                  backend AI, dan tidak perlu mengisi 3 pembanding untuk mulai.
                </p>
                <Button onClick={() => go('generator')}>
                  Mulai susun prompt
                  <ArrowRight size={16} />
                </Button>
              </section>
              <div className="guide-steps">
                {[
                  {
                    title: 'Isi atau perbarui detail properti',
                    text: 'Data dari versi sebelumnya tetap memakai penyimpanan yang sama. Alamat lengkap dan data internal tidak disertakan secara default.',
                  },
                  {
                    title: 'Pilih tujuan dan platform AI',
                    text: 'Pilih analisis lengkap, harga, evaluasi iklan, strategi 180 hari, materi iklan, atau laporan. Tentukan apakah AI diminta melakukan riset web.',
                  },
                  {
                    title: 'Generate, tinjau, dan salin prompt',
                    text: 'Periksa keenam bagian dan peringatan data. Pembanding dan performa opsional. Foto tidak tertanam dalam teks prompt.',
                  },
                  {
                    title: 'Tempel di ChatGPT atau Claude',
                    text: 'Buka percakapan baru. Aktifkan pencarian web jika tersedia pada akun Anda, tempel prompt, lalu kirim. Tidak ada prompt atau data yang dikirim otomatis oleh aplikasi ini.',
                  },
                  {
                    title: 'Tinjau jawaban dan lanjutkan evaluasi',
                    text: 'Periksa sumber, tanggal, dan asumsi AI. Jika bukti harga belum cukup, lengkapi data yang diminta. Setelah iklan berjalan, catat performa lalu buat prompt evaluasi baru.',
                  },
                ].map((item, i) => (
                  <section key={item.title} className="card guide-step">
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </section>
                ))}
              </div>
              <section className="card prompt-structure">
                <div className="card-heading">
                  <h2>Format prompt yang digunakan</h2>
                  <Tag>6 BAGIAN</Tag>
                </div>
                <div>
                  {sectionNames.map((name, i) => (
                    <div key={name}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      <strong>{name}</strong>
                      <p>{sectionDescriptions[i]}</p>
                    </div>
                  ))}
                </div>
              </section>
              <Notice>
                Reasoning meminta ringkasan metode dan perhitungan yang dapat ditinjau, bukan proses
                berpikir internal AI. AI tidak boleh mengarang data, menjamin penjualan 180 hari,
                atau mengklaim telah membuat file PDF/slide jika fitur percakapannya tidak
                mendukung.
              </Notice>
            </>
          )}

          <footer className="main-footer">
            <span>
              RuangNilai Prompt Studio <i /> Konteks tepat. Analisis lebih terarah.
            </span>
            <span>
              <ShieldCheck size={13} />
              Prompt disusun lokal · Tidak ada panggilan API AI
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button aria-label="Tutup pemberitahuan" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
      {showLog && (
        <CampaignModal
          project={project}
          close={() => setShowLog(false)}
          save={(c) => {
            setProject((s) => ({ ...s, campaigns: [...s.campaigns, c] }));
            setShowLog(false);
            setToast('Performa tersimpan dan siap disertakan ke prompt.');
          }}
        />
      )}
      {modal === 'new' && (
        <Modal
          title="Mulai properti baru"
          subtitle="Data saat ini akan diganti pada browser ini."
          close={() => setModal(null)}
        >
          <p>
            Cadangkan data yang masih diperlukan melalui Data & pengaturan. Properti baru dimulai
            kosong; aplikasi tidak menambahkan pembanding simulasi.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setModal(null)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                setProject(emptyProject());
                setModal(null);
                go('property');
              }}
            >
              Mulai properti kosong
              <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
      {modal === 'privacy' && (
        <Modal title="Tinjau sebelum membagikan prompt" close={() => setModal(null)}>
          <div className="help-steps">
            {[
              'Alamat lengkap dan koordinat tidak disertakan secara default. Area dan cluster tetap dipakai untuk konteks riset.',
              'Harga minimum internal, anggaran marketing, dan catatan legal internal hanya masuk jika Anda mencentang pilihannya.',
              'Nama properti, catatan, dan URL sumber bisa memuat data pribadi. Penyaringan pilihan tidak menyamarkan semua isi teks bebas.',
              'Foto tidak disalin. Jika diperlukan, unggah sendiri ke percakapan AI setelah meninjau privasinya.',
              'Aplikasi tidak mengirim data ke ChatGPT atau Claude. Data baru dibagikan saat Anda menempel dan mengirim prompt di layanan tersebut.',
            ].map((text, i) => (
              <div key={text}>
                <span>{i + 1}</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => setModal(null)}>
            Mengerti
            <Check size={16} />
          </Button>
        </Modal>
      )}
      {modal === 'settings' && (
        <Modal
          title="Data & pengaturan"
          subtitle="Penyimpanan lokal, kompatibel dengan data RuangNilai versi sebelumnya."
          close={() => setModal(null)}
        >
          <Notice>
            Data berada pada browser dan alamat situs ini. Tidak ada akun cloud atau sinkronisasi
            otomatis. Cadangkan sebelum menghapus data browser atau mengganti perangkat.
          </Notice>
          <div className="settings-row">
            <div>
              <strong>Cadangkan data properti</strong>
              <p>JSON lengkap termasuk data internal penjual. Simpan secara pribadi.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                saveBlob(
                  JSON.stringify(project, null, 2),
                  `RuangNilai-cadangan-${today()}.json`,
                  'application/json',
                )
              }
            >
              <ArrowDownToLine size={16} />
              Cadangkan
            </Button>
          </div>
          <div className="settings-row">
            <div>
              <strong>Unduh prompt Markdown</strong>
              <p>Isi sama dengan pratinjau prompt dan mengikuti pilihan privasi.</p>
            </div>
            <Button variant="secondary" onClick={() => download('md')}>
              <FileText size={16} />
              Markdown
            </Button>
          </div>
          <div className="settings-row">
            <div>
              <strong>Buka contoh simulasi</strong>
              <p>Mengganti proyek saat ini. Cadangkan terlebih dahulu.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (window.confirm('Ganti data saat ini dengan contoh simulasi?')) {
                  setProject(demoProject());
                  setModal(null);
                  go('generator');
                }
              }}
            >
              Lihat contoh
            </Button>
          </div>
          <div className="settings-row">
            <div>
              <strong>Hapus data properti</strong>
              <p>Data diganti formulir kosong. Tidak dapat dibatalkan.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (window.confirm('Hapus data properti dari browser ini?')) {
                  setProject(emptyProject());
                  setOptions(defaultPromptOptions);
                  setModal(null);
                  go('property');
                }
              }}
            >
              <Trash2 size={16} />
              Hapus
            </Button>
          </div>
        </Modal>
      )}
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
