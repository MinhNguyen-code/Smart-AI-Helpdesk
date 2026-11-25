import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export default function TicketRoutingControls({ ticket, busy, onRoute }) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [unitId, setUnitId] = useState(ticket.owner_unit_id || '');
  const [assignee, setAssignee] = useState('auto');
  const [reason, setReason] = useState('');
  useEffect(() => { setUnitId(ticket.owner_unit_id || ''); setAssignee('auto'); }, [ticket.owner_unit_id]);
  useEffect(() => {
    let active = true; setError('');
    apiClient('/routing/settings').then(value => { if (active) setSettings(value); }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [ticket.id, ticket.version, attempt]);
  const unit = settings?.units.find(row => row.id === Number(unitId));
  const agents = settings?.agents.filter(agent => agent.id !== ticket.reporter_id && unit?.members.some(member => member.user_id === agent.id && member.is_available)) || [];
  return <details className="routing-controls"><summary>Chuyển nhóm / giao lại</summary>
    {error && <p role="alert">{error}<button type="button" className="button secondary" onClick={() => setAttempt(value => value + 1)}>Tải lại nhóm</button></p>}
    {!settings && !error && <p role="status">Đang tải nhóm…</p>}
    {settings && <form onSubmit={async event => {
      event.preventDefault();
      const fields = { unit_id: Number(unitId), reason: reason.trim() };
      if (assignee !== 'auto') fields.assignee_id = assignee === 'queue' ? null : Number(assignee);
      if (await onRoute(fields)) setReason('');
    }}>
      <label>Nhóm phụ trách<select required value={unitId} onChange={event => { setUnitId(event.target.value); setAssignee('auto'); }}><option value="">Chọn nhóm…</option>{settings.units.filter(row => row.is_active).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label>Cách giao ticket<select value={assignee} onChange={event => setAssignee(event.target.value)}><option value="auto">Tự chọn người ít ticket mở nhất</option><option value="queue">Để nhóm tự nhận</option>{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.full_name} · {agent.open_count} ticket mở</option>)}</select></label>
      <label>Lý do chuyển tuyến<textarea required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <button className="button secondary" disabled={busy || !unitId || Boolean(error)}>Lưu chuyển tuyến</button>
    </form>}
  </details>;
}
