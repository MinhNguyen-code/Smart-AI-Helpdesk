export const priorities = { P1: 'Khẩn cấp', P2: 'Cao', P3: 'Bình thường', P4: 'Thấp' };
export const statuses = { OPEN: 'Mới tạo', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết' };
// Deadlines below are illustrative and reset when the preview module loads.
const previewStartedAt = Date.now();
export const sampleTickets = [
  { id: 1024, ticket_code: 'INC-1024', title: 'Sập hệ thống quản lý điểm', description: 'Từ 10:00 sáng nay, Phòng Đào tạo không thể truy cập hệ thống quản lý điểm. Trang đăng nhập hiển thị lỗi 503 – Service Unavailable. Nhờ bộ phận IT kiểm tra và hỗ trợ khôi phục.', priority: 'P1', status: 'OPEN', category_id: 1, reporter: 'Nguyễn Hà', impact: 'organization', assignee_id: 1, priority_reason: 'Từ khóa mẫu: sập hệ thống · quản lý điểm', comments: [{ id: 1, author_name: 'Người báo lỗi (mẫu)', message: 'Hệ thống vẫn chưa truy cập được, nhờ IT hỗ trợ.' }, { id: 2, author_name: 'Kỹ thuật viên (mẫu)', message: 'Đã tiếp nhận. Đang kiểm tra máy chủ và kết nối cơ sở dữ liệu.' }], version: 1 },
  { id: 1025, ticket_code: 'INC-1025', title: 'Không đăng nhập được email', description: 'Không thể truy cập email công việc.', priority: 'P2', status: 'OPEN', category_id: 2, reporter: 'Minh Anh', impact: 'individual', comments: [], version: 1 },
  { id: 1026, ticket_code: 'INC-1026', title: 'Máy in không nhận lệnh', description: 'Máy in phòng kế toán không phản hồi.', priority: 'P3', status: 'OPEN', category_id: 3, reporter: 'Thu Hương', impact: 'department', comments: [], version: 1 },
  { id: 1021, ticket_code: 'INC-1021', title: 'Mất kết nối mạng tại phòng máy', description: 'Phòng máy B tầng 2 mất kết nối.', priority: 'P2', status: 'IN_PROGRESS', category_id: 1, reporter: 'Quang Tú', impact: 'department', comments: [], version: 1 },
  { id: 1019, ticket_code: 'INC-1019', title: 'Cài đặt phần mềm giảng dạy', description: 'Cần cài đặt phần mềm cho buổi học.', priority: 'P3', status: 'IN_PROGRESS', category_id: 3, reporter: 'Hoàng Long', impact: 'individual', comments: [], version: 1 },
  { id: 1018, ticket_code: 'INC-1018', title: 'Đặt lại mật khẩu tài khoản', description: 'Yêu cầu đã hoàn tất.', priority: 'P3', status: 'RESOLVED', category_id: 2, reporter: 'Lan Ngọc', impact: 'individual', comments: [], version: 1 },
].map((ticket, index) => ({ ...ticket, resolution_deadline_at: ticket.status === 'RESOLVED' ? null : new Date(previewStartedAt + [14,85,220,48,135][index] * 60000).toISOString() }));
export const sampleRules = ['server sập', 'mất mạng', 'lỗi 500'].map((keyword, index) => ({ id: index + 1, keyword, priority: 'P1', is_active: true }));
export const sampleCategories = [{ id: 1, name: 'Mạng & Hệ thống' }, { id: 2, name: 'Tài khoản' }, { id: 3, name: 'Thiết bị & Phần mềm' }];
