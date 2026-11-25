import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { apiClient } from './api/client';

vi.mock('./api/client', () => ({ apiClient: vi.fn() }));

// Polyfill HTMLDialogElement and ResizeObserver for jsdom
beforeEach(() => {
  window.localStorage.clear();
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false;
  });
});

const sampleApiTickets = [
  {
    id: 101,
    ticket_code: 'INC-2101',
    title: 'Mất kết nối máy chủ LMS toàn trường',
    description: 'Không truy cập được LMS',
    priority: 'P1',
    status: 'OPEN',
    category_id: 1,
    reporter_id: 3,
    reporter_name: 'Nguyễn Văn A',
    version: 1,
    created_at: '2026-11-19T01:00:00.000Z',
    resolution_deadline_at: new Date(Date.now() - 15 * 60000).toISOString(), // Overdue
  },
  {
    id: 102,
    ticket_code: 'INC-2102',
    title: 'Lỗi xác thực wifi giảng đường B',
    description: 'Wifi chập chờn',
    priority: 'P2',
    status: 'IN_PROGRESS',
    category_id: 1,
    reporter_id: 3,
    reporter_name: 'Trần Thị B',
    version: 1,
    created_at: '2026-11-19T02:00:00.000Z',
    resolution_deadline_at: new Date(Date.now() + 90 * 60000).toISOString(), // On-time
  },
  {
    id: 103,
    ticket_code: 'INC-2103',
    title: 'Cấp lại quyền truy cập cổng học liệu',
    description: 'Đã xử lý xong',
    priority: 'P3',
    status: 'RESOLVED',
    category_id: 2,
    reporter_id: 3,
    reporter_name: 'Lê Văn C',
    version: 2,
    created_at: '2026-11-18T08:00:00.000Z',
    resolved_at: '2026-11-18T09:30:00.000Z',
    resolution_deadline_at: '2026-11-18T12:00:00.000Z',
  },
];

function mockSessionForRole(role = 'ADMIN') {
  apiClient.mockImplementation(endpoint => {
    if (endpoint === '/auth/me') {
      return Promise.resolve({
        user: { id: 1, full_name: `User ${role}`, role },
      });
    }
    if (endpoint.startsWith('/tickets/')) {
      const id = Number(endpoint.split('/').pop());
      const found = sampleApiTickets.find(t => t.id === id) || sampleApiTickets[0];
      return Promise.resolve({ ...found, comments: [], history: [], attachments: [] });
    }
    if (endpoint.startsWith('/tickets')) {
      return Promise.resolve({
        items: sampleApiTickets,
        total: sampleApiTickets.length,
        page: 1,
        pageSize: 30,
      });
    }
    if (endpoint === '/categories') {
      return Promise.resolve([
        { id: 1, name: 'Mạng & Hạ tầng' },
        { id: 2, name: 'Tài khoản' },
      ]);
    }
    if (endpoint === '/agents') {
      return Promise.resolve([{ id: 2, full_name: 'Agent Kỹ Thuật' }]);
    }
    if (endpoint === '/notifications') {
      return Promise.resolve({ items: [], unreadCount: 0 });
    }
    return Promise.resolve([]);
  });
}

describe('Dashboard Overview & Collapsible AppShell', () => {
  it('renders Tổng quan with 4 real KPI cards, 3-column workflow preview, MTTR chart, and P1/P2 high-priority table', async () => {
    mockSessionForRole('ADMIN');

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(
      () => expect(screen.getByRole('heading', { name: 'Tổng quan', level: 1 })).toBeTruthy(),
      { timeout: 5000 }
    );
    expect(
      screen.getByText('Tổng hợp tình hình xử lý sự cố và hiệu suất hệ thống IT')
    ).toBeTruthy();

    // 4 KPI Cards derived from sampleApiTickets: 1 OPEN, 1 IN_PROGRESS, 2 on-time, 1 overdue
    const kpiSection = screen.getByLabelText('Chỉ số vận hành chính');
    expect(within(kpiSection).getByText('Ticket mở')).toBeTruthy();
    expect(within(kpiSection).getByText('Đang xử lý')).toBeTruthy();
    expect(within(kpiSection).getByText('SLA đúng hạn')).toBeTruthy();
    expect(within(kpiSection).getByText('Quá hạn')).toBeTruthy();

    // Ticket Workflow Preview section
    expect(screen.getByRole('heading', { name: 'Luồng xử lý sự cố (Ticket)' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Xem tất cả ticket/i })).toBeTruthy();

    // Analytics & High-Priority table
    expect(screen.getByRole('heading', { name: 'Thời gian xử lý trung bình' })).toBeTruthy();
    expect(screen.getByText('1.5 giờ')).toBeTruthy(); // 90 mins between 08:00 and 09:30

    const hpSection = screen.getByLabelText('Sự cố ưu tiên cao gần đây');
    expect(within(hpSection).getByText('#INC-2101')).toBeTruthy();
    expect(within(hpSection).getByText('#INC-2102')).toBeTruthy();
    // P3 ticket (#INC-2103) must not appear in High Priority P1/P2 table
    expect(within(hpSection).queryByText('#INC-2103')).toBeNull();

    // Clicking a ticket opens the Ticket Detail dialog
    fireEvent.click(within(hpSection).getByText('#INC-2101'));
    await waitFor(
      () => expect(screen.getByRole('heading', { name: /#INC-2101 — Mất kết nối máy chủ LMS toàn trường/i })).toBeTruthy(),
      { timeout: 5000 }
    );
  }, 15000);

  it('toggles collapsible sidebar and persists preference in localStorage', async () => {
    mockSessionForRole('ADMIN');

    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(
      () => expect(screen.getByRole('heading', { name: 'Tổng quan', level: 1 })).toBeTruthy(),
      { timeout: 5000 }
    );

    const sidebar = container.querySelector('#workspace-navigation');
    expect(sidebar.classList.contains('collapsed')).toBe(false);

    const collapseBtn = screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' });
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(collapseBtn);
    expect(sidebar.classList.contains('collapsed')).toBe(true);
    expect(window.localStorage.getItem('smart_helpdesk_sidebar_collapsed')).toBe('1');

    const expandBtn = screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' });
    expect(expandBtn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(expandBtn);
    expect(sidebar.classList.contains('collapsed')).toBe(false);
    expect(window.localStorage.getItem('smart_helpdesk_sidebar_collapsed')).toBe('0');
  });

  it('enforces role-based sidebar navigation for END_USER vs ADMIN', async () => {
    mockSessionForRole('END_USER');

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(
      () => expect(screen.getByRole('heading', { name: 'Tổng quan', level: 1 })).toBeTruthy(),
      { timeout: 5000 }
    );

    const nav = screen.getByLabelText('Điều hướng chính');
    expect(within(nav).getByText('Tổng quan')).toBeTruthy();
    expect(within(nav).getByText('Ticket')).toBeTruthy();
    expect(within(nav).getByText('Kanban')).toBeTruthy();

    // Admin menus must be hidden for END_USER
    expect(within(nav).queryByText('Người dùng')).toBeNull();
    expect(within(nav).queryByText('Quy tắc & SLA')).toBeNull();
    expect(within(nav).queryByText('Báo cáo')).toBeNull();
  });
});
