import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import './routing.css';

export default function AgentAvailability({ mutate }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    apiClient('/routing/me').then(value => { if (active) { setData(value); setError(''); } })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [attempt]);
  async function update(unit) {
    setBusy(true); setError('');
    try {
      await mutate('/routing/availability', 'PATCH', { unit_id: unit.id, is_available: !unit.is_available, version: data.version });
      setData(await apiClient('/routing/me'));
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  if (!error && (!data || !data.enabled)) return null;
  return <section className="panel routing-availability" aria-label="Trạng thái nhận việc">
    <strong>Nhận ticket mới</strong>
    {Number.isFinite(data?.open_count) && <span>{data.open_count} ticket đang mở{Number.isFinite(data.capacity) ? ` · Giới hạn ${data.capacity}` : ''}</span>}
    {data?.enabled && !data.units.length && <span className="muted">Bạn chưa thuộc nhóm hỗ trợ. Liên hệ Admin để thiết lập.</span>}
    {data?.units.map(unit => <label className="check-label" key={unit.id}><input type="checkbox" checked={unit.is_available} disabled={busy || Boolean(error)} onChange={() => update(unit)} />{unit.name}: {unit.is_available ? 'Đang nhận' : 'Tạm ngừng'}</label>)}
    {error && <><span role="alert">{error}</span><button type="button" className="button secondary" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Tải lại trạng thái nhận việc</button></>}
  </section>;
}
