import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationMenu from './NotificationMenu';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({ apiClient: vi.fn() }));

describe('NotificationMenu', () => {
  it('shows unread count and opens only the selected ticket after marking read', async () => {
    apiClient.mockResolvedValue({ items: [{ id: 7, ticket_id: 42, notification_type: 'TICKET_CREATED',
      title: 'Yêu cầu mới', message: 'Một ticket cần xử lý', is_read: 0, created_at: '2026-11-12T00:00:00Z' }], unreadCount: 1 });
    const mutate = vi.fn().mockResolvedValue({});
    const onTicket = vi.fn();
    render(<NotificationMenu mutate={mutate} onTicket={onTicket}/>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Thông báo (1 chưa đọc)' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Thông báo (1 chưa đọc)' }));
    fireEvent.click(screen.getByRole('button', { name: /Yêu cầu mới/ }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith('/notifications/7/read', 'PATCH', {}));
    expect(onTicket).toHaveBeenCalledWith(42);
    expect(screen.getByRole('button', { name: 'Thông báo (0 chưa đọc)' })).toBeTruthy();
  });
});
