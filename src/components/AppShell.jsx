import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, Kanban, Clock3, Users,
  SlidersHorizontal, BarChart3, Headphones, GraduationCap, Workflow,
  ChevronLeft, ChevronRight, ChevronDown, Search, LogOut, Menu, Plus
} from 'lucide-react';
import NotificationMenu from '../features/NotificationMenu';

const STORAGE_KEY = 'smart_helpdesk_sidebar_collapsed';

const roleLabels = {
  ADMIN: 'Quản trị viên (ADMIN)',
  IT_AGENT: 'Kỹ thuật viên (IT_AGENT)',
  END_USER: 'Sinh viên / Cán bộ (END_USER)',
};

function readInitialCollapsed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function AppShell({
  user,
  preview,
  admin,
  path,
  routeLabels,
  url,
  search,
  onSearchChange,
  menu,
  setMenu,
  mutate,
  onOpenTicketById,
  onLogout,
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);
  const [ticketMenuOpen, setTicketMenuOpen] = useState(() =>
    ['/tickets', '/tickets/new'].includes(path)
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // Ignore storage failures in restricted browsing modes
    }
  }, [collapsed]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [path, location.search]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = event => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [userMenuOpen]);

  const displayName = preview ? 'Xem mẫu' : (user?.full_name || 'Người dùng');
  const displayRole = preview ? 'Minh họa' : (user?.role || 'END_USER');
  const displayInitial = preview ? 'M' : (user?.full_name?.slice(0, 1) || 'U');

  const isOverviewActive = path === '/';
  const isKanbanActive = path === '/kanban';
  const isTicketsListActive = path === '/tickets';
  const isNewTicketActive = path === '/tickets/new';
  const isRulesActive = path === '/rules' && location.hash !== '#sla';
  const isSlaActive = path === '/rules' && location.hash === '#sla';
  const isUsersActive = path === '/users';
  const isReportsActive = path === '/dashboard';

  function handleGlobalSearchSubmit(event) {
    event.preventDefault();
    if (!['/kanban', '/tickets'].includes(path)) {
      navigate(url('/kanban'));
    }
  }

  return (
    <div className={`workspace ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>

      <aside
        id="workspace-navigation"
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${menu ? 'open' : ''}`}
        aria-label="Điều hướng chính"
      >
        <div className="sidebar-brand-row">
          <Link className="wordmark" to={url('/')} title="BTEC FPT · Smart IT Helpdesk">
            <span className="brand-mark" aria-hidden="true">
              <GraduationCap size={17} />
            </span>
            {!collapsed && (
              <span className="wordmark-text">
                <strong>BTEC FPT</strong>
                <small>Smart IT Helpdesk</small>
              </span>
            )}
          </Link>
          <button
            type="button"
            className="icon-button sidebar-collapse-btn"
            aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            onClick={() => setCollapsed(value => !value)}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        <div className="sidebar-scroll">
          <div className="sidebar-section-label">{collapsed ? '•' : 'Vận hành'}</div>
          <nav aria-label="Menu vận hành">
            <NavLink
              to={url('/')}
              end
              className={isOverviewActive ? 'active' : ''}
              title="Tổng quan"
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              {!collapsed && <span>Tổng quan</span>}
            </NavLink>

            <div className="sidebar-group">
              <div className="sidebar-group-header">
                <NavLink
                  to={url('/tickets')}
                  end
                  className={isTicketsListActive || isNewTicketActive ? 'active' : ''}
                  title="Ticket"
                >
                  <Ticket size={18} aria-hidden="true" />
                  {!collapsed && <span>Ticket</span>}
                </NavLink>
                {!collapsed && (
                  <button
                    type="button"
                    className="icon-button sidebar-submenu-toggle"
                    aria-label="Mở rộng menu Ticket"
                    aria-expanded={ticketMenuOpen}
                    onClick={() => setTicketMenuOpen(v => !v)}
                  >
                    <ChevronDown size={15} className={ticketMenuOpen ? 'rotated' : ''} />
                  </button>
                )}
              </div>

              {!collapsed && ticketMenuOpen && (
                <div className="sidebar-submenu">
                  <NavLink to={url('/tickets')} end className={isTicketsListActive ? 'active' : ''}>
                    <span>Danh sách Ticket</span>
                  </NavLink>
                  <NavLink to={url('/tickets/new')} className={isNewTicketActive ? 'active' : ''}>
                    <Plus size={14} aria-hidden="true" />
                    <span>Tạo yêu cầu mới</span>
                  </NavLink>
                </div>
              )}

              {collapsed && (
                <NavLink
                  to={url('/tickets/new')}
                  className={isNewTicketActive ? 'active' : ''}
                  title="Tạo yêu cầu"
                >
                  <Plus size={18} aria-hidden="true" />
                </NavLink>
              )}
            </div>

            <NavLink
              to={url('/kanban')}
              className={isKanbanActive ? 'active' : ''}
              title="Kanban"
            >
              <Kanban size={18} aria-hidden="true" />
              {!collapsed && <span>Kanban</span>}
            </NavLink>
          </nav>

          {admin && (
            <>
              <div className="sidebar-section-label">{collapsed ? '•' : 'Quản trị'}</div>
              <nav aria-label="Menu quản trị">
                <NavLink to={url('/routing')} className={path === '/routing' ? 'active' : ''} title="Phân tuyến & đội hỗ trợ">
                  <Workflow size={18} aria-hidden="true" />{!collapsed && <span>Phân tuyến & đội hỗ trợ</span>}
                </NavLink>
                <NavLink
                  to={url('/rules') + '#sla'}
                  className={isSlaActive ? 'active' : ''}
                  title="SLA"
                >
                  <Clock3 size={18} aria-hidden="true" />
                  {!collapsed && <span>SLA</span>}
                </NavLink>

                <NavLink
                  to={url('/users')}
                  className={isUsersActive ? 'active' : ''}
                  title="Người dùng"
                >
                  <Users size={18} aria-hidden="true" />
                  {!collapsed && <span>Người dùng</span>}
                </NavLink>

                <NavLink
                  to={url('/rules')}
                  className={isRulesActive ? 'active' : ''}
                  title="Quy tắc & SLA"
                >
                  <SlidersHorizontal size={18} aria-hidden="true" />
                  {!collapsed && <span>Quy tắc & SLA</span>}
                </NavLink>

                <NavLink
                  to={url('/dashboard')}
                  className={isReportsActive ? 'active' : ''}
                  title="Báo cáo"
                >
                  <BarChart3 size={18} aria-hidden="true" />
                  {!collapsed && <span>Báo cáo</span>}
                </NavLink>
              </nav>
            </>
          )}
        </div>

        <div className="sidebar-user">
          <div className="avatar" title={displayName}>{displayInitial}</div>
          {!collapsed && (
            <div className="sidebar-user-meta">
              <strong>{displayName}</strong>
              <small>{displayRole}</small>
            </div>
          )}
          <button
            type="button"
            className="icon-button"
            aria-label="Đăng xuất"
            title="Đăng xuất"
            onClick={onLogout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {menu && (
        <button
          type="button"
          className="mobile-scrim"
          aria-label="Đóng điều hướng"
          onClick={() => setMenu(false)}
        />
      )}

      <main id="main-content" className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button mobile-menu-btn"
              aria-label="Mở điều hướng"
              aria-expanded={menu}
              aria-controls="workspace-navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={18} />
            </button>
            <span className="topbar-brand-crumb">
              <Headphones size={15} aria-hidden="true" />
              <span>IT Desk</span>
            </span>
            <span aria-hidden="true">/</span>
            <strong>{routeLabels[path] || 'Không gian làm việc'}</strong>
          </div>

          <div className="topbar-right">
            <form className="topbar-search" onSubmit={handleGlobalSearchSubmit} role="search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                aria-label="Tìm nhanh mã ticket hoặc tiêu đề"
                placeholder="Tìm mã hoặc tiêu đề ticket…"
                maxLength={200}
                value={search}
                onChange={event => onSearchChange(event.target.value)}
              />
            </form>

            {!preview && (
              <NotificationMenu
                mutate={mutate}
                onTicket={onOpenTicketById}
              />
            )}

            <div className="topbar-user-dropdown" ref={userMenuRef}>
              <button
                type="button"
                className="topbar-user-trigger"
                aria-label="Tài khoản người dùng"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen(v => !v)}
              >
                <span className="avatar tiny">{displayInitial}</span>
                <span className="topbar-user-info">
                  <strong>{displayName}</strong>
                  <small>{displayRole}</small>
                </span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>

              {userMenuOpen && (
                <div className="topbar-user-menu panel" role="menu">
                  <div className="topbar-user-menu-head">
                    <strong>{displayName}</strong>
                    <small>{roleLabels[user?.role] || (preview ? 'Chế độ xem giao diện mẫu' : displayRole)}</small>
                  </div>
                  <div className="topbar-user-menu-links">
                    <Link to={url('/')} onClick={() => setUserMenuOpen(false)}>Tổng quan hệ thống</Link>
                    <Link to={url('/kanban')} onClick={() => setUserMenuOpen(false)}>Bảng điều khiển Kanban</Link>
                    <Link to={url('/tickets/new')} onClick={() => setUserMenuOpen(false)}>Tạo yêu cầu hỗ trợ</Link>
                  </div>
                  <button
                    type="button"
                    className="topbar-user-logout"
                    onClick={() => { setUserMenuOpen(false); onLogout(); }}
                  >
                    <LogOut size={15} aria-hidden="true" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
