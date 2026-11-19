import { lazy, Suspense, useState } from 'react';
import { Clock3, Sparkles } from 'lucide-react';

const SupportScene = lazy(() => import('./SupportScene'));

export default function SupportVisual() {
  const [showScene, setShowScene] = useState(false);
  return (
    <div className="saas-preview-card">
      <div className="saas-preview-head">
        <span><Sparkles size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />Rule-Based Auto-Triage</span>
        <button type="button" className="visual-toggle" aria-pressed={showScene}
          onClick={() => setShowScene(current => !current)}>
          {showScene ? 'Xem ticket mẫu' : 'Xem bàn hỗ trợ 3D'}
        </button>
      </div>
      {showScene ? <Suspense fallback={<div className="visual-loading" role="status">Đang tải mô hình 3D…</div>}><SupportScene /></Suspense> : <div className="saas-preview-ticket" role="img" aria-label="Minh họa ticket khẩn cấp được phân loại theo quy tắc và SLA">
        <div className="saas-preview-meta">
          <span style={{ fontFamily: 'var(--font-mono)' }}>#INC-1024</span>
          <span className="badge P1">P1 · Khẩn cấp</span>
          <span className="sla urgent" style={{ marginLeft: 'auto' }}><Clock3 size={12} /> Còn 14 phút</span>
        </div>
        <strong>Sập hệ thống quản lý điểm</strong>
        <div className="saas-preview-meta">
          <span>Khớp quy tắc: <code className="keyword-code">server sập</code></span>
          <span>·</span>
          <span>Ảnh hưởng: Toàn tổ chức</span>
        </div>
      </div>}
    </div>
  );
}
