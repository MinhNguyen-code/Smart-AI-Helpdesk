import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RulesPage from './RulesPage';

describe('RulesPage preview interactions', () => {
  it('adds and deletes a P4 rule through the wireframe dialog', async () => {
    render(<RulesPage preview mutate={() => { throw new Error('Preview must not call API'); }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Quy Tắc Mới' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Từ khóa' }), { target: { value: 'máy in hỏng' } });
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Mức độ ưu tiên' }), { target: { value: 'P4' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu quy tắc' }));
    await waitFor(() => expect(screen.getByText('máy in hỏng')).toBeTruthy());
    expect(within(screen.getByText('máy in hỏng').closest('tr')).getByText('P4 · Thấp')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa máy in hỏng' }));
    const confirm = screen.getByRole('dialog');
    expect(within(confirm).getByText(/máy in hỏng/)).toBeTruthy();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Xóa quy tắc' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Xóa máy in hỏng' })).toBeNull());
  });

  it('edits P2 SLA without touching the backend in preview', async () => {
    render(<RulesPage preview mutate={() => { throw new Error('Preview must not call API'); }} />);
    const card = screen.getByText('P2 · Cao').closest('article');
    fireEvent.click(within(card).getByRole('button', { name: 'Chỉnh sửa' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Phản hồi (phút)' }), { target: { value: '75' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu SLA' }));
    await waitFor(() => expect(within(card).getByText('Phản hồi: 75 phút')).toBeTruthy());
  });
});
