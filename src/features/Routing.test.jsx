import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import RoutingPage from './RoutingPage';
import AgentAvailability from './AgentAvailability';
import TicketDetail from './TicketDetail';
import TicketRoutingControls from './TicketRoutingControls';
import CreateTicket from './CreateTicket';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({ apiClient: vi.fn() }));
const initial = () => ({ version: 7, auto_assign: true, max_open_per_agent: 10, units: [], routes: [],
  categories: [{ id: 91, name: 'Mạng & Kết nối' }, { id: 45, name: 'Phần cứng & Thiết bị' }],
  defaults: [{ code: 'NETWORK', name: 'IT Mạng', category: 'Mạng & Kết nối', keywords: ['wifi', 'mất mạng'] },
    { code: 'HARDWARE_ONSITE', name: 'Phần cứng / Tại chỗ', category: 'Phần cứng & Thiết bị', keywords: ['máy in'] },
    { code: 'APPLICATION_LMS', name: 'Ứng dụng / LMS', category: 'LMS', keywords: ['lms'] },
    { code: 'ACCOUNT_ACCESS', name: 'Tài khoản / Quyền truy cập', category: 'Account', keywords: ['mật khẩu'] }],
  agents: [{ id: 20, full_name: 'Kỹ thuật mạng', email: 'network@example.invalid', open_count: 2 }],
});
beforeEach(() => { vi.clearAllMocks(); });
function adminApi() {
  apiClient.mockImplementation(async endpoint => {
    if (endpoint === '/routing/capabilities') return { enabled: true };
    if (endpoint === '/routing/settings') return initial();
    throw new Error(`Unexpected request: ${endpoint}`);
  });
}

it('builds a four-team draft without writes, maps real category IDs and saves only selected members with a version', async () => {
  adminApi(); const mutate = vi.fn().mockResolvedValue({ saved: true });
  render(<RoutingPage mutate={mutate} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Tạo bản nháp 4 nhóm ban đầu' }));
  expect(mutate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('IT Mạng: Kỹ thuật mạng'));
  fireEvent.change(screen.getByLabelText('Từ khóa cho Mạng & Kết nối'), { target: { value: 'wifi, router, mất mạng' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình phân tuyến' }));
  await waitFor(() => expect(mutate).toHaveBeenCalledWith('/routing/settings', 'PUT', expect.objectContaining({ version: 7, max_open_per_agent: 10,
    units: expect.arrayContaining([expect.objectContaining({ code: 'NETWORK', members: [{ user_id: 20, is_available: true }] })]),
    routes: expect.arrayContaining([{ category_id: 91, unit_code: 'NETWORK', keywords: ['wifi', 'router', 'mất mạng'] }]),
  })));
  expect(mutate.mock.calls[0][2].units).toHaveLength(4);
  expect(mutate.mock.calls[0][2].units.filter(unit => unit.code !== 'NETWORK').every(unit => unit.members.length === 0)).toBe(true);
});

it('keeps an unsaved admin draft on a version conflict and requires reload before retry', async () => {
  adminApi(); const mutate = vi.fn().mockRejectedValue(Object.assign(new Error('Cấu hình đã thay đổi'), { status: 409 }));
  render(<RoutingPage mutate={mutate} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Tạo bản nháp 4 nhóm ban đầu' }));
  fireEvent.change(screen.getByLabelText('Tên nhóm NETWORK'), { target: { value: 'Nhóm mạng ca sáng' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình phân tuyến' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Cấu hình đã thay đổi');
  expect(screen.getByLabelText('Tên nhóm NETWORK')).toHaveValue('Nhóm mạng ca sáng');
  expect(screen.getByRole('button', { name: 'Lưu cấu hình phân tuyến' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Tải lại cấu hình' })).toBeEnabled();
});

it('does not offer configuration writes before feature activation', async () => {
  apiClient.mockResolvedValue({ enabled: false }); const mutate = vi.fn();
  render(<RoutingPage mutate={mutate} />);
  expect(await screen.findByRole('heading', { name: 'Phân tuyến chưa được kích hoạt' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Lưu cấu hình phân tuyến' })).toBeNull();
  expect(mutate).not.toHaveBeenCalled();
});

it('changes only the current agent membership availability and reloads the saved value', async () => {
  let saved = false;
  apiClient.mockImplementation(async () => ({ enabled: true, version: saved ? 8 : 7, units: [{ id: 44, name: 'IT Mạng', is_available: !saved }] }));
  const mutate = vi.fn().mockImplementation(async () => { saved = true; });
  render(<AgentAvailability mutate={mutate} />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'IT Mạng: Đang nhận' }));
  await waitFor(() => expect(mutate).toHaveBeenCalledWith('/routing/availability', 'PATCH', { unit_id: 44, is_available: false, version: 7 }));
  expect(await screen.findByRole('checkbox', { name: 'IT Mạng: Tạm ngừng' })).not.toBeChecked();
});

const widget = () => null;
const routed = { id: 10, version: 3, status: 'OPEN', title: 'Wifi', description: 'Không kết nối được wifi', reporter_id: 1, assignee_id: 20,
  owner_unit_id: 44, owner_unit_name: 'IT Mạng', routing_status: 'ASSIGNED', priority: 'P3' };
it('shows the shared ticket read-only to an agent who cannot handle it', () => {
  render(<TicketDetail ticket={{ ...routed, routing_permissions: { can_handle: false, can_attach: false, can_assign: false, can_route: false } }}
    user={{ id: 30, role: 'IT_AGENT' }} categories={[]} agents={[]} Sla={widget} Badge={widget} />);
  expect(screen.getByText('IT Mạng')).toBeTruthy();
  expect(screen.getByLabelText('Trạng thái')).toBeDisabled();
  for (const label of ['Xác nhận tiếp nhận', 'Gửi phản hồi', 'Tải ảnh lên', 'Lưu phân công']) expect(screen.queryByRole('button', { name: label })).toBeNull();
  expect(screen.queryByText('Chuyển nhóm / giao lại')).toBeNull();
});

it('keeps internal and public drafts separate and sends explicit visibility for the assigned member', async () => {
  const onReply = vi.fn().mockResolvedValue(true);
  render(<TicketDetail ticket={{ ...routed, routing_permissions: { can_handle: true, can_attach: true, can_internal: true } }}
    user={{ id: 20, role: 'IT_AGENT' }} categories={[]} agents={[]} onReply={onReply} Sla={widget} Badge={widget} />);
  fireEvent.change(screen.getByLabelText('Loại phản hồi'), { target: { value: 'reply_internal' } });
  fireEvent.change(screen.getByLabelText('Ghi chú nội bộ'), { target: { value: 'Chẩn đoán nội bộ' } });
  fireEvent.change(screen.getByLabelText('Loại phản hồi'), { target: { value: 'reply_public' } });
  expect(screen.getByLabelText('Phản hồi')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Phản hồi'), { target: { value: 'Đang kiểm tra kết nối' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));
  await waitFor(() => expect(onReply).toHaveBeenCalledWith('Đang kiểm tra kết nối', 'public'));
  fireEvent.change(screen.getByLabelText('Loại phản hồi'), { target: { value: 'reply_internal' } });
  expect(screen.getByLabelText('Ghi chú nội bộ')).toHaveValue('Chẩn đoán nội bộ');
});

it('requires an explicit routing reason and offers only the selected unit members', async () => {
  apiClient.mockResolvedValue({ ...initial(), units: [{ id: 44, name: 'IT Mạng', is_active: true, members: [{ user_id: 20, is_available: true }] },
    { id: 55, name: 'Thiết bị', is_active: true, members: [] }] });
  const onRoute = vi.fn().mockResolvedValue(true);
  render(<TicketRoutingControls ticket={routed} onRoute={onRoute} />);
  fireEvent.click(screen.getByText('Chuyển nhóm / giao lại'));
  const picker = await screen.findByLabelText('Cách giao ticket');
  expect(screen.getByRole('option', { name: 'Kỹ thuật mạng · 2 ticket mở' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Nhóm phụ trách'), { target: { value: '55' } });
  expect(screen.queryByRole('option', { name: 'Kỹ thuật mạng · 2 ticket mở' })).toBeNull();
  fireEvent.change(picker, { target: { value: 'queue' } });
  fireEvent.change(screen.getByLabelText('Lý do chuyển tuyến'), { target: { value: 'Cần kiểm tra thiết bị' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu chuyển tuyến' }));
  await waitFor(() => expect(onRoute).toHaveBeenCalledWith({ unit_id: 55, assignee_id: null, reason: 'Cần kiểm tra thiết bị' }));
});

it('submits auto classification as null category only when the capability is enabled', () => {
  const send = vi.fn();
  render(<CreateTicket automaticCategory categories={[{ id: 91, name: 'Mạng' }]} onSubmit={send} />);
  fireEvent.change(screen.getByLabelText(/Tiêu đề sự cố/), { target: { value: 'Mất wifi' } });
  fireEvent.change(screen.getByLabelText(/Mô tả chi tiết/), { target: { value: 'Không thể truy cập mạng.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ category_id: null }), null);
});
