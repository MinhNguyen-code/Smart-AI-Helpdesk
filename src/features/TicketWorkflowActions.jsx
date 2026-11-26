import { useState } from 'react';

const labels = {
  acknowledge: 'Xác nhận tiếp nhận', claim: 'Nhận ticket', assign: 'Phân công', unassign: 'Hủy phân công',
  start: 'Bắt đầu xử lý', request_information: 'Yêu cầu bổ sung thông tin', resume: 'Tiếp tục xử lý',
  resolve: 'Ghi nhận đã xử lý', confirm: 'Xác nhận đã khắc phục', reopen: 'Mở lại ticket',
};
const messageLabels = { request_information: 'Thông tin cần bổ sung', resolve: 'Tóm tắt kết quả xử lý' };

export default function TicketWorkflowActions({ ticket, agents, userId, busy, onCommand }) {
  const [selection, setSelection] = useState('');
  const action = ticket.allowed_actions.includes(selection) ? selection : '';
  const options = ticket.allowed_actions.filter(key => Object.hasOwn(labels, key));
  if (!options.length) return null;
  const oversight = ticket.oversight_actions?.includes(action);
  const assignmentReason = action === 'unassign' || (action === 'assign' && ticket.assignee_id != null);
  const reason = assignmentReason || action === 'resume' || action === 'reopen';
  return <form onSubmit={async event => {
    event.preventDefault();
    if (!action) return;
    const values = new FormData(event.currentTarget);
    const fields = {};
    if (values.has('message')) fields.message = values.get('message');
    if (values.has('reason')) fields.reason = values.get('reason');
    if (oversight) fields[action === 'acknowledge' ? 'reason' : 'override_reason'] = values.get('oversight');
    if (action === 'assign') fields.assignee_id = Number(values.get('assignee'));
    if (action === 'claim') fields.assignee_id = userId;
    if (action === 'unassign') fields.assignee_id = null;
    if (await onCommand(action, fields)) setSelection('');
  }}>
    <label>Thao tác<select value={action} disabled={busy} onChange={event => setSelection(event.target.value)}>
      <option value="">Chọn thao tác…</option>
      {options.map(key => <option key={key} value={key}>{labels[key]}</option>)}
    </select></label>
    <div key={action}>
      {action === 'assign' && <label>Kỹ thuật viên<select name="assignee" required defaultValue="">
        <option value="" disabled>Chọn kỹ thuật viên…</option>
        {agents.filter(agent => ![ticket.reporter_id, ticket.assignee_id].includes(agent.id)).map(agent =>
          <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}
      </select></label>}
      {messageLabels[action] && <label>{messageLabels[action]}<textarea name="message" required maxLength={10000} /></label>}
      {reason && <label>Lý do<textarea name="reason" required maxLength={1000} /></label>}
      {oversight && <label>Lý do can thiệp của quản trị viên<textarea name="oversight" required maxLength={1000} /></label>}
    </div>
    {action === 'confirm' && <p className="muted">Sau khi đóng, ticket không thể mở lại.</p>}
    {action && <button className="button secondary" disabled={busy}>{labels[action]}</button>}
  </form>;
}
