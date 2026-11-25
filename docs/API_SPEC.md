# SMART IT HELPDESK — ĐẶC TẢ REST API (API SPECIFICATION)

Base URL: `/api/v1`
Định dạng dữ liệu: JSON (UTF-8). Xác thực qua Cookie phiên (`smart_helpdesk_sid`).

---

## Trạng thái triển khai

Các endpoint trong mục 1–8 đã có mã. Các nhóm nghiệp vụ có kiểm thử API/MySQL tự động ở những đường đi chính; đăng nhập Google trên trình duyệt thật với đầy đủ ba vai trò và toàn bộ luồng UI vẫn cần nghiệm thu riêng. Request mutation yêu cầu cookie phiên, `Origin` đúng `CLIENT_URL` và header `X-CSRF-Token` lấy từ `GET /api/v1/auth/csrf`. Các field của Ticket/Rules/SLA dùng `snake_case`; phản hồi Analytics dùng `camelCase` như ví dụ bên dưới.

## 1. Hệ thống

- `GET /api`: metadata API.
- `GET /api/v1/health`: liveness, trả 200 `{ "status": "UP" }` khi Express chạy.
- `GET /api/v1/ready`: readiness truy vấn MySQL thật và xác minh schema đích; trả 200 `{ "status": "READY" }` hoặc 503 `{ "status": "NOT_READY" }`. Phản hồi công khai không chứa tên schema, runtime hoặc chi tiết kết nối.

## 2. Xác thực

- `GET /api/v1/auth/google`: bắt đầu OIDC, state/nonce/PKCE trong session, chuyển tới Google.
- `GET /api/v1/auth/google/callback`: xác minh Google ID token/email, đối soát allowlist rồi tạo session.
- `GET /api/v1/auth/me`: `{ "user": { "id", "full_name", "role" } }` hoặc 401.
- `GET /api/v1/auth/csrf`: `{ "csrfToken": "..." }` cho mutation.
- `POST /api/v1/auth/logout`: 204, hủy session.

## 3. Ticket Core

- `GET /api/v1/categories`: danh mục đang hoạt động.
- `GET /api/v1/agents`: danh sách `{id, full_name}` IT Agent đang hoạt động; Admin/IT Agent.
- `GET /api/v1/tickets?page=1&search=...&status=...`: `{items, total, page, pageSize}`; mỗi trang tối đa 30. End-User chỉ xem ticket của mình.
- `POST /api/v1/tickets`: JSON `{title, description, impact, category_id}`; trả ticket 201. Priority/SLA/history/notification ghi trong cùng transaction.
- `GET /api/v1/tickets/:id`: ticket, `comments`, `history`, `attachments` metadata; 404 nếu không có quyền xem. Với END_USER, `comments` chỉ gồm phản hồi public và `history` không gồm event `COMMENT_ADDED` của ghi chú internal hoặc comment đã mất; ADMIN/IT_AGENT thấy lịch sử đầy đủ.
- `GET /api/v1/tickets/:id/comments`: phản hồi; End-User chỉ xem phản hồi public.
- `POST /api/v1/tickets/:id/comments`: JSON `{message, visibility?}`. Chỉ staff được gửi `internal`.
- `PATCH /api/v1/tickets/:id/assign`: JSON `{assignee_id, version}`; staff, IT Agent chỉ được nhận chính mình.
- `POST /api/v1/tickets/:id/acknowledge`: JSON `{version}`; chỉ ADMIN/IT_AGENT. Ghi `acknowledged_at`, tăng version, ghi history/audit trong cùng transaction; 409 nếu đã ACK, đã RESOLVED hoặc version cũ. ACK không đặt `first_response_at`.
- `PATCH /api/v1/tickets/:id/status`: JSON `{status, version}`; staff, theo chuỗi OPEN → IN_PROGRESS → RESOLVED.
- `POST /api/v1/tickets/:id/attachments`: multipart field `file`, PNG/JPEG/WebP tối đa 10 MB. Kiểm tra nội dung file, lưu private, trả metadata 201.
- `GET /api/v1/tickets/:id/attachments/:attachmentId`: chỉ người có quyền xem ticket tải được; trả `Content-Disposition: attachment` và `nosniff`.

---

## 4. Quản Trị Quy Tắc Ưu Tiên (Priority Rules) - ADMIN Only

- `GET /api/v1/rules`: Mảng quy tắc `{id, keyword, priority, is_active, created_at, updated_at}`; frontend tìm kiếm cục bộ.
- `POST /api/v1/rules`: JSON `{keyword, priority, is_active}`; `priority` là `P1`, `P2`, `P3` hoặc `P4`; trả 201.
- `PATCH /api/v1/rules/:id`: JSON đầy đủ `{keyword, priority, is_active}`; trả 200. Từ khóa trùng sau chuẩn hóa tiếng Việt trả 409, kể cả ghi đồng thời nhờ unique index `uq_priority_rules_normalized_keyword`.
- `DELETE /api/v1/rules/:id`: Xóa quy tắc, trả 204. Mọi thay đổi ghi `audit_logs`.

---

## 5. Chính Sách SLA (SLA Policies) - ADMIN Only

- `GET /api/v1/sla/policies`: Mảng chính sách P1–P4 gồm `priority`, `response_minutes`, `resolution_minutes`, `is_active`.
- `PUT /api/v1/sla/policies/:priority`: JSON `{response_minutes, resolution_minutes, is_active}`. Phút là số nguyên từ 1–43200; hạn giải quyết không ngắn hơn hạn phản hồi. Chỉ tác động ticket mới; hạn của ticket đã tạo là snapshot.

---

## 6. Thông Báo Trong Ứng Dụng (Notifications)

Mỗi notification mới từ ticket/assignment/reply/SLA được thêm vào `email_outbox` trong cùng transaction. Email worker xử lý hàng đợi khi SMTP được cấu hình; API không coi gửi email thành công nếu nhà cung cấp chưa nhận. Retry tối đa 8 lượt với backoff; trạng thái `sent` nghĩa là SMTP đã chấp nhận recipient, chưa chứng minh email đến hộp thư. Nếu worker ngừng sau khi SMTP nhận nhưng trước khi ghi `sent`, có thể gửi lặp sau hồi phục (at-least-once).

- `GET /api/v1/notifications`: `{items, unreadCount}`; tối đa 50 thông báo mới nhất của chính người đang đăng nhập.
- `PATCH /api/v1/notifications/:id/read`: Đánh dấu thông báo của chính người dùng là đã đọc; 204, hoặc 404 nếu không thuộc người dùng.
- `POST /api/v1/notifications/read-all`: Đánh dấu tất cả thông báo của chính người dùng là đã đọc; 204.

---

## 7. Báo Cáo & Thống Kê (Dashboard Analytics) - ADMIN Only

- `GET /api/v1/analytics/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`: `{total, mttaSeconds, firstResponseSeconds, mttrSeconds, slaEvaluated, slaCompliant, slaCompliancePercent}`. Chỉ ticket tạo trong khoảng ngày. `mttaSeconds` tính từ tạo ticket đến **ACK đầu tiên** (`acknowledged_at`); `firstResponseSeconds` tính đến phản hồi public đầu tiên của nhân viên (`first_response_at`); `mttrSeconds` tính đến RESOLVED. Các trung bình chỉ gồm ticket có mốc tương ứng. Mẫu số SLA là ticket `RESOLVED`; đạt SLA khi phản hồi public đầu tiên đúng hạn **và** giải quyết đúng hạn. ACK không thay phản hồi cho SLA. Ticket đang mở chưa vào mẫu số. Không có mẫu số thì tỷ lệ là `null`.
- `GET /api/v1/analytics/daily?startDate=...&endDate=...`: Mảng `{day, count}` cho những ngày có ticket.
- `GET /api/v1/analytics/priorities?startDate=...&endDate=...`: Mảng `{priority, count, percent}`; mẫu số là tổng ticket cùng khoảng ngày.
- `GET /api/v1/analytics/categories?startDate=...&endDate=...`: Mảng `{category_id, name, count, percent}`; mẫu số là tổng ticket cùng khoảng ngày.

Ngày đầu/cuối tính cả hai, giới hạn tối đa 366 ngày, mặc định 7 ngày UTC gần nhất. `created_at` MySQL được diễn giải theo UTC; giao diện hiển thị ngày ISO. Các tỷ lệ được làm tròn hai chữ số thập phân. Không có dữ liệu thì trả mảng rỗng, `total: 0` và các trung bình không xác định là `null`.

---

## 8. Danh sách cho phép và vai trò — ADMIN Only

- `GET /api/v1/users`: Mảng `{id, email, full_name, role, is_active, google_linked}`. `google_sub` không được trả về.
- `POST /api/v1/users`: JSON `{email, role}` với vai trò `ADMIN`, `IT_AGENT` hoặc `END_USER`; trả 201. Email được chuẩn hóa chữ thường, trùng trả 409. Bản ghi mới **chưa liên kết Google**; chỉ callback OIDC hợp lệ mới liên kết `sub`.
- `PATCH /api/v1/users/:id`: JSON `{role, is_active}`; trả bản ghi sau cập nhật. Admin không thể tự đổi hoặc tự khóa tài khoản của mình qua API này. Các thay đổi ghi `audit_logs`.

Các endpoint kiểm tra vai trò và trạng thái hoạt động từ MySQL, không dựa vào vai trò cũ trong cookie phiên. Quyền Google Cloud và ánh xạ tài khoản cá nhân không được API này tự thay đổi.

## 9. Vận hành và môi trường

- `?preview=1` chỉ hoạt động trong Vite **development mode**; bản build production yêu cầu session thật và không hiển thị liên kết preview. Preview không gọi API nghiệp vụ thật.
- `/health` và `/ready` được đặt trước API rate limiter để probe phản ánh trạng thái dịch vụ; readiness vẫn truy vấn MySQL.
- `npm run session:cleanup` đếm session hết hạn sau khi xác minh schema/account đích, không xóa dữ liệu; `npm run session:cleanup -- --apply` mới dọn tối đa 5.000 session hết hạn mỗi lượt và kiểm tra lại hạn ngay trước khi xóa. Chỉ lên lịch ở môi trường đã được phê duyệt và theo dõi số còn lại.
- Mọi kết nối Knex đặt session MySQL về UTC. Migration chỉ nhắm hai schema `smart_it_helpdesk_new_dev` và `smart_it_helpdesk_new_test` bằng tài khoản migration riêng.
