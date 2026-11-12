# SMART IT HELPDESK (Hệ thống Quản lý Ticket Phản hồi Sự cố Tự động)

> **Academic Research Focus**: Reliability Engineering in Networked User Systems & Error Prevention Strategies.

Smart IT Helpdesk là hệ thống quản lý yêu cầu hỗ trợ sự cố tập trung cho môi trường làm việc và học tập số, tích hợp cơ chế tự động phân loại mức độ ưu tiên theo từ khóa (Rule-Based Priority Engine) và giám sát thời gian xử lý cam kết (SLA Monitoring).

---

## 1. Công nghệ Sử dụng (Tech Stack)

- **Frontend**: React 18, Vite, Tailwind CSS, React Router DOM, Lucide React, Recharts.
- **Backend**: Node.js, Express, Knex.js, mysql2.
- **Database**: MySQL 8.x (`smart_it_helpdesk_dev`, `smart_it_helpdesk_test`).
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
   - Cập nhật thông tin kết nối MySQL (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`)
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
5. Chạy kiểm thử:
   ```powershell
   npm test
   ```

---

## 4. Tài khoản Đề xuất & Vai trò (Role Mapping)

| Gmail | Vai trò | Quyền hạn chính |
|---|---|---|
| `binmin109@gmail.com` | **ADMIN** | Quản trị quy tắc từ khóa, cấu hình SLA, toàn quyền quản trị ticket & người dùng, xem báo cáo thống kê |
| `nguyenbinhminh.1009.vn@gmail.com` | **IT_AGENT** | Tiếp nhận ticket, cập nhật trạng thái, trao đổi giải quyết sự cố, nhận cảnh báo SLA |
| `nguyenbinhminh.2006.vn@gmail.com` | **END_USER** | Tạo ticket báo lỗi, theo dõi tiến độ ticket cá nhân, trao đổi phản hồi |

---

## 5. Trạng thái Dự án

- **Day 1 — Foundation**: Đang triển khai & nghiệm thu (PASS/PARTIAL/BLOCKED chi tiết trong `docs/DAILY_PROGRESS.md`).
- **Tài liệu tham chiếu**: Đã đối soát toàn diện `Diagrams/` và `Wireframe/`.
