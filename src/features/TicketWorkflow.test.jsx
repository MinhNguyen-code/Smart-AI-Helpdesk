import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TicketDetail from './TicketDetail';
import CreateTicket from './CreateTicket';
import { workflowRequest } from './ticketWorkflow';

vi.mock('./TicketProgress', () => ({ default: () => null }));
const widget = () => null;
const renderTicket = (ticket, role = 'END_USER') => {
  const onWorkflow = vi.fn().mockResolvedValue(true);
  const Element = <TicketDetail ticket={{ id: 9, version: 7, description: 'Lost connectivity', assignee_id: 2, reporter_id: 1, ...ticket }}
    user={{ id: role === 'END_USER' ? 1 : 2, role }} categories={[]} agents={[]} onWorkflow={onWorkflow} Sla={widget} Badge={widget} />;
  render(Element);
  return onWorkflow;
};

describe('Ticket lifecycle controls', () => {
  it('only offers server-authorized resolution actions and sends the current version with a reopen reason', async () => {
    const command = renderTicket({ status: 'RESOLVED', allowed_actions: ['confirm', 'reopen'] });
    const action = screen.getByLabelText('Thao tác');
    expect(screen.queryByRole('option', { name: 'Ghi nhận đã xử lý' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Gửi phản hồi' })).toBeNull();
    fireEvent.change(action, { target: { value: 'reopen' } });
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Lỗi xuất hiện lại' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở lại ticket' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('reopen', { reason: 'Lỗi xuất hiện lại' }));
    const [name, fields] = command.mock.calls[0];
    expect(workflowRequest(name, { id: 9, version: 7 }, fields))
      .toEqual(['/tickets/9/status', 'PATCH', { status: 'IN_PROGRESS', version: 7, reason: 'Lỗi xuất hiện lại' }]);
  });

  it('keeps the internal draft separate when switching back to public reply', async () => {
    const command = renderTicket({ status: 'IN_PROGRESS', allowed_actions: ['reply_public', 'reply_internal'] }, 'IT_AGENT');
    const selector = screen.getByLabelText('Loại phản hồi');
    fireEvent.change(selector, { target: { value: 'reply_internal' } });
    fireEvent.change(screen.getByLabelText('Ghi chú nội bộ'), { target: { value: 'Private diagnostic detail' } });
    fireEvent.change(selector, { target: { value: 'reply_public' } });
    expect(screen.getByLabelText('Phản hồi').value).toBe('');
    fireEvent.change(screen.getByLabelText('Phản hồi'), { target: { value: 'Please restart' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('reply_public', { message: 'Please restart' }));
    fireEvent.change(selector, { target: { value: 'reply_internal' } });
    expect(screen.getByLabelText('Ghi chú nội bộ').value).toBe('Private diagnostic detail');
  });

  it('leaves a closed ticket readable without presenting mutation controls', () => {
    renderTicket({ status: 'CLOSED', closed_at: '2026-11-18T07:00:00Z', allowed_actions: [] }, 'IT_AGENT');
    expect(screen.getByText('Đóng lúc')).toBeTruthy();
    expect(screen.queryByLabelText('Thao tác')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tải ảnh lên' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Gửi phản hồi' })).toBeNull();
  });

  it('reuses the creation request ID after retry, and changes it when the ticket fields change', () => {
    const send = vi.fn();
    render(<CreateTicket idempotent categories={[{ id: 1, name: 'Mạng' }]} onSubmit={send} />);
    fireEvent.change(screen.getByLabelText(/Tiêu đề sự cố/), { target: { value: 'Mất kết nối' } });
    const description = screen.getByLabelText(/Mô tả chi tiết/);
    fireEvent.change(description, { target: { value: 'Không vào được mạng.' } });
    fireEvent.change(screen.getByLabelText(/Danh mục/), { target: { value: '1' } });
    const submit = screen.getByRole('button', { name: 'Gửi yêu cầu' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.change(description, { target: { value: 'Đã thử một thiết bị khác.' } });
    fireEvent.click(submit);
    const ids = send.mock.calls.map(([fields]) => fields.request_id);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
  });
});
