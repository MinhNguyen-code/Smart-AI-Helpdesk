import { useId, useState } from 'react';
import { Clock3, Paperclip } from 'lucide-react';
import { priorities, statuses } from './previewData';
import TicketWorkflowActions from './TicketWorkflowActions';
import { kanbanColumn, workflowStatus } from './ticketWorkflow';
import TicketProgress from './TicketProgress';

const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const impacts = { individual: 'Cá nhân', department: 'Phòng ban', organization: 'Toàn tổ chức' };
const events = { CREATED: 'Tạo ticket', ACKNOWLEDGED: 'Xác nhận tiếp nhận', COMMENT_ADDED: 'Thêm phản hồi', ASSIGNED: 'Phân công kỹ thuật viên', STATUS_CHANGED: 'Đổi trạng thái', ATTACHMENT_ADDED: 'Thêm ảnh đính kèm' };
Object.assign(events, { INFORMATION_REQUESTED: 'Yêu cầu bổ sung thông tin', WORK_RESUMED: 'Tiếp tục xử lý', RESOLVED: 'Ghi nhận đã xử lý', CLOSED: 'Đóng ticket', REOPENED: 'Mở lại ticket' });
export default function TicketDetail({ ticket, preview, user, categories, agents, busy, onStatus, onAcknowledge, onReply, onAssign, onUpload, onRefresh, onWorkflow, Sla, Badge }) {
  const [drafts, setDrafts] = useState({ reply_public: '', reply_internal: '' });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [visibility, setVisibility] = useState('reply_public');
  const fileInputId = useId();
  const staff = preview || ['ADMIN', 'IT_AGENT'].includes(user?.role);
  const assignee = agents.find(agent => agent.id === ticket.assignee_id);
  const workflow = !preview && Array.isArray(ticket.allowed_actions);
  const can = name => workflow && ticket.allowed_actions.includes(name);
  const publicReply = !workflow || can('reply_public');
  const internalReply = can('reply_internal');
  const replyAction = (visibility === 'reply_internal' && internalReply) || !publicReply ? 'reply_internal' : 'reply_public';
  const reply = drafts[replyAction];
  const setReply = value => setDrafts(current => ({ ...current, [replyAction]: value }));
  const uploadOversight = workflow && ticket.oversight_actions?.includes('attach');
  const replyOversight = workflow && ticket.oversight_actions?.includes(replyAction);
  const statusLabel = workflowStatus[ticket.status] || statuses[ticket.status];
  async function upload(event) {
    event.preventDefault();
    if (!file) return;
    const reason = new FormData(event.currentTarget).get('reason');
    if (await onUpload(file, reason)) setFile(null);
  }
  async function submitReply(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    const reason = new FormData(event.currentTarget).get('reason');
    const ok = workflow ? await onWorkflow(replyAction, { message: reply, ...(reason ? { reason } : {}) }) : await onReply(reply);
    if (ok) setReply('');
  }
  function choose(selected) {
    if (!selected) return;
    if (!['image/png','image/jpeg','image/webp'].includes(selected.type) || selected.size > 10 * 1024 * 1024) {
      setFileError('Chọn ảnh PNG, JPG hoặc WebP tối đa 10 MB.'); return;
    }
    setFileError(''); setFile(selected);
  }
  async function refresh() {
    setRefreshing(true);
    setRefreshMessage('');
    try {
      await onRefresh();
      setRefreshMessage('Đã cập nhật trạng thái.');
    } catch {
      setRefreshMessage('Không tải được trạng thái mới. Hãy thử lại.');
    } finally {
      setRefreshing(false);
    }
  }
  return <><TicketProgress status={kanbanColumn(ticket.status)} />
  {!preview && <div className="ticket-progress-refresh">
    <button type="button" className="button secondary" disabled={busy || refreshing} onClick={refresh}>
      {refreshing ? 'Đang cập nhật…' : 'Làm mới trạng thái'}
    </button>
    <span role="status">{refreshMessage}</span>
  </div>}
  <div className="ticket-mobile-summary"><div><strong>Hạn xử lý SLA</strong><Sla ticket={ticket} /></div><Badge priority={ticket.priority} /></div>
  <div className="ticket-detail"><section>
    <h3>Mô tả chi tiết</h3><p className="description">{ticket.description}</p>
    <div className="attachments"><h3>Tệp đính kèm</h3>{ticket.attachments?.length ? ticket.attachments.map(item => <a key={item.id} href={`${base}/tickets/${ticket.id}/attachments/${item.id}`} className="attachment-link"><Paperclip size={16} />{item.original_filename}<small>{Math.ceil(item.size_bytes / 1024)} KB</small></a>) : <p className="muted">Chưa có tệp đính kèm.</p>}
      {!preview && (!workflow || can('attach')) && <form className="attachment-form" onSubmit={upload}><input id={fileInputId} className="file-input" type="file" aria-label="Chọn ảnh đính kèm" accept="image/png,image/jpeg,image/webp" onChange={event => choose(event.target.files[0])} /><label htmlFor={fileInputId} className="button secondary file-trigger"><Paperclip size={16} aria-hidden="true"/>Chọn ảnh</label><span className="muted">{file?.name || 'Chưa chọn ảnh'}</span>{uploadOversight && <label>Lý do đính kèm<input name="reason" required maxLength={1000}/></label>}<button className="button secondary" disabled={!file || busy}>Tải ảnh lên</button></form>}
      {fileError && <p role="alert" className="urgent">{fileError}</p>}
    </div><hr />
    <h3>Lịch sử trao đổi</h3><div className="comments">{ticket.comments?.length ? ticket.comments.map(comment => <article key={comment.id}><span className="avatar tiny">U</span><div><strong>{comment.author_name || `Người dùng #${comment.author_id || 'mẫu'}`}</strong>{comment.visibility === 'internal' && <small> · Ghi chú nội bộ</small>}<p>{comment.message}</p></div></article>) : <p className="muted">Chưa có phản hồi.</p>}</div>
    {workflow && ticket.status === 'PENDING_USER' && user?.id === ticket.reporter_id && publicReply &&
      <p className="notice">Kỹ thuật viên đang chờ thông tin. Gửi phản hồi để tiếp tục xử lý.</p>}
    {(publicReply || internalReply) && <form onSubmit={submitReply}>
      {publicReply && internalReply && <label>Loại phản hồi<select value={replyAction} onChange={event => setVisibility(event.target.value)}><option value="reply_public">Công khai</option><option value="reply_internal">Nội bộ</option></select></label>}
      <label>{replyAction === 'reply_internal' ? 'Ghi chú nội bộ' : 'Phản hồi'}<textarea value={reply} onChange={event => setReply(event.target.value)} required maxLength={10000} placeholder="Nhập nội dung phản hồi…" /></label>
      {replyOversight && <label>Lý do can thiệp của quản trị viên<input name="reason" required maxLength={1000}/></label>}
      <div className="form-actions"><button className="button dark" disabled={busy}>{replyAction === 'reply_internal' ? 'Lưu ghi chú nội bộ' : 'Gửi phản hồi'}</button></div>
    </form>}
    <hr /><h3>Nhật ký ticket</h3><div className="history">{ticket.history?.length ? ticket.history.map(item => <p key={item.id}><strong>{events[item.event_type] || item.event_type}</strong><span>{item.new_value || ''}{workflow && item.note ? ` · ${item.note}` : ''}</span><small>{new Date(item.created_at).toLocaleString('vi-VN')}</small></p>) : <p className="muted">Chưa có sự kiện nào.</p>}</div>
  </section><aside>
    <div className={`sla-box ${ticket.priority === 'P1' ? 'danger' : ''}`}><Clock3 size={19} /><strong>THỜI HẠN SLA</strong><Sla ticket={ticket} /><small>Theo dõi thời gian xử lý cam kết.</small></div>
    <div className="detail-field"><strong>Tiếp nhận (ACK)</strong><span>{ticket.acknowledged_at ? new Date(ticket.acknowledged_at).toLocaleString('vi-VN') : 'Chưa tiếp nhận'}</span>{!workflow && staff && !preview && !ticket.acknowledged_at && ticket.status !== 'RESOLVED' && <button type="button" className="button secondary" disabled={busy} onClick={onAcknowledge}>Xác nhận tiếp nhận</button>}</div>
    {workflow ? <div className="detail-field"><strong>Trạng thái</strong><span>{statusLabel}</span></div>
      : <label>Trạng thái<select value={ticket.status} disabled={busy || !staff} onChange={event => onStatus(event.target.value)}>{Object.entries(statuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
    {workflow && ticket.closed_at && <div className="detail-field"><strong>Đóng lúc</strong><span>{new Date(ticket.closed_at).toLocaleString('vi-VN')}</span></div>}
    <div className="detail-field"><strong>Người phụ trách</strong><div className="assignee"><span className="avatar">IT</span>{assignee?.full_name || ticket.assignee_name || (ticket.assignee_id ? `Kỹ thuật viên #${ticket.assignee_id}` : 'Chưa phân công')}</div></div>
    {!workflow && !preview && staff && <label>Phân công<select value="" disabled={busy} onChange={event => { if (event.target.value) onAssign(Number(event.target.value)); }}><option value="">Chọn kỹ thuật viên…</option>{agents.filter(agent => user.role === 'ADMIN' || agent.id === user.id).map(agent => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}</select></label>}
    {workflow && <TicketWorkflowActions ticket={ticket} agents={agents} userId={user?.id} busy={busy} onCommand={onWorkflow}/>}
    <div className="detail-field"><strong>Danh mục</strong><span>{categories.find(category => category.id === ticket.category_id)?.name || 'Chưa phân loại'}</span></div>
    <div className="detail-field"><strong>Mức độ ảnh hưởng</strong><span>{impacts[ticket.impact] || ticket.impact}</span></div>
    <div className="detail-field"><strong>Mức độ ưu tiên</strong><Badge priority={ticket.priority} /></div>
    <div className="evidence"><strong>Từ khóa nhận diện</strong><small>RULE-BASED</small><p>{ticket.priority_reason || `Ưu tiên ${priorities[ticket.priority] || ticket.priority}`}</p></div>
  </aside></div></>;
}
