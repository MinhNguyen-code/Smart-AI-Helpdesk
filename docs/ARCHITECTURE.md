# SMART IT HELPDESK — KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

## 1. Tổng Quan Kiến Trúc (Architecture Overview)

Smart IT Helpdesk được thiết kế theo mô hình kiến trúc Monorepo Single-Organization tinh gọn, kết hợp giữa Frontend Single Page Application (React + Vite) và Backend RESTful API (Node.js + Express), lưu trữ dữ liệu tại MySQL 8.x.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  React 18 (Vite) + Tailwind CSS + React Router + Lucide Icons + Recharts          |
|  - AuthProvider & Session Interceptor                                             |
|  - 7 screens based on the original wireframes                                     |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST API (with Credentials/Cookies)
+------------------------------------------v----------------------------------------+
|                                 SERVER TIER                                       |
|  Node.js + Express Application                                                    |
|  +-----------------------------------------------------------------------------+  |
|  | Middleware Pipeline: Helmet, CORS, RateLimiter, BodyParser, Session(MySQL)  |  |
|  | Auth Guard (Google OIDC / Session) & RBAC Guard (ADMIN, IT_AGENT, END_USER)  |  |
|  +-----------------------------------------------------------------------------+  |
|  | Business Logic Modules:                                                     |  |
|  | - Auth Module (Google OAuth 2.0 PKCE, Allowlist Binding)                    |  |
|  | - Ticket Lifecycle Module (OPEN -> IN_PROGRESS -> RESOLVED)                 |  |
|  | - Rule-Based Priority Engine (Vietnamese NFD Normalizer, Urgent Precedence) |  |
|  | - SLA Service (Target calculation, Breach detection, Deduplication)         |  |
|  | - Notification Service (persistent inbox, client polling)                  |  |
|  | - Analytics Aggregation Service (Raw SQL aggregation, No client-side calc)  |  |
|  +-----------------------------------------------------------------------------+  |
|  | Data Access Layer: Knex.js Query Builder with MySQL 8.x Transactions         |  |
+------------------------------------------+----------------------------------------+
                                           | SQL over TCP:3306 (mysql2 pool)
+------------------------------------------v----------------------------------------+
|                                DATA PERSISTENCE TIER                              |
|  MySQL 8.x Community Server                                                       |
|  - Development Database: `smart_it_helpdesk_new_dev`                              |
|  - Test Database: `smart_it_helpdesk_new_test`                                    |
|  - Persistent Session Table: `sessions`                                           |
|  - Core Entities: users, categories, tickets, comments, attachments,              |
|                   ticket_history, priority_rules, sla_policies, notifications     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Kiến Trúc Frontend (Client-Side)

### 2.1 Cấu trúc Module hướng tính năng (Feature-Oriented Architecture)
- `src/api/`: Khởi tạo API Client dùng Native Fetch API cấu hình kèm `credentials: 'include'` để tự động gửi Session Cookie.
- `src/App.jsx`: Điều hướng, phiên đăng nhập, Login, tạo ticket, Kanban và chế độ preview.
- `src/features/TicketDetail.jsx`: Chi tiết ticket, hội thoại, trạng thái và tệp đính kèm.
- `src/features/RulesPage.jsx`: Danh sách/dialog quy tắc và cấu hình SLA P1–P4.
- `src/features/RealDashboard.jsx`: KPI và biểu đồ SQL cho Admin.
- `src/features/NotificationMenu.jsx`: Hộp thông báo, lấy dữ liệu định kỳ 30 giây.
- `src/features/UsersPage.jsx`: Allowlist và vai trò cho Admin.

### 2.2 Quản lý Phiên & Bảo mật Client
- Xác thực dựa trên Cookie `HttpOnly` lưu session ID; vẫn phải phòng chống XSS ở nội dung giao diện.
- Phân quyền điều hướng: `src/App.jsx` ẩn trang Admin với vai trò khác và chuyển người chưa đăng nhập về Login; API luôn kiểm tra lại vai trò/trạng thái hoạt động từ MySQL.

---

## 3. Kiến Trúc Backend (Server-Side)

### 3.1 Chuỗi Middleware (Pipeline)
1. **Helmet**: Thiết lập bảo mật HTTP headers tiêu chuẩn (Content Security Policy, Referrer Policy, v.v.).
2. **CORS**: Chỉ cho phép nguồn tin cậy từ `CLIENT_URL` (mặc định `http://localhost:5173`) với `credentials: true`.
3. **Express Rate Limit**: Giới hạn API ở 200 requests/15 phút theo cấu hình hiện tại; chưa có limiter riêng cho Auth.
4. **Session Middleware**: `express-session` kết hợp `server/src/db/sessionStore.js` lưu trạng thái phiên bền vững trong MySQL.
5. **Request Sanitization & Validation**: Kiểm tra tính hợp lệ của tham số đầu vào (sử dụng schemas định nghĩa chặt chẽ) trước khi chuyển vào controller.

### 3.2 Động Cơ Phân Loại Ưu Tiên Tự Động (Rule-Based Priority Engine)
Tuân thủ nghiêm ngặt yêu cầu đề tài học thuật về độ tin cậy và phòng ngừa sai sót:
- **Nguyên lý**: Phân loại tiền định (Deterministic), hoàn toàn không phụ thuộc vào LLM/AI bên ngoài vốn có tính bất định (non-deterministic).
- **Thuật toán chuẩn hóa tiếng Việt**:
  1. Chuyển văn bản về dạng chữ thường (lowercase) và chuẩn Unicode NFD/NFC.
  2. Khử dấu tiếng Việt hoặc khớp song song cả từ có dấu và không dấu (VD: "server sập" <=> "server sap").
  3. Tách từ khóa và khớp theo cụm từ (phrase matching) hoặc ranh giới từ để loại trừ các từ lồng sai ngữ cảnh.
- **Quy tắc quyết định**:
  - Nếu `impact == 'organization'` (Toàn tổ chức) -> Tự động gắn `P1`.
  - Nếu tiêu đề hoặc mô tả khớp quy tắc đang `Active`, chọn mức cao nhất trong `P1`–`P4`.
  - Không khớp quy tắc và không ảnh hưởng toàn tổ chức -> `P3`.
  - `P1` là mức cao nhất; quyết định lưu bằng chứng khớp từ khóa cùng ticket.
- **Lưu vết bằng chứng**: Mọi quyết định phân loại đều được ghi nhận lý do cụ thể vào cột `priority_reason` của ticket.

### 3.3 Cơ Chế Giám Sát SLA (SLA Monitoring & Worker)
- Khi ticket được tạo, hệ thống nạp chính sách SLA tương ứng với mức ưu tiên `P1`–`P4`.
- Tự động tính toán và lưu `response_deadline_at` (hạn phản hồi) và `resolution_deadline_at` (hạn giải quyết).
- **Background Worker (`worker:sla`)**:
  - Chạy theo chu kỳ định cấu hình (mặc định 60 giây).
  - Quét hạn phản hồi và giải quyết; nếu đã hoàn thành sau hạn, vẫn ghi nhận vi phạm.
  - Tạo thông báo `SLA_BREACH` trong bảng `notifications` cho IT Agent và Admin đang hoạt động.
  - Khóa hàng ticket và dùng `deduplication_key = 'sla:{ticketId}:{response|resolution}:{recipientId}'` để ngăn trùng cảnh báo.
  - Trên Windows, `server/scripts/superviseWorkers.ps1` theo dõi PID, tự khởi động lại worker lỗi và ngăn hai supervisor qua mutex. Ba lần quét lỗi liên tiếp khiến worker thoát để supervisor hồi phục.
- **Email outbox (`worker:email`)**: Notification và hàng `email_outbox` được thêm trong cùng MySQL transaction. Worker claim bằng row lock/lease và retry có backoff; chỉ khởi chạy khi SMTP được chủ dự án cấu hình. Test không gửi email thật.
- **ACK/Analytics**: ACK lưu riêng tại `tickets.acknowledged_at`; MTTA dùng ACK, first-response dùng phản hồi public, MTTR dùng RESOLVED. Deadline và `priority_evidence` được chụp tại lúc tạo ticket.
- **Thời gian**: Mỗi kết nối Knex đặt MySQL session UTC để `CURRENT_TIMESTAMP` và `mysql2` nhất quán.

---

## 4. Thiết Kế An Toàn Dữ Liệu & Khả Năng Chịu Lỗi (Reliability Engineering)

1. **Failure Prevention (Phòng ngừa lỗi)**:
   - Ràng buộc toàn vẹn khóa ngoại (Foreign Keys) và ràng buộc duy nhất (Unique Constraints) tại tầng CSDL.
   - Kiểm tra trạng thái chuyển đổi hợp lệ (`OPEN -> IN_PROGRESS -> RESOLVED`). Chặn mọi bước nhảy trạng thái trái phép.
2. **Failure Containment (Khoanh vùng sự cố)**:
   - Sử dụng Database Transaction trong mọi tác vụ tạo ticket, đảm bảo nếu lưu thông báo hoặc lưu lịch sử thất bại thì toàn bộ transaction được rollback, không để lại dữ liệu rác.
3. **Traceability (Khả năng truy vết)**:
   - Bảng `ticket_history` lưu lại dấu vết thay đổi (ai thay đổi, lúc nào, giá trị cũ, giá trị mới).
   - Bảng `audit_logs` lưu trữ các hành động quản trị viên nhạy cảm.
4. **Data Isolation (Bảo mật tài liệu đính kèm)**:
   - File đính kèm lưu vào thư mục `server/private-uploads/` với tên file ngẫu nhiên (UUID).
   - Tuyệt đối không phục vụ tĩnh trực tiếp; mọi lượt tải xuống phải đi qua API kiểm tra quyền truy cập (IDOR Prevention).
