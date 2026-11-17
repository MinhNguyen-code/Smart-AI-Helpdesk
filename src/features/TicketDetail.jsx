import { useId, useState } from 'react';
import { Clock3, Paperclip } from 'lucide-react';
import { priorities, statuses } from './previewData';

const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const impacts = { individual: 'Cá nhân', department: 'Phòng ban', organization: 'Toàn tổ chức' };
const events = { CREATED: 'Tạo ticket', ACKNOWLEDGED: 'Xác nhận tiếp nhận', COMMENT_ADDED: 'Thêm phản hồi', ASSIGNED: 'Phân công kỹ thuật viên', STATUS_CHANGED: 'Đổi trạng thái', ATTACHMENT_ADDED: 'Thêm ảnh đính kèm' };

export default function TicketDetail({ ticket, preview, user, categories, agents, busy, onStatus, onAcknowledge, onReply, onAssign, onUpload, Sla, Badge }) {
  const [reply, setReply] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const fileInputId = useId();
  const staff = preview || ['ADMIN', 'IT_AGENT'].includes(user?.role);
  const assignee = agents.find(agent => agent.id === ticket.assignee_id);
  function choose(selected) {
    if (!selected) return;
    if (!['image/png','image/jpeg','image/webp'].includes(selected.type) || selected.size > 10 * 1024 * 1024) {
      setFileError('Chọn ảnh PNG, JPG hoặc WebP tối đa 10 MB.'); return;
    }
    setFileError(''); setFile(selected);
  }
  return <div className="ticket-detail"><section>
    <h3>Mô tả chi tiết</h3><p className="description">{ticket.description}</p>
    <div className="attachments"><h3>Tệp đính kèm</h3>{ticket.attachments?.length ? ticket.attachments.map(item => <a key={item.id} href={`${base}/tickets/${ticket.id}/attachments/${item.id}`} className="attachment-link"><Paperclip size={16} />{item.original_filename}<small>{Math.ceil(item.size_bytes / 1024)} KB</small></a>) : <p className="muted">Chưa có tệp đính kèm.</p>}
      {!preview && <form className="attachment-form" onSubmit={event => { event.preventDefault(); if (!file) return; onUpload(file).then(ok => { if (ok) setFile(null); }); }}><input id={fileInputId} className="file-input" type="file" aria-label="Chọn ảnh đính kèm" accept="image/png,image/jpeg,image/webp" onChange={event => choose(event.target.files[0])} /><label htmlFor={fileInputId} className="button secondary file-trigger"><Paperclip size={16} aria-hidden="true"/>Chọn ảnh</label><span className="muted">{file?.name || 'Chưa chọn ảnh'}</span><button className="button secondary" disabled={!file || busy}>Tải ảnh lên</button></form>}
      {fileError && <p role="alert" className="urgent">{fileError}</p>}
    </div><hr />
    <h3>Lịch sử trao đổi</h3><div className="comments">{ticket.comments?.length ? ticket.comments.map(comment => <article key={comment.id}><span className="avatar tiny">U</span><div><strong>{comment.author_name || `Người dùng #${comment.author_id || 'mẫu'}`}</strong><p>{comment.message}</p></div></article>) : <p className="muted">Chưa có phản hồi.</p>}</div>
    <form onSubmit={event => { event.preventDefault(); if (!reply.trim()) return; onReply(reply).then(ok => { if (ok) setReply(''); }); }}><label>Phản hồi<textarea value={reply} onChange={event => setReply(event.target.value)} required maxLength={10000} placeholder="Nhập nội dung phản hồi…" /></label><div className="form-actions"><button className="button dark" disabled={busy}>Gửi phản hồi</button></div></form>
    <hr /><h3>Nhật ký ticket</h3><div className="history">{ticket.history?.length ? ticket.history.map(item => <p key={item.id}><strong>{events[item.event_type] || item.event_type}</strong><span>{item.new_value || ''}</span><small>{new Date(item.created_at).toLocaleString('vi-VN')}</small></p>) : <p className="muted">Chưa có sự kiện nào.</p>}</div>
  </section><aside>
    <div className={`sla-box ${ticket.priority === 'P1' ? 'danger' : ''}`}><Clock3 size={19} /><strong>THỜI HẠN SLA</strong><Sla ticket={ticket} /><small>Theo dõi thời gian xử lý cam kết.</small></div>
    <div className="detail-field"><strong>Tiếp nhận (ACK)</strong><span>{ticket.acknowledged_at ? new Date(ticket.acknowledged_at).toLocaleString('vi-VN') : 'Chưa tiếp nhận'}</span>{staff && !preview && !ticket.acknowledged_at && ticket.status !== 'RESOLVED' && <button type="button" className="button secondary" disabled={busy} onClick={onAcknowledge}>Xác nhận tiếp nhận</button>}</div>
    <label>Trạng thái<select value={ticket.status} disabled={busy || !staff} onChange={event => onStatus(event.target.value)}>{Object.entries(statuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <div className="detail-field"><strong>Người phụ trách</strong><div className="assignee"><span className="avatar">IT</span>{assignee?.full_name || ticket.assignee_name || (ticket.assignee_id ? `Kỹ thuật viên #${ticket.assignee_id}` : 'Chưa phân công')}</div></div>
    {!preview && staff && <label>Phân công<select value="" disabled={busy} onChange={event => { if (event.target.value) onAssign(Number(event.target.value)); }}><option value="">Chọn kỹ thuật viên…</option>{agents.filter(agent => user.role === 'ADMIN' || agent.id === user.id).map(agent => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}</select></label>}
    <div className="detail-field"><strong>Danh mục</strong><span>{categories.find(category => category.id === ticket.category_id)?.name || 'Chưa phân loại'}</span></div>
    <div className="detail-field"><strong>Mức độ ảnh hưởng</strong><span>{impacts[ticket.impact] || ticket.impact}</span></div>
    <div className="detail-field"><strong>Mức độ ưu tiên</strong><Badge priority={ticket.priority} /></div>
    <div className="evidence"><strong>Từ khóa nhận diện</strong><small>RULE-BASED</small><p>{ticket.priority_reason || `Ưu tiên ${priorities[ticket.priority] || ticket.priority}`}</p></div>
  </aside></div>;
}
