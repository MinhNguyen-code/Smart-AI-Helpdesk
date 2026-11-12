import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  BarChart3,
  Sliders,
  Bell,
  ShieldCheck,
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  ExternalLink,
} from 'lucide-react';
import { systemApi } from './api/client.js';

export default function App() {
  const location = useLocation();
  const [healthStatus, setHealthStatus] = useState(null);
  const [readyStatus, setReadyStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSystem() {
      try {
        const health = await systemApi.getHealth();
        setHealthStatus(health);
      } catch (err) {
        setHealthStatus({ status: 'DOWN', error: err.message });
      }

      try {
        const ready = await systemApi.getReady();
        setReadyStatus(ready);
      } catch (err) {
        setReadyStatus({ status: 'NOT_READY', error: err.message, database: err.data?.database });
      } finally {
        setLoading(false);
      }
    }

    checkSystem();
    const interval = setInterval(checkSystem, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: '/', label: 'Nền tảng & Hệ thống', icon: LayoutDashboard },
    { path: '/kanban', label: 'Bảng Kanban', icon: Ticket },
    { path: '/rules', label: 'Cấu hình Quy tắc', icon: Sliders },
    { path: '/dashboard', label: 'Báo cáo Hiệu suất', icon: BarChart3 },
    { path: '/login', label: 'Đăng nhập Google', icon: LogIn },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      {/* Sidebar - Matching wireframes visual style */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between">
        <div>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">IT DESK</span>
              <h1 className="text-base font-bold text-slate-900 leading-tight">WORKSPACE</h1>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile at Sidebar Bottom */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-semibold text-slate-700 text-xs">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">Administrator</p>
            <p className="text-[11px] text-slate-500 truncate">binmin109@gmail.com</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">Smart IT Helpdesk</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-800">
              {navItems.find((item) => item.path === location.pathname)?.label || 'Tổng quan'}
            </span>
          </div>

          {/* Real-time System Indicators */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span>API:</span>
              {healthStatus?.status === 'UP' ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> UP
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                  <AlertTriangle className="w-3 h-3" /> {loading ? 'Checking...' : 'DOWN'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>MySQL:</span>
              {readyStatus?.status === 'READY' ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> READY
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                  <AlertTriangle className="w-3 h-3" /> {readyStatus?.database?.connected ? 'READY' : 'STANDBY'}
                </span>
              )}
            </div>

            <button className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route
              path="/"
              element={
                <FoundationOverview
                  healthStatus={healthStatus}
                  readyStatus={readyStatus}
                  loading={loading}
                />
              }
            />
            <Route path="/login" element={<LoginPreview />} />
            <Route path="/kanban" element={<KanbanPreview />} />
            <Route path="/rules" element={<RulesPreview />} />
            <Route path="/dashboard" element={<DashboardPreview />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function FoundationOverview({ healthStatus, readyStatus, loading }) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Day 1 — Foundation Verification</h2>
        <p className="text-sm text-slate-500 mt-1">
          Báo cáo tình trạng nền tảng cốt lõi của hệ thống Smart IT Helpdesk (React + Express + MySQL).
        </p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Express API</span>
            <Server className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {healthStatus?.status || (loading ? '...' : 'UNKNOWN')}
            </span>
            <span className="text-xs text-slate-500">
              {healthStatus?.uptimeSeconds !== undefined ? `Uptime: ${healthStatus.uptimeSeconds}s` : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Cổng backend 5000 / Proxy Vite 5173</p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">MySQL Data Layer</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {readyStatus?.database?.connected ? 'CONNECTED' : 'STANDBY'}
            </span>
            <span className="text-xs text-slate-500">
              {readyStatus?.database?.targetDatabase || 'smart_it_helpdesk_dev'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {readyStatus?.database?.connected
              ? `Đã kết nối an toàn (Độ trễ: ${readyStatus.database.latencyMs}ms)`
              : 'Đang chờ dịch vụ MySQL kích hoạt trên cổng 3306'}
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Google Sign-In</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">PREPARED</span>
            <span className="text-xs text-slate-500">3 Gmail Accounts</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">OAuth 2.0 PKCE & Allowlist bảo mật</p>
        </div>
      </div>

      {/* Implementation Checklist */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Hạng Mục Kỹ Thuật Đã Hoàn Thành (Day 1)</h3>
        <ul className="divide-y divide-slate-100 text-sm">
          <li className="py-2.5 flex items-center justify-between">
            <span className="text-slate-700">1. Khởi tạo Git & Workspace tại thư mục gốc D:\Smart IT Helpdesk</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200">PASS</span>
          </li>
          <li className="py-2.5 flex items-center justify-between">
            <span className="text-slate-700">2. Đối soát toàn diện 7 Wireframe & Diagrams, giải quyết 8 mâu thuẫn yêu cầu</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200">PASS</span>
          </li>
          <li className="py-2.5 flex items-center justify-between">
            <span className="text-slate-700">3. Bộ tài liệu kỹ thuật đầy đủ: PROJECT_SPEC, ARCHITECTURE, DATABASE_DESIGN, API_SPEC, TEST_PLAN</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200">PASS</span>
          </li>
          <li className="py-2.5 flex items-center justify-between">
            <span className="text-slate-700">4. Backend Express với Helmet, CORS, Rate Limit, Session, Error Handler</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200">PASS</span>
          </li>
          <li className="py-2.5 flex items-center justify-between">
            <span className="text-slate-700">5. Lớp kết nối MySQL Knex, 10 bảng migration và seed dữ liệu tham chiếu</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200">PASS</span>
          </li>
          <li className="py-2.5 flex items-center justify-between">
            <span className="text-slate-700">6. Frontend React + Vite + Tailwind CSS với API client chuẩn</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200">PASS</span>
          </li>
          <li className="py-2.5 flex items-center justify-between">
            <span className="text-slate-700">7. Endpoint kiểm tra sức khỏe hệ thống: /api/v1/health & /api/v1/ready</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200">PASS</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function LoginPreview() {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg border border-slate-200 p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">BTEC FPT · Cổng hỗ trợ CNTT</span>
          <h2 className="text-2xl font-bold text-slate-900 leading-tight">
            Học tập liền mạch.<br />Hỗ trợ luôn bên bạn.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Kết nối với đội ngũ IT, gửi yêu cầu và theo dõi tiến độ xử lý — tất cả trong một không gian.
          </p>
          <div className="p-4 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Tài khoản Google phê duyệt ban đầu:</div>
            <div>• Admin: binmin109@gmail.com</div>
            <div>• IT Agent: nguyenbinhminh.1009.vn@gmail.com</div>
            <div>• End User: nguyenbinhminh.2006.vn@gmail.com</div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Đăng nhập hệ thống</h3>
            <p className="text-xs text-slate-500 mt-1">
              Dành cho Sinh viên, Kỹ thuật viên và Quản trị viên BTEC FPT.
            </p>
          </div>

          <a
            href="/api/v1/auth/google"
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-sm font-semibold text-slate-700 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Đăng nhập bằng tài khoản Google</span>
          </a>

          <p className="text-[11px] text-center text-slate-400">
            Hệ thống áp dụng OpenID Connect / OAuth 2.0 với cơ chế xác minh bảo mật PKCE.
          </p>
        </div>
      </div>
    </div>
  );
}

function KanbanPreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400">SCR-03 / QUẢN LÝ TICKET</span>
          <h2 className="text-xl font-bold text-slate-900">Bảng Kanban Tương tác</h2>
        </div>
        <Link
          to="/tickets/create"
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
        >
          + Tạo Yêu Cầu Mới
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['MỚI TẠO (OPEN)', 'ĐANG XỬ LÝ (IN PROGRESS)', 'ĐÃ GIẢI QUYẾT (RESOLVED)'].map((col, idx) => (
          <div key={idx} className="bg-slate-100/70 p-3.5 rounded-lg border border-slate-200/80 min-h-[400px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700">{col}</span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-white rounded-full border border-slate-200 text-slate-600">
                {idx === 0 ? 1 : idx === 1 ? 0 : 0}
              </span>
            </div>

            {idx === 0 && (
              <div className="p-3 bg-white rounded-md border-2 border-red-500 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-800">#INC-1024</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded">P1 - URGENT</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">Sập hệ thống quản lý điểm</h4>
                <p className="text-[11px] text-slate-500">Phòng Đào tạo · Vừa tạo</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Nguyên Hà</span>
                  <span className="text-red-600 font-semibold flex items-center gap-1">⏰ 14:59</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesPreview() {
  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-slate-400">SCR-06 / RULE-BASED ENGINE</span>
        <h2 className="text-xl font-bold text-slate-900">Cấu hình Rule-Based Engine</h2>
        <p className="text-xs text-slate-500">Thiết lập từ khóa để tự động gán mức độ ưu tiên.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
            <tr>
              <th className="p-3">Từ khóa</th>
              <th className="p-3">Hành động gán</th>
              <th className="p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="p-3 font-medium text-slate-800">server sap</td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-semibold border border-red-200">
                  Set: P1 - Urgent
                </span>
              </td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Active</span>
              </td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-slate-800">mat mang</td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-semibold border border-red-200">
                  Set: P1 - Urgent
                </span>
              </td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Active</span>
              </td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-slate-800">loi 500</td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-semibold border border-red-200">
                  Set: P1 - Urgent
                </span>
              </td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Active</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-slate-400">SCR-05 / BÁO CÁO THỐNG KÊ</span>
        <h2 className="text-xl font-bold text-slate-900">Báo cáo Hiệu suất (Dashboard)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng số Ticket', val: '120', sub: 'Trong khoảng thời gian đã chọn' },
          { label: 'Thời gian tiếp nhận TB (MTTA)', val: '8 phút', sub: 'Từ lúc tạo đến khi tiếp nhận' },
          { label: 'Thời gian xử lý TB (MTTR)', val: '1.5 giờ', sub: 'Từ lúc tiếp nhận đến khi xử lý' },
          { label: 'Tỷ lệ tuân thủ SLA', val: '95%', sub: '114 / 120 ticket đúng hạn SLA' },
        ].map((kpi, idx) => (
          <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{kpi.val}</div>
            <p className="text-[11px] text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
