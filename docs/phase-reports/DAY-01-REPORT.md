# Báo cáo Ngày 1 — Foundation

**Dự án:** Smart IT Helpdesk
**Ngày checkpoint:** 10/11/2026
**Workspace:** `D:\Smart IT Helpdesk`
**Kết luận tại cuối Ngày 1: PARTIAL.** Nền tảng mã và tài liệu đã được tạo, nhưng kết nối/migration MySQL thật chưa có bằng chứng hoàn tất ở mốc này. Phần cơ sở dữ liệu được hoàn thành sau đó trong checkpoint cô lập ngày 11/11; không gán kết quả ấy ngược về Ngày 1.

## 1. Mục tiêu

Khởi tạo ứng dụng độc lập ngay tại project root: React/Vite, Tailwind, Express, Knex/MySQL, API client, health/readiness, migration nền tảng và tài liệu. Giữ nguyên `Diagrams/` và bảy ảnh gốc trong `Wireframe/`.

## 2. Kết quả mã nguồn

- Có frontend React/Vite, backend Express, API client và cấu hình môi trường. Không tạo project lồng bên trong root.
- Có API health và readiness. Readiness dựa trên truy vấn MySQL thật và kiểm tra database đích.
- Migration đầu tiên định nghĩa bảng `users`, `categories`, `priority_rules`, `sla_policies`, `tickets`, `ticket_comments`, `ticket_attachments`, `ticket_history`, `notifications`, `audit_logs`. Việc **có file migration** không chứng minh migration đã chạy vào MySQL trong Ngày 1.
- Có tài liệu kỹ thuật nền tảng và quy tắc không đưa `.env` vào Git. Giao diện nghiệp vụ hiện tại được phát triển sau Ngày 1, không tính là kết quả của checkpoint này.

## 3. API và database

| Hạng mục | Kết quả tại Ngày 1 | Bằng chứng sau checkpoint |
|---|---|---|
| `GET /api` | Đã có mã | Được kiểm tra lại trong suite hiện tại |
| `GET /api/v1/health` | Đã có mã | HTTP 200 trong kiểm tra sau này |
| `GET /api/v1/ready` | Đã có mã, cần MySQL để nghiệm thu | HTTP 200 trên schema cô lập sau provisioning |
| Migration/seed | File đã chuẩn bị | Hai migration đầu được áp dụng lên `smart_it_helpdesk_new_dev` và `smart_it_helpdesk_new_test` ngày 11/11 sau phê duyệt; seed không tạo Google user |

Các schema lịch sử `smart_it_helpdesk_dev` và `smart_it_helpdesk_test` không thuộc dự án mới và được giữ nguyên. Schema project-owned và tài khoản MySQL ít quyền được tạo ở checkpoint sau Ngày 1. Xem `docs/phase-reports/ISOLATED-INTEGRATION-2026-11-11.md`.

## 4. Frontend và tài liệu

Frontend nền tảng dùng `src/App.jsx`, `src/api/client.js`, `src/index.css`; bản giao diện bảy wireframe hiện nay là thay đổi đến sau. Tài liệu gồm `Codex.md`, `AGENTS.md`, README và các file `docs/` về kiến trúc, API, database, kế hoạch, test và nhật ký tiến độ. Ảnh thiết kế gốc là tham chiếu read-only.

## 5. Lệnh, kết quả và mức chứng minh

- Báo cáo Day 1 cũ liệt kê `node --test server/tests/unit/config.test.js`, `node --test server/tests/api/health.test.js` và `npm test`, nhưng không lưu raw output riêng cho toàn bộ lệnh ở đúng ngày 10/11. **Số lượng pass lịch sử: NOT VERIFIED** từ bằng chứng còn lại.
- Kiểm tra lại ngày 12/11: `npm.cmd test` cho **20 pass, 0 fail**; `npm.cmd run build` thành công trong **16.86 giây**, có cảnh báo chunk lớn hơn 500 kB. Đây là bằng chứng cho trạng thái hiện tại, không phải kết quả ngày 10/11.
- Checkpoint tích hợp ngày 11/11 ghi `npm.cmd test` **17 pass, 0 fail**, `npm.cmd run test:integration` **3 pass, 0 fail**, build thành công và `/health`, `/ready` đều 200 trên schema mới. Các kết quả này thuộc ngày 11/11.

## 6. Khuyết tật, rủi ro và việc tiếp theo

Ở cuối Ngày 1 chưa nghiệm thu MySQL thật, Google OAuth thật, RBAC và luồng ticket đầy đủ. Báo cáo cũ nói seed đã tạo ba Google user và dự án dùng schema lịch sử; hai nhận định đó không phản ánh thiết kế cô lập đã được phê duyệt và không được giữ làm kết luận. Bước tiếp theo là nghiệm thu cơ sở dữ liệu mới, rồi thực hiện Day 2 Google OIDC/RBAC.
