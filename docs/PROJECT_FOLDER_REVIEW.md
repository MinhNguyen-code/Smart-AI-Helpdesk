# Rà soát thư mục dự án — bản sơ bộ Day 7

**Ngày:** 12/11/2026. **Trạng thái:** PARTIAL vì nghiệm thu MVP cuối chưa hoàn tất. Đây là kiểm tra cấu trúc đọc dữ liệu; không xóa hoặc di chuyển file.

**Lưu ý hiện trạng:** Đây là snapshot ngày 12/11, nên số migration, ảnh chụp và khoảng trống nêu dưới đây là bằng chứng lịch sử, không phải số liệu repository hiện tại. Kiểm kê mới và đề xuất di chuyển giới hạn xem `docs/REPOSITORY_ORGANIZATION_PLAN.md`; các báo cáo frontend có ngày tháng đã được chuyển vào `docs/phase-reports/` trong Bước 2 được chủ dự án duyệt.

## Cây thư mục chính

```text
D:\Smart IT Helpdesk\
├─ AGENTS.md, Codex.md, README.md, package.json, knexfile.js
├─ Diagrams/                 5 tài liệu gốc
├─ Wireframe/                7 ảnh gốc
├─ docs/
│  ├─ API_SPEC.md, ARCHITECTURE.md, DATABASE_DESIGN.md, TEST_PLAN.md
│  ├─ database/              kế hoạch cô lập và SQL provisioning lịch sử
│  ├─ phase-reports/         báo cáo checkpoint
│  ├─ references/            ánh xạ ảnh gốc
│  └─ screenshots/           7 màn preview và ảnh Rules ở 5 kích thước
├─ src/
│  ├─ main.jsx, App.jsx, index.css
│  ├─ api/client.js
│  ├─ components/SupportScene.jsx
│  └─ features/             TicketDetail, RulesPage, RealDashboard, NotificationMenu, UsersPage, previewData
├─ server/
│  ├─ src/                  Express, auth, ticket, rule, notification, analytics, users, worker
│  ├─ migrations/           3 migration (không chạy trong lượt rà soát)
│  ├─ seeds/                dữ liệu tham chiếu
│  ├─ scripts/              lệnh database và onboarding
│  ├─ tests/                unit, API, MySQL integration
│  └─ private-uploads/      thư mục ảnh riêng tư bị Git ignore
├─ tests/frontend/          setup Vitest
├─ e2e/                     Playwright preview
└─ dist/, node_modules/, test-results/ (generated, Git ignore)
```

## Entry points và test

- Frontend: `src/main.jsx` → `src/App.jsx`; Vite `vite.config.js`.
- Backend: `server/src/index.js` → `server/src/app.js`; Knex `knexfile.js`.
- Worker: `server/src/workers/slaWorker.js` (`npm.cmd run worker:sla`).
- Backend test: `server/tests/unit`, `api`, `integration`; frontend test: `src/features/*.test.jsx`; browser: `e2e/wireframe.spec.js`.

## Phân loại

| Mục | Phân loại | Lý do/đề xuất |
|---|---|---|
| `Diagrams/`, `Wireframe/`, `Codex.md`, `AGENTS.md` | **KEEP** | Tài liệu gốc; giữ nguyên. |
| Migrations và `docs/database/` | **KEEP** | Lịch sử schema cô lập; không đổi/xóa nếu chưa kiểm tra dữ liệu. |
| `server/src/modules/*`, `src/features/*` | **KEEP** | Mã MVP đang dùng. |
| `src/App.jsx` | **REFACTOR** | Quá nhiều màn và logic trong một file; tách Login, Kanban, CreateTicket, preview dashboard thành feature sau nghiệm thu. |
| `src/index.css` | **REFACTOR** | Nhiều rule dồn một dòng; chia theo component và token để bảo trì. |
| `src/features/previewData.js` | **KEEP** | Cần cho preview, luôn gắn nhãn để tránh nhầm dữ liệu thật. |
| `docs/screenshots/` | **REVIEW** | Ảnh preview có thể lưu làm bằng chứng; chưa có ảnh ba vai trò thật. |
| `dist/`, `node_modules/`, `test-results/` | **REMOVE_CANDIDATE** | Chỉ là artifact tái tạo được; đã Git ignore, không xóa trong lượt này. |

## Khoảng trống tài liệu và cấu trúc

- `docs/ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `PROJECT_SPEC.md`, `TEST_PLAN.md` đã cập nhật các chỗ P1–P4 chính; cần rà toàn văn lần cuối để loại mô tả cũ/thiết kế chưa triển khai.
- Chưa có tài liệu vận hành worker như Windows Service/tự khởi động, và chưa có kết quả đo uptime/hiệu năng.
- Nên thêm test frontend cho CreateTicket/TicketDetail/NotificationMenu và browser E2E trên phiên Google thật khi chủ dự án cung cấp phiên tương ứng.
- Lộ trình dọn: sau checkpoint MVP PASS, tách `App.jsx`, định dạng CSS, đối chiếu API docs với code, sau đó chạy lại toàn bộ test/build. Không di chuyển file tham chiếu hoặc dữ liệu DB.
