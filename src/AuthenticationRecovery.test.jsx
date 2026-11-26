import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import App from './App';
import { apiClient } from './api/client';

vi.mock('./api/client', () => ({ apiClient: vi.fn() }));

it.each([429, 503])('offers session recovery instead of a false logout after HTTP %s', async status => {
  let sessionRequests = 0;
  apiClient.mockImplementation(async endpoint => {
    if (endpoint === '/auth/me') {
      sessionRequests++;
      if (sessionRequests === 1) throw Object.assign(new Error('Temporary API failure'), { status });
      return { user: { id: 3, role: 'END_USER', full_name: 'Acceptance reporter' } };
    }
    if (endpoint.split('?')[0] === '/tickets') return { items: [], total: 0 };
    if (endpoint === '/categories') return [];
    if (endpoint.startsWith('/notifications')) return { items: [], unreadCount: 0 };
    throw new Error(`Unexpected request: ${endpoint}`);
  });
  render(<MemoryRouter initialEntries={['/kanban']}><App /></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.queryByRole('link', { name: /Tiếp tục với Google/ })).toBeNull();
  expect(sessionRequests).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại phiên đăng nhập' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Bảng Kanban Tương tác' })).toBeTruthy());
  expect(screen.queryByRole('alert')).toBeNull();
  expect(sessionRequests).toBe(2);
});
