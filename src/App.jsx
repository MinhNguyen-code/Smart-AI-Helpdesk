import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, BarChart3, SlidersHorizontal, Users,
  Headphones, ShieldCheck, GraduationCap, Search, Plus, X,
  Clock3, LogOut, ArrowRight, Menu, CheckCircle2
} from 'lucide-react';
import { apiClient } from './api/client';
import TicketDetail from './features/TicketDetail';
import CreateTicket from './features/CreateTicket';
import NotificationMenu from './features/NotificationMenu';
import SupportVisual from './components/SupportVisual';
import { priorities, statuses, sampleTickets, sampleCategories } from './features/previewData';

const RealDashboard = lazy(() => import('./features/RealDashboard'));
const PreviewDashboard = lazy(() => import('./features/PreviewDashboard'));
const RulesPage = lazy(() => import('./features/RulesPage'));
const UsersPage = lazy(() => import('./features/UsersPage'));

const routeLabels = {
  '/': 'Bảng điều khiển',
  '/kanban': 'Bảng điều khiển',
  '/tickets': 'Bảng điều khiển',
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
  if (ticket.status === 'RESOLVED') return <span className="sla good"><CheckCircle2 size={13} />Đã giải quyết</span>;
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
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsLoadError, setTicketsLoadError] = useState('');
  const [ticketReload, setTicketReload] = useState(0);
  const [categories, setCategories] = useState([]);
  const [agents, setAgents] = useState([]);
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
    apiClient('/auth/me').then(data => setUser(data.user)).catch(() => setUser(null)).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    setSearch('');
    setPriorityFilter('all');
    setError('');
    setMenu(false);
  }, [path]);

  useEffect(() => {
    if (preview) {
      setTickets(sampleTickets);
      setCategories(sampleCategories);
      setLoadingTickets(false);
      setTicketsLoadError('');
      return;
    }
    setTickets([]);
    setCategories([]);
    setTicketsLoadError('');
    if (!user) { setLoadingTickets(false); return; }
    let active = true;
    setLoadingTickets(true);
    Promise.all([
      apiClient('/tickets'),
      apiClient('/categories'),
      user.role === 'END_USER' ? Promise.resolve([]) : apiClient('/agents'),
    ])
      .then(([data, list, staff]) => {
        if (active) { setTickets(data.items); setCategories(list); setAgents(staff); }
      })
      .catch(failure => { if (active) setTicketsLoadError(failure.message); })
      .finally(() => { if (active) setLoadingTickets(false); });
    return () => { active = false; };
  }, [preview, user, ticketReload]);

  async function mutate(endpoint, method, body) {
    const { csrfToken } = await apiClient('/auth/csrf');
    return apiClient(endpoint, { method, headers: { 'X-CSRF-Token': csrfToken }, body: JSON.stringify(body) });
  }

  async function mutateFile(endpoint, file) {
    const { csrfToken } = await apiClient('/auth/csrf');
    const body = new FormData();
    body.append('file', file);
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

  if ((!user && !preview) || path === '/login') {
    return (
      <main className="login-page">
        <section className="login-story">
          <div className="brand">
            <span className="brand-mark"><GraduationCap size={16} /></span>
            BTEC FPT · Smart IT Helpdesk
          </div>
          <div>
            <h1>Quản lý sự cố tập trung.<br />Phản hồi đúng cam kết SLA.</h1>
            <p>Phân loại mức độ ưu tiên tự động theo quy tắc, giám sát thời gian phản hồi và điều phối xử lý sự cố trên một không gian tối giản.</p>
            <SupportVisual />
            <div className="trust">
              <span><ShieldCheck size={15} />Xác thực Google OIDC</span>
              <span><Headphones size={15} />Giám sát SLA liên tục</span>
            </div>
          </div>
          <small>© 2026 Smart IT Helpdesk · Reliability Engineering MVP</small>
        </section>

        <section className="login-form">
          <span className="help">Cổng hỗ trợ sinh viên và cán bộ</span>
          <div className="login-content">
            <div className="brand" style={{ marginBottom: 24 }}>
              <span className="brand-mark"><Headphones size={16} /></span>
              <span style={{ fontSize: 16 }}>Smart IT Helpdesk</span>
            </div>
            <h2>Đăng nhập hệ thống</h2>
            <p>Sử dụng tài khoản Google đã được quản trị viên phê duyệt để truy cập không gian làm việc.</p>
            <a className="button google" href="/api/v1/auth/google">
              <span className="google-letter">G</span>
              <span>Tiếp tục với Google</span>
              <ArrowRight size={16} />
            </a>
            <p className="login-note"><ShieldCheck size={15} />Phiên làm việc được bảo vệ và lưu trữ an toàn.</p>
            {import.meta.env.MODE === 'development' && (
              <>
                <div className="divider">Chế độ thiết kế</div>
                <Link className="button secondary full" to="/kanban?preview=1">
                  Xem giao diện mẫu <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
          <small><ShieldCheck size={14} />Đăng nhập an toàn qua Google OAuth 2.0 PKCE</small>
        </section>
      </main>
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
    <div className="workspace">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <aside id="workspace-navigation" className={'sidebar ' + (menu ? 'open' : '')}>
        <Link className="wordmark" to={url('/kanban')}>
          <span className="brand-mark"><Headphones size={15} /></span>
          <span>IT Desk<small>Reliability Workspace</small></span>
        </Link>

        <div className="sidebar-section-label">Vận hành</div>
        <nav>
          <NavLink to={url('/kanban')}><LayoutDashboard size={17} /><span>Bảng điều khiển</span></NavLink>
          <NavLink to={url('/tickets/new')}><Ticket size={17} /><span>Tạo yêu cầu</span></NavLink>
        </nav>

        {admin && (
          <>
            <div className="sidebar-section-label">Quản trị</div>
            <nav>
              <NavLink to={url('/dashboard')}><BarChart3 size={17} /><span>Báo cáo</span></NavLink>
              <NavLink to={url('/rules')}><SlidersHorizontal size={17} /><span>Quy tắc & SLA</span></NavLink>
              <NavLink to={url('/users')}><Users size={17} /><span>Người dùng</span></NavLink>
            </nav>
          </>
        )}

        <div className="sidebar-user">
          <div className="avatar">{preview ? 'M' : user?.full_name?.slice(0, 1)}</div>
          <div className="sidebar-user-meta">
            <strong>{preview ? 'Xem mẫu' : user?.full_name}</strong>
            <small>{preview ? 'Minh họa' : user?.role}</small>
          </div>
          <button
            className="icon-button"
            aria-label="Đăng xuất"
            onClick={() => action(async () => {
              if (!preview) await mutate('/auth/logout', 'POST', {});
              setUser(null);
              navigate('/login');
            })}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {menu && <button className="mobile-scrim" aria-label="Đóng điều hướng" onClick={() => setMenu(false)} />}

      <main id="main-content" className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-btn"
              aria-label="Mở điều hướng"
              aria-expanded={menu}
              aria-controls="workspace-navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={18} />
            </button>
            <span>IT Desk</span>
            <span>/</span>
            <strong>{routeLabels[path] || 'Không gian làm việc'}</strong>
          </div>
          {!preview && (
            <NotificationMenu
              mutate={mutate}
              onTicket={id => action(async () => setSelected(await apiClient('/tickets/' + id)))}
            />
          )}
        </header>

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

        {['/', '/kanban', '/tickets'].includes(path) && (
          <>
            <header className="page-header">
              <div>
                <small>QUẢN LÝ SỰ CỐ</small>
                <h1>Bảng Kanban Tương tác</h1>
              </div>
              <Link className="button primary" to={url('/tickets/new')}><Plus size={16} />Tạo yêu cầu</Link>
            </header>

            <div className="toolbar">
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
                {loadingTickets ? 'Đang tải…' : ticketsLoadError ? 'Lỗi tải dữ liệu' : visibleTickets.length + ' ticket' + (preview ? '' : ' trong trang đầu (tối đa 30)')}
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
                      if (ticket) changeStatus(ticket, status);
                    }}
                  >
                    <header>
                      <span className="column-title">
                        <span className="column-dot" />
                        {label}
                        <small>({status})</small>
                      </span>
                      <span className="count">{visibleTickets.filter(t => t.status === status).length}</span>
                    </header>

                    {visibleTickets.filter(t => t.status === status).map(ticket => (
                      <button
                        className={'ticket-card ' + (ticket.priority === 'P1' ? 'critical' : '')}
                        key={ticket.id}
                        draggable={preview || user?.role !== 'END_USER'}
                        onDragStart={event => event.dataTransfer.setData('text/plain', ticket.id)}
                        onClick={() => openTicket(ticket)}
                      >
                        <div className="card-top">
                          <small>#{ticket.ticket_code}</small>
                          <Badge priority={ticket.priority} />
                        </div>
                        <h3>{ticket.title}</h3>
                        <p>{categories.find(c => c.id === ticket.category_id)?.name || 'Chưa phân loại'}</p>
                        <footer>
                          <span className="person">
                            <span className="avatar tiny">{(ticket.reporter_name || ticket.reporter || 'U').slice(0, 1)}</span>
                            {ticket.reporter_name || ticket.reporter || ('Người gửi #' + ticket.reporter_id)}
                          </span>
                          <Sla ticket={ticket} />
                        </footer>
                      </button>
                    ))}
                    {!visibleTickets.some(t => t.status === status) && <div className="empty">Chưa có ticket</div>}
                  </section>
                ))
              )}
            </div>

            <div className="board-footer">
              <span><span className="red-dot" />Dải đỏ: P1 · Khẩn cấp</span>
              <span>Kéo thẻ hoặc nhấn để xem chi tiết & cập nhật trạng thái</span>
            </div>
          </>
        )}

        {path === '/tickets/new' && (
          <CreateTicket
            categories={categories}
            busy={busy}
            preview={preview}
            onCancel={() => navigate(url('/kanban'))}
            onSubmit={(data, file) => action(async () => {
              const ticket = preview
                ? { ...data, id: Date.now(), ticket_code: 'DEMO-' + (tickets.length + 1), priority: data.impact === 'organization' ? 'P1' : 'P3', status: 'OPEN', reporter: 'Bạn', comments: [], version: 1 }
                : await mutate('/tickets', 'POST', data);
              setTickets(current => [ticket, ...current]);
              let message = preview ? 'Đã thêm ticket vào phiên xem mẫu.' : 'Đã gửi yêu cầu hỗ trợ.';
              if (file && !preview) {
                try {
                  await mutateFile('/tickets/' + ticket.id + '/attachments', file);
                  message += ' Ảnh đã được lưu riêng tư.';
                } catch {
                  message += ' Ticket đã lưu, nhưng ảnh chưa tải lên; mở ticket để thử lại.';
                }
              }
              setNotice(message);
              navigate(url('/kanban'));
            })}
          />
        )}

        {path === '/rules' && admin && <Suspense fallback={<div className="loading" role="status">Đang tải trang quy tắc…</div>}><RulesPage preview={preview} mutate={mutate} /></Suspense>}
        {path === '/users' && admin && <Suspense fallback={<div className="loading" role="status">Đang tải trang người dùng…</div>}><UsersPage preview={preview} mutate={mutate} selfId={user?.id} /></Suspense>}
        {path === '/dashboard' && admin && <Suspense fallback={<div className="loading">Đang tải báo cáo…</div>}>{preview ? <PreviewDashboard preview /> : <RealDashboard />}</Suspense>}
        {['/rules', '/dashboard', '/users'].includes(path) && !admin && <div className="empty" role="alert">Trang này dành cho quản trị viên.</div>}
        {!['/', '/kanban', '/tickets', '/tickets/new', '/rules', '/dashboard', '/users'].includes(path) && (
          <div className="empty"><h1>Không tìm thấy trang</h1><Link to={url('/kanban')}>Về bảng ticket</Link></div>
        )}
      </main>

      {selected && (
        <Dialog title={'#' + selected.ticket_code + ' — ' + selected.title} wide onClose={() => setSelected(null)}>
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
            onUpload={file => action(async () => {
              await mutateFile('/tickets/' + selected.id + '/attachments', file);
              setSelected(await apiClient('/tickets/' + selected.id));
              setNotice('Ảnh đã được lưu riêng tư.');
            })}
          />
        </Dialog>
      )}
    </div>
  );
}
