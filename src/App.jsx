import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, Headphones, Shield, ShieldCheck, GraduationCap, Search, Plus, X,
  Clock3, ArrowRight, CheckCircle2, Layers, Workflow
} from 'lucide-react';
import { apiClient } from './api/client';
import TicketDetail from './features/TicketDetail';
import CreateTicket from './features/CreateTicket';
import SupportVisual from './components/SupportVisual';
import AppShell from './components/AppShell';
import { priorities, statuses, sampleTickets, sampleCategories } from './features/previewData';
import { kanbanColumn, workflowRequest, workflowStatus } from './features/ticketWorkflow';

const DashboardOverview = lazy(() => import('./features/DashboardOverview'));
const RealDashboard = lazy(() => import('./features/RealDashboard'));
const PreviewDashboard = lazy(() => import('./features/PreviewDashboard'));
const RulesPage = lazy(() => import('./features/RulesPage'));
const UsersPage = lazy(() => import('./features/UsersPage'));

const routeLabels = {
  '/': 'Tổng quan',
  '/kanban': 'Bảng điều khiển',
  '/tickets': 'Danh sách Ticket',
  '/tickets/new': 'Tạo yêu cầu mới',
  '/dashboard': 'Báo cáo hiệu suất',
  '/rules': 'Quy tắc & SLA',
  '/users': 'Quản trị người dùng',
};

function Dialog({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const element = ref.current;
    const opener = document.activeElement;
    element.showModal();
    return () => {
      if (element.open) element.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog wide' : 'dialog'}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={event => { if (event.target === ref.current) onClose(); }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={18} /></button>
      </header>
      {children}
    </dialog>
  );
}

function Badge({ priority }) {
  return <span className={'badge ' + priority}>{priority} · {priorities[priority]}</span>;
}

function Sla({ ticket }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  if (kanbanColumn(ticket.status) === 'RESOLVED') return <span className="sla good"><CheckCircle2 size={13} />{workflowStatus[ticket.status] || 'Đã giải quyết'}</span>;
  if (ticket.resolved_at && Array.isArray(ticket.allowed_actions)) {
    const onTime = ticket.resolution_deadline_at && new Date(ticket.resolved_at) <= new Date(ticket.resolution_deadline_at);
    return <span className={onTime ? 'sla good' : 'sla'}><Clock3 size={13} />
      {onTime ? 'Lần xử lý đầu đúng hạn' : 'Đã ghi nhận lần xử lý đầu'}</span>;
  }
  if (!ticket.resolution_deadline_at) return <span className="sla"><Clock3 size={13} />Chưa có hạn SLA</span>;
  const minutes = Math.ceil((new Date(ticket.resolution_deadline_at) - now) / 60000);
  const state = minutes < 0 ? 'urgent' : minutes <= 15 ? 'approaching' : '';
  return <span className={'sla ' + state}><Clock3 size={13} />{minutes < 0 ? 'Quá hạn ' + (-minutes) + ' phút' : 'Còn ' + minutes + ' phút'}</span>;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const preview = import.meta.env.MODE === 'development' && new URLSearchParams(location.search).get('preview') === '1';

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsLoadError, setTicketsLoadError] = useState('');
  const [ticketReload, setTicketReload] = useState(0);
  const [categories, setCategories] = useState([]);
  const [agents, setAgents] = useState([]);
  const [workflowAvailable, setWorkflowAvailable] = useState(false);
  const [scope, setScope] = useState('all');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('sla');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);

  const path = location.pathname;
  const url = value => value + (preview ? '?preview=1' : '');
  const admin = preview || user?.role === 'ADMIN';

  useEffect(() => {
    let active = true;
    setChecking(true);
    setSessionError('');
    apiClient('/auth/me')
      .then(data => { if (active) setUser(data.user); })
      .catch(failure => {
        if (!active) return;
        if (failure.status === 401) setUser(null);
        else setSessionError(failure.status === 429
          ? 'Đã đạt giới hạn yêu cầu tạm thời. Hãy chờ trước khi kiểm tra lại phiên đăng nhập.'
          : 'Không thể kiểm tra phiên đăng nhập. Kiểm tra kết nối rồi thử lại.');
      })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [sessionAttempt]);

  useEffect(() => {
    setSearch('');
    setPriorityFilter('all');
    setError('');
    setMenu(false);
  }, [path]);

  useEffect(() => {
    if (preview) {
      setTickets(sampleTickets);
      setTotalTickets(sampleTickets.length);
      setCategories(sampleCategories);
      setLoadingTickets(false);
      setTicketsLoadError('');
      return;
    }
    setTickets([]);
    setTotalTickets(0);
    setCategories([]);
    setTicketsLoadError('');
    if (!user) { setLoadingTickets(false); return; }
    let active = true;
    setLoadingTickets(true);
    Promise.all([
      apiClient(scope === 'all' ? '/tickets' : '/tickets?scope=' + scope),
      apiClient('/categories'),
      user.role === 'END_USER' ? Promise.resolve([]) : apiClient('/agents'),
    ])
      .then(([data, list, staff]) => {
        if (active) {
          setTickets(data.items);
          setTotalTickets(Number.isFinite(data.total) ? data.total : data.items.length);
          setCategories(list);
          setAgents(staff);
          setWorkflowAvailable(data.workflow === true);
        }
      })
      .catch(failure => { if (active) setTicketsLoadError(failure.message); })
      .finally(() => { if (active) setLoadingTickets(false); });
    return () => { active = false; };
  }, [preview, user, ticketReload, scope]);

  async function mutate(endpoint, method, body) {
    const { csrfToken } = await apiClient('/auth/csrf');
    return apiClient(endpoint, { method, headers: { 'X-CSRF-Token': csrfToken }, body: JSON.stringify(body) });
  }

  async function mutateFile(endpoint, file, fields = {}) {
    const { csrfToken } = await apiClient('/auth/csrf');
    const body = new FormData();
    body.append('file', file);
    for (const [key, value] of Object.entries(fields)) body.append(key, String(value));
    return apiClient(endpoint, { method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, body });
  }

  async function action(work) {
    setBusy(true);
    setError('');
    try { await work(); return true; }
    catch (failure) { setError(failure.message); return false; }
    finally { setBusy(false); }
  }

  async function openTicket(ticket) {
    await action(async () => setSelected(preview ? ticket : await apiClient('/tickets/' + ticket.id)));
  }

  async function refreshTicket(id) {
    const detail = await apiClient('/tickets/' + id);
    setSelected(current => current?.id === id ? detail : current);
    setTickets(current => current.map(item => item.id === id ? detail : item));
    return detail;
  }

  async function workflowMutation(ticket, write) {
    return action(async () => {
      try { await write(); }
      catch (failure) {
        if (failure.status === 409 || failure.status === 404) {
          await refreshTicket(ticket.id).catch(refreshFailure => {
            if (refreshFailure.status === 404) setSelected(current => current?.id === ticket.id ? null : current);
          });
          setTicketReload(value => value + 1);
        }
        throw failure;
      }
      setTicketReload(value => value + 1);
      try { await refreshTicket(ticket.id); }
      catch {
        setSelected(current => current?.id === ticket.id ? null : current);
        setNotice('Đã lưu thay đổi. Mở lại ticket để tải thông tin mới.');
      }
    });
  }

  async function changeStatus(ticket, status) {
    const next = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED' };
    if (next[ticket.status] !== status) {
      setError('Chỉ chuyển Mới tạo → Đang xử lý → Đã giải quyết.');
      return;
    }
    await action(async () => {
      const updated = preview
        ? { ...ticket, status, version: ticket.version + 1 }
        : await mutate('/tickets/' + ticket.id + '/status', 'PATCH', { status, version: ticket.version });
      setTickets(current => current.map(item => (item.id === ticket.id ? updated : item)));
      setSelected(current => (current?.id === ticket.id ? { ...current, ...updated } : current));
    });
  }

  if (checking) return <div className="loading" role="status">Đang tải Smart IT Helpdesk…</div>;

  if (sessionError && !preview) return <main className="loading">
    <div><p role="alert">{sessionError}</p>
      <button type="button" className="button secondary" onClick={() => setSessionAttempt(value => value + 1)}>Kiểm tra lại phiên đăng nhập</button>
    </div>
  </main>;

  if ((!user && !preview) || path === '/login') {
    const featureCards = [
      { Icon: Shield, title: 'Đăng nhập an toàn', subtitle: 'với Google OIDC' },
      { Icon: BarChart3, title: 'Giám sát SLA', subtitle: 'liên tục' },
      { Icon: Layers, title: 'Phân loại tự động', subtitle: 'theo quy tắc' },
      { Icon: Workflow, title: 'Điều phối xử lý', subtitle: 'đúng đơn vị' },
    ];
    return (
      <div className="login-shell">
        <header className="login-topbar">
          <div className="login-topbar-left">
            <span className="login-topbar-logo" aria-hidden="true">
              <GraduationCap size={18} />
            </span>
            <strong className="login-topbar-brand">BTEC FPT · Smart IT Helpdesk</strong>
            <span className="login-topbar-sep" aria-hidden="true" />
            <span className="login-topbar-sub">Hệ thống hỗ trợ và quản lý dịch vụ CNTT</span>
          </div>
          <div className="login-topbar-right">
            <Headphones size={15} aria-hidden="true" />
            <span>Cổng hỗ trợ sinh viên và cán bộ</span>
          </div>
        </header>

        <main className="login-page">
          <section className="login-story" aria-label="Giới thiệu hệ thống hỗ trợ CNTT">
            <div className="login-story-inner">
              <div className="login-hero-top">
                <div className="login-hero-copy">
                  <span className="login-badge-pill">
                    <GraduationCap size={15} aria-hidden="true" />
                    <span>Hỗ trợ CNTT cho BTEC FPT</span>
                  </span>
                  <h1>
                    Quản lý sự cố tập trung,
                    <br />
                    phản hồi đúng cam kết <span className="login-sla-highlight">SLA.</span>
                  </h1>
                  <p className="login-hero-desc">
                    Phân loại mức độ ưu tiên tự động theo quy tắc, giám sát thời gian phản hồi và điều phối xử lý sự cố trên một không gian thống nhất.
                  </p>
                </div>
                <SupportVisual />
              </div>

              <div className="login-feature-grid" aria-label="Tính năng nổi bật">
                {featureCards.map(({ Icon, title, subtitle }) => (
                  <div className="login-feature-card" key={title}>
                    <span className="login-feature-icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <div className="login-feature-text">
                      <strong>{title}</strong>
                      <span>{subtitle}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="login-form" aria-labelledby="login-title">
            <div className="login-content">
              <div className="login-brand-lockup">
                <span className="brand-mark" aria-hidden="true">
                  <Headphones size={20} />
                </span>
                <span>Smart IT Helpdesk</span>
              </div>
              <h2 id="login-title">Đăng nhập hệ thống</h2>
              <p className="login-card-desc">
                Sử dụng tài khoản Google đã được quản trị viên phê duyệt để truy cập không gian làm việc.
              </p>
              <a className="button google login-google-button" href="/api/v1/auth/google">
                <span className="login-google-mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </span>
                <span>Tiếp tục với Google</span>
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <p className="login-security-note">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>Phiên làm việc được bảo vệ và lưu trữ an toàn.</span>
              </p>
              {import.meta.env.MODE === 'development' && (
                <div className="login-preview-block">
                  <div className="login-divider">
                    <span>CHẾ ĐỘ THIẾT KẾ</span>
                  </div>
                  <Link className="button secondary full login-preview-btn" to="/kanban?preview=1">
                    <span>Xem giao diện mẫu</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </main>

        <footer className="login-bottombar">
          <span>© 2026 Smart IT Helpdesk · Reliability Engineering MVP</span>
          <span className="login-bottombar-right">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Đăng nhập an toàn qua Google OAuth 2.0 PKCE</span>
          </span>
        </footer>
      </div>
    );
  }

  const visibleTickets = tickets
    .filter(ticket => (priorityFilter === 'all' || ticket.priority === priorityFilter)
      && (ticket.title + ' ' + ticket.ticket_code).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'sla') return (Date.parse(a.resolution_deadline_at) || Infinity) - (Date.parse(b.resolution_deadline_at) || Infinity);
      return sort === 'priority' ? a.priority.localeCompare(b.priority) : b.id - a.id;
    });

  return (
    <AppShell
      user={user}
      preview={preview}
      admin={admin}
      path={path}
      routeLabels={routeLabels}
      url={url}
      search={search}
      onSearchChange={setSearch}
      menu={menu}
      setMenu={setMenu}
      mutate={mutate}
      onOpenTicketById={id => action(async () => setSelected(await apiClient('/tickets/' + id)))}
      onLogout={() => action(async () => {
        if (!preview) await mutate('/auth/logout', 'POST', {});
        setUser(null);
        navigate('/login');
      })}
    >
      {preview && (
        <div className="preview-bar">
          <span>Chế độ xem giao diện mẫu · Thay đổi chỉ lưu tạm trong phiên trình duyệt này.</span>
          <Link to="/login">Đăng nhập thật →</Link>
        </div>
      )}
      {error && <div className="alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Ẩn lỗi"><X size={16} /></button></div>}
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Ẩn thông báo"><X size={16} /></button></div>}
      {path === '/tickets/new' && ticketsLoadError && (
        <div className="alert" role="alert">
          Không tải được danh mục: {ticketsLoadError}
          <button className="button secondary" onClick={() => setTicketReload(v => v + 1)}>Thử lại</button>
        </div>
      )}

      {path === '/' && (
        <Suspense fallback={<div className="loading" role="status">Đang tải tổng quan…</div>}>
          <DashboardOverview
            tickets={visibleTickets}
            totalTickets={totalTickets}
            categories={categories}
            loadingTickets={loadingTickets}
            ticketsLoadError={ticketsLoadError}
            onOpenTicket={openTicket}
            onRetryTickets={() => setTicketReload(v => v + 1)}
            preview={preview}
            user={user}
            url={url}
            Badge={Badge}
            Sla={Sla}
          />
        </Suspense>
      )}

      {['/kanban', '/tickets'].includes(path) && (
        <>
          <header className="page-header">
            <div>
              <small>QUẢN LÝ SỰ CỐ</small>
              <h1>Bảng Kanban Tương tác</h1>
            </div>
            <Link className="button primary" to={url('/tickets/new')}><Plus size={16} />Tạo yêu cầu</Link>
          </header>

          <div className="toolbar">
            {!preview && workflowAvailable && user?.role !== 'END_USER' && (
              <select aria-label="Phạm vi ticket" value={scope} onChange={event => setScope(event.target.value)}>
                <option value="all">{admin ? 'Tất cả ticket' : 'Ticket có quyền xem'}</option>
                <option value="unassigned">Chưa phân công</option>
                {!admin && <option value="mine">Ticket tôi phụ trách</option>}
              </select>
            )}
            {!preview && workflowAvailable && user?.role === 'END_USER' && <strong>Yêu cầu của tôi</strong>}
            <div className="search">
              <Search size={16} />
              <input
                aria-label="Tìm ticket"
                placeholder="Tìm theo mã ticket hoặc tiêu đề…"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
            <select aria-label="Lọc mức độ ưu tiên" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}>
              <option value="all">Tất cả ưu tiên</option>
              {Object.entries(priorities).map(([key, label]) => <option key={key} value={key}>{key} · {label}</option>)}
            </select>
            <select aria-label="Sắp xếp ticket" value={sort} onChange={event => setSort(event.target.value)}>
              <option value="sla">SLA gần nhất</option>
              <option value="priority">Mức độ ưu tiên</option>
              <option value="newest">Mới nhất trước</option>
            </select>
            <span className="muted">
              {loadingTickets ? 'Đang tải…' : ticketsLoadError ? 'Lỗi tải dữ liệu' : visibleTickets.length + ' ticket'}
            </span>
          </div>

          <div className="kanban">
            {loadingTickets ? (
              <div className="board-state loading" role="status">Đang tải ticket…</div>
            ) : ticketsLoadError ? (
              <div className="board-state alert" role="alert">
                Không tải được ticket: {ticketsLoadError}
                <button className="button secondary" onClick={() => setTicketReload(v => v + 1)}>Thử lại</button>
              </div>
            ) : (
              Object.entries(statuses).map(([status, label]) => (
                <section
                  key={status}
                  className="kanban-column"
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault();
                    const ticket = tickets.find(item => item.id === Number(event.dataTransfer.getData('text/plain')));
                    if (ticket && (preview || !workflowAvailable)) changeStatus(ticket, status);
                  }}
                >
                  <header>
                    <span className="column-title">
                      <span className="column-dot" />
                      {label}
                      <small>({status})</small>
                    </span>
                    <span className="count">{visibleTickets.filter(t => kanbanColumn(t.status) === status).length}</span>
                  </header>

                  {visibleTickets.filter(t => kanbanColumn(t.status) === status).map(ticket => (
                    <button
                      className={'ticket-card ' + (ticket.priority === 'P1' ? 'critical' : '')}
                      key={ticket.id}
                      draggable={preview || (!workflowAvailable && user?.role !== 'END_USER')}
                      onDragStart={event => event.dataTransfer.setData('text/plain', ticket.id)}
                      onClick={() => openTicket(ticket)}
                    >
                      <div className="card-top">
                        <small>#{ticket.ticket_code}</small>
                        <Badge priority={ticket.priority} />
                      </div>
                      <h3>{ticket.title}</h3>
                      <p>{categories.find(c => c.id === ticket.category_id)?.name || 'Chưa phân loại'}</p>
                      {ticket.status === 'PENDING_USER' && <p>{workflowStatus[ticket.status]}</p>}
                      <footer>
                        <span className="person">
                          <span className="avatar tiny">{(ticket.reporter_name || ticket.reporter || 'U').slice(0, 1)}</span>
                          {ticket.reporter_name || ticket.reporter || ('Người gửi #' + ticket.reporter_id)}
                        </span>
                        <Sla ticket={ticket} />
                      </footer>
                    </button>
                  ))}
                  {!visibleTickets.some(t => kanbanColumn(t.status) === status) && <div className="empty">Chưa có ticket</div>}
                </section>
              ))
            )}
          </div>

          <div className="board-footer">
            <span><span className="red-dot" />Dải đỏ: P1 · Khẩn cấp</span>
            <span>{!preview && workflowAvailable ? 'Mở ticket để xem và cập nhật trạng thái' : 'Kéo thẻ hoặc nhấn để xem chi tiết & cập nhật trạng thái'}</span>
          </div>
        </>
      )}

      {path === '/tickets/new' && (
        <CreateTicket
          categories={categories}
          busy={busy}
          preview={preview}
          idempotent={!preview && workflowAvailable}
          onCancel={() => navigate(url('/kanban'))}
          onSubmit={(data, file) => action(async () => {
            const ticket = preview
              ? { ...data, id: Date.now(), ticket_code: 'DEMO-' + (tickets.length + 1), priority: data.impact === 'organization' ? 'P1' : 'P3', status: 'OPEN', reporter: 'Bạn', comments: [], version: 1 }
              : await mutate('/tickets', 'POST', data);
            setTickets(current => [ticket, ...current.filter(item => item.id !== ticket.id)]);
            let message = preview ? 'Đã thêm ticket vào phiên xem mẫu.' : 'Đã gửi yêu cầu hỗ trợ.';
            if (file && !preview) {
              try {
                await mutateFile('/tickets/' + ticket.id + '/attachments', file, Array.isArray(ticket.allowed_actions) ? { version: ticket.version } : {});
                message += ' Ảnh đã được lưu riêng tư.';
              } catch {
                message += ' Ticket đã lưu, nhưng ảnh chưa tải lên; mở ticket để thử lại.';
              }
            }
            setNotice(message);
            navigate(url('/kanban'));
            setSelected(!preview
              ? await apiClient('/tickets/' + ticket.id).catch(() => ticket) : ticket);
          })}
        />
      )}

      {path === '/rules' && admin && <Suspense fallback={<div className="loading" role="status">Đang tải trang quy tắc…</div>}><RulesPage preview={preview} mutate={mutate} /></Suspense>}
      {path === '/users' && admin && <Suspense fallback={<div className="loading" role="status">Đang tải trang người dùng…</div>}><UsersPage preview={preview} mutate={mutate} selfId={user?.id} /></Suspense>}
      {path === '/dashboard' && admin && <Suspense fallback={<div className="loading">Đang tải báo cáo…</div>}>{preview ? <PreviewDashboard preview /> : <RealDashboard />}</Suspense>}
      {['/rules', '/dashboard', '/users'].includes(path) && !admin && <div className="empty" role="alert">Trang này dành cho quản trị viên.</div>}
      {path === '/simulation' && <Navigate replace to={url('/kanban')} />}
      {!['/', '/kanban', '/tickets', '/tickets/new', '/rules', '/dashboard', '/users', '/simulation'].includes(path) && (
        <div className="empty"><h1>Không tìm thấy trang</h1><Link to={url('/kanban')}>Về bảng ticket</Link></div>
      )}

      {selected && (
        <Dialog title={'#' + selected.ticket_code + ' — ' + selected.title} wide onClose={() => setSelected(null)}>
          {Array.isArray(selected.allowed_actions) && error && <p className="alert" role="alert">{error}</p>}
          <TicketDetail
            key={selected.id}
            Sla={Sla}
            Badge={Badge}
            ticket={selected}
            preview={preview}
            user={user}
            categories={categories}
            agents={agents}
            busy={busy}
            onWorkflow={(name, fields) => workflowMutation(selected, () => mutate(...workflowRequest(name, selected, fields)))}
            onRefresh={async () => {
              const id = selected.id;
              const updated = await apiClient('/tickets/' + id);
              setSelected(current => current?.id === id ? updated : current);
              setTickets(current => current.map(ticket => ticket.id === id ? { ...ticket, ...updated } : ticket));
            }}
            action={action}
            onStatus={status => changeStatus(selected, status)}
            onAcknowledge={() => action(async () => {
              const updated = await mutate('/tickets/' + selected.id + '/acknowledge', 'POST', { version: selected.version });
              setSelected(current => ({
                ...current,
                ...updated,
                history: [...(current.history || []), { id: 'ack-' + updated.version, event_type: 'ACKNOWLEDGED', new_value: updated.acknowledged_at, created_at: updated.acknowledged_at }],
              }));
              setTickets(current => current.map(t => (t.id === updated.id ? updated : t)));
            })}
            onReply={message => action(async () => {
              const comment = preview ? { id: Date.now(), message, author_name: 'Bạn' } : await mutate('/tickets/' + selected.id + '/comments', 'POST', { message });
              const updated = { ...selected, comments: [...(selected.comments || []), comment] };
              setSelected(updated);
              setTickets(current => current.map(t => (t.id === updated.id ? updated : t)));
            })}
            onAssign={assigneeId => action(async () => {
              const updated = await mutate('/tickets/' + selected.id + '/assign', 'PATCH', { assignee_id: assigneeId, version: selected.version });
              const detail = { ...selected, ...updated };
              setSelected(detail);
              setTickets(current => current.map(t => (t.id === updated.id ? detail : t)));
            })}
            onUpload={(file, reason) => Array.isArray(selected.allowed_actions)
              ? workflowMutation(selected, () => mutateFile('/tickets/' + selected.id + '/attachments', file,
                { version: selected.version, ...(reason ? { reason } : {}) }))
              : action(async () => {
              await mutateFile('/tickets/' + selected.id + '/attachments', file);
              setSelected(await apiClient('/tickets/' + selected.id));
              setNotice('Ảnh đã được lưu riêng tư.');
            })}
          />
        </Dialog>
      )}
    </AppShell>
  );
}
