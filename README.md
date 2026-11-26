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
│   ├── components/              # Thành phần minh họa và giao diện hỗ trợ
│   ├── features/                # Ticket, Rules, Dashboard, Notifications, Users và test giao diện
│   └── styles/                  # Design tokens và CSS giao diện
├── server/                      # Backend Express
│   ├── src/
│   │   ├── config/              # Cấu hình môi trường & database
│   │   ├── db/                  # Knex connection & query helpers
│   │   ├── middleware/          # Auth, RBAC, error handling, rate limiting
│   │   ├── modules/             # Auth, Tickets, Rules, SLA, Notifications, Analytics
│   │   ├── workers/             # SLA breach detection worker
│   │   └── app.js               # Express application entry
│   ├── migrations/              # Database migration files (Knex)
│   ├── seeds/                   # Dữ liệu tham chiếu (Rules, SLA policies, Categories)
│   ├── scripts/                 # Lệnh vận hành và kiểm tra
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
│   ├── phase-reports/           # Báo cáo checkpoint và frontend có ngày tháng
│   ├── screenshots/             # Ảnh bằng chứng preview, fixture và API test
│   ├── benchmarks/              # Kết quả đo theo từng môi trường
│   ├── references/              # Ánh xạ tới ảnh Wireframe gốc
│   └── database/                # Tài liệu cô lập cơ sở dữ liệu
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
     - Backend kèm SLA worker: `npm.cmd run start:with-sla`.
     - SLA worker độc lập: `npm.cmd run worker:sla`.
     - Windows supervisor: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File server/scripts/superviseWorkers.ps1`; thêm `-IncludeEmail` chỉ sau khi SMTP hợp lệ.
     - Availability monitor: `npm.cmd run monitor:availability` (mặc định ghi JSONL theo giờ `Asia/Ho_Chi_Minh`; lịch thứ Hai–Sáu 08:00–17:00 cần chủ dự án xác nhận).
     - Tổng hợp kỳ quan sát: `npm.cmd run report:availability`; báo `NOT_VERIFIED` nếu chưa đủ 10 ngày làm việc/95% độ phủ mẫu.

   Chọn một cách chạy SLA worker cho mỗi database. Khi chạy nhiều tiến trình Express, chỉ bật worker ở một tiến trình, hoặc dùng lệnh độc lập / Windows supervisor. `npm run dev` và `npm run dev:server` chỉ chạy Express ở phía backend.

   Worker quét ngay khi Express mở cổng thành công. Mỗi lần chỉ chạy một đợt quét. Worker tiếp tục trang kế sau 1 giây hoặc bắt đầu vòng quét mới sau 60 giây. Khi lỗi, worker ghi mã lỗi và thời gian chờ vào log, rồi thử lại cùng trang sau 1, 2, 4 giây và tăng dần đến tối đa 60 giây. Một lần quét thành công đặt lại thời gian chờ khi lỗi.

   Khi Node nhận Ctrl+C/SIGINT hoặc SIGTERM, worker hủy lượt quét đã lên lịch và chờ lượt hiện tại kết thúc trước khi đóng pool MySQL. Express cũng chờ các request đang xử lý. Node thoát với mã 1 nếu quá 10 giây. Để tự khởi động lại sau khi toàn bộ tiến trình Express thoát, cấu hình trình quản lý tiến trình chạy `node server/src/index.js --with-sla-worker` từ thư mục dự án.
5. Chạy kiểm thử:
   ```powershell
   npm.cmd test
   npm.cmd run test:frontend
   npm.cmd run test:browser
   npm.cmd run test:browser:routing
   npm.cmd run test:browser:production
   ```

   Browser suites dùng API fixture và các port riêng 5187/5188/4173; không khởi động backend hoặc dùng phiên Google thật. Bộ production cần `npm.cmd run build` trước. Các lệnh `test:integration` và `test:browser:api` có fixture ghi/xóa; không chạy chúng trên database development/local hoặc production. MySQL integration được chạy trong job CI service cô lập, xác minh schema/account trước khi ghi. Seed hiện chỉ thêm các SLA P1–P4 còn thiếu, không ghi đè policy đã có; không tự chạy seed trên dữ liệu hiện hữu chỉ để kiểm thử.

---

## Giao diện theo 7 wireframe

Chạy `npm run dev` rồi mở `http://localhost:5173/login`. Giao diện hiện có trang đăng nhập, tạo yêu cầu, Kanban, chi tiết ticket/SLA, báo cáo, danh sách quy tắc và hộp thoại thêm/sửa quy tắc. Trang đăng nhập dùng minh họa SVG tĩnh đã duyệt; bảng, biểu mẫu và biểu đồ là thành phần HTML/React có thể tương tác và dùng bàn phím. Kanban tìm kiếm/lọc/sắp xếp qua API trên toàn bộ hàng chờ được phân quyền, mỗi trang tối đa 30 ticket và có điều khiển chuyển trang.

Trong Vite development, chọn **Xem giao diện mẫu** hoặc mở `http://localhost:5173/kanban?preview=1` để thử giao diện với dữ liệu trong bộ nhớ. Bản build production không có preview và yêu cầu session thật. Chế độ thật dùng Google OIDC, API ticket, quy tắc, SLA, thông báo và báo cáo SQL. Ảnh được lưu riêng tư sau khi tạo ticket; UI báo rõ nếu upload lỗi. `test:browser` kiểm tra giao diện mẫu; `test:browser:api` dùng session fixture chỉ trong schema test để kiểm tra React/API/MySQL, **không** xác nhận đăng nhập Google thật.

## 4. Tài khoản và vai trò

Ba vai trò là `ADMIN`, `IT_AGENT`, `END_USER`. Chủ dự án cấu hình các địa chỉ được phép trong `.env` và xác minh ánh xạ trước khi dùng script onboarding. Trang quản trị `/users` cho phép Admin duyệt tài khoản mới và điều chỉnh vai trò/trạng thái; bản ghi mới chỉ liên kết Google sau callback OIDC hợp lệ.

## 5. Trạng thái dự án

API Ticket, Rules, ACK/SLA, notification, outbox, analytics và quản trị người dùng có test MySQL CI cô lập. Nghiệm thu Google ba vai trò local đã có báo cáo ngày 25/11; source local tổng hợp và PR GitHub được đánh giá riêng. Xem [audit GitHub](docs/phase-reports/GITHUB-FULL-AUDIT-2026-11-26.md) và [bản sửa ổn định 26/11](docs/phase-reports/MVP-STABILITY-FIXES-2026-11-26.md) cho kết quả mới nhất. SMTP được hoãn và không chặn nghiệm thu lõi; Google routing E2E mới, CI cho bản sửa chưa publish, recovery production và uptime 99% vẫn là các phạm vi cần kiểm chứng riêng. Phương án đưa lên web: [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).
