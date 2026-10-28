import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Bath,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Download,
  Eye,
  FileBarChart2,
  FileText,
  House,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  analyze,
  analyzeMarket,
  compact,
  demoProject,
  emptyProject,
  evaluate,
  insights,
  phases,
  rupiah,
  shortDate,
  today,
  type Analysis,
  type Project,
  type Property,
} from './domain';
import { exportPdf, exportSlides } from './reports';
import { PropertyForm, Comparables, CampaignModal } from './inputs';
import { Button, Tag, Empty, Notice, Modal, saveBlob } from './ui';
import { PromptPanel } from './PromptPanel';
import { AnalysisReadiness } from './AnalysisReadiness';
import { CostPanel } from './CostPanel';
import { costReportLines } from './cost';
import { formatRooms } from './rooms';
import type { PromptGoal } from './prompts';

type Page =
  'overview' | 'property' | 'comparables' | 'pricing' | 'strategy' | 'reports' | 'prompts';
const navigation: { id: Page; label: string; icon: typeof House }[] = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'property', label: 'Detail properti', icon: House },
  { id: 'comparables', label: 'Data pembanding', icon: Layers3 },
  { id: 'pricing', label: 'Analisis harga', icon: BarChart3 },
  { id: 'strategy', label: 'Strategi penjualan', icon: Target },
  { id: 'reports', label: 'Laporan & presentasi', icon: FileBarChart2 },
  { id: 'prompts', label: 'Generator prompt AI', icon: Sparkles },
];
const STORAGE = 'ruangnilai.project.v1';
function loadProject(): Project {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    if (
      p?.version === 1 &&
      typeof p.demo === 'boolean' &&
      p.property &&
      Array.isArray(p.comparables) &&
      Array.isArray(p.campaigns) &&
      p.settings &&
      Array.isArray(p.priceHistory)
    )
      return p;
  } catch {
    /* damaged storage falls back to clearly labelled demo */
  }
  return emptyProject();
}
function HouseArt() {
  return (
    <svg
      className="house-art"
      viewBox="0 0 520 320"
      role="img"
      aria-label="Ilustrasi rumah dua lantai, bukan foto properti"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#dce8dc" />
          <stop offset="1" stopColor="#eff0df" />
        </linearGradient>
        <linearGradient id="wall">
          <stop stopColor="#eae6d7" />
          <stop offset="1" stopColor="#d0d2bc" />
        </linearGradient>
        <pattern id="slats" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="3" height="9" fill="#98775a" />
        </pattern>
      </defs>
      <rect width="520" height="320" fill="url(#sky)" />
      <circle cx="425" cy="55" r="32" fill="#f6f1d4" />
      <path d="M0 242Q105 219 244 240T520 231V320H0" fill="#9da98b" />
      <path d="M73 272 215 222 496 268 366 320H80" fill="#c8c9b5" />
      <path d="M131 95 324 65 428 105 234 138Z" fill="#5c6b5e" />
      <path d="M234 138 428 105V252L234 281Z" fill="#d3d5c5" />
      <path d="M131 95 234 138V281L131 237Z" fill="url(#wall)" />
      <path d="M120 89 323 56 440 101 428 111 324 73 130 105Z" fill="#4d5e52" />
      <path d="M251 151 331 138V197L251 208Z" fill="#57746a" />
      <path d="M258 154 324 144V188L258 198Z" fill="#a9c4b6" />
      <path d="m290 149 1 44" stroke="#d8dfce" strokeWidth="4" />
      <path d="M349 134 401 125V186L349 193Z" fill="url(#slats)" />
      <path d="m151 121 57 25v52l-57-25Z" fill="#6b8174" />
      <path d="m162 129 36 16v40l-36-16Z" fill="#adc4b2" />
      <path d="m180 138 0 38" stroke="#dce1cf" strokeWidth="3" />
      <path d="m244 218 184-29v15l-184 30-112-47v-14Z" fill="#f5f2e8" />
      <path d="m257 232 54-8v44l-54 8Z" fill="#5a6658" />
      <path d="m322 221 81-13v46l-81 13Z" fill="#a0b3a5" />
      <path d="m349 216 0 45m27-49v45" stroke="#e5e8db" strokeWidth="4" />
      <path d="m142 197 63 26v43l-63-27Z" fill="url(#slats)" />
      <path d="m233 282 201-30v9l-201 31-108-45v-10Z" fill="#b6b8a5" />
      <path d="M28 250V139m-14 45 14 17m17-39-17 20" stroke="#788566" strokeWidth="7" />
      <ellipse cx="31" cy="140" rx="37" ry="58" fill="#718969" />
      <ellipse cx="10" cy="157" rx="26" ry="34" fill="#839877" />
      <ellipse cx="486" cy="225" rx="32" ry="57" fill="#819373" />
      <path d="M486 283v-75" stroke="#6d7b5b" strokeWidth="5" />
      <path d="M256 292 322 281 367 320h-74Z" fill="#e0dfce" />
      <ellipse cx="113" cy="267" rx="28" ry="13" fill="#738665" />
      <ellipse cx="444" cy="268" rx="31" ry="12" fill="#6d845e" />
      <path d="m70 285 30 5m-54 0 22 5" stroke="#a9b295" strokeWidth="2" />
    </svg>
  );
}

export default function App() {
  const [project, setProject] = useState<Project>(loadProject);
  const [page, setPage] = useState<Page>('overview');
  const [promptGoal, setPromptGoal] = useState<PromptGoal>('research');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modal, setModal] = useState<'new' | 'help' | 'settings' | 'notifications' | null>(null);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [exporting, setExporting] = useState('');
  const a = analyze(project);
  const market = analyzeMarket(project);
  const isCost = a.method === 'cost';
  const e = evaluate(project, a);
  const p = project.property;
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(project));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [project]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const go = (next: Page) => {
    setPage(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openPrompt = (goal: PromptGoal) => {
    setPromptGoal(goal);
    go('prompts');
  };
  const updateProperty = (value: Property) => {
    setProject((s) => ({ ...s, property: value }));
    setToast('Detail properti disimpan. Analisis telah diperbarui.');
    go('overview');
  };
  const download = async (format: string) => {
    setExporting(format);
    try {
      if (format === 'PDF') await exportPdf(project);
      else await exportSlides(project);
      setToast(`${format} berhasil dibuat dan siap diunduh.`);
    } catch {
      setToast('Laporan gagal dibuat. Coba kembali.');
    } finally {
      setExporting('');
    }
  };
  return (
    <div className="app-shell">
      {mobileMenu && <div className="sidebar-scrim" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <a
          className="brand"
          href="#"
          onClick={(ev) => {
            ev.preventDefault();
            go('overview');
          }}
        >
          <span className="brand-mark">
            <House size={25} strokeWidth={1.8} />
          </span>
          <span>
            ruang<span className="brand-light">nilai</span>
            <small>PROPERTY ANALYSIS + PROMPTS</small>
          </span>
        </a>
        <div className="workspace-label">RUANG KERJA</div>
        <button className="workspace-switch" onClick={() => setModal('settings')}>
          <span className="workspace-icon">
            <Building2 size={17} />
          </span>
          <span>
            Workspace pribadi<small>Analisis properti Anda</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">ANALISIS PROPERTI</div>
        <nav aria-label="Navigasi utama">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              aria-label={label}
              aria-current={page === id ? 'page' : undefined}
              onClick={() => go(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === 'comparables' && (
                <span className="nav-count">{project.comparables.length}</span>
              )}
              {page === id && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon">
              <Sparkles size={20} />
            </div>
            <h4>Setiap rumah punya nilai.</h4>
            <p>Temukan harga yang tepat dengan keputusan berbasis data.</p>
            <button onClick={() => setModal('help')}>
              Kenali cara kerjanya <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setModal('settings')}>
            <Settings2 size={19} />
            Pengaturan workspace
          </button>
          <button className="nav-item" onClick={() => setModal('help')}>
            <CircleHelp size={19} />
            Panduan & bantuan
          </button>
          <div className="sidebar-footer">
            <span className="status-dot" /> Data tersimpan di perangkat ini
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
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{navigation.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="top-date">
              <CalendarDays size={15} />
              {shortDate(today())}
            </span>
            <Tag tone="green">V1 + TANAH/BANGUNAN</Tag>
            <span className="top-divider" />
            <button
              className="notification-button"
              aria-label="Lihat notifikasi"
              onClick={() => setModal('notifications')}
            >
              <Bell size={18} />
              <span />
            </button>
            <button
              className="avatar"
              aria-label="Pengaturan pengguna"
              onClick={() => setModal('settings')}
            >
              AP
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> PROPERTY ANALYSIS + AI PROMPTS
              </div>
              <h1>
                {page === 'overview'
                  ? 'Keputusan tepat dimulai di sini.'
                  : navigation.find((n) => n.id === page)?.label}
              </h1>
              <p>
                {
                  {
                    overview:
                      'Kenali nilai rumah Anda. Susun langkah penjualan dengan lebih percaya diri.',
                    property:
                      'Detail yang lengkap membantu menghasilkan pembanding yang lebih relevan.',
                    comparables: 'Bangun dasar analisis dari sumber yang dapat ditelusuri.',
                    pricing:
                      'Harga yang dapat dijelaskan, dengan bukti dan keterbatasan yang terlihat.',
                    strategy: 'Ukur respons pasar. Ambil langkah berikutnya berdasarkan bukti.',
                    reports: 'Ubah analisis Anda menjadi laporan yang siap dibagikan.',
                    prompts:
                      'Pendamping V1: cari pembanding siap impor dan tinjau harga untuk acuan penjualan 180 hari.',
                  }[page]
                }
              </p>
            </div>
            <div className="heading-actions">
              <Button variant="secondary" onClick={() => setModal('new')}>
                <Plus size={16} />
                Analisis baru
              </Button>
              <Button
                onClick={() => (page === 'reports' ? download('PDF') : go('reports'))}
                disabled={!!exporting}
              >
                {exporting ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}
                Unduh laporan
              </Button>
            </div>
          </div>
          {project.demo && (
            <div className="demo-banner">
              <span>
                <Sparkles size={15} />
                <strong>Anda sedang melihat contoh analisis.</strong> Semua properti, harga, dan
                performa merupakan data simulasi.
              </span>
              <button onClick={() => setModal('new')}>
                Mulai dengan data Anda <ArrowRight size={14} />
              </button>
            </div>
          )}
          {storageError && (
            <div role="alert" className="error-message">
              Penyimpanan perangkat penuh atau diblokir. Perubahan belum tersimpan; unduh cadangan
              melalui Pengaturan sebelum menutup halaman.
            </div>
          )}
          {page === 'overview' && (
            <>
              <div className="section-line">
                <h2>
                  Ringkasan properti <Tag tone="gray">{p.kind || 'Rumah tapak'}</Tag>
                </h2>
                <span className="saved-label">
                  <CheckCheck size={14} />
                  {storageError ? 'Belum tersimpan' : 'Tersimpan di perangkat'}
                </span>
              </div>
              {!isCost && project.comparables.length > 0 && a.suggested === null && (
                <AnalysisReadiness
                  project={project}
                  analysis={a}
                  onReview={() => go('comparables')}
                />
              )}
              {!isCost && project.comparables.length === 0 && (
                <section className="card v1-prompt-bridge">
                  <div>
                    <h2>Harga belum tersedia? Mulai dari data pembanding.</h2>
                    <p>
                      Detail properti Anda tetap tersimpan. Gunakan prompt AI untuk mencari
                      pembanding, lalu impor hasil CSV agar estimasi V1 dapat dihitung.
                    </p>
                  </div>
                  <Button onClick={() => openPrompt('research')}>
                    <Sparkles size={16} />
                    Cari pembanding dengan prompt AI
                  </Button>
                </section>
              )}
              <section className="card v1-prompt-bridge">
                <div>
                  <h2>
                    {isCost
                      ? 'Metode aktif: tanah + bangunan'
                      : 'Baru: hitung nilai tanah + bangunan'}
                  </h2>
                  <p>
                    {isCost
                      ? a.suggested
                        ? 'Hasil memakai asumsi tersimpan. Tinjau penyusutan dan koreksi sebelum menetapkan harga iklan.'
                        : a.issues.join(' ')
                      : 'Gunakan harga tanah per m², biaya bangun baru, umur, kondisi, tusuk sate, dan banjir. Data V1 Anda tetap tersimpan.'}
                  </p>
                </div>
                <Button onClick={() => go('pricing')}>Atur metode tanah + bangunan</Button>
              </section>
              <div className="hero-grid">
                <section className="property-card card">
                  <div className="property-art">
                    {p.photos[0] ? (
                      <img src={p.photos[0]} alt="Foto rumah dari pengguna" />
                    ) : (
                      <HouseArt />
                    )}
                    <span className="image-label">
                      <House size={12} />
                      {p.photos[0] ? 'Foto pemilik' : 'Ilustrasi properti'}
                    </span>
                    <span className="property-type">{(p.kind || 'Rumah tapak').toUpperCase()}</span>
                  </div>
                  <div className="property-overview">
                    <div className="property-title-line">
                      <Tag tone="green">
                        <span className="tiny-dot" />
                        Analisis aktif
                      </Tag>
                      <button className="text-link" onClick={() => go('property')}>
                        Lihat detail <ArrowUpRight size={14} />
                      </button>
                    </div>
                    <h2>{p.title || 'Properti baru Anda'}</h2>
                    <p className="address">
                      <MapPin size={14} />
                      {p.address || 'Lengkapi alamat untuk memulai analisis'}
                    </p>
                    <div className="property-facts">
                      <span>
                        <ScanLine size={18} />
                        <strong>
                          {p.land || '—'} <small>m²</small>
                        </strong>
                        <small>Luas tanah</small>
                      </span>
                      <span>
                        <Building2 size={18} />
                        <strong>
                          {p.building || '—'} <small>m²</small>
                        </strong>
                        <small>Luas bangunan</small>
                      </span>
                      <span>
                        <BedDouble size={18} />
                        <strong>
                          {p.beds || p.staffBeds ? formatRooms(p.beds, p.staffBeds) : '—'}{' '}
                          <small>kamar</small>
                        </strong>
                        <small>Kamar tidur</small>
                      </span>
                      <span>
                        <Bath size={18} />
                        <strong>
                          {p.baths || p.staffBaths ? formatRooms(p.baths, p.staffBaths) : '—'}{' '}
                          <small>kamar</small>
                        </strong>
                        <small>Kamar mandi</small>
                      </span>
                    </div>
                  </div>
                </section>
                <section className="price-hero">
                  <div className="price-hero-top">
                    <span className="icon-tile">
                      <TrendingUp size={21} />
                    </span>
                    <Tag>
                      {project.demo
                        ? 'SIMULASI'
                        : isCost && a.suggested
                          ? 'SIMULASI BIAYA'
                          : a.confidence === 'Belum cukup data'
                            ? 'BELUM TERSEDIA'
                            : 'INDIKASI HARGA'}
                    </Tag>
                  </div>
                  <p>Harga pembukaan yang disarankan</p>
                  <div className="hero-price">
                    {a.suggested ? compact(a.suggested) : 'Belum tersedia'}
                    <span>
                      {a.suggested
                        ? isCost
                          ? 'Simulasi biaya untuk mulai menguji pasar'
                          : 'Posisi kompetitif untuk mulai menguji pasar'
                        : isCost
                          ? 'Lengkapi asumsi tanah dan bangunan'
                          : 'Lengkapi data dan pembanding terlebih dahulu'}
                    </span>
                  </div>
                  <div className="price-range">
                    <span>
                      {isCost ? 'Rentang skenario tanah + bangunan' : 'Rentang indikasi pasar'}
                    </span>
                    <strong>
                      {a.low
                        ? `${compact(a.low)} – ${compact(a.high!)}`
                        : isCost
                          ? 'Isi harga tanah dan asumsi bangunan'
                          : 'Minimal 3 pembanding sejenis'}
                    </strong>
                    <div className="range-track">
                      <span />
                      <i />
                    </div>
                    <div className="range-label">
                      <span>{isCost ? 'Skenario tanah minimum' : 'Kompetitif'}</span>
                      <span>{isCost ? 'Skenario tanah maksimum' : 'Optimistis'}</span>
                    </div>
                  </div>
                  <button className="hero-link" onClick={() => go('pricing')}>
                    Lihat dasar perhitungan <ArrowRight size={17} />
                  </button>
                  <small className="price-disclaimer">
                    <ShieldCheck size={13} />
                    Indikasi berbasis{' '}
                    {isCost
                      ? 'asumsi tanah + bangunan'
                      : a.transactionCount >= 3
                        ? 'transaksi input pengguna'
                        : 'harga penawaran'}
                    , bukan penilaian resmi.
                  </small>
                </section>
              </div>
              <div className="stats-grid">
                <Stat
                  icon={Layers3}
                  label={
                    isCost
                      ? project.cost?.landMode === 'houses'
                        ? 'Rumah dasar ekstraksi'
                        : 'Referensi tanah dasar'
                      : 'Pembanding relevan'
                  }
                  value={`${a.count}`}
                  detail={
                    isCost
                      ? project.cost?.landMode === 'manual'
                        ? 'Harga tanah manual; lihat sumber/asumsi'
                        : project.cost?.landMode === 'houses'
                          ? `dari ${project.comparables.length} rumah tersimpan`
                          : `dari ${project.landReferences?.length || 0} referensi tanah`
                      : `dari ${project.comparables.length} data tersimpan`
                  }
                  badge="Dasar analisis"
                  onClick={() => go(isCost ? 'pricing' : 'comparables')}
                />
                <Stat
                  icon={Eye}
                  label="Viewer iklan"
                  value={e.current ? String(e.current.views) : '—'}
                  detail="pada periode terakhir"
                  badge="Jangkauan"
                  onClick={() => go('strategy')}
                />
                <Stat
                  icon={MessageCircle}
                  label="Calon pembeli tertarik"
                  value={e.current ? String(e.current.chats) : '—'}
                  detail="prospek chat unik"
                  badge="Ketertarikan"
                  onClick={() => go('strategy')}
                />
                <Stat
                  icon={Users}
                  label="Rasio chat → survei"
                  value={e.ratio === null ? '—' : `${Math.round(e.ratio * 100)}%`}
                  detail={`sasaran awal ${Math.round(project.settings.visitTarget * 100)}% · belum jaminan deal`}
                  badge={e.current && e.current.chats < 10 ? 'Sampel terbatas' : 'Konversi'}
                  onClick={() => go('strategy')}
                />
              </div>
              <div className="analysis-grid">
                <section className="card market-card">
                  <div className="card-heading">
                    <div>
                      <h2>{isCost ? 'Komponen nilai properti' : 'Posisi harga di pasar'}</h2>
                      <p>
                        {isCost
                          ? 'Nilai berdasarkan asumsi tersimpan, sebelum koreksi strategi jual.'
                          : 'Bandingkan harga penawaran sebelum penyesuaian.'}
                      </p>
                    </div>
                    <button className="subtle-link" onClick={() => go('pricing')}>
                      Lihat analisis <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <PriceChart project={project} analysis={a} />
                  {!isCost && (
                    <div className="chart-footer">
                      <span>
                        <i className="legend-dot muted" />
                        Pembanding lolos filter
                      </span>
                      <span>
                        <i className="legend-dot green-dot" />
                        Rumah Anda
                      </span>
                      <Tag tone="gray">
                        {project.settings.mode === 'radius'
                          ? `Radius ${project.settings.radius} km`
                          : project.settings.mode === 'cluster'
                            ? 'Cluster yang sama'
                            : p.area || 'Area belum diisi'}
                      </Tag>
                    </div>
                  )}
                </section>
                <section className="card next-step">
                  <div className="next-step-top">
                    <span className="icon-tile pale">
                      <Sparkles size={20} />
                    </span>
                    <Tag>LANGKAH BERIKUTNYA</Tag>
                  </div>
                  <h2>{e.title}</h2>
                  <p>{e.description}</p>
                  <div className="next-step-note">
                    <span className="tiny-dot" />
                    180 hari adalah panduan, bukan tenggat mutlak.
                  </div>
                  <Button variant="secondary" onClick={() => go('strategy')}>
                    {e.action}
                    <ArrowRight size={16} />
                  </Button>
                </section>
              </div>
              <section className="card roadmap-preview">
                <div className="card-heading">
                  <div>
                    <h2>Perjalanan menuju penjualan</h2>
                    <p>Strategi bertahap, mengikuti respons pasar Anda.</p>
                  </div>
                  <button className="subtle-link" onClick={() => go('strategy')}>
                    Lihat strategi lengkap <ArrowRight size={15} />
                  </button>
                </div>
                <div className="mini-roadmap">
                  {[phases[0], phases[1], phases[3], phases[6]].map((phase, i) => (
                    <button key={phase.days} onClick={() => go('strategy')}>
                      <span className={`roadmap-number ${i === 0 ? 'first' : ''}`}>
                        {i === 0 ? <Check size={15} /> : `0${i + 1}`}
                      </span>
                      <div>
                        <small>HARI {phase.days}</small>
                        <strong>{phase.title}</strong>
                      </div>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
          {page === 'property' && (
            <PropertyForm key={project.demo ? 'demo' : 'real'} property={p} save={updateProperty} />
          )}
          {page === 'prompts' && (
            <PromptPanel
              project={project}
              setProject={setProject}
              initialGoal={promptGoal}
              onEditProperty={() => go('property')}
              onComparables={(goal) => go(goal === 'land' ? 'pricing' : 'comparables')}
              notify={setToast}
            />
          )}
          {page === 'comparables' && (
            <>
              <section className="card v1-prompt-bridge">
                <div>
                  <h2>Lengkapi pembanding dengan bantuan AI</h2>
                  <p>
                    Generate prompt riset → jalankan di ChatGPT/Claude → tempel CSV hasilnya →
                    tinjau data → hitung estimasi lokal.
                  </p>
                </div>
                <Button onClick={() => openPrompt('research')}>
                  <Sparkles size={16} />
                  Generate prompt pembanding
                </Button>
              </section>
              <section className="card v1-prompt-bridge">
                <div>
                  <h2>Referensi tanah untuk metode baru</h2>
                  <p>
                    Pembanding rumah di bawah dapat dipakai untuk menaksir harga tanah: lengkapi
                    tahun bangunan dan biaya bangun baru per m² pada Analisis harga. Harga tanah
                    dihitung dari sisa harga rumah setelah nilai bangunan dikurangi.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => go('pricing')}>
                  Kelola referensi tanah
                </Button>
              </section>
              <Comparables
                project={project}
                analysis={market}
                update={setProject}
                notify={setToast}
              />
            </>
          )}
          {page === 'pricing' && (
            <>
              <CostPanel
                project={project}
                update={setProject}
                onPrompt={() => openPrompt('land')}
                onProperty={() => go('property')}
                onHousePrompt={() => openPrompt('research')}
                notify={setToast}
              />
              {!isCost && project.comparables.length > 0 && a.suggested === null && (
                <AnalysisReadiness
                  project={project}
                  analysis={a}
                  onReview={() => go('comparables')}
                />
              )}
              <section className="card v1-prompt-bridge">
                <div>
                  <h2>Butuh sudut pandang harga untuk acuan 180 hari?</h2>
                  <p>
                    Gunakan data properti, pembanding pilihan, dan performa pemasaran sebagai
                    konteks AI. Hasilnya tidak otomatis mengubah harga Anda.
                  </p>
                </div>
                <Button onClick={() => openPrompt('pricing')}>
                  <Sparkles size={16} />
                  Generate prompt harga 180 hari
                </Button>
              </section>
              <Pricing project={project} analysis={a} update={setProject} notify={setToast} />
            </>
          )}
          {page === 'strategy' && (
            <Strategy project={project} analysis={a} update={setProject} notify={setToast} />
          )}
          {page === 'reports' && (
            <>
              <div className="reports-grid">
                <section className="card report-preview">
                  <div className="report-paper">
                    <div className="report-brand">
                      <House size={23} />
                      ruangnilai
                    </div>
                    <span className="report-kicker">LAPORAN ANALISIS PROPERTI</span>
                    <h2>{p.title || 'Properti Anda'}</h2>
                    <p>{p.area || 'Area belum diisi'} · Rumah tapak</p>
                    {project.demo && <Tag tone="amber">DATA SIMULASI</Tag>}
                    <div className="report-price">
                      <small>HARGA PEMBUKAAN INDIKATIF</small>
                      <strong>{a.suggested ? compact(a.suggested) : 'Belum tersedia'}</strong>
                    </div>
                    <div className="paper-line" />
                    <div className="paper-line short" />
                    <div className="paper-chart">
                      {[50, 68, 57, 80, 72, 62].map((v, i) => (
                        <i key={i} style={{ height: `${v}%` }} />
                      ))}
                    </div>
                    <div className="paper-footer">
                      RUANGNILAI <span>{shortDate(today())}</span>
                    </div>
                  </div>
                  <small className="preview-caption">
                    Pratinjau sampul · grafik dekoratif, isi lengkap mengikuti data analisis.
                  </small>
                </section>
                <div className="report-options">
                  <section className="card">
                    <div className="section-icon">
                      <FileText size={22} />
                    </div>
                    <h2>Laporan yang siap dibagikan</h2>
                    <p>
                      Profil, indikasi harga, pembanding, kekuatan, keterbatasan, dan strategi
                      penjualan dalam satu dokumen.
                    </p>
                    <div className="export-option">
                      <span className="file-icon pdf">PDF</span>
                      <div>
                        <strong>Laporan lengkap</strong>
                        <small>Siap dibaca, dicetak, dan dibagikan</small>
                      </div>
                      <Button
                        variant="secondary"
                        disabled={!!exporting}
                        onClick={() => download('PDF')}
                      >
                        {exporting === 'PDF' ? (
                          <LoaderCircle className="spin" size={16} />
                        ) : (
                          <Download size={16} />
                        )}
                        PDF
                      </Button>
                    </div>
                    <div className="export-option">
                      <span className="file-icon ppt">PPT</span>
                      <div>
                        <strong>Presentasi properti</strong>
                        <small>Slide PowerPoint yang dapat diedit</small>
                      </div>
                      <Button
                        variant="secondary"
                        disabled={!!exporting}
                        onClick={() => download('PPTX')}
                      >
                        {exporting === 'PPTX' ? (
                          <LoaderCircle className="spin" size={16} />
                        ) : (
                          <Download size={16} />
                        )}
                        PPTX
                      </Button>
                    </div>
                    <Notice>
                      Harga minimum internal dan anggaran penjual tidak disertakan. Periksa alamat,
                      sumber, dan isi laporan sebelum dibagikan. Jawaban AI dari percakapan
                      eksternal belum diimpor otomatis ke laporan ini.
                    </Notice>
                  </section>
                  <section className="card ai-card">
                    <div className="card-heading">
                      <h2>
                        <Sparkles size={19} />
                        Pendamping analisis dengan AI
                      </h2>
                      <Tag>Tanpa API key</Tag>
                    </div>
                    <p>
                      Buat prompt untuk mencari data pembanding atau meninjau harga jual dalam acuan
                      180 hari. Jalankan di ChatGPT atau Claude, lalu periksa sumber dan hasilnya.
                    </p>
                    <div className="button-row">
                      <Button onClick={() => openPrompt('research')}>
                        Prompt riset pembanding
                      </Button>
                      <Button variant="secondary" onClick={() => openPrompt('pricing')}>
                        Prompt harga 180 hari
                      </Button>
                    </div>
                  </section>
                </div>
              </div>
              <section className="card insights-card">
                <div className="card-heading">
                  <div>
                    <h2>Resume berdasarkan data Anda</h2>
                    <p>
                      Disusun dari aturan transparan. Keterangan pemilik belum diverifikasi
                      independen.
                    </p>
                  </div>
                </div>
                <InsightColumns property={p} />
              </section>
            </>
          )}
          <footer className="main-footer">
            <span>
              © {new Date().getFullYear()} RuangNilai <i /> Harga tepat. Langkah terarah.
            </span>
            <span>
              <ShieldCheck size={13} />
              Indikasi pasar, bukan penilaian resmi KJPP.
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
      {modal === 'new' && (
        <Modal
          title="Mulai analisis baru"
          subtitle="Data saat ini akan diganti pada perangkat ini."
          close={() => setModal(null)}
        >
          <p>
            Anda dapat mengunduh cadangan terlebih dahulu melalui Pengaturan workspace. Data contoh
            tidak akan digunakan untuk analisis baru.
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
                setToast('Analisis baru dibuat. Mulai dengan detail rumah Anda.');
              }}
            >
              Mulai analisis kosong <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
      {modal === 'help' && (
        <Modal
          title="Kenali cara kerja RuangNilai"
          subtitle="Dari data properti sampai langkah penjualan."
          close={() => setModal(null)}
        >
          <div className="help-steps">
            {[
              'Isi spesifikasi, kondisi, legalitas, dan lokasi rumah.',
              'Gunakan Generator prompt AI untuk meminta riset pembanding. Tempel CSV hasil AI di Data pembanding, tinjau sumbernya, lalu pastikan minimal 3 pembanding relevan.',
              'Atau buka Analisis harga: isi harga tanah per m², biaya bangun baru, umur efektif, kondisi, tusuk sate dan banjir; simpan metode tanah + bangunan. Referensi tanah memakai CSV tersendiri.',
              'Tinjau rentang harga, metode aktif, asumsi penyesuaian, dan kualitas buktinya.',
              'Catat performa setiap periode. Tinjau rekomendasi sebelum mengubah harga.',
              'Unduh PDF atau PowerPoint untuk diskusi dengan pemilik dan agen.',
            ].map((text, i) => (
              <div key={text}>
                <span>{i + 1}</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <Notice>
            Estimasi lokal V1 mendukung rumah tapak dan pembanding manual/CSV, didampingi generator
            prompt riset dan harga 180 hari. Belum ada pengambilan iklan otomatis dari marketplace
            atau media sosial. Koordinat tidak dicocokkan otomatis dengan alamat. Pastikan sendiri
            ketepatan lokasinya.
          </Notice>
          <Button onClick={() => setModal(null)}>
            Mengerti <Check size={16} />
          </Button>
        </Modal>
      )}
      {modal === 'notifications' && (
        <Modal title="Pemberitahuan workspace" close={() => setModal(null)}>
          <Notice>
            {a.issues.length
              ? a.issues.join(' ')
              : isCost
                ? 'Metode tanah + bangunan aktif. Tinjau harga tanah, penyusutan, faktor kondisi dan koreksi risiko pada Analisis harga.'
                : `${a.count} pembanding menjadi dasar harga. Tinjau kembali sumber dan tanggalnya sebelum mengambil keputusan.`}
          </Notice>
          <p>
            {e.title}. {e.description}
          </p>
          <Button
            onClick={() => {
              setModal(null);
              go('strategy');
            }}
          >
            Buka evaluasi pemasaran <ArrowRight size={16} />
          </Button>
        </Modal>
      )}
      {modal === 'settings' && (
        <Modal
          title="Pengaturan workspace"
          subtitle="Data Anda berada di browser ini, bukan di akun cloud."
          close={() => setModal(null)}
        >
          <Notice>
            Hindari perangkat bersama. Menghapus data browser akan menghapus analisis. Ekspor
            cadangan secara berkala. Belum tersedia sinkronisasi akun atau pemulihan cadangan
            otomatis.
          </Notice>
          <div className="settings-row">
            <div>
              <strong>Cadangan data proyek</strong>
              <p>JSON lengkap termasuk data internal penjual. Simpan secara pribadi.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                saveBlob(
                  JSON.stringify(project, null, 2),
                  `ruangnilai-cadangan-${today()}.json`,
                  'application/json',
                );
                setToast(
                  'Cadangan data diunduh. File berisi data internal; simpan secara pribadi.',
                );
              }}
            >
              <Download size={16} />
              Cadangkan
            </Button>
          </div>
          <div className="settings-row">
            <div>
              <strong>Jelajahi contoh analisis</strong>
              <p>Mengganti proyek saat ini dengan data simulasi.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (
                  window.confirm(
                    'Ganti analisis saat ini dengan contoh? Cadangkan data terlebih dahulu.',
                  )
                ) {
                  setProject(demoProject());
                  setModal(null);
                  go('overview');
                }
              }}
            >
              Buka contoh
            </Button>
          </div>
          <div className="settings-row">
            <div>
              <strong>Hapus data dari perangkat</strong>
              <p>Mengganti proyek dengan formulir kosong.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (
                  window.confirm(
                    'Hapus analisis dari browser ini? Tindakan ini tidak dapat dibatalkan.',
                  )
                ) {
                  localStorage.removeItem(STORAGE);
                  setProject(emptyProject());
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
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  badge,
  onClick,
}: {
  icon: typeof House;
  label: string;
  value: string;
  detail: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <button className="stat-card card" onClick={onClick}>
      <div className="stat-top">
        <span className="stat-icon">
          <Icon size={19} />
        </span>
        <small>{badge}</small>
        <ArrowUpRight size={14} />
      </div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </button>
  );
}
function PriceChart({ project, analysis }: { project: Project; analysis: Analysis }) {
  if (analysis.cost)
    return (
      <div className="cost-preview">
        <dl>
          <div>
            <dt>Tanah</dt>
            <dd>{rupiah(analysis.cost.landValue)}</dd>
          </div>
          <div>
            <dt>Bangunan setelah umur & kondisi</dt>
            <dd>{rupiah(analysis.cost.buildingValue)}</dd>
          </div>
          <div>
            <dt>Nilai dasar setelah posisi & banjir</dt>
            <dd>{rupiah(analysis.cost.baseValue)}</dd>
          </div>
        </dl>
      </div>
    );
  const rows = analysis.rows.filter((r) => r.included).slice(0, 6);
  const prices = rows.map((r) => r.comparable.price);
  const own = project.property.asking;
  if (!rows.length)
    return (
      <Empty
        title="Belum ada pembanding relevan"
        text="Tambahkan pembanding atau sesuaikan kriteria pencarian."
      />
    );
  const max = Math.max(...prices, own) * 1.16;
  return (
    <div
      className="price-chart"
      role="img"
      aria-label={`Grafik harga ${rows.length} pembanding dan harga iklan rumah Anda ${rupiah(own)}`}
    >
      <div className="chart-y">
        <span>{compact(max)}</span>
        <span>{compact(max / 2)}</span>
        <span>Rp 0</span>
      </div>
      <div className="chart-plot">
        <div className="chart-gridlines">
          <i />
          <i />
          <i />
        </div>
        <div className="chart-bars">
          {[
            ...rows.map((r, i) => ({
              value: r.comparable.price,
              label: `P${i + 1}`,
              name: r.comparable.title,
              own: false,
            })),
            ...(own > 0
              ? [{ value: own, label: 'Rumah Anda', name: 'Harga iklan rumah Anda', own: true }]
              : []),
          ].map((item, i) => (
            <div key={i} className={`bar-column ${item.own ? 'own' : ''}`}>
              <span className="bar-price">{compact(item.value)}</span>
              <div
                className="bar-fill"
                style={{ height: `${(item.value / max) * 145}px` }}
                title={`${item.name}: ${rupiah(item.value)}`}
              />
              <span className="bar-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function InsightColumns({ property }: { property: Property }) {
  const info = insights(property);
  return (
    <div className="insight-columns">
      <div>
        <h3>
          <CheckCircle2 size={18} />
          Kekuatan properti
        </h3>
        <ul>
          {info.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3>
          <Search size={18} />
          Perlu diperhatikan
        </h3>
        <ul>
          {info.weaknesses.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3>
          <Users size={18} />
          Kebutuhan calon pembeli
        </h3>
        <p>{info.audience}</p>
      </div>
    </div>
  );
}

function Pricing({
  project,
  analysis: a,
  update,
  notify,
}: {
  project: Project;
  analysis: Analysis;
  update: React.Dispatch<React.SetStateAction<Project>>;
  notify: (s: string) => void;
}) {
  const [method, setMethod] = useState(false);
  return (
    <>
      {a.issues.length > 0 && <Notice>{a.issues.join(' ')}</Notice>}
      {a.suggested !== null && a.suggested < project.property.minimum && (
        <Notice>
          Indikasi pasar di bawah harga minimum internal Anda. Harga tidak dapat diterapkan melalui
          tombol ini. Tinjau kembali ekspektasi penjual, pembanding, dan strategi sebelum
          melanjutkan.
        </Notice>
      )}
      <div className="pricing-summary">
        <section className="price-hero">
          <div className="price-hero-top">
            <span className="icon-tile">
              <TrendingUp size={22} />
            </span>
            <Tag>HARGA PEMBUKAAN</Tag>
          </div>
          <div className="hero-price">
            {a.suggested ? compact(a.suggested) : 'Belum tersedia'}
            <span>
              {a.method === 'cost'
                ? 'Tanah + bangunan tersusut, setelah koreksi'
                : 'Persentil 35 dari pembanding setelah penyesuaian'}
            </span>
          </div>
          <p>
            Harga awal untuk menguji ketertarikan pasar. Tidak menjamin kunjungan atau penjualan.
          </p>
          <Button
            variant="secondary"
            disabled={
              !a.suggested ||
              a.suggested === project.property.asking ||
              a.suggested < project.property.minimum
            }
            onClick={() => {
              if (
                a.suggested &&
                a.suggested >= project.property.minimum &&
                window.confirm(`Tetapkan harga iklan ${rupiah(a.suggested)}?`)
              ) {
                update((s) => ({
                  ...s,
                  property: { ...s.property, asking: a.suggested! },
                  priceHistory: [
                    ...s.priceHistory,
                    {
                      at: new Date().toISOString(),
                      from: s.property.asking,
                      to: a.suggested!,
                      reason:
                        a.method === 'cost'
                          ? 'Harga pembukaan simulasi tanah + bangunan'
                          : 'Harga pembukaan berdasarkan pembanding',
                    },
                  ],
                }));
                notify('Harga iklan diperbarui. Mulai periode pengukuran baru.');
              }
            }}
          >
            <Check size={16} />
            Gunakan sebagai harga iklan
          </Button>
        </section>
        <section className="card range-card">
          <span className="stat-icon">
            <BarChart3 size={20} />
          </span>
          <p>
            {a.method === 'cost' ? 'Rentang skenario tanah + bangunan' : 'Rentang indikasi pasar'}
          </p>
          <h2>{a.low ? `${compact(a.low)} – ${compact(a.high!)}` : 'Belum tersedia'}</h2>
          <p>
            {a.method === 'cost'
              ? 'Minimum–maksimum harga tanah referensi, dengan asumsi bangunan tetap. Bukan rentang transaksi atau interval keyakinan. Manual/satu referensi memberi satu nilai.'
              : 'Kuartil 25–75%. Rentang ini menunjukkan sebaran data, bukan interval keyakinan atau batas pasti nilai rumah.'}
          </p>
          <div className="range-track light">
            <span />
            <i />
          </div>
          <Tag tone="gray">
            {a.count}{' '}
            {a.method === 'cost'
              ? project.cost?.landMode === 'houses'
                ? 'rumah dasar ekstraksi'
                : 'referensi tanah'
              : 'pembanding dasar harga'}
          </Tag>
        </section>
        <section className="card evidence-card">
          <ShieldCheck size={23} />
          <p>Kualitas bukti</p>
          <h2>{a.confidence}</h2>
          <p>
            {a.method === 'cost'
              ? 'Simulasi berdasarkan harga tanah dan biaya pengganti. Belum dikalibrasi dengan harga transaksi rumah setempat.'
              : a.transactionCount >= 3
                ? 'Menggunakan transaksi yang ditandai terverifikasi oleh pengguna.'
                : 'Menggunakan harga penawaran. Harga kesepakatan sebenarnya belum diketahui.'}
          </p>
          <Tag tone="amber">Belum diverifikasi independen</Tag>
        </section>
      </div>
      {a.method === 'cost' ? (
        <section className="card form-section cost-details">
          <h2>Dasar perhitungan yang tersimpan</h2>
          {costReportLines(project).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </section>
      ) : (
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Harga asli & hasil penyesuaian</h2>
              <p>Penyesuaian luas dan kondisi dibuat eksplisit agar mudah ditinjau.</p>
            </div>
            <Button variant="secondary" onClick={() => setMethod(!method)}>
              <ClipboardList size={15} />
              {method ? 'Tutup metode' : 'Lihat metode'}
            </Button>
          </div>
          {method && (
            <div className="method-box">
              <h3>Asumsi awal yang digunakan</h3>
              <p>
                Faktor luas = 65% × (LT subjek ÷ LT pembanding) + 35% × (LB subjek ÷ LB pembanding).
                Faktor kondisi = 1 + 4% × selisih tingkat kondisi. Hasil gabungan dibatasi antara
                0,8–1,2 lalu dikalikan harga pembanding.
              </p>
              <p>
                Harga pembukaan menggunakan persentil 35, rentang menggunakan persentil 25–75;
                dibulatkan ke Rp5 juta. Bobot belum dikalibrasi dengan transaksi setempat.
                Sertifikat harus sama; pembanding berusia lebih dari 180 hari dan ukuran terlalu
                berbeda dikeluarkan.
              </p>
              <p>
                Transaksi dipakai jika ada minimal 3 yang ditandai terverifikasi pengguna. Jika
                tidak, diperlukan minimal 3 harga penawaran. Keduanya tidak dicampur. Verifikasi
                pengguna bukan penilaian independen.
              </p>
            </div>
          )}
          {a.rows.some((r) => r.included) ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>PEMBANDING</th>
                    <th>HARGA ASLI</th>
                    <th>PENYESUAIAN</th>
                    <th>SETARA SUBJEK</th>
                    <th>DASAR ESTIMASI</th>
                  </tr>
                </thead>
                <tbody>
                  {a.rows
                    .filter((r) => r.included)
                    .map((r) => (
                      <tr key={r.comparable.id}>
                        <td>
                          <strong>{r.comparable.title}</strong>
                          <small>
                            {r.comparable.land} m² tanah · {r.comparable.building} m² bangunan
                          </small>
                        </td>
                        <td>{rupiah(r.comparable.price)}</td>
                        <td>
                          <Tag tone="gray">
                            {r.adjustment >= 0 ? '+' : ''}
                            {r.adjustment.toFixed(1)}%
                          </Tag>
                        </td>
                        <td>
                          <strong>{rupiah(r.adjusted)}</strong>
                        </td>
                        <td>
                          {(
                            a.transactionCount >= 3
                              ? r.comparable.priceType === 'Transaksi'
                              : r.comparable.priceType === 'Penawaran'
                          ) ? (
                            <Tag>Digunakan</Tag>
                          ) : (
                            <Tag tone="gray">Kelompok terpisah</Tag>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Belum ada pembanding"
              text="Tambahkan data di halaman Data pembanding untuk memulai."
            />
          )}
        </section>
      )}
      <section className="card insights-card">
        <div className="card-heading">
          <h2>Potensi & hal yang perlu diperiksa</h2>
        </div>
        <InsightColumns property={project.property} />
      </section>
      <Notice>
        {a.method === 'cost'
          ? 'Koreksi legalitas, akses, dan keusangan fungsi belum dihitung otomatis. Jangan menerapkan banjir/tusuk sate dua kali bila harga tanah acuan sudah mencerminkan risiko yang sama. Tinjau harga dengan bukti pasar dan respons calon pembeli.'
          : 'Penyesuaian belum memasukkan premi legalitas, risiko banjir, renovasi terperinci, atau nilai fasilitas secara otomatis. Periksa kemiripan lingkungan secara manual. Hasil ini bukan penilaian resmi KJPP.'}
      </Notice>
    </>
  );
}

function Strategy({
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
  const [showLog, setShowLog] = useState(false);
  const [openPhase, setOpenPhase] = useState(0);
  const e = evaluate(project, analysis);
  return (
    <>
      <div className="strategy-top">
        <section className="card strategy-recommendation">
          <div className="card-heading">
            <h2>
              <Sparkles size={19} />
              Rekomendasi langkah berikutnya
            </h2>
            <Tag tone="gray">Berbasis aturan & data Anda</Tag>
          </div>
          <h2>{e.title}</h2>
          <p>{e.description}</p>
          {e.nextPrice && (
            <div className="proposed-price">
              <div>
                <small>USULAN HARGA BERIKUTNYA</small>
                <strong>
                  {compact(e.current.price)} <ArrowRight size={20} /> {compact(e.nextPrice)}
                </strong>
              </div>
              <Button
                onClick={() => {
                  if (
                    e.nextPrice &&
                    window.confirm(
                      `Setujui perubahan harga menjadi ${rupiah(e.nextPrice)}? Iklan eksternal harus Anda perbarui sendiri.`,
                    )
                  ) {
                    update((s) => ({
                      ...s,
                      property: { ...s.property, asking: e.nextPrice! },
                      priceHistory: [
                        ...s.priceHistory,
                        {
                          at: new Date().toISOString(),
                          from: s.property.asking,
                          to: e.nextPrice!,
                          reason: 'Uji harga berdasarkan respons pemasaran',
                        },
                      ],
                    }));
                    notify('Harga diperbarui. Sesuaikan iklan eksternal dan catat periode baru.');
                  }
                }}
              >
                <Check size={16} />
                Setujui usulan
              </Button>
            </div>
          )}
          <div className="button-row">
            <Button onClick={() => setShowLog(true)}>
              <Plus size={16} />
              Catat performa iklan
            </Button>
            <span className="muted">Perubahan harga selalu memerlukan persetujuan Anda.</span>
          </div>
        </section>
        <section className="card target-card">
          <span className="stat-icon">
            <Target size={21} />
          </span>
          <h3>Sasaran konversi survei</h3>
          <div className="target-value">
            {e.ratio === null ? '—' : `${Math.round(e.ratio * 100)}%`}
            <small>/ {Math.round(project.settings.visitTarget * 100)}%</small>
          </div>
          <p>Survei terlaksana ÷ prospek chat unik pada periode yang sama.</p>
          <select
            aria-label="Sasaran rasio survei"
            value={project.settings.visitTarget}
            onChange={(ev) =>
              update((s) => ({
                ...s,
                settings: { ...s.settings, visitTarget: Number(ev.target.value) },
              }))
            }
          >
            {[0.25, 0.4, 0.5, 0.6, 0.75].map((n) => (
              <option key={n} value={n}>
                Sasaran {Math.round(n * 100)}%
              </option>
            ))}
          </select>
          <small>
            Minimal 10 chat untuk sinyal awal yang lebih berguna. Ini asumsi operasional, belum
            tolok ukur pasar.
          </small>
        </section>
      </div>
      <section className="card">
        <div className="card-heading">
          <div>
            <h2>Catatan respons pasar</h2>
            <p>Satu catatan gabungan kanal per periode. Periode tidak boleh tumpang tindih.</p>
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
                  <th>PERIODE & KANAL</th>
                  <th>HARGA DIUJI</th>
                  <th>VIEWER</th>
                  <th>CHAT UNIK</th>
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
                        <small>{c.channel}</small>
                        <small>Hambatan: {c.objection}</small>
                        {c.notes && <small>{c.notes}</small>}
                      </td>
                      <td>
                        <strong>{compact(c.price)}</strong>
                        <small>Biaya {rupiah(c.spend)}</small>
                      </td>
                      <td>{c.views}</td>
                      <td>{c.chats}</td>
                      <td>
                        <strong>{c.visits} terlaksana</strong>
                        <small>
                          {c.scheduled} dijadwalkan ·{' '}
                          {c.chats ? Math.round((c.visits / c.chats) * 100) : '—'}
                          {c.chats ? '%' : ''}
                        </small>
                      </td>
                      <td>{c.offers}</td>
                      <td>
                        <button
                          className="icon-button delete"
                          aria-label="Hapus periode"
                          onClick={() => {
                            if (window.confirm('Hapus catatan periode ini?'))
                              update((s) => ({
                                ...s,
                                campaigns: s.campaigns.filter((x) => x.id !== c.id),
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
            title="Belum ada catatan pemasaran"
            text="Catat hasil iklan untuk mengetahui hambatan dan langkah berikutnya."
          />
        )}
        <div className="table-bottom">
          <CircleHelp size={15} />
          Jumlah viewer antarplatform bisa berbeda definisi. Gunakan pencatatan yang konsisten; chat
          spam dan agen penawar jasa tidak dihitung sebagai prospek.
        </div>
      </section>
      <section className="card roadmap-full">
        <div className="card-heading">
          <div>
            <h2>Rencana penjualan 180 hari</h2>
            <p>Panduan bertahap. Sesuaikan dengan kondisi rumah dan respons calon pembeli.</p>
          </div>
          <Tag tone="green">
            <CalendarDays size={13} />7 fase evaluasi
          </Tag>
        </div>
        {phases.map((phase, i) => (
          <div key={phase.days} className={`phase ${openPhase === i ? 'expanded' : ''}`}>
            <button
              className="phase-heading"
              aria-expanded={openPhase === i}
              onClick={() => setOpenPhase(openPhase === i ? -1 : i)}
            >
              <span className="phase-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="phase-days">HARI {phase.days}</span>
              <strong>{phase.title}</strong>
              <ChevronDown size={18} />
            </button>
            {openPhase === i && (
              <div className="phase-body">
                <p>{phase.text}</p>
                {phase.tasks.map((task) => (
                  <div key={task}>
                    <CheckCircle2 size={16} />
                    {task}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
      {project.priceHistory.length > 0 && (
        <section className="card">
          <div className="card-heading">
            <h2>Riwayat keputusan harga</h2>
          </div>
          <div className="history-list">
            {[...project.priceHistory].reverse().map((h, i) => (
              <div key={i}>
                <span>
                  <CalendarDays size={15} />
                  {new Date(h.at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                </span>
                <strong>
                  {compact(h.from)} <ArrowRight size={14} /> {compact(h.to)}
                </strong>
                <p>{h.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {showLog && (
        <CampaignModal
          project={project}
          close={() => setShowLog(false)}
          save={(c) => {
            update((s) => ({ ...s, campaigns: [...s.campaigns, c] }));
            setShowLog(false);
            notify('Performa periode disimpan. Rekomendasi telah diperbarui.');
          }}
        />
      )}
    </>
  );
}
