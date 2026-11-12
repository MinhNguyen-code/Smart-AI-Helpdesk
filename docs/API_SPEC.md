# SMART IT HELPDESK — ĐẶC TẢ REST API (API SPECIFICATION)

Base URL: `/api/v1`
Định dạng dữ liệu: JSON (UTF-8). Xác thực qua Cookie phiên (`connect.sid`).

---

## 1. Hệ Thống & Kiểm Tra Tình Trạng (System & Health)

### 1.1 `GET /api/v1/health`
Kiểm tra trạng thái máy chủ Express (Liveness probe).
- **Quyền hạn**: Công khai (Public).
- **Response (200 OK)**:
  ```json
  {
    "status": "UP",
    "timestamp": "2026-11-10T04:15:00.000Z",
    "uptimeSeconds": 128.4
  }
  ```

### 1.2 `GET /api/v1/ready`
Kiểm tra tính sẵn sàng của hệ thống, bao gồm kết nối cơ sở dữ liệu MySQL (Readiness probe).
- **Quyền hạn**: Công khai (Public).
- **Response (200 OK - Cơ sở dữ liệu sẵn sàng)**:
  ```json
  {
    "status": "READY",
    "database": {
      "connected": true,
      "targetDatabase": "smart_it_helpdesk_dev",
      "latencyMs": 4
    },
    "timestamp": "2026-11-10T04:15:00.000Z"
  }
  ```
- **Response (503 Service Unavailable - Chưa kết nối được DB)**:
  ```json
  {
    "status": "NOT_READY",
    "database": {
      "connected": false,
      "error": "ECONNREFUSED"
    },
    "timestamp": "2026-11-10T04:15:00.000Z"
  }
  ```

---

## 2. Xác Thực & Người Dùng (Authentication)

### 2.1 `GET /api/v1/auth/google`
Khởi tạo luồng xác thực Google OAuth 2.0 PKCE, trả về URL chuyển hướng đến Google Sign-In.

### 2.2 `GET /api/v1/auth/google/callback`
Nhận authorization code từ Google, xác minh token, đối soát allowlist email, gán vai trò và tạo session.

### 2.3 `GET /api/v1/auth/me`
Lấy thông tin người dùng đang đăng nhập trong phiên làm việc hiện tại.
- **Quyền hạn**: Đã đăng nhập.
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": 1,
      "email": "binmin109@gmail.com",
      "fullName": "Nguyen Binh Minh (Admin)",
      "avatarUrl": "https://...",
      "role": "ADMIN"
    }
  }
  ```
- **Response (401 Unauthorized)**: Phiên chưa xác thực.

### 2.4 `POST /api/v1/auth/logout`
Hủy phiên làm việc hiện tại và xóa cookie xác thực.

---

## 3. Quản Lý Ticket (Tickets)

### 3.1 `GET /api/v1/tickets`
Lấy danh sách ticket theo bộ lọc và phân quyền:
- **Query params**: `status` (`OPEN`, `IN_PROGRESS`, `RESOLVED`), `search`, `priority`, `page`, `limit`, `sortBy` (`sla_asc`, `created_desc`).
- **Phân quyền**:
  - `END_USER`: Chỉ xem ticket do chính mình tạo.
  - `IT_AGENT`, `ADMIN`: Xem tất cả ticket trong hệ thống.
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1024,
        "ticketCode": "#INC-1024",
        "title": "Sập hệ thống quản lý điểm",
        "impact": "organization",
        "priority": "URGENT",
        "status": "OPEN",
        "categoryName": "Phần mềm",
        "reporterName": "Nguyên Hà",
        "assigneeName": null,
        "responseDeadlineAt": "2026-11-10T04:30:00.000Z",
        "resolutionDeadlineAt": "2026-11-10T06:15:00.000Z",
        "createdAt": "2026-11-10T04:15:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 17 }
  }
  ```

### 3.2 `POST /api/v1/tickets`
Tạo yêu cầu hỗ trợ mới. Tự động chạy Rule-Based Priority Engine và tính toán SLA.
- **Body**:
  ```json
  {
    "title": "Không vào được hệ thống LMS...",
    "description": "Tôi không đăng nhập được vào LMS từ sáng nay...",
    "impact": "organization",
    "categoryId": 1
  }
  ```
- **Response (201 Created)**: Trả về ticket mới tạo kèm mức ưu tiên và hạn xử lý đã tính.

### 3.3 `GET /api/v1/tickets/:id`
Xem chi tiết ticket, bao gồm lịch sử trao đổi, tệp đính kèm và thông tin SLA.

### 3.4 `PATCH /api/v1/tickets/:id/status`
Cập nhật trạng thái ticket (`OPEN -> IN_PROGRESS -> RESOLVED`).
- **Quyền hạn**: `IT_AGENT`, `ADMIN`.

### 3.5 `PATCH /api/v1/tickets/:id/assign`
Phân công kỹ thuật viên phụ trách.
- **Quyền hạn**: `IT_AGENT` (tự tiếp nhận), `ADMIN` (phân công bất kỳ ai).

### 3.6 `POST /api/v1/tickets/:id/comments`
Gửi tin nhắn phản hồi trao đổi trong ticket.

---

## 4. Quản Trị Quy Tắc Ưu Tiên (Priority Rules) - ADMIN Only

- `GET /api/v1/rules`: Danh sách quy tắc từ khóa (tìm kiếm theo từ khóa).
- `POST /api/v1/rules`: Thêm quy tắc từ khóa mới.
- `PATCH /api/v1/rules/:id`: Cập nhật từ khóa hoặc trạng thái Active/Inactive.
- `DELETE /api/v1/rules/:id`: Xóa quy tắc từ khóa.

---

## 5. Chính Sách SLA (SLA Policies) - ADMIN Only

- `GET /api/v1/sla/policies`: Xem thời gian cam kết phản hồi/giải quyết hiện tại.
- `PUT /api/v1/sla/policies/:priority`: Cập nhật thời gian SLA cho mức `URGENT` hoặc `NORMAL`.

---

## 6. Thông Báo Trong Ứng Dụng (Notifications)

- `GET /api/v1/notifications`: Lấy danh sách thông báo của người dùng hiện tại kèm số lượng chưa đọc.
- `PATCH /api/v1/notifications/:id/read`: Đánh dấu thông báo là đã đọc.
- `POST /api/v1/notifications/read-all`: Đánh dấu tất cả là đã đọc.

---

## 7. Báo Cáo & Thống Kê (Dashboard Analytics) - ADMIN Only

- `GET /api/v1/analytics/summary?startDate=...&endDate=...`: Tổng số ticket, MTTA, MTTR, Tỷ lệ tuân thủ SLA (tính bằng SQL aggregation trực tiếp).
- `GET /api/v1/analytics/daily?startDate=...&endDate=...`: Số lượng ticket theo từng ngày trong tuần.
- `GET /api/v1/analytics/priorities?startDate=...&endDate=...`: Phân bổ số lượng và tỷ lệ theo mức độ ưu tiên.
- `GET /api/v1/analytics/categories`: Phân bổ theo danh mục sự cố.
