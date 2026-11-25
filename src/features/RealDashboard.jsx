import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiClient } from '../api/client';
import { priorities } from './previewData';

const colors = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)'];
const day = date => date.toISOString().slice(0, 10);
const viDate = value => value ? value.split('-').reverse().join('/') : '';
function duration(seconds) {
  if (seconds === null) return 'Chưa có dữ liệu';
  return seconds < 3600 ? `${Math.round(seconds / 60)} phút` : `${Math.round(seconds / 360) / 10} giờ`;
}
export default function RealDashboard() {
  const [end, setEnd] = useState(() => day(new Date()));
  const [start, setStart] = useState(() => day(new Date(Date.now() - 6 * 86400000)));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(''); setData(null);
    const query = `?startDate=${start}&endDate=${end}`;
    Promise.all(['summary', 'daily', 'priorities', 'categories'].map(name => apiClient(`/analytics/${name}${query}`)))
      .then(([summary, daily, prioritiesData, categories]) => { if (active) setData({ summary, daily, prioritiesData, categories }); })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [start, end, retry]);
  const distribution = data?.prioritiesData.map(item => ({ name: `${item.priority} — ${priorities[item.priority]}`, value: item.count, percent: item.percent })) || [];
  return <><header className="page-header"><div><small>BÁO CÁO THỐNG KÊ</small><h1>Báo Cáo Hiệu Suất</h1><p>Khoảng báo cáo: {viDate(start)} – {viDate(end)}</p></div><div className="date-filter"><label>Từ ngày<input type="date" value={start} max={end} onChange={event => setStart(event.target.value)}/></label><label>Đến ngày<input type="date" value={end} min={start} onChange={event => setEnd(event.target.value)}/></label></div></header>
    {error && <div className="alert" role="alert">{error}<button className="button secondary" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>}
    {!data && !error && <div className="loading">Đang tải số liệu từ MySQL…</div>}
    {data && <><div className="kpis">{[
      ['Tổng số Ticket', data.summary.total, 'Ticket tạo trong khoảng ngày đã chọn'],
      ['Tiếp nhận TB — MTTA', duration(data.summary.mttaSeconds), 'Từ tạo ticket đến ACK đầu tiên'],
      ['Xử lý TB — MTTR', duration(data.summary.mttrSeconds), 'Ticket đã giải quyết'],
      ['Tuân thủ SLA', data.summary.slaCompliancePercent === null ? 'Chưa có dữ liệu' : `${data.summary.slaCompliancePercent}%`, `${data.summary.slaCompliant}/${data.summary.slaEvaluated} ticket đã giải quyết đạt cả hai hạn`],
    ].map(([label, value, note], index) => <section className="panel" key={label}><span>{label}</span><strong className={index === 3 ? 'good' : ''}>{value}</strong><small>{note}</small></section>)}</div>
      <div className="charts"><section className="panel"><h3>Số lượng Ticket theo ngày</h3><p>{viDate(start)} – {viDate(end)} · Dữ liệu MySQL</p><div className="chart">{data.daily.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.daily} margin={{top:20,right:15,bottom:10,left:-20}}><CartesianGrid vertical={false} stroke="#eeeeef"/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip/><Bar isAnimationActive={false} dataKey="count" name="Ticket" fill="var(--color-chart-bar)" radius={[3,3,0,0]} maxBarSize={42}/></BarChart></ResponsiveContainer> : <div className="empty">Không có ticket trong khoảng ngày này.</div>}</div><small>■ Số ticket được tạo trong ngày</small></section>
        <section className="panel"><h3>Phân bố Mức độ ưu tiên</h3><p>{data.summary.total} ticket trong khoảng ngày đã chọn</p><div className="pie-chart">{distribution.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie isAnimationActive={false} data={distribution} dataKey="value" strokeWidth={3} stroke="#fff">{distribution.map((item,index) => <Cell key={item.name} fill={colors[index % colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer> : <div className="empty">Chưa có dữ liệu ưu tiên.</div>}</div><div className="legend">{distribution.map((item,index) => <div key={item.name}><span><i style={{background:colors[index % colors.length]}}/>{item.name}</span><span>{item.value} ticket</span><strong>{item.percent}%</strong></div>)}</div></section></div>
      <section className="panel category-report"><h3>Danh mục sự cố</h3>{data.categories.length ? <div className="legend">{data.categories.map(item => <div key={item.category_id ?? 'none'}><span>{item.name}</span><span>{item.count} ticket</span><strong>{item.percent}%</strong></div>)}</div> : <p>Chưa có dữ liệu danh mục.</p>}</section>
    </>}
  </>;
}
