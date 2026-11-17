import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

const roles = ['ADMIN', 'IT_AGENT', 'END_USER'];
const previewUsers = [
  { id: 1, email: 'admin@example.invalid', full_name: 'Quản trị viên', role: 'ADMIN', is_active: true, google_linked: true },
  { id: 2, email: 'agent@example.invalid', full_name: 'Kỹ thuật viên', role: 'IT_AGENT', is_active: true, google_linked: true },
  { id: 3, email: 'user@example.invalid', full_name: 'Người gửi', role: 'END_USER', is_active: true, google_linked: false },
];
function UserRow({ user, onSave, busy }) {
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(Boolean(user.is_active));
  return <tr><td><strong>{user.full_name}</strong><small style={{display:'block'}}>{user.email}</small></td>
    <td><select aria-label={`Vai trò ${user.full_name}`} value={role} onChange={event => setRole(event.target.value)}>{roles.map(value => <option key={value}>{value}</option>)}</select></td>
    <td><label className="check-label"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/> {active ? 'Đang hoạt động' : 'Tạm khóa'}</label></td>
    <td>{user.google_linked ? 'Đã liên kết' : 'Chờ Google'}</td>
    <td><button className="button secondary" disabled={busy || (role === user.role && active === Boolean(user.is_active))} onClick={() => onSave(user.id, { role, is_active: active })}>Lưu</button></td></tr>;
}
export default function UsersPage({ preview, mutate, selfId }) {
  const [users, setUsers] = useState(preview ? previewUsers : []);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('END_USER');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!preview) apiClient('/users').then(setUsers).catch(failure => setError(failure.message)); }, [preview]);
  async function run(work) { setBusy(true); setError(''); try { await work(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  async function add(event) { event.preventDefault(); await run(async () => {
    const created = preview ? { id: Date.now(), email: email.trim().toLowerCase(), full_name: 'Chờ đăng nhập Google', role, is_active: true, google_linked: false }
      : await mutate('/users', 'POST', { email: email.trim(), role });
    setUsers(current => [...current, created]); setEmail(''); setNotice(preview ? 'Đã thêm trong phiên mẫu.' : 'Đã phê duyệt tài khoản.');
  }); }
  async function save(id, fields) { await run(async () => {
    const updated = preview ? { ...users.find(user => user.id === id), ...fields } : await mutate(`/users/${id}`, 'PATCH', fields);
    setUsers(current => current.map(user => user.id === id ? updated : user));
    setNotice(preview ? 'Đã lưu trong phiên mẫu.' : 'Đã cập nhật tài khoản.');
  }); }
  return <><header className="page-header"><div><small>QUẢN TRỊ HỆ THỐNG / NGƯỜI DÙNG</small><h1>Tài khoản và Vai trò</h1><p>Phê duyệt người dùng trước khi họ đăng nhập bằng Google.</p></div></header>
    {error && <p className="alert" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    <section className="panel users-panel"><h2>Thêm tài khoản vào danh sách cho phép</h2><form className="users-add" onSubmit={add}><label>Email<input type="email" required maxLength={255} value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com"/></label><label>Vai trò<select value={role} onChange={event => setRole(event.target.value)}>{roles.map(value => <option key={value}>{value}</option>)}</select></label><button className="button primary" disabled={busy}>Phê duyệt</button></form></section>
    <div className="table-panel users-panel"><table><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Google</th><th>Thao tác</th></tr></thead><tbody>{users.map(user => user.id === selfId && !preview
      ? <tr key={user.id}><td><strong>{user.full_name} (bạn)</strong><small style={{display:'block'}}>{user.email}</small></td><td>{user.role}</td><td>Đang hoạt động</td><td>{user.google_linked ? 'Đã liên kết' : 'Chờ Google'}</td><td>—</td></tr>
      : <UserRow key={`${user.id}:${user.role}:${user.is_active}`} user={user} onSave={save} busy={busy}/>)}</tbody></table><footer>Hiển thị {users.length} tài khoản</footer></div>
  </>;
}
