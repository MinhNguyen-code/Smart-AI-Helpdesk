import { useEffect, useRef, useState } from 'react';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { priorities, sampleRules } from './previewData';

const samplePolicies = ['P1','P2','P3','P4'].map((priority, index) => ({ priority,
  response_minutes: [15,60,240,480][index], resolution_minutes: [120,480,1440,2880][index], is_active: true }));
function RuleDialog({ value, onClose, onSave, busy, error }) {
  const ref = useRef(null);
  useEffect(() => { const opener = document.activeElement; const dialog = ref.current; dialog.showModal(); dialog.querySelector('input[name="keyword"]')?.focus(); return () => { if (dialog.open) dialog.close(); if (opener?.isConnected) opener.focus(); }; }, []);
  return <dialog ref={ref} className="dialog" aria-labelledby="rule-dialog-title" aria-busy={busy} onCancel={onClose}><header><h2 id="rule-dialog-title">{value.id ? 'Chỉnh sửa Quy Tắc' : 'Thêm Quy Tắc Mới'}</h2><button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={18}/></button></header>
    <form className="rule-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave({ keyword: String(data.get('keyword')).trim(), priority: data.get('priority'), is_active: data.get('is_active') === 'on' }); }}>
      {error && <p className="alert" role="alert">{error}</p>}
      <label>Từ khóa<input name="keyword" autoComplete="off" defaultValue={value.keyword} required maxLength={200} placeholder="Nhập từ khóa…" /></label>
      <label>Mức độ ưu tiên<select name="priority" defaultValue={value.priority}>{Object.entries(priorities).map(([key,label]) => <option key={key} value={key}>{key} — {label}</option>)}</select></label>
      <label className="check-label"><input type="checkbox" name="is_active" defaultChecked={Boolean(value.is_active)} /> Kích hoạt quy tắc</label>
      <footer><button type="button" className="button secondary" onClick={onClose}>Hủy</button><button className="button primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu quy tắc'}</button></footer>
    </form></dialog>;
}
function ConfirmDelete({ rule, onClose, onConfirm, busy }) {
  const ref = useRef(null);
  useEffect(() => { const opener = document.activeElement; const dialog = ref.current; dialog.showModal(); return () => { if (dialog.open) dialog.close(); if (opener?.isConnected) opener.focus(); }; }, []);
  return <dialog ref={ref} className="dialog" onCancel={onClose}><header><h2>Xóa quy tắc?</h2><button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={18}/></button></header><div className="rule-form"><p>Quy tắc “{rule.keyword}” sẽ bị xóa.</p><footer><button className="button secondary" onClick={onClose}>Hủy</button><button className="button danger-button" disabled={busy} onClick={onConfirm}>Xóa quy tắc</button></footer></div></dialog>;
}
function PolicyDialog({ value, onClose, onSave, busy, error }) {
  const ref = useRef(null);
  useEffect(() => { const opener = document.activeElement; const dialog = ref.current; dialog.showModal(); return () => { if (dialog.open) dialog.close(); if (opener?.isConnected) opener.focus(); }; }, []);
  return <dialog ref={ref} className="dialog" aria-labelledby="policy-dialog-title" onCancel={onClose}><header><h2 id="policy-dialog-title">SLA {value.priority}</h2><button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={18}/></button></header><form className="rule-form" onSubmit={onSave}>{error && <p className="alert" role="alert">{error}</p>}<label>Phản hồi (phút)<input name="response_minutes" type="number" min="1" max="43200" defaultValue={value.response_minutes} required/></label><label>Giải quyết (phút)<input name="resolution_minutes" type="number" min="1" max="43200" defaultValue={value.resolution_minutes} required/></label><label className="check-label"><input type="checkbox" name="is_active" defaultChecked={Boolean(value.is_active)}/> Đang áp dụng</label><footer><button type="button" className="button secondary" onClick={onClose}>Hủy</button><button className="button primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu SLA'}</button></footer></form></dialog>;
}
export default function RulesPage({ preview, mutate }) {
  const [rules, setRules] = useState(preview ? sampleRules : []);
  const [loading, setLoading] = useState(!preview);
  const [policies, setPolicies] = useState(preview ? samplePolicies : []);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [policyEdit, setPolicyEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (preview) { setRules(sampleRules); setPolicies(samplePolicies); setLoading(false); return; }
    let active = true;
    setLoading(true);
    Promise.all([apiClient('/rules'), apiClient('/sla/policies')])
      .then(([items, values]) => { if (active) { setRules(items); setPolicies(values); } })
      .catch(failure => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [preview]);
  async function run(work) { setBusy(true); setError(''); try { await work(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  async function saveRule(fields) { await run(async () => {
    const rule = preview ? { ...fields, id: editing.id || Date.now() } : await mutate(editing.id ? `/rules/${editing.id}` : '/rules', editing.id ? 'PATCH' : 'POST', fields);
    setRules(current => editing.id ? current.map(item => item.id === editing.id ? rule : item) : [...current, rule]);
    setEditing(null); setNotice(preview ? 'Đã lưu quy tắc trong phiên mẫu.' : 'Đã lưu quy tắc.');
  }); }
  async function toggle(rule) { await run(async () => {
    const fields = { keyword: rule.keyword, priority: rule.priority, is_active: !Boolean(rule.is_active) };
    const updated = preview ? { ...rule, ...fields } : await mutate(`/rules/${rule.id}`, 'PATCH', fields);
    setRules(current => current.map(item => item.id === rule.id ? updated : item));
  }); }
  async function removeRule() { await run(async () => {
    if (!preview) await mutate(`/rules/${deleting.id}`, 'DELETE', {});
    setRules(current => current.filter(item => item.id !== deleting.id)); setDeleting(null);
    setNotice(preview ? 'Đã xóa trong phiên mẫu.' : 'Đã xóa quy tắc.');
  }); }
  async function savePolicy(event) { event.preventDefault(); const data = new FormData(event.currentTarget); const fields = {
    response_minutes: Number(data.get('response_minutes')), resolution_minutes: Number(data.get('resolution_minutes')),
    is_active: data.get('is_active') === 'on',
  }; await run(async () => {
    const updated = preview ? { ...policyEdit, ...fields } : await mutate(`/sla/policies/${policyEdit.priority}`, 'PUT', fields);
    setPolicies(current => current.map(item => item.priority === policyEdit.priority ? updated : item));
    setPolicyEdit(null); setNotice(preview ? 'Đã lưu SLA trong phiên mẫu.' : 'Đã lưu chính sách SLA.');
  }); }
  const filteredRules = rules.filter(rule => rule.keyword.toLowerCase().includes(search.trim().toLowerCase()));
  return <><header className="page-header"><div><small>QUẢN TRỊ HỆ THỐNG / RULE-BASED ENGINE</small><h1>Cấu hình Rule-Based Engine</h1><p>Thiết lập từ khóa để tự động gán mức độ ưu tiên.</p></div></header>
    {error && <p className="alert" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    <div className="toolbar"><div className="search"><Search size={17}/><input aria-label="Tìm quy tắc" placeholder="Nhập từ khóa cần tìm…" value={search} onChange={event => setSearch(event.target.value)}/></div><button className="button primary" onClick={() => { setError(''); setEditing({ keyword: '', priority: 'P1', is_active: true }); }}><Plus size={17}/>Thêm Quy Tắc Mới</button></div>
    <div className="table-panel rules-table"><table><thead><tr><th>Từ khóa</th><th>Hành động gán</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filteredRules.map(rule => <tr key={rule.id}><td data-label="Từ khóa">{rule.keyword}</td><td data-label="Ưu tiên"><span className={`badge ${rule.priority}`}>{rule.priority} · {priorities[rule.priority]}</span></td><td data-label="Trạng thái"><button className={`toggle ${rule.is_active ? 'active' : ''}`} role="switch" aria-checked={Boolean(rule.is_active)} aria-label={`Kích hoạt ${rule.keyword}`} disabled={busy} onClick={() => toggle(rule)}><span/></button>{rule.is_active ? 'Đang bật' : 'Đã tắt'}</td><td data-label="Thao tác"><button className="icon-button" aria-label={`Sửa ${rule.keyword}`} onClick={() => { setError(''); setEditing(rule); }}><Pencil size={17}/></button><button className="icon-button" aria-label={`Xóa ${rule.keyword}`} onClick={() => setDeleting(rule)}><Trash2 size={17}/></button></td></tr>)}{loading && <tr><td colSpan="4" className="empty" role="status">Đang tải quy tắc…</td></tr>}{!loading && !error && filteredRules.length === 0 && <tr><td colSpan="4" className="empty">Không có quy tắc phù hợp. Thử từ khóa khác.</td></tr>}</tbody></table><footer>Hiển thị {filteredRules.length} quy tắc</footer></div>
    <section id="sla" className="sla-policies"><div><h2>Chính sách SLA P1–P4</h2><p>Thời gian phản hồi và giải quyết, tính bằng phút.</p></div><div className="policy-grid">{policies.map(policy => <article className="panel" key={policy.priority}><strong>{policy.priority} · {priorities[policy.priority]}</strong><p>Phản hồi: {policy.response_minutes} phút</p><p>Giải quyết: {policy.resolution_minutes} phút</p><small>{policy.is_active ? 'Đang áp dụng' : 'Tạm ngưng'}</small><button className="button secondary" onClick={() => setPolicyEdit(policy)}>Chỉnh sửa</button></article>)}</div></section>
    {editing && <RuleDialog value={editing} onClose={() => setEditing(null)} onSave={saveRule} busy={busy} error={error}/>}
    {deleting && <ConfirmDelete rule={deleting} onClose={() => setDeleting(null)} onConfirm={removeRule} busy={busy}/>}
    {policyEdit && <PolicyDialog value={policyEdit} onClose={() => setPolicyEdit(null)} onSave={savePolicy} busy={busy} error={error}/>}
  </>;
}
