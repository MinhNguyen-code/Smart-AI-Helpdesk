# Day 7 — Tích hợp và nghiệm thu hiện tại

**Ngày:** 12/11/2026. **Checkpoint: PARTIAL.** Các bộ test đã chạy đạt; chưa hoàn thành toàn bộ luồng Google ba vai trò với ticket thật.

## Phạm vi đã xác minh

- Google OIDC trên browser thật: tài khoản đã được duyệt đăng nhập qua Google, ứng dụng trả vai trò **IT_AGENT**, Kanban dùng MySQL và không có liên kết Admin. Mở trực tiếp `/rules` bị chặn. Sau restart Express/Vite, reload vẫn giữ phiên; đăng xuất và mở lại Kanban trở về login. Không ghi địa chỉ email hay token vào báo cáo.
- Ticket API trên test schema: tạo ticket, phân loại P1, SLA, quyền sở hữu/IDOR, bình luận, phân công, chuyển trạng thái, upload ảnh giả bị từ chối rồi retry ảnh hợp lệ, download riêng tư. Ticket RESOLVED được đọc từ một tiến trình Node mới trước khi fixture được dọn. Điều này xác minh lưu bền vững ở MySQL, chưa phải browser flow sau restart với ticket thật.
- Rules/SLA API, notification API, analytics SQL và SLA worker được kiểm bằng integration test. Số liệu preview và browser preview **không** được xem là dữ liệu thật.
- API và giao diện quản trị danh sách cho phép/vai trò đã bổ sung: chỉ Admin đọc/thêm/sửa; bản ghi mới chưa liên kết Google; test MySQL xác minh phân quyền, chống tự khóa và audit. Chưa kiểm bằng phiên Admin thật trên browser.
- Playwright trên Edge kiểm tra 7 màn preview tại 1440×900, dialog Rules tại 390×844, và Login/Create Ticket/Kanban/Dashboard/Rules không tràn ngang cấp trang ở đủ 5 độ phân giải; ảnh trong `docs/screenshots/day7-01-login.png` đến `day7-07-rule-dialog.png` cùng `day7-rules-*.png`. Ảnh SCR-05/06/07 đã được xem lại và đối chiếu bố cục với wireframe gốc. Chưa đo pixel ở mọi màn/kích thước.

## Lệnh và kết quả cuối

| Lệnh | Kết quả |
|---|---|
| `npm.cmd test` | **PASS: 20 pass, 0 fail** |
| `npm.cmd run test:integration` | **PASS: 7 pass, 0 fail** (chạy lại 16/11) |
| `npm.cmd run test:frontend` | **PASS: 4 pass, 0 fail** |
| `npm.cmd run test:browser` | **PASS: 5 pass, 0 fail** (preview; chạy lại 16/11) |
| `npm.cmd run build` | **PASS**, Vite 7.3.8; cảnh báo hai chunk >500 kB |
| `npm.cmd audit --audit-level=moderate` | **PASS: 0 vulnerabilities** (chạy lại 16/11) |
| HTTP `/api/v1/health`, `/api/v1/ready` sau restart | **200, 200**; backend kết nối `smart_it_helpdesk_new_dev` (16/11) |
| `npm.cmd run db:check`, `npm.cmd run db:check:test` | **PASS**; MySQL 8.4.13, lần lượt `smart_it_helpdesk_new_dev`/`sih_new_app@127.0.0.1` và `smart_it_helpdesk_new_test`/`sih_new_test@127.0.0.1` |

Lượt `npm.cmd test` đầu trong sandbox thất bại `EACCES` trên Supertest localhost; chạy lại với quyền mạng phù hợp đạt 20/20, kể cả ngày 16/11. Lượt Playwright đầu sau nâng dependency gặp Vite cũ chưa restart; sau restart đạt 2/2 ở thời điểm đó và 5/5 ngày 16/11. Integration test từng thất bại vì worker chạy song song sinh thêm thông báo cho fixture analytics; assertion đã sửa theo bản ghi thuộc người nhận, sau đó đạt 6/6 và 7/7 ngày 16/11. Không coi các lượt thất bại này là PASS.

## Bổ sung 16/11/2026

- Đối chiếu báo cáo nghiên cứu đính kèm với workspace thực: sửa README/kiến trúc/thiết kế database còn trỏ tới schema lịch sử; cập nhật API Specification cho quản trị tài khoản và định nghĩa MTTA hiện tại. Báo cáo đính kèm là tài liệu tham khảo, không thay thế mã nguồn và kết quả test hiện hành.
- Xóa địa chỉ cá nhân khỏi `.env.example` và giá trị mặc định trong `server/src/config/index.js`; lệnh onboarding đòi hỏi ba email hợp lệ từ cấu hình cục bộ. Mọi môi trường ngoài test bắt buộc có `SESSION_SECRET` dài ít nhất 32 ký tự. Callback Google cập nhật tên hiển thị từ ID token hợp lệ. Lỗi 5xx và 404 không trả chi tiết SQL hoặc query string.
- `npm.cmd test`: **20/20**; `npm.cmd run test:integration`: **7/7**; `npm.cmd run test:frontend`: **4/4**; `npm.cmd run test:browser`: **5/5**; `npm.cmd run build`: **PASS**, vẫn cảnh báo hai chunk >500 kB. HTTP trên tiến trình mới: `/api/v1/health=200`, `/api/v1/ready=200`, khách gọi `/api/v1/users=401`, `/login=200`.
- Không chạy provisioning, migration hoặc seed; không sửa hai schema lịch sử hay tài liệu thiết kế gốc. Không commit/push.
- `git diff --check`: exit 0; `Diagrams/` và `Wireframe/` không có thay đổi Git, lần lượt còn 5 và 7 tệp; `.env` không được Git theo dõi.

## Database/Git/an toàn

Không provision hay chạy migration/seed trong lượt này. Hai schema lịch sử vẫn ngoài phạm vi. Fixture chỉ trên `smart_it_helpdesk_new_test` và được dọn. Không commit hoặc push; working tree đang có thay đổi. `express-mysql-session` không dùng đã gỡ, thay bằng `DatabaseSessionStore` hiện có; Vite/Vitest/React Router được nâng sau khi audit cảnh báo.

## BLOCKED / NOT VERIFIED

- **NOT VERIFIED:** Browser E2E với Admin và End-User thật; tài khoản Google ngoài allowlist bị chặn; trọn luồng create → notification → assignment → reply → resolve → dashboard bằng ba vai trò. Cần phiên đăng nhập của hai tài khoản tương ứng do chủ dự án kiểm soát.
- **NOT VERIFIED:** Upload/retry qua browser thật; đã PASS qua HTTP integration trên test schema.
- **NOT VERIFIED:** Ticket thật được đọc lại qua browser sau restart; chỉ xác minh bằng tiến trình Node mới và phiên browser qua restart.
- **PARTIAL:** 7 ảnh 1440×900 và kiểm tràn ngang 5 màn ở đủ 5 kích thước; so sánh pixel toàn diện, hiệu năng và uptime chưa đo.
- **PARTIAL:** Worker có kiểm thử chống trùng nhưng chưa được vận hành dưới cơ chế tự khởi động/giám sát tiến trình. Rules chưa có unique constraint DB cho từ khóa chuẩn hóa khi hai Admin ghi đồng thời.
- **PARTIAL:** Trang quản lý người dùng có API, giao diện và test MySQL; chưa nghiệm thu bằng phiên Admin Google thật. MTTA hiện là thời gian đến phản hồi public đầu tiên, chưa có mốc ACK độc lập như sơ đồ. Email cảnh báo ngoài ứng dụng cần SMTP được chủ dự án cấu hình và chưa có kiểm thử gửi thực.

## Bước nghiệm thu tiếp

Đăng nhập lần lượt Admin và End-User đã duyệt trong browser, tạo một ticket thật có ảnh, cấu hình quy tắc/SLA bằng Admin, xử lý với IT Agent, xác nhận thông báo/KPI rồi restart và đọc lại ticket. Chụp ảnh ở 1280×800, 950×900, 768×1024; đo thời gian tải board và phân loại. Sau khi đạt đầy đủ mới nâng checkpoint Day 7 lên PASS.

## Cập nhật nghiệm thu 17/11/2026 — PARTIAL

Các mục BLOCKED/NOT VERIFIED phía trên là trạng thái tại ngày 16/11. Kết quả mới và giới hạn bằng chứng được ghi chi tiết trong `FINAL-ACCEPTANCE-2026-11-17.md`.

- **PASS:** Hai migration bổ sung trên đúng `smart_it_helpdesk_new_dev`/`smart_it_helpdesk_new_test` (unique keyword, ACK) và migration outbox; preflight không có keyword trùng, không có ticket lịch sử; 6 migration/schema, không đổi schema cũ. Rules race 201/409, DB đúng một hàng. Tất cả kết nối Knex đặt session UTC.
- **PASS:** Browser API/MySQL trên schema test dùng session fixture của ba vai trò: ticket có ảnh → agent tự nhận → ACK → public reply → RESOLVED → notification → Admin quản lý rule/SLA/user → dashboard/audit. Điều này không xác nhận Google login thật.
- **PASS:** HTTP test có restart hẳn tiến trình Express rồi đọc lại ticket và thông báo; SLA test quét lại trong tiến trình Node mới không tạo cảnh báo trùng. Supervisor PowerShell bị dừng worker con đã khởi động lại worker mới và dọn worker khi kết thúc.
- **PASS (giới hạn đo):** triage thuần thuật toán 10.000 lần, p95 0,014 ms; Kanban Vite dev + Express + 30 ticket MySQL test 20 lượt sau warmup, p95 391 ms. Các số này không chứng minh tải production hoặc 99% uptime.
- **PASS (giới hạn đo):** tạo ticket qua HTTP/Supertest gồm rule matching, SLA, MySQL và notifications trên schema test, 20 lượt sau warmup p95 21 ms; vẫn chưa đo tải đồng thời production.
- **PARTIAL:** SMTP outbox/retry đã kiểm bằng sender giả lập; chưa có credentials và recipient để gửi thật. Availability monitor đã ghi một mẫu ngoài giờ làm việc `health=200`, `ready=200`; chưa đủ thời gian quan sát để tính 99%.
- `report:availability` hiện trả `NOT_VERIFIED`: 1 mẫu, 0 ngày làm việc và 0 phút đủ điều kiện; yêu cầu ít nhất 10 ngày làm việc/95% độ phủ để xét ngưỡng 99%.
- **BLOCKED:** Google ADMIN/END_USER trên browser thật đang chờ chủ dự án mở hai phiên được phép. IT_AGENT đã có bằng chứng từ checkpoint trước nhưng chưa chạy lại Google provider trong lượt này.
- **PASS:** Build production không còn mở preview qua `?preview=1`; xác nhận bằng Edge, chỉ thấy Login, không có link preview. Bảy màn preview và các trang kết nối API test có ảnh riêng; so sánh vẫn bằng mắt, chưa có pixel diff định lượng.
