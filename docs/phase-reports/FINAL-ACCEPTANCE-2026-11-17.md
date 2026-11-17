# Smart IT Helpdesk — Nghiệm thu cuối, 17/11/2026

> Bản tiếp tục cùng ngày, gồm số đo production, UI, worker và giới hạn kiểm thử SQL mới: `FINAL-ACCEPTANCE-CONTINUATION-2026-11-17.md`. Bảng dưới đây giữ nguyên kết quả checkpoint lịch sử.

**Kết luận: PARTIAL.** Mã, SQL và browser với fixture test đã vượt qua các bài kiểm hiện có. Nghiệm thu Google ba tài khoản thật, SMTP thật và chỉ tiêu uptime 99% chưa có đủ bằng chứng. Không dùng preview hoặc session test để thay cho đăng nhập Google.

## 1. Ma trận chức năng

| Yêu cầu | Bằng chứng hiện tại | Trạng thái |
|---|---|---|
| Google OIDC, allowlist, session MySQL | Unit/API và IT_AGENT browser ở checkpoint trước; Admin/End-User chưa có phiên mới | PARTIAL |
| Ticket, ảnh, ưu tiên P1–P4 và deadline SLA | Browser API/MySQL test tạo ticket ảnh P1; SQL lưu bền vững; dữ liệu dev không có ticket thử | PASS trong test, Google E2E NOT VERIFIED |
| Phân công, ACK, phản hồi, trạng thái, lịch sử | Browser API/MySQL test ba vai trò và integration test; ACK khác phản hồi public | PASS trong test |
| Rule CRUD và SLA policies | API/MySQL, browser test; unique keyword dưới ghi đồng thời 201/409 | PASS trong test |
| Thông báo và SLA worker | HTTP restart test còn ticket/thông báo; worker chạy lại tiến trình không gửi trùng | PASS trong test |
| Quản trị user/RBAC/IDOR | Integration test guest, End-User, IT Agent, Admin; browser test Admin bằng session fixture | PASS trong test, Google Admin NOT VERIFIED |
| Analytics MTTA/MTTR/SLA | SQL aggregation test và browser Dashboard API/MySQL | PASS trong test |
| Email ngoài ứng dụng | Outbox + retry bằng sender giả lập; SMTP thực chưa cấu hình | PARTIAL |

## 2. Ma trận phi chức năng

| Chỉ tiêu | Bằng chứng | Trạng thái |
|---|---|---|
| Chống trùng Rules và toàn vẹn dữ liệu | Preflight 0 nhóm trùng, unique index DB, race test; migrations chỉ thêm cột/bảng/index | PASS |
| RBAC, IDOR, CSRF, preview | Regression test; Edge production `?preview=1` trở về Login, không có link mẫu | PASS trong phạm vi test |
| Auto-triage ≤500 ms | p95 thuật toán 0,014 ms / 10.000 lần; p95 HTTP/MySQL tuần tự 21 ms / 20 lần; chưa đo tải đồng thời | PARTIAL |
| Kanban p95 ≤2 s | 307 ms / 20 lượt, 30 ticket MySQL test, Vite dev + Express + Edge; chưa đo production/tải đồng thời | PARTIAL |
| Uptime ≥99% giờ làm việc | Monitor JSONL, một mẫu ngoài giờ `health=200`, `ready=200`; chưa có kỳ quan sát | NOT VERIFIED |
| Windows worker recovery | Supervisor khởi động lại sau khi dừng PID con, test schema, worker con dừng cùng supervisor | PASS ở local test |
| Responsive và accessibility | Playwright 5 viewport được duyệt, thêm 375 px; dialog, focus, menu, reduced motion; ảnh đối chiếu | PASS trong phạm vi test, pixel diff NOT VERIFIED |
| Build/dependencies | Vite build PASS; npm audit 0 vulnerabilities; Three chunk 522,14 KB vẫn có cảnh báo, chỉ tải có điều kiện trên Login desktop | PARTIAL về kích thước chunk |

## 3. Kết quả thực thi

| Lệnh | Kết quả gần nhất |
|---|---|
| `npm.cmd test` | 20 pass, 0 fail |
| `npm.cmd run test:integration` | 9 pass, 0 fail; chạy tuần tự theo file vì cùng dùng một schema MySQL test |
| `npm.cmd run test:frontend` | 4 pass, 0 fail |
| `npm.cmd run test:browser` | 8 pass, 0 fail; preview có nhãn |
| `npm.cmd run test:browser:api` | 2 pass, 0 fail; React/API/MySQL test schema và Kanban benchmark |
| `npm.cmd run test:browser:production` | 1 pass, 0 fail; preview query trên Kanban/Rules/Dashboard/Users đều về Login |
| `npm.cmd run build` | PASS, Vite 7.3.8; Three chunk >500 KB |
| `npm.cmd audit --audit-level=high` | 0 vulnerabilities sau nâng Nodemailer lên bản vá |
| `npm.cmd run benchmark:triage:api` | 20 mẫu sau warmup, p50 16 ms, p95 21 ms, p99 22 ms; Supertest + MySQL test |
| `npm.cmd run report:availability` | `NOT_VERIFIED`: 1 mẫu ngoài giờ, 0 ngày làm việc |
| `SELECT DATABASE(), CURRENT_USER(), TIMEDIFF(NOW(), UTC_TIMESTAMP())` | `_new_dev`/`sih_new_app@127.0.0.1` và `_new_test`/`sih_new_test@127.0.0.1`; session UTC `00:00:00` |
| HTTP sau restart Express | `/health=200`, `/ready=200`, `/login=200` trên `localhost` |

Lượt test từng thất bại trong quá trình sửa không được tính là PASS: outbox ban đầu gặp lệch múi giờ MySQL +07, đã đặt mọi session Knex về UTC; browser benchmark ban đầu bị rate limiter 200 request/15 phút, test environment tăng riêng lên 1000 còn development/production giữ 200; integration chạy song song từng nhiễu fixture của worker, đã chạy tuần tự theo file; production preview ban đầu còn bật do `.env` đặt `NODE_ENV=development`, đã đổi sang `import.meta.env.MODE` và kiểm lại trong Edge.

## 4. Google ba vai trò

- **IT_AGENT:** Có bằng chứng browser Google thật từ checkpoint trước; không đăng nhập lại provider trong lượt này. Trạng thái phiên hiện tại chưa xác minh.
- **ADMIN, END_USER:** **BLOCKED** vì cần chủ dự án mở hai phiên Google tương tác trên local app. Chủ dự án đã phản hồi sẽ mở và báo khi sẵn sàng. Không yêu cầu mật khẩu, token, cookie hay email trong báo cáo.
- Luồng ba vai trò mới PASS bằng session fixture ký chỉ trong test, kết nối API và MySQL test thật. Đây là bằng chứng ứng dụng, **không** là bằng chứng OIDC.

## 5. Rules, ACK và dữ liệu lịch sử

- Trước migration, hai schema mới mỗi schema có 6 rules, 0 nhóm `normalized_keyword` trùng, 0 ticket; index cũ không unique. Migration `20261116000004` thêm unique index, `20261116000005` thêm `acknowledged_at`; migration `00006` thêm outbox. Sau migration có 6 bản ghi lịch sử migration/schema. Hai schema cũ không truy cập/ghi trong lượt này.
- Tạo/cập nhật Rules dùng unique constraint làm nguồn quyết định cuối cùng; `ER_DUP_ENTRY` được trả 409. Bài test gửi hai POST cùng keyword chuẩn hóa đồng thời cho 201/409 và đúng một hàng.
- `acknowledged_at` ghi bằng thao tác staff riêng, cùng audit/history; `first_response_at` vẫn chỉ đặt ở phản hồi public đầu tiên của staff. MTTA = AVG(created_at → ACK), `firstResponseSeconds` = AVG(created_at → phản hồi public), MTTR = AVG(created_at → RESOLVED). SLA response dùng mốc phản hồi public, không dùng ACK. Integration test đã thay đổi rule và SLA policy sau khi tạo ticket rồi xác nhận `priority`, `priority_evidence` và hai deadline của ticket vẫn nguyên; bộ integration cuối đạt 9/9.

## 6. SMTP, worker và availability

- Notification mới từ ticket, reply, assignment, SLA tạo hàng outbox trong cùng transaction. Worker claim bằng row lock + lease, retry tối đa 8 lần với backoff. Test giả lập một lần lỗi rồi SMTP accepted, xác minh trạng thái `pending` → `sent` và không gửi lại sau `sent`.
- Không có biến `SMTP_*` trong `.env` hiện tại nên chưa thử kết nối hoặc gửi mail thật. Cần chủ dự án cấu hình provider và chỉ định recipient thử được phép. SMTP accepted không chứng minh người nhận đã đọc/nhận hộp thư; nếu tiến trình chết giữa accepted và ghi DB có thể gửi lặp khi retry.
- `server/scripts/superviseWorkers.ps1` giám sát SLA worker bằng mutex local; có thể thêm email worker sau khi SMTP sẵn sàng. Thử nghiệm Windows đã dừng worker con và quan sát worker mới; test DB quét SLA bằng tiến trình Node mới vẫn đúng hai cảnh báo duy nhất theo nghĩa vụ/recipient.
- `monitor:availability` ghi timestamp, businessHours (mặc định thứ Hai–Sáu 08:00–17:00 Asia/Bangkok), HTTP health/ready và latency. `report:availability` chỉ ra verdict sau ≥10 ngày làm việc và ≥95% độ phủ mẫu theo phút; hiện một mẫu ngoài giờ nên `NOT_VERIFIED`. Trước vận hành cần chốt lịch giờ làm việc và chạy monitor liên tục qua kỳ quan sát đại diện.

## 7. Hiệu năng và hình ảnh

- `benchmark:triage`: 10.000 mẫu sau 1.000 warmup, p50 0,008 ms, p95 0,014 ms, p99 0,063 ms. Đo hàm trong tiến trình, không bao gồm MySQL/API/tải đồng thời.
- `benchmark:triage:api`: 20 mẫu sau 3 warmup, p50 16 ms, p95 21 ms, p99 22 ms. Bao gồm HTTP/Supertest, phân loại rule, SLA, MySQL transaction và notifications trên test schema; chưa có tải đồng thời.
- `test:browser:api`: 30 thẻ MySQL test, 20 lượt sau 3 warmup, p50 224 ms, p95 391 ms, p99 397 ms. Chạy Edge với Vite dev và Express local; file `docs/benchmarks/kanban-test.json`. Cần benchmark production và tải đồng thời để chốt non-functional target.
- 7 ảnh gốc trong `Wireframe/` và 5 tài liệu trong `Diagrams/` giữ nguyên. Ảnh preview trong `docs/screenshots/design-review/`; ảnh trang API/MySQL thật dùng fixture ở `docs/screenshots/live-api/`. Kanban, dialog chi tiết, Rules, Dashboard bám bố cục sáng, sidebar hẹp, thẻ SLA. Khác biệt có chủ ý: Google OIDC thay password; code ticket UUID dài hơn `INC-1024`; chart demo/fixture ít ticket hơn ảnh gốc; mobile xếp dialog dọc. Chưa có phép đo pixel định lượng.

## 8. Hành động còn chờ và kết luận

1. Chủ dự án mở phiên Google **ADMIN** và **END_USER** đã được duyệt tại `http://localhost:5173`, mỗi vai trò trong profile riêng, rồi báo sẵn sàng. Sau đó chạy luồng ba tài khoản thật trên browser, kiểm unauthorized account và restart persistence qua UI.
2. Nếu cần email ngoài ứng dụng, chủ dự án điền `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` vào `.env` cục bộ và chỉ định địa chỉ nhận thử được phép. Không đưa bí mật vào chat/Git.
3. Chốt giờ làm việc chính thức, vận hành monitor qua kỳ quan sát đủ dài; benchmark production với tải đại diện và xử lý cảnh báo chunk Three.js nếu ngân sách tải trang yêu cầu.

**Verdict cuối: PARTIAL.** Các bước nội bộ an toàn đã có bằng chứng PASS; ba điều kiện ngoài (Google ba phiên thật, email provider và kỳ uptime) chưa thể đánh dấu PASS.
