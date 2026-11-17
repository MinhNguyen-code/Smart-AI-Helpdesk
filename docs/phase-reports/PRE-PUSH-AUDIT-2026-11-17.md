# Kiểm kê trước khi đẩy GitHub — 17/11/2026

## Phạm vi

- Root duy nhất: `D:\Smart IT Helpdesk`; không phát hiện Git repository lồng trong các thư mục dự án.
- `Diagrams/`: 5 tệp gốc; `Wireframe/`: 7 JPG gốc. Không có thay đổi Git trong hai thư mục này.
- Mã nguồn gồm React/Vite tại `src/`, Express/Knex/MySQL tại `server/`, Playwright tại `e2e/`, tài liệu và ảnh bằng chứng tại `docs/`.
- `.agents/skills/oil-ui/` là skill bên thứ ba đã có trong workspace, kèm license và `skills-lock.json`; được giữ để tái lập hướng dẫn thiết kế. `.oil-ui/` là sản phẩm làm việc trung gian, bị ignore.
- Figma có 14 frame thiết kế desktop/mobile trong file ngoài Git; mã React không được tự nhận là đã đồng bộ hoàn toàn với các frame đó.

## Bảo mật và dữ liệu

- `.env`, `.env.provision.local`, `node_modules/`, `dist/`, `logs/`, `test-results/`, `.oil-ui/` và private uploads được Git ignore; không nằm trong staging.
- `.env.example` để trống các giá trị password, session secret, Google client secret và SMTP credential. Scan các mẫu private key/token phổ biến trên tệp staged không có kết quả.
- Không in secret hoặc địa chỉ email cá nhân trong báo cáo này. Cần tiếp tục quản lý allowlist và credential trong tệp môi trường cục bộ.
- Hai lệnh `db:check` chỉ chạy `SELECT` và xác minh schema `smart_it_helpdesk_new_dev`/`smart_it_helpdesk_new_test` bằng tài khoản runtime riêng; MySQL 8.4.13. Không ghi DB lịch sử.
- Migration mới kiểm tra danh tính schema/account trước khi chạy. Chúng thêm unique keyword, timestamp ACK và email outbox; không chạy migration khi kiểm kê. Migration khởi tạo có các `dropTableIfExists` ở hàm `down`; không được dùng rollback nếu chưa duyệt tác động.

## Kiểm chứng mới nhất

| Lệnh | Kết quả |
|---|---|
| `npm.cmd test` | 22 pass, 0 fail |
| `npm.cmd run test:frontend` | 4 pass, 0 fail / 3 tệp |
| `npm.cmd run test:browser` | 10 pass, 0 fail; preview có nhãn |
| `npm.cmd run test:browser:production` | 9 pass, 0 fail; API fixture, không phải Google E2E |
| `npm.cmd run build` | PASS; chunk Three.js 522.14 KB minified vẫn có cảnh báo |
| `npm.cmd audit --audit-level=high --json` | 0 vulnerability |
| `npm.cmd run db:check`, `npm.cmd run db:check:test` | PASS, chỉ đọc, đúng hai schema dự án |

Không chạy full MySQL integration hoặc browser API vì bộ test hiện có thao tác fixture SQL có ghi/xóa dữ liệu; kết quả lịch sử không được tính là lần kiểm chứng này. Google ba vai trò thật, SMTP ngoài ứng dụng và uptime 99% còn PARTIAL/NOT VERIFIED theo báo cáo nghiệm thu.

## Git

Remote `origin` là repository Smart-AI-Helpdesk của chủ dự án. Trước commit, remote `main` đi trước local một commit chỉ sửa README; phải tích hợp commit này và push theo hướng fast-forward, không force push.
