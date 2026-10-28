import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BedDouble,
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
  ExternalLink,
  Eye,
  FileBarChart2,
  FileDown,
  FileText,
  House,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Pencil,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';
import Papa from 'papaparse';
import {
  analyze,
  compact,
  dateOffset,
  demoProject,
  emptyProject,
  evaluate,
  insights,
  phases,
  rupiah,
  safeUrl,
  shortDate,
  today,
  validateCampaign,
  validateComparable,
  validateProperty,
  type Analysis,
  type Campaign,
  type Comparable,
  type Project,
  type Property,
} from './domain';
import { exportPdf, exportSlides } from './reports';

type Page = 'overview' | 'property' | 'comparables' | 'pricing' | 'strategy' | 'reports';
const navigation: { id: Page; label: string; icon: typeof House }[] = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'property', label: 'Detail properti', icon: House },
  { id: 'comparables', label: 'Data pembanding', icon: Layers3 },
  { id: 'pricing', label: 'Analisis harga', icon: BarChart3 },
  { id: 'strategy', label: 'Strategi penjualan', icon: Target },
  { id: 'reports', label: 'Laporan & presentasi', icon: FileBarChart2 },
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
  return demoProject();
}
function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      className={`button ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Field({
  label,
  children,
  hint,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  wide?: boolean;
}) {
  const id = useId();
  return (
    <div className={`field ${wide ? 'wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-control" id={`${id}-wrapper`}>
        {children && typeof children === 'object' && 'type' in children ? (
          <FieldChild id={id}>{children}</FieldChild>
        ) : (
          children
        )}
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}
function FieldChild({ id, children }: { id: string; children: ReactNode }) {
  return isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ id?: string }>, { id })
    : children;
}
function Tag({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: 'green' | 'amber' | 'gray';
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <Layers3 size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <CircleHelp size={17} />
      <div>{children}</div>
    </div>
  );
}
function Modal({
  title,
  subtitle,
  children,
  close,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,a[href]',
        );
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal"
      >
        <div className="modal-heading">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" aria-label="Tutup dialog" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
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
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modal, setModal] = useState<'new' | 'help' | 'settings' | 'notifications' | null>(null);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [exporting, setExporting] = useState('');
  const a = analyze(project);
  const e = evaluate(project, a);
  const p = project.property;
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(project));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    setAiSummary('');
  }, [project]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (import.meta.env.VITE_STANDALONE === 'true' || location.protocol === 'file:') return;
    fetch('/api/health')
      .then((r) => r.json())
      .then((r) => setAiReady(r.aiConfigured))
      .catch(() => setAiReady(false));
  }, []);
  const go = (next: Page) => {
    setPage(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const askAI = async () => {
    setAiBusy(true);
    try {
      // Exact address, coordinates, internal minimum and seller identity are deliberately omitted.
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facts: {
            simulation: project.demo,
            property: {
              area: p.area,
              land: p.land,
              building: p.building,
              beds: p.beds,
              baths: p.baths,
              conditionReportedByOwner: p.condition,
              facilitiesReportedByOwner: p.facilities,
              risksReportedByOwner: p.risks,
              certificateReportedByOwner: p.certificate,
            },
            analysis: {
              suggested: a.suggested,
              low: a.low,
              high: a.high,
              comparables: a.count,
              evidence: a.confidence,
              basis: a.transactionCount >= 3 ? 'user-verified transactions' : 'asking prices',
            },
            evaluation: { title: e.title, description: e.description },
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAiSummary(result.summary);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'AI belum dapat dihubungi.');
    } finally {
      setAiBusy(false);
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
            <small>PROPERTY INTELLIGENCE</small>
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
                <span /> PROPERTY INTELLIGENCE, SIMPLIFIED
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
                  Ringkasan properti <Tag tone="gray">Rumah tapak</Tag>
                </h2>
                <span className="saved-label">
                  <CheckCheck size={14} />
                  {storageError ? 'Belum tersimpan' : 'Tersimpan di perangkat'}
                </span>
              </div>
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
                    <span className="property-type">RUMAH TAPAK</span>
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
                          {p.beds || '—'} <small>kamar</small>
                        </strong>
                        <small>Kamar tidur</small>
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
                        ? 'Posisi kompetitif untuk mulai menguji pasar'
                        : 'Lengkapi data dan pembanding terlebih dahulu'}
                    </span>
                  </div>
                  <div className="price-range">
                    <span>Rentang indikasi pasar</span>
                    <strong>
                      {a.low
                        ? `${compact(a.low)} – ${compact(a.high!)}`
                        : 'Minimal 3 pembanding sejenis'}
                    </strong>
                    <div className="range-track">
                      <span />
                      <i />
                    </div>
                    <div className="range-label">
                      <span>Kompetitif</span>
                      <span>Optimistis</span>
                    </div>
                  </div>
                  <button className="hero-link" onClick={() => go('pricing')}>
                    Lihat dasar perhitungan <ArrowRight size={17} />
                  </button>
                  <small className="price-disclaimer">
                    <ShieldCheck size={13} />
                    Indikasi berbasis{' '}
                    {a.transactionCount >= 3 ? 'transaksi input pengguna' : 'harga penawaran'},
                    bukan penilaian resmi.
                  </small>
                </section>
              </div>
              <div className="stats-grid">
                <Stat
                  icon={Layers3}
                  label="Pembanding relevan"
                  value={`${a.count}`}
                  detail={`dari ${project.comparables.length} data tersimpan`}
                  badge="Dasar analisis"
                  onClick={() => go('comparables')}
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
                      <h2>Posisi harga di pasar</h2>
                      <p>Bandingkan harga penawaran sebelum penyesuaian.</p>
                    </div>
                    <button className="subtle-link" onClick={() => go('pricing')}>
                      Lihat analisis <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <PriceChart project={project} analysis={a} />
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
          {page === 'comparables' && (
            <Comparables project={project} analysis={a} update={setProject} notify={setToast} />
          )}
          {page === 'pricing' && (
            <Pricing project={project} analysis={a} update={setProject} notify={setToast} />
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
                      sumber, dan isi laporan sebelum dibagikan. Ringkasan AI tambahan ditinjau di
                      layar dan belum dimasukkan ke ekspor.
                    </Notice>
                  </section>
                  <section className="card ai-card">
                    <div className="card-heading">
                      <h2>
                        <Sparkles size={19} />
                        Ringkasan dengan AI
                      </h2>
                      <Tag tone={aiReady ? 'green' : 'gray'}>
                        {aiReady ? 'Koneksi tersedia' : 'Belum terhubung'}
                      </Tag>
                    </div>
                    <p>
                      AI membantu menarasikan fakta yang Anda masukkan. Perhitungan harga tetap
                      menggunakan metode yang transparan.
                    </p>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={aiConsent}
                        onChange={(ev) => setAiConsent(ev.target.checked)}
                      />
                      Saya setuju mengirim spesifikasi, area, catatan pemilik, dan hasil analisis ke
                      penyedia AI. Alamat lengkap, koordinat, serta harga minimum tidak dikirim.
                    </label>
                    <Button onClick={askAI} disabled={!aiReady || !aiConsent || aiBusy}>
                      {aiBusy ? (
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      Buat ringkasan AI
                    </Button>
                    {!aiReady && (
                      <small className="muted">
                        Konfigurasi kunci API di server diperlukan. Panduan ada di README proyek;
                        fitur lainnya tetap berfungsi.
                      </small>
                    )}
                    {aiSummary && (
                      <div className="ai-result">
                        <Tag>HASIL AI · PERLU DITINJAU</Tag>
                        <p>{aiSummary}</p>
                      </div>
                    )}
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
                setAiConsent(false);
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
              'Tambahkan minimal 3 pembanding unik dari sumber yang dapat ditelusuri. Disarankan 5 atau lebih.',
              'Tinjau rentang harga, metode penyesuaian, dan kualitas buktinya.',
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
            Versi awal mendukung rumah tapak dan pembanding manual/CSV. Belum ada pengambilan iklan
            otomatis dari marketplace atau media sosial. Koordinat tidak dicocokkan otomatis dengan
            alamat. Pastikan sendiri ketepatan lokasinya.
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

function PropertyForm({ property, save }: { property: Property; save: (p: Property) => void }) {
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
    const issues = validateProperty(draft);
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
            <select value="Rumah tapak" onChange={() => {}}>
              <option>Rumah tapak</option>
              <option disabled>Ruko · segera hadir</option>
              <option disabled>Tanah kavling · segera hadir</option>
              <option disabled>Apartemen · segera hadir</option>
            </select>
          </Field>
          {text('address', 'Alamat lengkap *', 'Jalan, nomor, kelurahan, kota', true, true)}
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
          {num('land', 'Luas tanah (m²) *', true)}
          {num('building', 'Luas bangunan (m²) *', true)}
          {num('frontage', 'Lebar muka tanah / bangunan (m)')}
          {num('road', 'Lebar jalan (m)')}
          {num('floors', 'Jumlah lantai')}
          {num('beds', 'Kamar tidur')}
          {num('baths', 'Kamar mandi')}
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
          ])}
          {select('certificate', 'Status sertifikat *', [
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
            <p>Harga minimum dan anggaran bersifat internal, tidak masuk laporan berbagi.</p>
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

function Comparables({
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
  const importCsv = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2e6) {
      setError('File maksimal 2 MB.');
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (result) => {
        if (result.errors.length) {
          setError(`CSV tidak valid: ${result.errors[0].message}`);
          return;
        }
        if (!result.data.length || result.data.length > 500) {
          setError('CSV harus berisi 1–500 baris.');
          return;
        }
        const num = (s: string | undefined) => (s?.trim() ? Number(s) : 0);
        const records = result.data.map((r) => ({
          id: crypto.randomUUID(),
          title: r.title || '',
          address: r.address || '',
          area: r.area || '',
          cluster: r.cluster || '',
          lat: r.lat?.trim() ? Number(r.lat) : null,
          lng: r.lng?.trim() ? Number(r.lng) : null,
          land: num(r.land),
          building: num(r.building),
          beds: num(r.beds),
          price: num(r.price),
          condition: (r.condition || 'Siap huni') as Comparable['condition'],
          certificate: (r.certificate || 'SHM') as Comparable['certificate'],
          source: r.source || '',
          url: r.url || '',
          observedAt: r.observedAt || '',
          verified: false,
          enabled: true,
          priceType: (r.priceType || 'Penawaran') as Comparable['priceType'],
        }));
        const invalid = records
          .map((r, i) => ({ message: validateComparable(r), row: i + 2 }))
          .find((x) => x.message);
        if (invalid) {
          setError(`Baris ${invalid.row}: ${invalid.message} Tidak ada data yang diimpor.`);
          return;
        }
        update((s) => ({ ...s, comparables: [...s.comparables, ...records] }));
        setError('');
        notify(`${records.length} pembanding diimpor. Periksa duplikat dan verifikasi sumbernya.`);
      },
      error: () => setError('File tidak dapat dibaca.'),
    });
  };
  const template = () =>
    saveBlob(
      Papa.unparse([
        {
          title: 'Contoh rumah (ganti dengan data nyata)',
          address: 'Alamat lengkap unik',
          area: 'Nama kecamatan',
          cluster: '',
          lat: '',
          lng: '',
          land: 180,
          building: 150,
          beds: 3,
          price: 2800000000,
          condition: 'Siap huni',
          certificate: 'SHM',
          source: 'Nama sumber',
          url: '',
          observedAt: today(),
          priceType: 'Penawaran',
        },
      ]),
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
            <p>Filter bekerja pada data yang Anda masukkan, bukan pencarian otomatis internet.</p>
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
      <section className="card comparables-card">
        <div className="card-heading">
          <div>
            <h2>
              Data pembanding <Tag tone="gray">{project.comparables.length} data</Tag>
            </h2>
            <p>
              {analysis.count} pembanding menjadi dasar harga · minimal 3, disarankan 5 atau lebih.
            </p>
          </div>
          <div className="button-row">
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
        {error && (
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
                  <th>STATUS ANALISIS</th>
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
                          : 'Tidak dipakai dalam estimasi'}
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
            notify('Pembanding disimpan dan analisis diperbarui.');
          }}
        />
      )}
    </>
  );
}

function ComparableModal({
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
        value={c[key] === null || c[key] === 0 ? '' : String(c[key])}
        onChange={(ev) =>
          setC((s) => ({
            ...s,
            [key]:
              type === 'number'
                ? ev.target.value === '' && ['lat', 'lng'].includes(key)
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
          {field('beds', 'Kamar tidur', 'number')}
          <Field label="Kondisi bangunan">
            <select
              value={c.condition}
              onChange={(ev) =>
                setC((s) => ({ ...s, condition: ev.target.value as Comparable['condition'] }))
              }
            >
              {['Siap huni', 'Perlu renovasi ringan', 'Perlu renovasi besar'].map((x) => (
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
          Saya telah memeriksa sumber dan bukti harga ini. Transaksi tanpa verifikasi tidak
          digunakan.
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
            <span>Persentil 35 dari pembanding setelah penyesuaian</span>
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
                      reason: 'Harga pembukaan berdasarkan pembanding',
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
          <p>Rentang indikasi pasar</p>
          <h2>{a.low ? `${compact(a.low)} – ${compact(a.high!)}` : 'Belum tersedia'}</h2>
          <p>
            Kuartil 25–75%. Rentang ini menunjukkan sebaran data, bukan interval keyakinan atau
            batas pasti nilai rumah.
          </p>
          <div className="range-track light">
            <span />
            <i />
          </div>
          <Tag tone="gray">{a.count} pembanding dasar harga</Tag>
        </section>
        <section className="card evidence-card">
          <ShieldCheck size={23} />
          <p>Kualitas bukti</p>
          <h2>{a.confidence}</h2>
          <p>
            {a.transactionCount >= 3
              ? 'Menggunakan transaksi yang ditandai terverifikasi oleh pengguna.'
              : 'Menggunakan harga penawaran. Harga kesepakatan sebenarnya belum diketahui.'}
          </p>
          <Tag tone="amber">Belum diverifikasi independen</Tag>
        </section>
      </div>
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
              dibulatkan ke Rp5 juta. Bobot belum dikalibrasi dengan transaksi setempat. Sertifikat
              harus sama; pembanding berusia lebih dari 180 hari dan ukuran terlalu berbeda
              dikeluarkan.
            </p>
            <p>
              Transaksi dipakai jika ada minimal 3 yang ditandai terverifikasi pengguna. Jika tidak,
              diperlukan minimal 3 harga penawaran. Keduanya tidak dicampur. Verifikasi pengguna
              bukan penilaian independen.
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
      <section className="card insights-card">
        <div className="card-heading">
          <h2>Potensi & hal yang perlu diperiksa</h2>
        </div>
        <InsightColumns property={project.property} />
      </section>
      <Notice>
        Penyesuaian belum memasukkan premi legalitas, risiko banjir, renovasi terperinci, atau nilai
        fasilitas secara otomatis. Periksa kemiripan lingkungan secara manual. Hasil ini bukan
        penilaian resmi KJPP.
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
function CampaignModal({
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
            Simpan & evaluasi
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function saveBlob(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
