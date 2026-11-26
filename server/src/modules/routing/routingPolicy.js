import { normalizePhrase } from '../ticketPolicy.js';

export const routingEnabled = () => process.env.TICKET_ROUTING_ENABLED === 'true';
export const hasRouting = ticket => ticket.routing_status != null;
export function routingError(statusCode, code, message) { return Object.assign(new Error(message), { statusCode, code }); }

function occurs(value, keyword) {
  return String(value || '').split(/[.!?;\n]+/u).some(clause => {
    const text = ` ${normalizePhrase(clause)} `;
    const needle = ` ${keyword} `;
    let at = 0;
    while ((at = text.indexOf(needle, at)) >= 0) {
      const prefix = text.slice(0, at).trim();
      if (!['khong bi', 'khong con', 'chua', 'da het'].some(negation => prefix === negation || prefix.endsWith(` ${negation}`))) return true;
      at += needle.length - 1;
    }
    return false;
  });
}

export function decideUnit({ title, description, category_id: category }, routes) {
  const usable = routes.filter(route => Boolean(route.unit_active) && Boolean(route.category_active));
  const matches = usable.filter(item => item.keywords.some(word => {
    const keyword = normalizePhrase(word);
    return keyword && [title, description].some(value => occurs(value, keyword));
  }));
  const signals = [...new Set(matches.map(item => item.unit_id))].sort((a, b) => a - b);
  const route = usable.find(item => item.category_id === category);
  if (category == null) {
    if (signals.length !== 1) return { unit_id: null, category_id: null, reason: signals.length ? 'AMBIGUOUS_CONTENT' : 'NO_UNIQUE_SIGNAL', matched_unit_ids: signals };
    const categories = [...new Set(matches.map(item => item.category_id))];
    return { unit_id: signals[0], category_id: categories.length === 1 ? categories[0] : null, reason: 'KEYWORD', matched_unit_ids: signals };
  }
  if (!route) return { unit_id: null, reason: 'CATEGORY_NOT_ROUTED', matched_unit_ids: signals };
  if (signals.length > 1) return { unit_id: null, reason: 'AMBIGUOUS_CONTENT', matched_unit_ids: signals };
  if (signals.length && signals[0] !== route.unit_id) return { unit_id: null, reason: 'CATEGORY_CONTENT_CONFLICT', matched_unit_ids: signals };
  return { unit_id: route.unit_id, reason: signals.length ? 'CATEGORY_AND_KEYWORD' : 'CATEGORY', matched_unit_ids: signals };
}

export function chooseAgent(candidates, counts, capacity, reporterId) {
  return candidates.filter(agent => agent.id !== reporterId && Boolean(agent.is_active)
    && agent.role === 'IT_AGENT' && Boolean(agent.is_available) && (counts.get(agent.id) || 0) < capacity)
    .sort((a, b) => (counts.get(a.id) || 0) - (counts.get(b.id) || 0)
      || Number(new Date(a.last_assigned_at || 0)) - Number(new Date(b.last_assigned_at || 0)) || a.id - b.id)[0] || null;
}

export const routingDefaults = [
  { code: 'NETWORK', name: 'IT Mạng', category: 'Mạng & Kết nối', keywords: ['mất mạng', 'wifi', 'wi-fi', 'router', 'switch', 'mạng lan'] },
  { code: 'APPLICATION_LMS', name: 'Ứng dụng / LMS', category: 'Phần mềm & Hệ thống LMS', keywords: ['lms', 'phần mềm'] },
  { code: 'HARDWARE_ONSITE', name: 'Phần cứng / Tại chỗ', category: 'Phần cứng & Thiết bị', keywords: ['máy in', 'bàn phím', 'hỏng màn hình'] },
  { code: 'ACCOUNT_ACCESS', name: 'Tài khoản / Quyền truy cập', category: 'Tài khoản & Quyền truy cập', keywords: ['mật khẩu', 'tài khoản', 'quyền truy cập'] },
];
