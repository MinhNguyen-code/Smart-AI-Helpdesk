# Day 5 — Kanban và Notifications

**Ngày:** 12/11/2026. **Checkpoint: PARTIAL.** Backend và UI đã nối; luồng ticket mới bằng cả ba tài khoản Google chưa hoàn tất.

## Đã triển khai

- Kanban ba cột và modal chi tiết ticket dựa trên `src/App.jsx`/`src/features/TicketDetail.jsx` từ Day 3: dữ liệu thật lấy `GET /tickets`; status/assignment/comment đi qua API có kiểm soát version và RBAC. Preview vẫn mang nhãn dữ liệu mẫu.
- `server/src/modules/notificationRoutes.js`: danh sách 50 thông báo mới nhất, `unreadCount`, đọc một hoặc tất cả; truy vấn luôn giới hạn theo `recipient_id` của user đang hoạt động. `src/features/NotificationMenu.jsx` hiển thị chuông, đọc/chưa đọc, mở ticket liên quan và thăm dò 30 giây.
- Ticket tạo mới đã ghi thông báo cho Admin/IT Agent; phản hồi và phân công cũng ghi thông báo. Worker ghi cảnh báo SLA vào cùng bảng.

## Database/API

Không thêm migration. API: `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` dưới `/api/v1`; mutation có CSRF và Origin. Integration test dùng riêng schema mới `_new_test`.

## Kiểm thử

- `reportingApi.test.js`: người khác không thấy hoặc đánh dấu đọc thông báo của Admin (404); owner đọc được, cập nhật đọc và read-all trả 204. **PASS** trong `npm.cmd run test:integration` 6/6.
- `NotificationMenu.test.jsx`: số chưa đọc 1 → 0, gọi API đánh dấu đọc và mở đúng ticket. Bộ frontend toàn suite **4 pass, 0 fail**.
- Browser Google thật: IT_AGENT đăng nhập thành công, Kanban hiển thị dữ liệu từ MySQL (tại thời điểm kiểm tra 0 ticket); chuông báo 0 chưa đọc và empty state. Trang `/rules` hiện thông báo chỉ Admin. **PASS cho một vai trò và empty state**.
- Ảnh Kanban/modal preview: `docs/screenshots/day7-03-kanban.png`, `day7-04-ticket-detail.png`.

## Chưa xác minh

Thông báo mới xuất hiện trong browser thật khi End-User tạo ticket; click thông báo mở đúng ticket; kéo thả status trên dữ liệu thật. Dashboard và notification menu trên phiên Admin/End-User thật. Browser hiện chỉ xác nhận IT_AGENT với hàng đợi rỗng.

## Checkpoint kế tiếp

Nghiệm thu một ticket thật do End-User được duyệt tạo, IT Agent nhận và phản hồi, Admin theo dõi; so sánh notification count trước/sau, rồi xác nhận lịch sử và trạng thái tồn tại sau restart.
