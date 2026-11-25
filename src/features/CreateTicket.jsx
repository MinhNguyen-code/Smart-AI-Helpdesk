import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Paperclip, X } from 'lucide-react';

const imageTypes = ['image/png', 'image/jpeg', 'image/webp'];
const maxImageBytes = 10 * 1024 * 1024;

export default function CreateTicket({ categories, onSubmit, onCancel, busy, preview, idempotent }) {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [image, setImage] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const attempt = useRef(null);

  useEffect(() => {
    if (!file) { setImage(''); return; }
    const objectUrl = URL.createObjectURL(file);
    setImage(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function choose(selected) {
    if (!selected) return;
    if (!imageTypes.includes(selected.type) || selected.size > maxImageBytes) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFileError('Chọn ảnh PNG, JPG hoặc WebP tối đa 10 MB.');
      return;
    }
    setFileError('');
    setFile(selected);
  }

  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') || '').trim();
    const description = String(data.get('description') || '').trim();
    const categoryId = Number(data.get('category'));
    if (!title) { setFormError('Nhập tiêu đề mô tả sự cố.'); titleRef.current?.focus(); return; }
    if (!description) { setFormError('Nhập mô tả chi tiết để đội IT xử lý.'); descriptionRef.current?.focus(); return; }
    if (!Number.isSafeInteger(categoryId) || categoryId < 1) { setFormError('Chọn danh mục sự cố.'); return; }
    setFormError('');
    const fields = { title, description, impact: data.get('impact'), category_id: categoryId };
    if (idempotent && globalThis.crypto?.randomUUID) {
      const key = JSON.stringify(fields);
      if (attempt.current?.key !== key) attempt.current = { key, id: globalThis.crypto.randomUUID() };
      fields.request_id = attempt.current.id;
    }
    onSubmit(fields, file);
  }

  return <div className="create-page">
    <header><h1>Tạo Yêu Cầu Hỗ Trợ Mới</h1><p>Mô tả sự cố và đính kèm ảnh để đội IT hỗ trợ bạn nhanh hơn.</p></header>
    <form className="ticket-form" onSubmit={submit}>
      {formError && <p className="field-error" role="alert">{formError}</p>}
      <label>Tiêu đề sự cố *
        <input ref={titleRef} name="title" autoComplete="off" placeholder="Ví dụ: Không vào được hệ thống LMS…" required maxLength={255} onInput={() => setFormError('')} />
      </label>
      <div className="form-grid">
        <label>Mức độ ảnh hưởng *
          <select name="impact" defaultValue="individual"><option value="individual">Cá nhân</option><option value="department">Phòng ban</option><option value="organization">Toàn tổ chức</option></select>
        </label>
        <label>Danh mục *
          <select name="category" required defaultValue=""><option value="" disabled>Chọn danh mục…</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        </label>
      </div>
      <label>Mô tả chi tiết *
        <textarea ref={descriptionRef} name="description" autoComplete="off" required maxLength={20000} rows={8} placeholder="Sự cố xảy ra khi nào? Bạn đã thử những cách nào?" onInput={() => setFormError('')} onPaste={event => choose([...event.clipboardData.files][0])} />
        <span className="field-hint">Có thể dán ảnh từ clipboard bằng Ctrl+V.</span>
      </label>
      <div className={`upload upload-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragEnter={event => { event.preventDefault(); setDragging(true); }}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }}>
        <input ref={fileInputRef} id="ticket-attachment" className="file-input" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="ticket-attachment-help" onChange={event => choose(event.target.files[0])} />
        <label htmlFor="ticket-attachment" className="button secondary file-trigger"><Paperclip size={16} aria-hidden="true" />Chọn ảnh</label>
        <small id="ticket-attachment-help">{preview ? 'Kéo ảnh vào đây hoặc chọn ảnh · Chỉ xem trước trong chế độ mẫu' : 'Kéo ảnh vào đây hoặc chọn ảnh · PNG, JPG, WebP · Tối đa 10 MB · Lưu riêng tư'}</small>
      </div>
      {fileError && <p className="field-error" role="alert">{fileError}</p>}
      {file && <div className="file-preview"><img src={image} width="88" height="66" alt="Ảnh đính kèm xem trước"/><div><strong>{file.name}</strong><small>Đã chọn ảnh · chưa tải lên máy chủ</small></div><button type="button" className="icon-button" aria-label="Bỏ ảnh" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}><X size={18}/></button></div>}
      <footer><button className="button secondary" type="button" onClick={onCancel}>Hủy bỏ</button><button className="button dark" disabled={busy || categories.length === 0}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}<ArrowRight size={16} aria-hidden="true"/></button></footer>
    </form>
  </div>;
}
