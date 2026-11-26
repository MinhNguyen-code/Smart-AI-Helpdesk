# SMART IT HELPDESK — THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN)

> Bổ sung 25/11/2026: migration mới `20261125000007_add_ticket_routing.js` thêm `routing_settings`, `support_units`, `support_unit_memberships`, `category_unit_routes` và nullable `tickets.owner_unit_id/routing_status/routing_evidence`, index unit/status. Không backfill/đổi status/priority/SLA. Local chưa migrate; đặc tả, FK, guard và forward recovery tại [TICKET_ROUTING_SPEC.md](TICKET_ROUTING_SPEC.md). Bản ghi cấu hình tuyến được thay toàn bộ trong transaction Admin có version/audit; đây là thao tác cấu hình có chủ đích, không xóa ticket/history.

## 1. Cơ Sở Dữ Liệu Mục Tiêu & Nguyên Tắc An Toàn

- **Hệ quản trị CSDL**: MySQL 8.x
- **Development Database**: `smart_it_helpdesk_new_dev`
- **Testing Database**: `smart_it_helpdesk_new_test`
- Hai schema lịch sử `smart_it_helpdesk_dev` và `smart_it_helpdesk_test` không thuộc phạm vi ghi của ứng dụng này.
- **Múi giờ phiên kết nối**: Knex đặt `SET time_zone = '+00:00'` cho mọi kết nối; `mysql2` giải mã ngày giờ theo UTC. Ứng dụng hiển thị giờ địa phương tại frontend.

### Nguyên Tắc An Toàn Tuyệt Đối (Accidental Data Loss Prevention)
1. Chỉ thực hiện thao tác tạo hoặc cập nhật bảng trên đúng database đích đã xác minh (`smart_it_helpdesk_new_dev` hoặc `smart_it_helpdesk_new_test`).
2. Tuyệt đối không chạy lệnh `DROP DATABASE`, `TRUNCATE` hay `DELETE` không có điều kiện `WHERE` trên môi trường đang hoạt động.
3. Không tự ý sửa đổi hoặc xóa các cơ sở dữ liệu khác đang tồn tại trên máy chủ MySQL của hệ thống.
4. Mọi thay đổi cấu trúc bảng bắt buộc phải thông qua Knex Migration có phiên bản rõ ràng (Versioned Migrations).

---

## 2. Danh Sách Các Bảng Dữ Liệu Chuẩn MVP

### 2.1 Bảng `users` (Người dùng hệ thống)
Lưu trữ danh sách người dùng được phê duyệt và thông tin định danh Google:
- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `google_sub`: VARCHAR(255) NULL UNIQUE (ID định danh ổn định của Google sau khi xác thực)
- `email`: VARCHAR(255) NOT NULL UNIQUE (Địa chỉ Gmail đã chuẩn hóa chữ thường)
- `full_name`: VARCHAR(255) NOT NULL
- `avatar_url`: TEXT NULL
- `role`: ENUM('ADMIN', 'IT_AGENT', 'END_USER') NOT NULL DEFAULT 'END_USER'
- `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- *Chỉ mục*: `idx_users_email`, `idx_users_google_sub`, `idx_users_role`

### 2.2 Bảng `categories` (Danh mục sự cố)
- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `name`: VARCHAR(150) NOT NULL UNIQUE
- `description`: TEXT NULL
- `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### 2.3 Bảng `tickets` (Ticket sự cố)
- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `ticket_code`: VARCHAR(32) NOT NULL UNIQUE (UUID hex 32 ký tự; giao diện thêm `#`)
- `reporter_id`: INT UNSIGNED NOT NULL (FK -> `users.id`)
- `assignee_id`: INT UNSIGNED NULL (FK -> `users.id`)
- `category_id`: INT UNSIGNED NULL (FK -> `categories.id`)
- `title`: VARCHAR(255) NOT NULL
- `description`: TEXT NOT NULL
- `impact`: ENUM('individual', 'department', 'organization') NOT NULL DEFAULT 'individual'
- `priority`: ENUM có `P1`, `P2`, `P3`, `P4` (và giá trị legacy `URGENT`, `NORMAL` để tương thích migration); mặc định `P3`.
- `status`: ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'OPEN'
- `priority_reason`: TEXT NULL (Lý do gán ưu tiên từ Rule Engine)
- `priority_evidence`: JSON NULL (snapshot impact và quy tắc đã khớp tại lúc tạo)
- `response_deadline_at`: DATETIME NULL (Hạn phản hồi theo SLA)
- `resolution_deadline_at`: DATETIME NULL (Hạn giải quyết theo SLA)
- `first_response_at`: DATETIME NULL (Thời điểm phản hồi đầu tiên của kỹ thuật viên)
- `acknowledged_at`: DATETIME NULL (ACK tường minh của staff, độc lập với phản hồi public)
- `resolved_at`: DATETIME NULL (Thời điểm chuyển sang RESOLVED)
- `version`: INT UNSIGNED NOT NULL DEFAULT 1 (Quản lý xung đột đồng thời - Optimistic Locking)
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- *Chỉ mục*: `idx_tickets_status`, `idx_tickets_priority`, `idx_tickets_reporter`, `idx_tickets_assignee`, `idx_tickets_deadlines`

### 2.4 Bảng `ticket_comments` (Bình luận / trao đổi xử lý)
- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `ticket_id`: INT UNSIGNED NOT NULL (FK -> `tickets.id` ON DELETE CASCADE)
- `author_id`: INT UNSIGNED NOT NULL (FK -> `users.id`)
- `message`: TEXT NOT NULL
- `visibility`: ENUM('public', 'internal') NOT NULL DEFAULT 'public'
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- *Chỉ mục*: `idx_ticket_comments_ticket_id`

### 2.5 Bảng `ticket_attachments` (Tệp đính kèm)
- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `ticket_id`: INT UNSIGNED NOT NULL (FK -> `tickets.id` ON DELETE CASCADE)
- `uploaded_by`: INT UNSIGNED NOT NULL (FK -> `users.id`)
- `original_filename`: VARCHAR(255) NOT NULL
- `stored_filename`: VARCHAR(255) NOT NULL UNIQUE (UUID lưu trong private-uploads)
- `mime_type`: VARCHAR(127) NOT NULL
- `size_bytes`: BIGINT UNSIGNED NOT NULL
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- *Chỉ mục*: `idx_ticket_attachments_ticket_id`

### 2.6 Bảng `ticket_history` (Lịch sử biến động trạng thái & phân công)
- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `ticket_id`: INT UNSIGNED NOT NULL (FK -> `tickets.id` ON DELETE CASCADE)
- `actor_id`: INT UNSIGNED NOT NULL (FK -> `users.id`)
- `event_type`: VARCHAR(50) NOT NULL (VD: 'STATUS_CHANGE', 'ASSIGNED', 'PRIORITY_UPDATE')
- `old_value`: VARCHAR(255) NULL
- `new_value`: VARCHAR(255) NULL
- `note`: TEXT NULL
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- *Chỉ mục*: `idx_ticket_history_ticket_id`

### 2.7 Bảng `priority_rules` (Quy tắc từ khóa gán ưu tiên)
- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `keyword`: VARCHAR(200) NOT NULL (Từ khóa hiển thị, VD: "server sập")
- `normalized_keyword`: VARCHAR(200) NOT NULL (Từ khóa chuẩn hóa không dấu, chữ thường, VD: "server sap")
- `priority`: ENUM có `P1`–`P4` và giá trị legacy cho migration; mặc định `P1`.
- `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- *Chỉ mục*: `idx_priority_rules_active`, `idx_priority_rules_norm_kw`, unique `uq_priority_rules_normalized_keyword`

### 2.8 Bảng `sla_policies` (Chính sách thời gian cam kết SLA)
- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `priority`: ENUM có `P1`–`P4` và giá trị legacy cho migration; UNIQUE.
- `response_minutes`: INT UNSIGNED NOT NULL
- `resolution_minutes`: INT UNSIGNED NOT NULL
- `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### 2.9 Bảng `notifications` (Thông báo trong ứng dụng)
- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `recipient_id`: INT UNSIGNED NOT NULL (FK -> `users.id` ON DELETE CASCADE)
- `ticket_id`: INT UNSIGNED NULL (FK -> `tickets.id` ON DELETE SET NULL)
- `notification_type`: VARCHAR(50) NOT NULL (VD: 'TICKET_CREATED', 'ASSIGNED', 'SLA_BREACH', 'NEW_REPLY')
- `title`: VARCHAR(255) NOT NULL
- `message`: TEXT NOT NULL
- `deduplication_key`: VARCHAR(191) NULL UNIQUE (Ngăn chặn tạo cảnh báo SLA trùng lặp)
- `is_read`: BOOLEAN NOT NULL DEFAULT FALSE
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- *Chỉ mục*: `idx_notifications_recipient`, `idx_notifications_is_read`

### 2.10 Bảng `audit_logs` (Nhật ký kiểm toán)
- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `actor_id`: INT UNSIGNED NULL (FK -> `users.id` ON DELETE SET NULL)
- `action`: VARCHAR(100) NOT NULL
- `entity_type`: VARCHAR(80) NOT NULL
- `entity_id`: VARCHAR(100) NULL
- `safe_metadata`: JSON NULL
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- *Chỉ mục*: `idx_audit_logs_actor`, `idx_audit_logs_action`

### 2.11 Bảng `sessions` (Lưu trữ phiên đăng nhập MySQL)
Được quản lý bởi `server/src/db/sessionStore.js` qua `express-session`:
- `session_id`: VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY
- `expires`: BIGINT UNSIGNED NOT NULL (Unix milliseconds)
- `data`: LONGTEXT NOT NULL (JSON session server-side)

### 2.12 Bảng `email_outbox` (gửi email bền vững)
- `notification_id`: INT UNSIGNED UNIQUE, FK đến `notifications.id`; một hàng outbox cho một notification.
- `status`: `pending`, `sending`, `sent`, `failed` hoặc `skipped`.
- `attempts`, `next_attempt_at`, `locked_until`, `lease_token`, `sent_at`, `last_error_code` và timestamps để claim/retry.
- Worker chỉ chạy khi có SMTP hợp lệ; `sent` thể hiện SMTP chấp nhận recipient, chưa chứng minh đã đến inbox. Nếu worker chết giữa SMTP accepted và ghi `sent`, retry có thể gửi lặp.
