import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { apiClient } from '../api/client';

export default function NotificationMenu({ mutate, onTicket }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unreadCount: 0 });
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => apiClient('/notifications').then(result => { if (active) setData(result); }).catch(failure => { if (active) setError(failure.message); });
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  async function mark(item) {
    try {
      if (!item.is_read) await mutate(`/notifications/${item.id}/read`, 'PATCH', {});
      setData(current => ({ items: current.items.map(value => value.id === item.id ? { ...value, is_read: true } : value),
        unreadCount: Math.max(0, current.unreadCount - (item.is_read ? 0 : 1)) }));
      setOpen(false);
      if (item.ticket_id) onTicket(item.ticket_id);
    } catch (failure) { setError(failure.message); }
  }
  async function markAll() {
    try {
      await mutate('/notifications/read-all', 'POST', {});
      setData(current => ({ items: current.items.map(item => ({ ...item, is_read: true })), unreadCount: 0 }));
    } catch (failure) { setError(failure.message); }
  }
  return <div className="notification-menu"><button className="icon-button notification-bell" aria-label={`Thông báo (${data.unreadCount} chưa đọc)`} aria-expanded={open} onClick={() => setOpen(!open)}><Bell size={20}/>{data.unreadCount > 0 && <span className="notification-count">{data.unreadCount}</span>}</button>{open && <div className="notification-panel panel"><header><strong>Thông báo</strong><button className="icon-button" aria-label="Đóng thông báo" onClick={() => setOpen(false)}><X size={16}/></button></header>{error && <p className="alert" role="alert">{error}</p>}{data.items.length ? <><button className="text-button" onClick={markAll}>Đánh dấu tất cả đã đọc</button><div className="notification-list">{data.items.map(item => <button key={item.id} className={`notification-item ${item.is_read ? '' : 'unread'}`} onClick={() => mark(item)}><strong>{item.title}</strong><span>{item.message}</span><small>{new Date(item.created_at).toLocaleString('vi-VN')}</small></button>)}</div></> : <p>Chưa có thông báo.</p>}</div>}</div>;
}
