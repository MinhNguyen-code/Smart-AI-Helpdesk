import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { apiClient } from './api/client';

vi.mock('./api/client', () => ({ apiClient: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:acceptance-image'; }
    static revokeObjectURL() {}
  });
});

it('shows the persisted image and history immediately after creating a three-state ticket', async () => {
  const created = {
    id: 42, ticket_code: 'acceptance-ticket', title: 'Cannot access LMS',
    description: 'Synthetic acceptance report', impact: 'individual', category_id: 3,
    reporter_id: 3, priority: 'P1', status: 'OPEN', version: 1,
  };
  let uploaded = false;
  apiClient.mockImplementation(async (endpoint, options) => {
    if (endpoint === '/auth/me') return { user: { id: 3, role: 'END_USER', full_name: 'Reporter' } };
    if (endpoint.split('?')[0] === '/tickets' && !options?.method) return { items: [], total: 0 };
    if (endpoint === '/categories') return [{ id: 3, name: 'LMS' }];
    if (endpoint === '/auth/csrf') return { csrfToken: 'test-only-csrf' };
    if (endpoint.startsWith('/notifications')) return { items: [], unreadCount: 0 };
    if (endpoint === '/tickets' && options?.method === 'POST') return created;
    if (endpoint === '/tickets/42/attachments' && options?.method === 'POST') {
      expect(options.body.get('file').name).toBe('acceptance.png');
      uploaded = true;
      return { id: 7 };
    }
    if (endpoint === '/tickets/42') {
      expect(uploaded).toBe(true);
      return { ...created,
        attachments: [{ id: 7, original_filename: 'acceptance.png', size_bytes: 128 }],
        history: [{ id: 8, event_type: 'ATTACHMENT_ADDED', new_value: '7', created_at: '2026-11-25T01:00:00Z' }],
        comments: [],
      };
    }
    throw new Error(`Unexpected request: ${endpoint}`);
  });
  render(<MemoryRouter initialEntries={['/tickets/new']}><App /></MemoryRouter>);
  await screen.findByRole('option', { name: 'LMS' });
  fireEvent.change(screen.getByLabelText(/Tiêu đề sự cố/), { target: { value: created.title } });
  fireEvent.change(screen.getByLabelText(/Mô tả chi tiết/), { target: { value: created.description } });
  fireEvent.change(screen.getByLabelText(/Danh mục/), { target: { value: '3' } });
  fireEvent.change(document.querySelector('#ticket-attachment'), {
    target: { files: [new File(['synthetic image'], 'acceptance.png', { type: 'image/png' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: /Gửi yêu cầu/ }));
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(within(dialog).getByRole('link', { name: /acceptance.png/ }).getAttribute('href'))
    .toContain('/tickets/42/attachments/7'));
  expect(within(dialog).getByText('Thêm ảnh đính kèm')).toBeTruthy();
  expect(within(dialog).queryByText('Chưa có tệp đính kèm.')).toBeNull();
});
