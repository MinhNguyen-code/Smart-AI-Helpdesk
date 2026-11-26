const choices = [
  ['all', 'Hàng chờ chung', 'Tất cả ticket được phép xem, gồm cả đã giải quyết.'],
  ['mine', 'Việc của tôi', 'Ticket đang mở được giao cho bạn, ưu tiên SLA gần nhất.'],
  ['team', 'Hàng chờ nhóm', 'Ticket đang mở của các nhóm bạn tham gia, gồm việc đã giao và chờ nhận.'],
  ['review', 'Cần Admin phân tuyến', 'Ticket đang mở chưa xác định được nhóm; Admin cần kiểm tra và phân tuyến.'],
];

export default function TicketQueueNav({ role, routing, scope, counts, onChange }) {
  const visible = choices.filter(([key]) => key === 'all' || key === 'mine' && role === 'IT_AGENT'
    || routing && (key === 'review' || key === 'team' && role === 'IT_AGENT'));
  return <section className="ticket-queues" aria-label="Hàng chờ công việc">
    <nav aria-label="Chọn hàng chờ">{visible.map(([key, label]) => <button type="button" key={key}
      className="button secondary" aria-pressed={scope === key} onClick={() => onChange(key)}>
      {label}{Number.isFinite(counts?.[key]) && <span className="queue-count">{counts[key]}</span>}
    </button>)}</nav>
    <p>{choices.find(([key]) => key === scope)?.[2]}</p>
  </section>;
}
