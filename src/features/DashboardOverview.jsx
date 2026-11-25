import { Link } from 'react-router-dom';
import {
  Ticket, Clock3, CheckCircle2, AlertTriangle, ArrowRight,
  BarChart3, ShieldAlert
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { priorities } from './previewData';
import { kanbanColumn, workflowStatus } from './ticketWorkflow';

const statusLabels = {
  OPEN: 'Mới tạo',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Hoàn tất',
};

const previewDailySeries = [
  { label: 'Thứ 2', count: 18, mttrHours: 1.4 },
  { label: 'Thứ 3', count: 24, mttrHours: 1.6 },
  { label: 'Thứ 4', count: 20, mttrHours: 1.3 },
  { label: 'Thứ 5', count: 16, mttrHours: 1.5 },
  { label: 'Thứ 6', count: 22, mttrHours: 1.7 },
  { label: 'Thứ 7', count: 12, mttrHours: 1.4 },
  { label: 'CN', count: 8, mttrHours: 1.6 },
];

function formatRelativeOrDate(ticket) {
  if (ticket.created_at) {
    const d = new Date(ticket.created_at);
    if (Number.isFinite(d.getTime())) {
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  }
  if (ticket.resolution_deadline_at) {
    const mins = Math.ceil((new Date(ticket.resolution_deadline_at) - Date.now()) / 60000);
    return mins < 0 ? `Quá hạn ${-mins} phút` : `Hạn SLA: còn ${mins} phút`;
  }
  return 'Đã ghi nhận';
}

export function DashboardKpiCard({ icon: Icon, title, value, subnote, accent = 'blue' }) {
  return (
    <article className={`dash-kpi-card accent-${accent}`}>
      <div className="dash-kpi-top">
        <span className={`dash-kpi-icon icon-${accent}`} aria-hidden="true">
          <Icon size={20} />
        </span>
        <div className="dash-kpi-meta">
          <span className="dash-kpi-title">{title}</span>
          <strong className="dash-kpi-value">{value}</strong>
        </div>
      </div>
      {subnote && <small className="dash-kpi-note">{subnote}</small>}
    </article>
  );
}

export function DashboardTicketPreview({
  tickets,
  totalTickets,
  categories,
  loading,
  error,
  onOpenTicket,
  onRetry,
  url,
  Badge,
  Sla,
}) {
  const columns = [
    { key: 'OPEN', label: 'Mới tạo', tone: 'open' },
    { key: 'IN_PROGRESS', label: 'Đang xử lý', tone: 'progress' },
    { key: 'RESOLVED', label: 'Hoàn tất', tone: 'resolved' },
  ];

  const isSubset = Number.isFinite(totalTickets) && totalTickets > tickets.length;

  return (
    <section className="dash-section panel" aria-labelledby="dash-workflow-heading">
      <header className="dash-section-header">
        <div>
          <h2 id="dash-workflow-heading">Luồng xử lý sự cố (Ticket)</h2>
          <p>
            {isSubset
              ? `Hiển thị ${tickets.length}/${totalTickets} ticket gần nhất được phân quyền`
              : `Tổng hợp ${tickets.length} ticket theo trạng thái vận hành`}
          </p>
        </div>
        <Link className="dash-link-action" to={url('/kanban')}>
          <span>Xem tất cả ticket</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>

      {loading ? (
        <div className="dash-state loading" role="status">Đang tải luồng xử lý sự cố…</div>
      ) : error ? (
        <div className="dash-state alert" role="alert">
          <span>Không tải được danh sách ticket: {error}</span>
          {onRetry && <button type="button" className="button secondary" onClick={onRetry}>Thử lại</button>}
        </div>
      ) : (
        <div className="dash-workflow-grid">
          {columns.map(col => {
            const colTickets = tickets.filter(t => kanbanColumn(t.status) === col.key);
            const previewItems = colTickets.slice(0, 3);
            return (
              <div className={`dash-workflow-col tone-${col.tone}`} key={col.key}>
                <header className="dash-workflow-col-head">
                  <span className="dash-col-title">
                    <span className={`dash-col-dot dot-${col.tone}`} aria-hidden="true" />
                    <strong>{col.label}</strong>
                  </span>
                  <span className="dash-col-count">{colTickets.length}</span>
                </header>

                <div className="dash-workflow-cards">
                  {previewItems.map(ticket => (
                    <button
                      type="button"
                      key={ticket.id}
                      className={`ticket-card dash-preview-card ${ticket.priority === 'P1' ? 'critical' : ''}`}
                      onClick={() => onOpenTicket(ticket)}
                    >
                      <div className="card-top">
                        <small>#{ticket.ticket_code}</small>
                        <Badge priority={ticket.priority} />
                      </div>
                      <h3>{ticket.title}</h3>
                      <p>{categories.find(c => c.id === ticket.category_id)?.name || 'Chưa phân loại'}</p>
                      <footer>
                        <span className="person">
                          <span className="avatar tiny">
                            {(ticket.reporter_name || ticket.reporter || 'U').slice(0, 1)}
                          </span>
                          {ticket.reporter_name || ticket.reporter || `Người gửi #${ticket.reporter_id}`}
                        </span>
                        <Sla ticket={ticket} />
                      </footer>
                    </button>
                  ))}
                  {colTickets.length === 0 && (
                    <div className="dash-col-empty">Chưa có ticket ở trạng thái này</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function HighPriorityTicketTable({ tickets, categories, loading, onOpenTicket, url, Badge }) {
  const highPriority = tickets
    .filter(t => t.priority === 'P1' || t.priority === 'P2')
    .sort((a, b) => a.priority.localeCompare(b.priority) || b.id - a.id)
    .slice(0, 6);

  return (
    <section className="dash-section panel dash-high-priority" aria-labelledby="dash-hp-heading">
      <header className="dash-section-header">
        <div>
          <h2 id="dash-hp-heading">Sự cố ưu tiên cao gần đây</h2>
          <p>Các yêu cầu mức P1 (Khẩn cấp) và P2 (Cao) cần ưu tiên theo dõi</p>
        </div>
        <Link className="dash-link-action" to={url('/tickets')}>
          <span>Danh sách đầy đủ</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>

      {loading ? (
        <div className="dash-state loading" role="status">Đang tải sự cố ưu tiên cao…</div>
      ) : highPriority.length === 0 ? (
        <div className="dash-state empty">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Hiện không có sự cố P1 hoặc P2 nào trong danh sách.</span>
        </div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-hp-table">
            <thead>
              <tr>
                <th>Mã Ticket</th>
                <th>Tiêu đề sự cố</th>
                <th>Người báo / Danh mục</th>
                <th>Ưu tiên</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {highPriority.map(ticket => {
                const col = kanbanColumn(ticket.status);
                const statusText = workflowStatus[ticket.status] || statusLabels[col] || ticket.status;
                const categoryName = categories.find(c => c.id === ticket.category_id)?.name || 'Hạ tầng CNTT';
                const reporter = ticket.reporter_name || ticket.reporter || `Người gửi #${ticket.reporter_id}`;
                return (
                  <tr key={ticket.id} onClick={() => onOpenTicket(ticket)} className="dash-hp-row">
                    <td data-label="Mã Ticket">
                      <button
                        type="button"
                        className="dash-ticket-code-btn"
                        onClick={e => { e.stopPropagation(); onOpenTicket(ticket); }}
                      >
                        #{ticket.ticket_code}
                      </button>
                    </td>
                    <td data-label="Tiêu đề">
                      <strong className="dash-hp-title">{ticket.title}</strong>
                    </td>
                    <td data-label="Người báo">
                      <span className="dash-hp-reporter">{reporter}</span>
                      <small className="dash-hp-cat">{categoryName}</small>
                    </td>
                    <td data-label="Ưu tiên">
                      <Badge priority={ticket.priority} />
                    </td>
                    <td data-label="Trạng thái">
                      <span className={`dash-status-pill status-${col}`}>
                        {statusText}
                      </span>
                    </td>
                    <td data-label="Thời gian">
                      <small className="dash-hp-time">{formatRelativeOrDate(ticket)}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function DashboardOverview({
  tickets,
  totalTickets,
  categories,
  loadingTickets,
  ticketsLoadError,
  onOpenTicket,
  onRetryTickets,
  preview,
  user,
  url,
  Badge,
  Sla,
}) {
  const now = Date.now();
  const openCount = tickets.filter(t => kanbanColumn(t.status) === 'OPEN').length;
  const inProgressCount = tickets.filter(t => kanbanColumn(t.status) === 'IN_PROGRESS').length;

  const overdueCount = tickets.filter(t => {
    if (kanbanColumn(t.status) === 'RESOLVED') return false;
    return t.resolution_deadline_at && new Date(t.resolution_deadline_at).getTime() < now;
  }).length;

  const onTimeCount = tickets.filter(t => {
    if (kanbanColumn(t.status) === 'RESOLVED') {
      if (!t.resolution_deadline_at || !t.resolved_at) return true;
      return new Date(t.resolved_at) <= new Date(t.resolution_deadline_at);
    }
    return !t.resolution_deadline_at || new Date(t.resolution_deadline_at).getTime() >= now;
  }).length;

  // Compute real MTTR from loaded tickets when resolved_at & created_at exist
  const resolvedWithTimestamps = tickets.filter(
    t => t.resolved_at && t.created_at && Number.isFinite(Date.parse(t.resolved_at)) && Number.isFinite(Date.parse(t.created_at))
  );
  const avgSeconds = resolvedWithTimestamps.length
    ? resolvedWithTimestamps.reduce((sum, t) => sum + Math.max(0, (Date.parse(t.resolved_at) - Date.parse(t.created_at)) / 1000), 0) / resolvedWithTimestamps.length
    : null;

  const mttrDisplay = preview
    ? '1.5 giờ'
    : avgSeconds !== null
      ? (avgSeconds < 3600 ? `${Math.round(avgSeconds / 60)} phút` : `${(avgSeconds / 3600).toFixed(1)} giờ`)
      : 'Chưa có dữ liệu';

  // Build daily ticket chart from real tickets if timestamps exist, or preview series in preview mode
  const dailyMap = new Map();
  tickets.forEach(t => {
    if (t.created_at) {
      const dayKey = String(t.created_at).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);
      }
    }
  });
  const liveSeries = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([day, count]) => ({ label: day.slice(5).replace('-', '/'), count }));

  const chartData = preview ? previewDailySeries : liveSeries;
  const chartDataKey = preview ? 'mttrHours' : 'count';
  const chartUnit = preview ? 'giờ' : 'ticket';

  return (
    <div className="dash-overview">
      <header className="page-header dash-page-header">
        <div>
          <small>KHÔNG GIAN ĐIỀU HÀNH CNTT</small>
          <h1>Tổng quan</h1>
          <p>Tổng hợp tình hình xử lý sự cố và hiệu suất hệ thống IT</p>
        </div>
        <div className="dash-header-actions">
          {(preview || user?.role === 'ADMIN') && (
            <Link className="button secondary" to={url('/dashboard')}>
              <BarChart3 size={16} aria-hidden="true" />
              <span>Báo cáo chi tiết</span>
            </Link>
          )}
          <Link className="button primary" to={url('/tickets/new')}>
            <Ticket size={16} aria-hidden="true" />
            <span>Tạo yêu cầu mới</span>
          </Link>
        </div>
      </header>

      <section className="dash-kpi-grid" aria-label="Chỉ số vận hành chính">
        <DashboardKpiCard
          icon={Ticket}
          title="Ticket mở"
          value={loadingTickets ? '…' : openCount}
          subnote="Đang chờ tiếp nhận và phân công"
          accent="blue"
        />
        <DashboardKpiCard
          icon={Clock3}
          title="Đang xử lý"
          value={loadingTickets ? '…' : inProgressCount}
          subnote="Kỹ thuật viên đang khắc phục"
          accent="indigo"
        />
        <DashboardKpiCard
          icon={CheckCircle2}
          title="SLA đúng hạn"
          value={loadingTickets ? '…' : onTimeCount}
          subnote="Trong ngưỡng cam kết phản hồi"
          accent="green"
        />
        <DashboardKpiCard
          icon={AlertTriangle}
          title="Quá hạn"
          value={loadingTickets ? '…' : overdueCount}
          subnote="Cần ưu tiên đôn đốc xử lý ngay"
          accent="red"
        />
      </section>

      <DashboardTicketPreview
        tickets={tickets}
        totalTickets={totalTickets}
        categories={categories}
        loading={loadingTickets}
        error={ticketsLoadError}
        onOpenTicket={onOpenTicket}
        onRetry={onRetryTickets}
        url={url}
        Badge={Badge}
        Sla={Sla}
      />

      <div className="dash-analytics-grid">
        <section className="dash-section panel dash-mttr-panel" aria-labelledby="dash-mttr-heading">
          <header className="dash-section-header">
            <div>
              <h2 id="dash-mttr-heading">Thời gian xử lý trung bình</h2>
              <p>
                {preview
                  ? 'Thống kê MTTR minh họa (đơn vị: giờ)'
                  : 'Thống kê từ các ticket đã giải quyết trong danh sách hiện tại'}
              </p>
            </div>
            <div className="dash-mttr-badge">
              <span>MTTR hiện tại</span>
              <strong>{mttrDisplay}</strong>
            </div>
          </header>

          <div className="dash-mttr-chart">
            {loadingTickets ? (
              <div className="dash-state loading" role="status">Đang tải biểu đồ…</div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 14, right: 16, bottom: 6, left: -16 }}>
                  <defs>
                    <linearGradient id="dashAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip
                    formatter={value => [`${value} ${chartUnit}`, preview ? 'MTTR TB' : 'Số ticket']}
                    contentStyle={{ borderRadius: 10, borderColor: '#DCE6F3', fontSize: 12.5 }}
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey={chartDataKey}
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#dashAreaFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="dash-state empty">
                <span>
                  Chưa có dữ liệu chuỗi thời gian theo ngày trong phiên hiện tại.
                  {(preview || user?.role === 'ADMIN') && (
                    <> Xem thống kê SQL đầy đủ tại <Link to={url('/dashboard')} className="dash-inline-link">Báo cáo hiệu suất</Link>.</>
                  )}
                </span>
              </div>
            )}
          </div>
          <footer className="dash-chart-footer">
            <span>Đơn vị trục tung: {chartUnit}</span>
            <span>Nguồn: {preview ? 'Chế độ xem mẫu' : 'Dữ liệu phiên xác thực'}</span>
          </footer>
        </section>

        <HighPriorityTicketTable
          tickets={tickets}
          categories={categories}
          loading={loadingTickets}
          onOpenTicket={onOpenTicket}
          url={url}
          Badge={Badge}
        />
      </div>
    </div>
  );
}
