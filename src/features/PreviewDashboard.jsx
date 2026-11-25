import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { priorities } from './previewData';

const colors = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)'];
const viDate = value => value ? value.split('-').reverse().join('/') : '';
const previewDays = [
  { count: 18, priorityCounts: [2, 5, 7, 4], mtta: 7, mttr: 1.4, onTime: 17 },
  { count: 24, priorityCounts: [2, 7, 10, 5], mtta: 8, mttr: 1.6, onTime: 23 },
  { count: 20, priorityCounts: [2, 6, 8, 4], mtta: 9, mttr: 1.3, onTime: 19 },
  { count: 16, priorityCounts: [2, 5, 6, 3], mtta: 8, mttr: 1.5, onTime: 15 },
  { count: 22, priorityCounts: [2, 7, 9, 4], mtta: 7, mttr: 1.7, onTime: 21 },
  { count: 12, priorityCounts: [1, 4, 4, 3], mtta: 9, mttr: 1.4, onTime: 11 },
  { count: 8, priorityCounts: [1, 2, 4, 1], mtta: 8, mttr: 1.6, onTime: 8 },
].map((item, index) => ({
  ...item,
  day: `2026-10-${String(index + 5).padStart(2, '0')}`,
  label: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'][index],
}));

export default function PreviewDashboard({ preview }) {
  const [from, setFrom] = useState('2026-10-05');
  const [to, setTo] = useState('2026-10-11');
  const days = previewDays.filter(item => item.day >= from && item.day <= to);
  const total = days.reduce((sum, item) => sum + item.count, 0);
  const distribution = Object.entries(priorities).map(([priority, label], index) => ({
    name: `${priority} — ${label}`,
    value: days.reduce((sum, item) => sum + item.priorityCounts[index], 0),
  }));
  const weighted = field => days.reduce((sum, item) => sum + item[field] * item.count, 0) / total;
  const mtta = total ? `${Math.round(weighted('mtta'))} phút` : '—';
  const mttr = total ? `${weighted('mttr').toFixed(1)} giờ` : '—';
  const onTime = days.reduce((sum, item) => sum + item.onTime, 0);
  const compliance = total ? `${Math.round(onTime / total * 100)}%` : '—';

  return <>
    <header className="page-header">
      <div><small>BÁO CÁO THỐNG KÊ</small><h1>Báo Cáo Hiệu Suất</h1><p>Khoảng báo cáo: {viDate(from)} – {viDate(to)}</p></div>
      <div className="date-filter">
        <label>Từ ngày<input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
        <label>Đến ngày<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label>
      </div>
    </header>
    {!preview ? <div className="empty panel">API thống kê đang được hoàn thiện. <Link to="/dashboard?preview=1">Xem thiết kế mẫu</Link></div> : <>
      <div className="kpis">{[
        ['Tổng số Ticket', total, 'Ticket trong khoảng thời gian đã chọn'],
        ['Thời gian tiếp nhận TB — MTTA', mtta, 'Chỉ số minh họa theo ngày'],
        ['Thời gian xử lý TB — MTTR', mttr, 'Chỉ số minh họa theo ngày'],
        ['Tỷ lệ tuân thủ SLA', compliance, `${onTime}/${total} ticket minh họa đúng hạn`],
      ].map(([label, value, note], index) => <section className="panel" key={label}>
        <span>{label}</span><strong className={index === 3 ? 'good' : ''}>{value}</strong><small>{note}</small>
      </section>)}</div>
      <div className="charts">
        <section className="panel">
          <h3>Số lượng Ticket theo ngày</h3><p>Dữ liệu minh họa: {viDate(from)} – {viDate(to)}</p>
          <div className="chart">{days.length ? <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 20, right: 15, bottom: 10, left: -20 }}>
              <CartesianGrid vertical={false} stroke="#eeeeef" /><XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} /><Tooltip />
              <Bar isAnimationActive={false} dataKey="count" name="Ticket" fill="var(--color-chart-bar)" radius={[3, 3, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer> : <div className="empty">Không có dữ liệu mẫu trong khoảng ngày này.</div>}</div>
          <small>■ Số ticket được tạo trong ngày</small>
        </section>
        <section className="panel">
          <h3>Phân bố Mức độ ưu tiên</h3><p>Tỷ trọng trên tổng số {total} ticket minh họa</p>
          <div className="pie-chart">{total ? <ResponsiveContainer width="100%" height="100%">
            <PieChart><Pie isAnimationActive={false} data={distribution} dataKey="value" strokeWidth={3} stroke="#fff">
              {distribution.map((item, index) => <Cell key={item.name} fill={colors[index]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer> : <div className="empty">Không có ticket trong khoảng ngày này.</div>}</div>
          <div className="legend">{distribution.map((item, index) => <div key={item.name}>
            <span><i style={{ background: colors[index] }} />{item.name}</span><span>{item.value} ticket</span>
            <strong>{total ? Math.round(item.value / total * 100) : 0}%</strong>
          </div>)}</div>
        </section>
      </div>
    </>}
  </>;
}
