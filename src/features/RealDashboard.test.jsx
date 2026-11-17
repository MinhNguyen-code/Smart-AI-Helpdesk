import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import RealDashboard from './RealDashboard';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({ apiClient: vi.fn() }));

describe('RealDashboard', () => {
  it('renders SQL API totals and explicit empty averages, not preview metrics', async () => {
    apiClient.mockImplementation(endpoint => Promise.resolve(endpoint.includes('/summary')
      ? { total: 0, mttaSeconds: null, mttrSeconds: null, slaEvaluated: 0, slaCompliant: 0, slaCompliancePercent: null }
      : []));
    render(<RealDashboard />);
    await waitFor(() => expect(within(screen.getByText('Tổng số Ticket').closest('section')).getByText('0')).toBeTruthy());
    expect(screen.getAllByText('Chưa có dữ liệu').length).toBeGreaterThan(0);
    expect(screen.queryByText('95%')).toBeNull();
    expect(apiClient).toHaveBeenCalledTimes(4);
  });
});
