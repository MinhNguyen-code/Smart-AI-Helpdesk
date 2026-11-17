import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Ticket, BarChart3, SlidersHorizontal, Users, Headphones, ShieldCheck, GraduationCap, Search, Plus, X, Clock3, LogOut, ArrowRight, Menu, CheckCircle2 } from 'lucide-react';
import { apiClient } from './api/client';
import TicketDetail from './features/TicketDetail';
import CreateTicket from './features/CreateTicket';
import NotificationMenu from './features/NotificationMenu';
import { priorities, statuses, sampleTickets, sampleCategories } from './features/previewData';
const SupportScene = lazy(() => import('./components/SupportVisual'));
const RealDashboard = lazy(() => import('./features/RealDashboard'));
const PreviewDashboard = lazy(() => import('./features/PreviewDashboard'));
const RulesPage = lazy(() => import('./features/RulesPage'));
const UsersPage = lazy(() => import('./features/UsersPage'));

function Dialog({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const element = ref.current;
    const opener = document.activeElement;
    element.showModal();
    return () => { if (element.open) element.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={ref} className={wide ? 'dialog wide' : 'dialog'} aria-labelledby={titleId} onCancel={onClose} onClick={event => { if (event.target === ref.current) onClose(); }}><header><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={20} /></button></header>{children}</dialog>;
}
function Badge({ priority }) { return <span className={`badge ${priority}`}>{priority} · {priorities[priority]}</span>; }
function Sla({ ticket }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  if (ticket.status === 'RESOLVED') return <span className="sla good"><CheckCircle2 size={14} />Đã giải quyết</span>;
  if (!ticket.resolution_deadline_at) return <span className="sla"><Clock3 size={14} />Chưa có hạn SLA</span>;
  const minutes = Math.ceil((new Date(ticket.resolution_deadline_at) - now) / 60000);
  const state = minutes < 0 ? 'urgent' : minutes <= 15 ? 'approaching' : '';
  return <span className={`sla ${state}`}><Clock3 size={14} />{minutes < 0 ? `Quá hạn ${-minutes} phút` : `Còn ${minutes} phút`}</span>;
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
  const url = value => `${value}${preview ? '?preview=1' : ''}`;
  const admin = preview || user?.role === 'ADMIN';
  useEffect(() => { apiClient('/auth/me').then(data => setUser(data.user)).catch(() => setUser(null)).finally(() => setChecking(false)); }, []);
  useEffect(() => { setSearch(''); setPriorityFilter('all'); setError(''); setMenu(false); }, [path]);
  useEffect(() => {
    if (preview) { setTickets(sampleTickets); setCategories(sampleCategories); setLoadingTickets(false); setTicketsLoadError(''); return; }
    setTickets([]); setCategories([]);
    setTicketsLoadError('');
    if (!user) { setLoadingTickets(false); return; }
    let active = true;
    setLoadingTickets(true);
    Promise.all([apiClient('/tickets'), apiClient('/categories'), user.role === 'END_USER' ? Promise.resolve([]) : apiClient('/agents')])
      .then(([data, list, staff]) => { if (active) { setTickets(data.items); setCategories(list); setAgents(staff); } })
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
    const body = new FormData(); body.append('file', file);
    return apiClient(endpoint, { method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, body });
  }
  async function action(work) {
    setBusy(true); setError('');
    try { await work(); return true; } catch (failure) { setError(failure.message); return false; } finally { setBusy(false); }
  }
  async function openTicket(ticket) {
    await action(async () => setSelected(preview ? ticket : await apiClient(`/tickets/${ticket.id}`)));
  }
  async function changeStatus(ticket, status) {
    const next = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED' };
    if (next[ticket.status] !== status) { setError('Chỉ chuyển Mới tạo → Đang xử lý → Đã giải quyết.'); return; }
    await action(async () => {
      const updated = preview ? { ...ticket, status, version: ticket.version + 1 } : await mutate(`/tickets/${ticket.id}/status`, 'PATCH', { status, version: ticket.version });
      setTickets(current => current.map(item => item.id === ticket.id ? updated : item));
      setSelected(current => current?.id === ticket.id ? { ...current, ...updated } : current);
    });
  }
  if (checking) return <div className="loading" role="status">Đang tải Smart IT Helpdesk…</div>;
  if ((!user && !preview) || path === '/login') return <main className="login-page"><section className="login-story"><div className="brand"><GraduationCap size={24} /> BTEC FPT · Cổng hỗ trợ CNTT</div><div><h1>Học tập liền mạch.<br />Hỗ trợ luôn bên bạn.</h1><p>Kết nối với đội ngũ IT, gửi yêu cầu và theo dõi tiến độ xử lý — tất cả trong một không gian.</p><div className="scene-card"><Suspense fallback={<div className="loading">Đang tải minh họa…</div>}><SupportScene /></Suspense><span className="scene-label"><CheckCircle2 size={17} /> Luôn sẵn sàng hỗ trợ</span></div><div className="trust"><span><ShieldCheck size={18} />An toàn & bảo mật</span><span><Headphones size={18} />Đồng hành cùng bạn</span></div></div><small>© 2026 Smart IT Helpdesk. Bảo lưu mọi quyền.</small></section><section className="login-form"><span className="help">Cổng hỗ trợ sinh viên và cán bộ</span><div className="login-content"><div className="brand big"><Headphones />Smart IT Helpdesk</div><h2>Đăng nhập hệ thống</h2><p>Chào mừng bạn trở lại! Đăng nhập để tiếp tục.<br />Dành cho Sinh viên, Kỹ thuật viên & Quản trị viên.</p><a className="button google" href="/api/v1/auth/google"><span className="google-letter">G</span>Tiếp tục với Google<ArrowRight size={18} /></a><p className="login-note"><ShieldCheck size={16} />Sử dụng tài khoản đã được quản trị viên phê duyệt.</p>{import.meta.env.MODE === 'development' && <><div className="divider">Xem thiết kế trước khi đăng nhập</div><Link className="button secondary full" to="/kanban?preview=1">Xem giao diện mẫu<ArrowRight size={17} /></Link></>}</div><small><ShieldCheck size={16} />Đăng nhập an toàn qua Google</small></section></main>;

  const visibleTickets = tickets.filter(ticket => (priorityFilter === 'all' || ticket.priority === priorityFilter)
    && `${ticket.title} ${ticket.ticket_code}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    if (sort === 'sla') return (Date.parse(a.resolution_deadline_at) || Infinity) - (Date.parse(b.resolution_deadline_at) || Infinity);
    return sort === 'priority' ? a.priority.localeCompare(b.priority) : b.id - a.id;
  });
  return <div className="workspace"><a className="skip-link" href="#main-content">Bỏ qua điều hướng</a><aside id="workspace-navigation" className={`sidebar ${menu ? 'open' : ''}`}><Link className="wordmark" to={url('/kanban')}>IT DESK<small>WORKSPACE</small></Link><nav>{[[LayoutDashboard, '/kanban', 'Bảng điều khiển'], [Ticket, '/tickets/new', 'Tạo yêu cầu'], [BarChart3, '/dashboard', 'Báo cáo'], [SlidersHorizontal, '/rules', 'Quy tắc'], [Users, '/users', 'Người dùng']].filter(([,route]) => admin || !['/dashboard','/rules','/users'].includes(route)).map(([Icon, route, label]) => <NavLink key={route} to={url(route)}><Icon size={21} /><span>{label}</span></NavLink>)}</nav><div className="sidebar-user"><div className="avatar">{preview ? 'M' : user?.full_name?.slice(0,1)}</div><strong>{preview ? 'Bản xem mẫu' : user?.full_name}</strong><small>{preview ? 'Dữ liệu minh họa' : user?.role}</small><button className="icon-button" aria-label="Đăng xuất" onClick={() => action(async () => { if (!preview) await mutate('/auth/logout', 'POST', {}); setUser(null); navigate('/login'); })}><LogOut size={17} /></button></div></aside>{menu && <button className="mobile-scrim" aria-label="Đóng điều hướng" onClick={() => setMenu(false)} />}<main id="main-content" className="main">{!preview && <div className="notification-bar"><NotificationMenu mutate={mutate} onTicket={id => action(async () => setSelected(await apiClient(`/tickets/${id}`)))} /></div>}<div className="mobile-bar"><button className="icon-button" aria-label="Mở điều hướng" aria-expanded={menu} aria-controls="workspace-navigation" onClick={() => setMenu(!menu)}><Menu /></button><strong>IT DESK</strong></div>{preview && <div className="preview-bar">Chế độ xem giao diện · Dữ liệu mẫu, thay đổi chỉ tồn tại trong phiên này.<Link to="/login">Đăng nhập thật →</Link></div>}{error && <div className="alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Ẩn lỗi"><X size={16} /></button></div>}{notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Ẩn thông báo"><X size={16} /></button></div>}{path === '/tickets/new' && ticketsLoadError && <div className="alert" role="alert">Không tải được danh mục: {ticketsLoadError}<button className="button secondary" onClick={() => setTicketReload(value => value + 1)}>Thử lại</button></div>}

    {['/', '/kanban', '/tickets'].includes(path) && <><header className="page-header"><div><small>QUẢN LÝ TICKET</small><h1>Bảng Kanban Tương tác</h1></div><Link className="button primary" to={url('/tickets/new')}><Plus size={17} />Tạo yêu cầu</Link></header><div className="toolbar"><select aria-label="Sắp xếp ticket" value={sort} onChange={event => setSort(event.target.value)}><option value="sla">SLA gần nhất</option><option value="priority">Mức độ ưu tiên</option><option value="newest">Mới nhất trước</option></select><select aria-label="Lọc mức độ ưu tiên" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}><option value="all">Tất cả ưu tiên</option>{Object.entries(priorities).map(([key, label]) => <option key={key} value={key}>{key} · {label}</option>)}</select><div className="search"><Search size={17} /><input aria-label="Tìm ticket" placeholder="Tìm theo mã ticket hoặc tiêu đề…" value={search} onChange={event => setSearch(event.target.value)} /></div><span className="muted">{loadingTickets ? 'Đang tải ticket…' : ticketsLoadError ? 'Không tải được ticket' : `${visibleTickets.length} ticket${preview ? '' : ' trong trang đầu (tối đa 30)'}`}</span></div><div className="kanban">{loadingTickets ? <div className="board-state loading" role="status">Đang tải ticket…</div> : ticketsLoadError ? <div className="board-state alert" role="alert">Không tải được ticket: {ticketsLoadError}<button className="button secondary" onClick={() => setTicketReload(value => value + 1)}>Thử lại</button></div> : Object.entries(statuses).map(([status, label]) => <section key={status} className="kanban-column" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const ticket = tickets.find(item => item.id === Number(event.dataTransfer.getData('text/plain'))); if (ticket) changeStatus(ticket, status); }}><header><span>{label.toUpperCase()}<small>({status.replace('_', ' ')})</small></span><span className="count">{visibleTickets.filter(ticket => ticket.status === status).length}</span></header>{visibleTickets.filter(ticket => ticket.status === status).map(ticket => <button className={`ticket-card ${ticket.priority === 'P1' ? 'critical' : ''}`} key={ticket.id} draggable={preview || user?.role !== 'END_USER'} onDragStart={event => event.dataTransfer.setData('text/plain', ticket.id)} onClick={() => openTicket(ticket)}><div className="card-top"><small>#{ticket.ticket_code}</small><Badge priority={ticket.priority} /></div><h3>{ticket.title}</h3><p>{categories.find(category => category.id === ticket.category_id)?.name || 'Chưa phân loại'}</p><footer><span className="person"><span className="avatar tiny">{(ticket.reporter_name || ticket.reporter || 'U').slice(0,1)}</span>{ticket.reporter_name || ticket.reporter || `Người gửi #${ticket.reporter_id}`}</span><Sla ticket={ticket} /></footer></button>)}{!visibleTickets.some(ticket => ticket.status === status) && <div className="empty">Chưa có ticket</div>}</section>)}</div><div className="board-footer"><span><span className="red-dot" />Viền đỏ: P1 · Khẩn cấp</span><span>Kéo thẻ hoặc mở ticket để cập nhật trạng thái</span></div></>}

    {path === '/tickets/new' && <CreateTicket categories={categories} busy={busy} preview={preview} onCancel={() => navigate(url('/kanban'))} onSubmit={(data, file) => action(async () => { const ticket = preview ? { ...data, id: Date.now(), ticket_code: `DEMO-${tickets.length + 1}`, priority: data.impact === 'organization' ? 'P1' : 'P3', status: 'OPEN', reporter: 'Bạn', comments: [], version: 1 } : await mutate('/tickets', 'POST', data); setTickets(current => [ticket, ...current]); let message = preview ? 'Đã thêm ticket vào phiên xem mẫu.' : 'Đã gửi yêu cầu hỗ trợ.'; if (file && !preview) { try { await mutateFile(`/tickets/${ticket.id}/attachments`, file); message += ' Ảnh đã được lưu riêng tư.'; } catch { message += ' Ticket đã lưu, nhưng ảnh chưa tải lên; mở ticket để thử lại.'; } } setNotice(message); navigate(url('/kanban')); })} />}

    {path === '/rules' && admin && <Suspense fallback={<div className="loading" role="status">Đang tải trang quy tắc…</div>}><RulesPage preview={preview} mutate={mutate} /></Suspense>}
    {path === '/users' && admin && <Suspense fallback={<div className="loading" role="status">Đang tải trang người dùng…</div>}><UsersPage preview={preview} mutate={mutate} selfId={user?.id} /></Suspense>}
    {path === '/dashboard' && admin && <Suspense fallback={<div className="loading">Đang tải báo cáo…</div>}>{preview ? <PreviewDashboard preview /> : <RealDashboard />}</Suspense>}
    {['/rules', '/dashboard', '/users'].includes(path) && !admin && <div className="empty" role="alert">Trang này dành cho quản trị viên.</div>}
    {!['/', '/kanban','/tickets','/tickets/new','/rules','/dashboard','/users'].includes(path) && <div className="empty"><h1>Không tìm thấy trang</h1><Link to={url('/kanban')}>Về bảng ticket</Link></div>}
  </main>
  {selected && <Dialog title={`#${selected.ticket_code} — ${selected.title}`} wide onClose={() => setSelected(null)}><TicketDetail Sla={Sla} Badge={Badge} ticket={selected} preview={preview} user={user} categories={categories} agents={agents} busy={busy} action={action} onStatus={status => changeStatus(selected, status)} onAcknowledge={() => action(async () => { const updated = await mutate(`/tickets/${selected.id}/acknowledge`, 'POST', { version: selected.version }); setSelected(current => ({ ...current, ...updated, history: [...(current.history || []), { id: `ack-${updated.version}`, event_type: 'ACKNOWLEDGED', new_value: updated.acknowledged_at, created_at: updated.acknowledged_at }] })); setTickets(current => current.map(ticket => ticket.id === updated.id ? updated : ticket)); })} onReply={message => action(async () => { const comment = preview ? { id: Date.now(), message, author_name: 'Bạn' } : await mutate(`/tickets/${selected.id}/comments`, 'POST', { message }); const updated = { ...selected, comments: [...(selected.comments || []), comment] }; setSelected(updated); setTickets(current => current.map(ticket => ticket.id === updated.id ? updated : ticket)); })} onAssign={assigneeId => action(async () => { const updated = await mutate(`/tickets/${selected.id}/assign`, 'PATCH', { assignee_id: assigneeId, version: selected.version }); const detail = { ...selected, ...updated }; setSelected(detail); setTickets(current => current.map(ticket => ticket.id === updated.id ? detail : ticket)); })} onUpload={file => action(async () => { await mutateFile(`/tickets/${selected.id}/attachments`, file); setSelected(await apiClient(`/tickets/${selected.id}`)); setNotice('Ảnh đã được lưu riêng tư.'); })} /></Dialog>}

  </div>;
}
