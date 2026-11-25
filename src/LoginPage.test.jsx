import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { apiClient } from './api/client';

vi.mock('./api/client', () => ({ apiClient: vi.fn() }));

describe('LoginPage redesign (/login)', () => {
  it('renders header, hero badge, heading, 2x2 feature cards, illustration, login card, Google OIDC link, and footer while omitting old ticket demo and 3D link', async () => {
    apiClient.mockRejectedValue(Object.assign(new Error('Unauthenticated'), { status: 401 }));

    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Đăng nhập hệ thống' })).toBeTruthy());

    // Header
    expect(screen.getByText('BTEC FPT · Smart IT Helpdesk')).toBeTruthy();
    expect(screen.getByText('Hệ thống hỗ trợ và quản lý dịch vụ CNTT')).toBeTruthy();
    expect(screen.getByText('Cổng hỗ trợ sinh viên và cán bộ')).toBeTruthy();

    // Left hero section
    expect(screen.getByText('Hỗ trợ CNTT cho BTEC FPT')).toBeTruthy();
    const heroHeading = screen.getByRole('heading', { level: 1 });
    expect(heroHeading.textContent).toContain('Quản lý sự cố tập trung,');
    expect(heroHeading.textContent).toContain('phản hồi đúng cam kết SLA.');
    expect(
      screen.getByText(
        'Phân loại mức độ ưu tiên tự động theo quy tắc, giám sát thời gian phản hồi và điều phối xử lý sự cố trên một không gian thống nhất.'
      )
    ).toBeTruthy();

    // 4 feature cards
    expect(screen.getByText('Đăng nhập an toàn')).toBeTruthy();
    expect(screen.getByText('với Google OIDC')).toBeTruthy();
    expect(screen.getByText('Giám sát SLA')).toBeTruthy();
    expect(screen.getByText('liên tục')).toBeTruthy();
    expect(screen.getByText('Phân loại tự động')).toBeTruthy();
    expect(screen.getByText('theo quy tắc')).toBeTruthy();
    expect(screen.getByText('Điều phối xử lý')).toBeTruthy();
    expect(screen.getByText('đúng đơn vị')).toBeTruthy();
    expect(container.querySelectorAll('.login-feature-card')).toHaveLength(4);

    // SVG illustration present
    expect(container.querySelector('.login-hero-illustration svg')).toBeTruthy();

    // Right login card & Google OAuth link
    expect(
      screen.getByText('Sử dụng tài khoản Google đã được quản trị viên phê duyệt để truy cập không gian làm việc.')
    ).toBeTruthy();
    const googleLink = screen.getByRole('link', { name: /Tiếp tục với Google/i });
    expect(googleLink.getAttribute('href')).toBe('/api/v1/auth/google');
    expect(screen.getByText('Phiên làm việc được bảo vệ và lưu trữ an toàn.')).toBeTruthy();

    // Footer
    expect(screen.getByText('© 2026 Smart IT Helpdesk · Reliability Engineering MVP')).toBeTruthy();
    expect(screen.getByText('Đăng nhập an toàn qua Google OAuth 2.0 PKCE')).toBeTruthy();

    // Removed legacy elements must be completely absent from /login
    expect(screen.queryByText(/INC-1024/i)).toBeNull();
    expect(screen.queryByText(/P1 · Khẩn cấp/i)).toBeNull();
    expect(screen.queryByText(/Còn 14 phút/i)).toBeNull();
    expect(screen.queryByText(/Sập hệ thống quản lý điểm/i)).toBeNull();
    expect(screen.queryByText(/Ví dụ: Sự cố được phát hiện và phân loại tự động/i)).toBeNull();
    expect(screen.queryByText(/Xem bàn hỗ trợ 3D/i)).toBeNull();
    expect(screen.queryByText(/Xem bản hỗ trợ 3D/i)).toBeNull();
  });
});
