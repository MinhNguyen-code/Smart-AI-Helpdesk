import { statuses } from './previewData';
import './ticket-simulation.css';

export default function TicketProgress({ status }) {
  const stages = Object.entries(statuses);
  const current = stages.findIndex(([value]) => value === status);
  if (current < 0) return null;

  return (
    <section className="ticket-progress" aria-label="Tiến độ xử lý ticket">
      <span className="ticket-progress-label">TIẾN ĐỘ XỬ LÝ</span>
      <ol className="ticket-progress-steps" aria-label="Trạng thái ticket">
        {stages.map(([value, label], index) => (
          <li className={index < current ? 'completed' : ''} key={value}
            aria-current={index === current ? 'step' : undefined}>
            <span className="step-marker" aria-hidden="true">{index + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
