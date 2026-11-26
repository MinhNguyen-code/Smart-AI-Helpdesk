import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { defaultRoutingDraft, settingsPayload } from './routingModel';
import './routing.css';

export default function RoutingPage({ preview, mutate }) {
  const [draft, setDraft] = useState(null);
  const [enabled, setEnabled] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stale, setStale] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (preview) { setEnabled(false); return; }
    let active = true;
    setBusy(true); setError('');
    (async () => {
      const capabilities = await apiClient('/routing/capabilities');
      if (active) setEnabled(capabilities.enabled);
      if (capabilities.enabled) {
        const data = await apiClient('/routing/settings');
        if (active) { setDraft(data); setStale(false); }
      }
    })().catch(failure => { if (active) setError(failure.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [preview, attempt]);

  const unitChange = (code, change) => setDraft(current => ({ ...current,
    units: current.units.map(unit => unit.code === code ? { ...unit, ...change } : unit),
  }));
  function toggleMember(unit, agent, selected) {
    unitChange(unit.code, { members: selected
      ? [...unit.members, { user_id: agent.id, is_available: true }]
      : unit.members.filter(member => member.user_id !== agent.id) });
  }
  function routeChange(categoryId, field, value) {
    setDraft(current => {
      const route = current.routes.find(row => row.category_id === categoryId) || { category_id: categoryId, keywords: [] };
      const routes = current.routes.filter(row => row.category_id !== categoryId);
      const updated = { ...route, [field]: value };
      return { ...current, routes: updated.unit_code ? [...routes, updated] : routes };
    });
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await mutate('/routing/settings', 'PUT', settingsPayload(draft));
      setDraft(await apiClient('/routing/settings'));
      setNotice('Đã lưu cấu hình. Ticket mới sẽ dùng tuyến này; ticket cũ giữ người phụ trách.');
    } catch (failure) { setError(failure.message); if (failure.status === 409) setStale(true); }
    finally { setBusy(false); }
  }

  return <>
    <header className="page-header"><div><small>QUẢN TRỊ HỆ THỐNG</small><h1>Phân tuyến & đội hỗ trợ</h1>
      <p>Giao đúng chuyên môn, cân bằng số ticket đang mở giữa người đang nhận việc.</p></div></header>
    <div className="routing-page">
      {error && <p className="alert" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      <div className="routing-actions"><button type="button" className="button secondary" disabled={busy || preview} onClick={() => { setNotice(''); setAttempt(value => value + 1); }}>Tải lại cấu hình</button>
        {draft && <small className="muted">Phiên bản {draft.version}</small>}</div>
      {enabled === false && <section className="panel"><h2>Phân tuyến chưa được kích hoạt</h2><p>{preview ? 'Đăng nhập bằng tài khoản quản trị để quản lý đội hỗ trợ.' : 'Tiếp tục dùng luồng ticket hiện tại. Quản trị viên sẽ triển khai phân tuyến sau khi kiểm chứng dữ liệu.'}</p></section>}
      {busy && !draft && <p role="status">Đang tải cấu hình…</p>}
      {enabled && draft && <form onSubmit={save}>
        <fieldset disabled={busy || stale} className="routing-fieldset">
          <section className="panel">
            <h2>1. Cách giao việc</h2>
            <div className="form-grid">
              <label className="check-label"><input type="checkbox" checked={draft.auto_assign} onChange={event => setDraft({ ...draft, auto_assign: event.target.checked })} />Tự giao cho người ít ticket mở nhất</label>
              <label>Giới hạn ticket mở mỗi người<input type="number" min="1" max="100" required value={draft.max_open_per_agent} onChange={event => setDraft({ ...draft, max_open_per_agent: event.target.value })} /></label>
            </div>
            <p className="muted">Chỉ chọn người thuộc đúng nhóm, đang hoạt động và đang nhận việc. Bằng số ticket thì ưu tiên người lâu chưa được giao. Đủ tải hoặc chưa có người phù hợp: chờ nhóm nhận.</p>
            {!draft.units.length && <button className="button secondary" type="button" onClick={() => setDraft(defaultRoutingDraft(draft))}>Tạo bản nháp 4 nhóm ban đầu</button>}
          </section>
          <section className="panel">
            <h2>2. Nhóm và thành viên</h2><p className="muted">Chọn thành viên thực tế cho từng nhóm. “Tạm ngừng nhận” chỉ dừng giao việc mới; ticket đang phụ trách vẫn giữ nguyên.</p>
            {!draft.agents.length && <p>Chưa có kỹ thuật viên đang hoạt động. Thêm tài khoản IT_AGENT tại trang Người dùng.</p>}
            <div className="routing-units">{draft.units.map(unit => <fieldset className="routing-unit" key={unit.code}>
              <legend>{unit.code}</legend>
              <label>Tên nhóm {unit.code}<input required maxLength={120} value={unit.name} onChange={event => unitChange(unit.code, { name: event.target.value })} /></label>
              <label className="check-label"><input type="checkbox" checked={unit.is_active} onChange={event => unitChange(unit.code, { is_active: event.target.checked })} />Nhóm hoạt động</label>
              <div className="routing-members">{draft.agents.map(agent => {
                const member = unit.members.find(row => row.user_id === agent.id);
                return <div className="routing-member" key={agent.id}>
                  <label className="check-label"><input type="checkbox" checked={Boolean(member)} aria-label={`${unit.name}: ${agent.full_name}`} onChange={event => toggleMember(unit, agent, event.target.checked)} />
                    <span><strong>{agent.full_name}</strong><small>{agent.email} · {agent.open_count} ticket mở</small></span></label>
                  {member && <label className="check-label"><input type="checkbox" checked={member.is_available} aria-label={`Nhận việc ${unit.name}: ${agent.full_name}`} onChange={event => unitChange(unit.code, { members: unit.members.map(row => row.user_id === agent.id ? { ...row, is_available: event.target.checked } : row) })} />Đang nhận việc</label>}
                </div>;
              })}</div>
            </fieldset>)}</div>
            <div className="routing-add"><label>Mã nhóm mới<input value={newCode} maxLength={32} pattern="[A-Z][A-Z0-9_]{1,31}" onChange={event => setNewCode(event.target.value.toUpperCase())} placeholder="VD: IT_SECURITY" /></label>
              <label>Tên nhóm mới<input value={newName} maxLength={120} onChange={event => setNewName(event.target.value)} /></label>
              <button type="button" className="button secondary" disabled={draft.units.length >= 20 || !/^[A-Z][A-Z0-9_]{1,31}$/.test(newCode) || !newName.trim() || draft.units.some(unit => unit.code === newCode)} onClick={() => { setDraft({ ...draft, units: [...draft.units, { code: newCode, name: newName.trim(), is_active: true, members: [] }] }); setNewCode(''); setNewName(''); }}>Thêm nhóm vào bản nháp</button></div>
          </section>
          <section className="panel">
            <h2>3. Danh mục và dấu hiệu nhận diện</h2><p className="muted">Mỗi danh mục có một nhóm chính. Từ khóa cách nhau bằng dấu phẩy (tối đa 20). Nội dung xung đột hoặc nhiều nhóm sẽ chờ Admin điều phối.</p>
            {draft.categories.map(category => {
              const route = draft.routes.find(row => row.category_id === category.id);
              return <div className="routing-route" key={category.id}><strong>{category.name}</strong>
                <label>Nhóm cho {category.name}<select value={route?.unit_code || ''} onChange={event => routeChange(category.id, 'unit_code', event.target.value)}><option value="">Chờ điều phối</option>{draft.units.map(unit => <option key={unit.code} value={unit.code}>{unit.name}{unit.is_active ? '' : ' (tạm ngừng)'}</option>)}</select></label>
                <label>Từ khóa cho {category.name}<input disabled={!route} value={Array.isArray(route?.keywords) ? route.keywords.join(', ') : route?.keywords || ''} onChange={event => routeChange(category.id, 'keywords', event.target.value)} placeholder="VD: wifi, mất mạng, router" /></label>
              </div>;
            })}
          </section>
          <div className="routing-save"><span className="muted">Mọi thay đổi chỉ có hiệu lực sau khi lưu.</span><button className="button primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu cấu hình phân tuyến'}</button></div>
        </fieldset>
      </form>}
      {stale && <p className="notice">Tải lại cấu hình để xử lý thay đổi đồng thời hoặc ticket đang được giao, rồi chỉnh lại bản nháp.</p>}
    </div>
  </>;
}
