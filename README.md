# SMART IT HELPDESK (Hệ thống Quản lý Ticket Phản hồi Sự cố Tự động)

> **Academic Research Focus**: Reliability Engineering in Networked User Systems & Error Prevention Strategies.

Smart IT Helpdesk là hệ thống quản lý yêu cầu hỗ trợ sự cố tập trung cho môi trường làm việc và học tập số, tích hợp cơ chế tự động phân loại mức độ ưu tiên theo từ khóa (Rule-Based Priority Engine) và giám sát thời gian xử lý cam kết (SLA Monitoring).

---

## 1. Công nghệ Sử dụng (Tech Stack)

- **Frontend**: React 18, Vite, Tailwind CSS, React Router DOM, Lucide React, Recharts.
- **Backend**: Node.js, Express, Knex.js, mysql2.
- **Database**: MySQL 8.x (`smart_it_helpdesk_new_dev`, `smart_it_helpdesk_new_test`); hai schema không có `new` là dữ liệu lịch sử ngoài phạm vi dự án.
- **Authentication**: Google OpenID Connect / OAuth 2.0 Authorization Code Flow với PKCE và session lưu trữ server-side.
- **Testing**: Node.js Test Runner / Vitest, React Testing Library, Supertest.

---

## 2. Cấu trúc Dự án (Monorepo Layout)

```text
D:\Smart IT Helpdesk
├── src/                         # Frontend React + Vite
│   ├── api/                     # API client gọi backend
│   ├── components/              # UI components dùng chung (Layout, Form, Modal, Badges, Charts)
│   ├── features/                # Modules tính năng (auth, tickets, kanban, rules, sla, notifications, dashboard)
│   ├── hooks/                   # Custom React hooks
│   └── utils/                   # Hàm tiện ích giao diện
├── server/                      # Backend Express
│   ├── src/
│   │   ├── config/              # Cấu hình môi trường & database
│   │   ├── db/                  # Knex connection & query helpers
│   │   ├── middleware/          # Auth, RBAC, error handling, rate limiting
│   │   ├── modules/             # Auth, Tickets, Rules, SLA, Notifications, Analytics
│   │   ├── workers/             # SLA breach detection worker
│   │   └── app.js               # Express application entry
│   ├── migrations/              # Database migration files (Knex)
│   ├── seeds/                   # Dữ liệu khởi tạo (Rules, SLA policies, Categories, Initial users)
│   ├── tests/                   # Integration & unit tests
│   └── private-uploads/         # Thư mục lưu trữ file đính kèm an toàn
├── docs/                        # Tài liệu kỹ thuật dự án
│   ├── PROJECT_SPEC.md          # Đặc tả yêu cầu & giải quyết mâu thuẫn
│   ├── ARCHITECTURE.md          # Kiến trúc hệ thống
│   ├── DATABASE_DESIGN.md       # Thiết kế CSDL & quan hệ
│   ├── API_SPEC.md              # Đặc tả REST API
│   ├── IMPLEMENTATION_PLAN.md   # Kế hoạch 7 ngày
│   ├── TEST_PLAN.md             # Kế hoạch kiểm thử
│   ├── DAILY_PROGRESS.md        # Nhật ký tiến độ hằng ngày
│   └── phase-reports/           # Báo cáo nghiệm thu từng Day
├── Diagrams/                    # Tài liệu sơ đồ thiết kế gốc (Read-only)
├── Wireframe/                   # 7 ảnh wireframe thiết kế giao diện gốc (Read-only)
├── package.json                 # Cấu hình scripts & dependencies
├── vite.config.js               # Cấu hình Vite
└── tailwind.config.js           # Cấu hình Tailwind CSS
```

---

## 3. Cài đặt và Chạy cục bộ (Local Setup)

### Yêu cầu tiên quyết:
- **Node.js**: >= 20.x (Hiện tại máy phát triển: Node.js v24.20.0, npm 11.19.0)
- **MySQL**: 8.x (Cổng mặc định: 3306)

### Các bước cài đặt:
1. Cài đặt dependencies:
   ```powershell
   npm install
   ```
2. Cấu hình file môi trường:
   - Copy `.env.example` thành `.env`
   - Cập nhật thông tin kết nối MySQL (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`) và xác minh `DB_NAME=smart_it_helpdesk_new_dev`, `DB_TEST_NAME=smart_it_helpdesk_new_test`.
   - Thêm Google OAuth Client ID & Secret nếu chạy live Google Sign-In
3. Chạy migrations khởi tạo cơ sở dữ liệu (sau khi xác minh database đích):
   ```powershell
   npm run db:migrate
   npm run db:seed
   ```
4. Khởi chạy ứng dụng:
   - Khởi chạy cả Frontend và Backend song song:
     ```powershell
     npm run dev
     ```
   - Hoặc chạy độc lập:
     - Backend: `npm run dev:server` (Cổng 5000)
     - Frontend: `npm run dev:client` (Cổng 5173)
     - SLA Worker: `npm run worker:sla`
     - Windows supervisor: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File server/scripts/superviseWorkers.ps1`; thêm `-IncludeEmail` chỉ sau khi SMTP hợp lệ.
     - Availability monitor: `npm.cmd run monitor:availability` (mặc định ghi JSONL theo giờ Asia/Bangkok).
     - Tổng hợp kỳ quan sát: `npm.cmd run report:availability`; báo `NOT_VERIFIED` nếu chưa đủ 10 ngày làm việc/95% độ phủ mẫu.
5. Chạy kiểm thử:
   ```powershell
   npm.cmd test
   npm.cmd run test:integration
   npm.cmd run test:frontend
   npm.cmd run test:browser
   npm.cmd run test:browser:api
   npm.cmd run test:browser:production
   ```

---

## Giao diện theo 7 wireframe

Chạy `npm run dev` rồi mở `http://localhost:5173/login`. Giao diện hiện có trang đăng nhập, tạo yêu cầu, Kanban, chi tiết ticket/SLA, báo cáo, danh sách quy tắc và hộp thoại thêm/sửa quy tắc. Minh họa 3D ở trang đăng nhập dùng Three.js; bảng, biểu mẫu và biểu đồ vẫn là thành phần HTML/React để có thể tương tác và dùng bàn phím.

Trong Vite development, chọn **Xem giao diện mẫu** hoặc mở `http://localhost:5173/kanban?preview=1` để thử giao diện với dữ liệu trong bộ nhớ. Bản build production không có preview và yêu cầu session thật. Chế độ thật dùng Google OIDC, API ticket, quy tắc, SLA, thông báo và báo cáo SQL. Ảnh được lưu riêng tư sau khi tạo ticket; UI báo rõ nếu upload lỗi. `test:browser` kiểm tra giao diện mẫu; `test:browser:api` dùng session fixture chỉ trong schema test để kiểm tra React/API/MySQL, **không** xác nhận đăng nhập Google thật.

## 4. Tài khoản và vai trò

Ba vai trò là `ADMIN`, `IT_AGENT`, `END_USER`. Chủ dự án cấu hình các địa chỉ được phép trong `.env` và xác minh ánh xạ trước khi dùng script onboarding. Trang quản trị `/users` cho phép Admin duyệt tài khoản mới và điều chỉnh vai trò/trạng thái; bản ghi mới chỉ liên kết Google sau callback OIDC hợp lệ.

## 5. Trạng thái dự án

API Ticket, Rules, ACK/SLA, notification, outbox, analytics và quản trị người dùng có test MySQL trên `smart_it_helpdesk_new_test`. Bảy wireframe có ảnh Playwright preview và các trang API/MySQL test. Checkpoint cuối vẫn **PARTIAL** cho đến khi nghiệm thu Google ba vai trò thật, SMTP ngoài ứng dụng và kỳ quan sát uptime 99%. Xem `docs/phase-reports/FINAL-ACCEPTANCE-2026-11-17.md`.
