# SMART IT HELPDESK — KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

## 1. Tổng Quan Kiến Trúc (Architecture Overview)

Smart IT Helpdesk được thiết kế theo mô hình kiến trúc Monorepo Single-Organization tinh gọn, kết hợp giữa Frontend Single Page Application (React + Vite) và Backend RESTful API (Node.js + Express), lưu trữ dữ liệu tại MySQL 8.x.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  React 18 (Vite) + Tailwind CSS + React Router + Lucide Icons + Recharts          |
|  - AuthProvider & Session Interceptor                                             |
|  - 7 screens matching exact wireframe visual layout                               |
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
|  | - Notification Service (In-App real-time alerts & persistent inbox)         |  |
|  | - Analytics Aggregation Service (Raw SQL aggregation, No client-side calc)  |  |
|  +-----------------------------------------------------------------------------+  |
|  | Data Access Layer: Knex.js Query Builder with MySQL 8.x Transactions         |  |
+------------------------------------------+----------------------------------------+
                                           | SQL over TCP:3306 (mysql2 pool)
+------------------------------------------v----------------------------------------+
|                                DATA PERSISTENCE TIER                              |
|  MySQL 8.x Community Server                                                       |
|  - Development Database: `smart_it_helpdesk_dev`                                  |
|  - Test Database: `smart_it_helpdesk_test`                                        |
|  - Persistent Session Table: `sessions`                                           |
|  - Core Entities: users, categories, tickets, comments, attachments,              |
|                   ticket_history, priority_rules, sla_policies, notifications     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Kiến Trúc Frontend (Client-Side)

### 2.1 Cấu trúc Module hướng tính năng (Feature-Oriented Architecture)
- `src/api/`: Khởi tạo API Client dùng Native Fetch API cấu hình kèm `credentials: 'include'` để tự động gửi Session Cookie.
- `src/components/layout/`: Sidebar thu nhỏ thanh lịch, Topbar, UserProfile badge.
- `src/components/ui/`: Các thành phần nguyên tử dùng chung (Button, Input, Select, Textarea, Badge, Modal, Alert, Table, LoadingSpinner).
- `src/features/auth/`: Màn hình Đăng nhập (SCR-01), trạng thái phiên người dùng, AuthProvider context.
- `src/features/tickets/`: Biểu mẫu tạo ticket (SCR-02), modal chi tiết ticket & trao đổi phản hồi (SCR-04).
- `src/features/kanban/`: Bảng Kanban 3 cột (Mới tạo, Đang xử lý, Đã giải quyết) (SCR-03), bộ lọc sắp xếp và tìm kiếm.
- `src/features/rules/`: Bảng danh sách quy tắc từ khóa (SCR-06) và modal thêm/sửa quy tắc (SCR-07).
- `src/features/dashboard/`: Thẻ chỉ số MTTA/MTTR, biểu đồ số lượng ticket theo ngày, biểu đồ phân bổ mức độ ưu tiên (SCR-05).
- `src/features/notifications/`: Hộp thư thông báo trong ứng dụng, đếm số thông báo chưa đọc, đánh dấu đã đọc.

### 2.2 Quản lý Phiên & Bảo mật Client
- Xác thực dựa trên Cookie `HttpOnly` lưu session ID an toàn, ngăn chặn hoàn toàn rủi ro XSS rò rỉ token.
- Phân quyền điều hướng: Sử dụng `<ProtectedRoute allowedRoles={['ADMIN', 'IT_AGENT']}>` để kiểm soát giao diện, tuy nhiên toàn bộ bảo mật thực tế được cưỡng chế 100% tại Backend API.

---

## 3. Kiến Trúc Backend (Server-Side)

### 3.1 Chuỗi Middleware (Pipeline)
1. **Helmet**: Thiết lập bảo mật HTTP headers tiêu chuẩn (Content Security Policy, Referrer Policy, v.v.).
2. **CORS**: Chỉ cho phép nguồn tin cậy từ `CLIENT_URL` (mặc định `http://localhost:5173`) với `credentials: true`.
3. **Express Rate Limit**: Giới hạn tần suất gọi API (100 requests/15 phút cho general API; 10 requests/15 phút cho Auth endpoints) chống brute-force và DDoS.
4. **Session Middleware**: Quản lý phiên làm việc bằng `express-session` kết hợp `express-mysql-session` để lưu trữ trạng thái phiên bền vững trong MySQL.
5. **Request Sanitization & Validation**: Kiểm tra tính hợp lệ của tham số đầu vào (sử dụng schemas định nghĩa chặt chẽ) trước khi chuyển vào controller.

### 3.2 Động Cơ Phân Loại Ưu Tiên Tự Động (Rule-Based Priority Engine)
Tuân thủ nghiêm ngặt yêu cầu đề tài học thuật về độ tin cậy và phòng ngừa sai sót:
- **Nguyên lý**: Phân loại tiền định (Deterministic), hoàn toàn không phụ thuộc vào LLM/AI bên ngoài vốn có tính bất định (non-deterministic).
- **Thuật toán chuẩn hóa tiếng Việt**:
  1. Chuyển văn bản về dạng chữ thường (lowercase) và chuẩn Unicode NFD/NFC.
  2. Khử dấu tiếng Việt hoặc khớp song song cả từ có dấu và không dấu (VD: "server sập" <=> "server sap").
  3. Tách từ khóa và khớp theo cụm từ (phrase matching) hoặc ranh giới từ để loại trừ các từ lồng sai ngữ cảnh.
- **Quy tắc quyết định**:
  - Nếu `impact == 'organization'` (Toàn tổ chức) -> Tự động gắn `URGENT`.
  - Nếu tiêu đề hoặc mô tả chứa bất kỳ từ khóa quy tắc nào đang `Active` có mức ưu tiên `URGENT` -> Gán `URGENT`.
  - Ngược lại -> Gán `NORMAL`.
  - Mức `URGENT` luôn có độ ưu tiên cao nhất trong quá trình so khớp.
- **Lưu vết bằng chứng**: Mọi quyết định phân loại đều được ghi nhận lý do cụ thể vào cột `priority_reason` của ticket.

### 3.3 Cơ Chế Giám Sát SLA (SLA Monitoring & Worker)
- Khi ticket được tạo, hệ thống nạp chính sách SLA tương ứng với mức ưu tiên (`URGENT` hoặc `NORMAL`).
- Tự động tính toán và lưu `response_deadline_at` (hạn phản hồi) và `resolution_deadline_at` (hạn giải quyết).
- **Background Worker (`worker:sla`)**:
  - Chạy theo chu kỳ định cấu hình (mặc định 60 giây).
  - Quét các ticket chưa giải quyết có hạn xử lý đã vượt quá thời gian hiện tại (`NOW() > resolution_deadline_at`).
  - Tạo bản ghi thông báo lỗi vi phạm SLA (`sla_breach`) trong bảng `notifications` cho đội ngũ kỹ thuật và Admin.
  - Sử dụng cơ chế khóa trùng lặp (`deduplication_key = 'sla_breach_{ticket_id}_{type}'`) để đảm bảo tính lũy nghiệm (idempotency), không gửi cảnh báo lặp lại cho cùng một sự kiện vi phạm.

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
