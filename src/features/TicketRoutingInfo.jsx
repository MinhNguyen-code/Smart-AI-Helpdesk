import { routingLabels } from './routingModel';

const reasons = { KEYWORD: 'Nội dung khớp từ khóa chuyên môn', CATEGORY: 'Theo danh mục đã chọn',
  CATEGORY_AND_KEYWORD: 'Danh mục và nội dung cùng khớp nhóm', CATEGORY_CONTENT_CONFLICT: 'Danh mục và nội dung khác nhóm',
  AMBIGUOUS_CONTENT: 'Nội dung liên quan nhiều nhóm', NO_UNIQUE_SIGNAL: 'Chưa đủ thông tin xác định nhóm', CATEGORY_NOT_ROUTED: 'Danh mục chưa có tuyến' };

export default function TicketRoutingInfo({ ticket }) {
  if (!ticket.routing_status && !ticket.assignee_name) return null;
  const explanation = ticket.routing_explanation;
  return <div className="ticket-routing-info">
    {ticket.routing_status && <small>{routingLabels[ticket.routing_status]}</small>}
    {ticket.routing_status && <span><strong>Nhóm:</strong> {ticket.owner_unit_name || 'Chờ Admin xác định'}</span>}
    <span><strong>Phụ trách:</strong> {ticket.assignee_name || (ticket.assignee_id ? `Kỹ thuật viên #${ticket.assignee_id}` : 'Chưa giao người')}
      {Number.isFinite(ticket.assignee_open_count) && ` · ${ticket.assignee_open_count} ticket mở`}</span>
    {explanation && <small>{explanation.source === 'MANUAL' ? 'Admin đã chuyển tuyến'
      : explanation.source === 'ASSIGNMENT' ? 'Phân công / nhận việc trong nhóm'
        : reasons[explanation.reason] || 'Cần Admin kiểm tra tuyến'}
      {explanation.auto_assigned && ticket.assignee_id ? ' · Tự giao theo tải mở thấp nhất tại lúc phân công' : ''}
      {Number.isFinite(explanation.load_before) ? ` (${explanation.load_before} việc trước khi giao)` : ''}
    </small>}
  </div>;
}
