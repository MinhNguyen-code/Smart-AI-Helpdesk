# Smart IT Helpdesk — tiếp tục nghiệm thu cuối, 17/11/2026

**Kết luận: PARTIAL.** Đây là lần kiểm tra tiếp theo của `FINAL-ACCEPTANCE-2026-11-17.md`, không thay thế kết quả lịch sử bằng giả định. Các phép kiểm tự chủ không ghi bền vững vào MySQL đã hoàn tất. Google E2E ba vai trò, SMTP thật, hiệu năng ticket API với tải MySQL đại diện và uptime 99% vẫn thiếu điều kiện hoặc thời gian quan sát.

## Phạm vi và dữ liệu được bảo vệ

- Project root: `D:\Smart IT Helpdesk`. `Wireframe/` có đúng 7 ảnh JPG gốc; `Diagrams/` có 3 ảnh PNG và 2 file PlantUML. `git diff --name-only -- Diagrams Wireframe` rỗng, không sửa hai thư mục này.
- `npm.cmd run db:check` chọn `smart_it_helpdesk_new_dev`, tài khoản `sih_new_app@127.0.0.1`, MySQL 8.4.13. `npm.cmd run db:check:test` chọn `smart_it_helpdesk_new_test`, `sih_new_test@127.0.0.1`. Không truy cập/ghi hai schema lịch sử trong lượt này, không migration, seed, provisioning, `DROP`, `TRUNCATE` hay `DELETE` SQL.
- Chỉ một integration test tạo dữ liệu trong transaction riêng rồi chủ động `ROLLBACK`; kết quả truy vấn sau rollback không còn ticket đó. Full integration, live-browser API và triage API benchmark hiện có chứa `DELETE` fixture và/hoặc cập nhật tạm policy nên không chạy lại dưới giới hạn hiện tại. Các lượt 9/9, 2/2 và p95 21 ms trong báo cáo trước là **bằng chứng lịch sử**, không là kết quả của lượt này.

## 1. Ma trận nghiệm thu chức năng

| Chức năng | Bằng chứng lượt này | Trạng thái |
|---|---|---|
| Google OIDC, allowlist, session | Config Google có tại máy (chỉ kiểm sự hiện diện); unit/API 22/22 gồm guest bị từ chối; chưa có browser session mới cho ADMIN/END_USER | PARTIAL; Google ba vai trò NOT VERIFIED lượt này |
| END_USER tạo ticket/ảnh/ưu tiên/SLA, xem ticket và notification | Mã và integration 9/9, browser API 2/2 ở checkpoint trước; lượt này chỉ kiểm transaction rollback 1/1 và UI fixture | NOT VERIFIED trong browser Google thật |
| IT_AGENT xem/ACK/tự nhận/phản hồi/chuyển trạng thái/giải quyết | Có code và bằng chứng integration/fixture trước; không chạy lại thao tác ghi bền vững | NOT VERIFIED lượt này |
| ADMIN Rules, SLA, users, phân công, audit, analytics | Preview 7 màn và production UI fixture; mã/API test lịch sử; chưa có session ADMIN thật | PARTIAL |
| Notification in-app và SLA worker | Mã có deduplication và integration lịch sử; không chạy worker thật trên DB lần này | PARTIAL |
| Dashboard MTTA/MTTR | Code đã dùng ACK riêng với phản hồi đầu tiên; production test xác minh trạng thái lỗi và retry, chưa xác minh dữ liệu SQL mới | PARTIAL |
| SMTP outbox và email ngoài ứng dụng | Các biến `SMTP_*` vắng trong `.env`; không gửi email hoặc thử transport | BLOCKED riêng cho SMTP thật |
| Preview không vượt xác thực | `test:browser:production` xác minh `?preview=1` ở Kanban/Rules/Dashboard/Users vẫn về Login | PASS |

**Google:** IT_AGENT browser thật là kết quả checkpoint cũ, chưa xác minh lại phiên hiện tại. Chủ dự án chưa báo hai phiên ADMIN/END_USER sẵn sàng; không đụng tới mật khẩu, cookie hay token. Tài khoản ngoài allowlist chưa được thử bằng tài khoản Google test được cho phép. Không dùng session fixture để thay cho OIDC.

## 2. Ma trận nghiệm thu phi chức năng

| Yêu cầu | Bằng chứng và giới hạn | Trạng thái |
|---|---|---|
| Auto-triage ≤500 ms | `classifyPriority` 10.000 lượt p50 0,007 / p95 0,008 / p99 0,019 ms; không gồm HTTP/MySQL/tải đồng thời | PASS thuật toán; mục tiêu end-to-end PARTIAL |
| Kanban p95 ≤2 s | Bundle production + Edge, 30 thẻ/trang, 1/4/8 client, p95 262/1100/1604 ms; API fixture, không có truy vấn MySQL với 3.000 ticket | PASS cho phép đo UI; end-to-end PARTIAL |
| Readiness/API latency | Express `NODE_ENV=production`, MySQL thật, 120 GET `/ready`, 0 lỗi; p95 5,7/6,1/11,8 ms ở 1/4/8 client | PASS cho `/ready`; ticket API NOT VERIFIED ở tải này |
| RBAC/IDOR và dữ liệu riêng tư | Guest `/tickets=401`, production preview guard PASS; bộ integration RBAC lịch sử chưa chạy lại | PARTIAL |
| Responsive, focus, trạng thái UI | Preview 1440/1280/950/768/390 px và 375 px không tràn; production Kanban fixture 5 width; modal trả focus cho nút mở; loading/error/retry có test | PASS các hành vi đã thử; accessibility tổng thể PARTIAL |
| Three.js Login | Chunk 522,14 KB minified / 130,46 KB gzip; thử named imports không giảm; production test xác nhận mobile không tải chunk, desktop mới tải và dựng canvas | PARTIAL về ngân sách tải desktop |
| Worker Windows | Supervisor ghi `logs/workers/supervisor.jsonl`, stdout/stderr riêng mỗi lần khởi động; worker giả lập tự thoát được khởi động lại nhiều lần | PASS recovery giả lập; boot/shutdown/worker DB thật NOT VERIFIED lượt này |
| Uptime ≥99% giờ làm việc | Monitor v2 kiểm web + health + ready, snapshot 04:19 local có 5 mẫu hợp lệ ngoài giờ; chưa có phút giờ làm việc hoặc 10 ngày quan sát | NOT VERIFIED |
| Dependency/build | Vite build PASS; `npm.cmd audit --audit-level=high`: 0 vulnerabilities; cảnh báo Three chunk còn | PASS build/audit; chunk PARTIAL |

## 3. Lệnh và kết quả mới nhất

| Lệnh | Kết quả |
|---|---|
| `npm.cmd test` | 22 pass, 0 fail (20 cũ + 2 test lịch giờ làm việc) |
| `node --test server/tests/integration/database.test.js` | 1 pass, 0 fail; transaction rollback |
| `npm.cmd run test:frontend` | 4 pass, 0 fail / 3 file |
| `npm.cmd run test:browser` | 9 pass, 0 fail; preview có nhãn, thêm focus restore |
| `npm.cmd run test:browser:production` | 7 pass, 0 fail; guard, UI loading/error/retry, Three lazy, 5 width |
| `npm.cmd run benchmark:kanban:production` | 1 pass; 120 lượt đo, 0 navigation fail |
| `npm.cmd run benchmark:readiness` | 120 GET `/ready`, 0 lỗi, HTTP 200 toàn bộ |
| `npm.cmd run benchmark:triage` | 10.000 lần, p95 0,008 ms |
| `npm.cmd run build` | PASS, Vite 7.3.8; Three chunk warning còn |
| `npm.cmd audit --audit-level=high` | 0 vulnerabilities |
| `npm.cmd run db:check` / `db:check:test` | PASS, đúng hai schema dự án và tài khoản runtime riêng |
| `node server/scripts/monitorAvailability.js --once` | v2: web/health/ready đều 200, mẫu ngoài giờ |
| `npm.cmd run report:availability` | NOT_VERIFIED tại snapshot 04:19 local: 7 mẫu tổng, 5 mẫu v2 hợp lịch, 2 mẫu cũ bị loại; 0 ngày làm việc |
| `git diff --check` | exit 0; chỉ cảnh báo line ending Git, không có lỗi whitespace |

Lần chạy đầu trong sandbox trả `EACCES` với localhost, nên API/MySQL test được chạy lại với quyền kết nối local và đạt kết quả trong bảng. Không tính lượt `EACCES` là lỗi ứng dụng. Test browser mới từng lỗi do assertion/timing, đã sửa và chạy lại đến kết quả 7/7; không gộp các lượt lỗi trước thành PASS.

## 4. Benchmark có thể lặp lại

Máy kiểm: Windows, Node v24.20.0, Edge 157.0.4341.60, 12 logical CPU, RAM 16 GiB. `docs/benchmarks/kanban-production-fixture.json` và `docs/benchmarks/readiness-production.json` ghi thời điểm UTC, phương pháp và số liệu. Mỗi percentile dùng nearest-rank sau warmup.

| Kanban production | Thẻ render/trang | Mẫu | p50 | p95 | p99 | Lỗi |
|---|---:|---:|---:|---:|---:|---:|
| Tổng fixture 30, 1 client | 30 | 40 | 206 ms | 262 ms | 376 ms | 0/40 |
| Tổng fixture 300, 4 client | 30 | 40 | 752 ms | 1100 ms | 1101 ms | 0/40 |
| Tổng fixture 3000, 8 client | 30 | 40 | 1516 ms | 1604 ms | 1672 ms | 0/40 |

`total` là metadata fixture; API thật phân trang 30, nên **không** suy ra SQL có thể xử lý 3.000 ticket trong 1,604 s. Không có client Google hay MySQL trong phép đo Kanban này.

| `/ready` production + MySQL | Mẫu | p50 | p95 | p99 | Lỗi |
|---|---:|---:|---:|---:|---:|
| 1 client | 40 | 3,6 ms | 5,7 ms | 5,8 ms | 0/40 |
| 4 client | 40 | 4,7 ms | 6,1 ms | 6,5 ms | 0/40 |
| 8 client | 40 | 8,4 ms | 11,8 ms | 12,7 ms | 0/40 |

## 5. Đối chiếu bảy wireframe

Ảnh gốc là bảy JPG trong `Wireframe/`; ảnh React mới chụp ở `docs/screenshots/design-review/desktop/01-login.png` đến `07-rule-dialog.png` và bản mobile tương ứng. Ảnh production fixture đã khử dữ liệu cá nhân nằm trong `docs/screenshots/acceptance-production/`. Chúng là bằng chứng hình ảnh giao diện, không phải chứng nhận Google E2E.

| Ảnh gốc | Bố cục React quan sát được | Chênh lệch còn lại |
|---|---|---|
| `1791984801876_*` Login | Hai cột, hero trái, khối đăng nhập phải | Google OIDC thay form mật khẩu theo quyết định dự án; minh họa bàn 3D thay người |
| `1791984953566_*` Tạo ticket | Form giữa trang, ảnh hưởng/mô tả/ảnh/nút hành động | Thêm danh mục theo MVP; ảnh preview chỉ xuất hiện khi chọn |
| `1791985471445_*` Kanban | Sidebar hẹp, ba cột, thẻ P1 đỏ, countdown | Dữ liệu preview 6 thẻ thay 17; production fixture 30 thẻ/trang |
| `1791985886780_*` Chi tiết | Modal hai vùng, phản hồi trái, SLA phải | Preview không có ảnh thật; live API ảnh test là bằng chứng checkpoint trước |
| `1791986159563_*` Dashboard | Bốn KPI, cột ngày, pie ưu tiên | Preview dùng số minh họa có nhãn; live lấy API SQL |
| `1791986296193_*` Rules | Bảng, tìm kiếm, toggle, hành động | Thêm SLA P1–P4 dưới bảng theo MVP |
| `1791986298736_*` Rule dialog | Modal giữa, từ khóa, ưu tiên, Hủy/Lưu | Thêm checkbox hoạt động và trạng thái lỗi/đang lưu |

Không làm pixel diff định lượng vì kích thước ảnh gốc, dữ liệu, phương thức đăng nhập và breakpoint đã đổi. Preview test kiểm 375–1440 px; production fixture Kanban kiểm 390–1440 px và chụp `kanban-mobile-390.png`. Đã sửa trạng thái rỗng giả khi API đang tải và focus modal trở lại nút mở. Ảnh `kanban-loading.png`, `kanban-error.png`, `dashboard-error.png` minh họa các trạng thái production với fixture. Chưa chạy kiểm toán tự động color contrast hoặc screen reader thực, nên không kết luận toàn bộ WCAG đạt chuẩn.

## 6. Reliability, timezone và rủi ro còn lại

- `Codex.md` yêu cầu lưu DB UTC, timezone báo cáo ưu tiên `Asia/Ho_Chi_Minh`. Monitor trước dùng `Asia/Bangkok` (cùng UTC+7 hiện tại), nay mặc định `Asia/Ho_Chi_Minh`; `BUSINESS_TIMEZONE`, `BUSINESS_START_HOUR`, `BUSINESS_END_HOUR` ở `.env.example` cho phép cấu hình. Lịch thứ Hai–Sáu 08:00–17:00 vẫn là **giả định**, chưa được chủ dự án xác nhận.
- Monitor v2 chỉ chấp nhận mẫu cùng lịch có cả web/health/ready. Mẫu cũ bị loại để không thổi phồng độ phủ. Tiến trình monitor local được khởi động nền, nhưng không có bằng chứng bảo đảm tự khởi động sau reboot; URL local dev không thay cho URL production. Cần cấu hình URL production và giám sát đủ ≥10 ngày làm việc, ≥95% phút dự kiến, rồi mới đánh giá mục tiêu 99%.
- Supervisor Windows có mutex một instance và log riêng. Test dùng `server/tests/fixtures/supervisorCrash.js` không kết nối MySQL: nhiều chu kỳ `worker_exited` → `worker_started` được ghi. Chưa xác minh Windows startup task, dừng sạch worker thật sau reboot hoặc log retention. Exit code của `Start-Process -PassThru` không ổn định trong lần thử giả lập nên log không ghi giá trị có thể sai; stderr từng tiến trình vẫn được giữ.
- Chunk Three.js còn 522,14 KB minified; đổi namespace import sang named import không giảm kích thước nên đã hoàn nguyên. Production test thấy chunk không tải trên mobile và chỉ tải khi viewport desktop kích hoạt; reduced-motion đã có test static fallback. Chưa có số liệu tải qua mạng chậm hoặc thiết bị GPU yếu.
- `/login`, `/health`, `/ready` trên `http://localhost` hiện trả 200; `/tickets` khi chưa đăng nhập trả 401. Vite hiện lắng nghe `localhost:5173`; gọi `127.0.0.1:5173` trên máy này bị từ chối vì binding của tiến trình hiện tại. Người dùng mở `http://localhost:5173/login`.

## 7. Việc cần chủ dự án và checkpoint kế tiếp

1. Khi sẵn sàng, mở hai phiên Google ADMIN và END_USER đã duyệt trong profile riêng trên ứng dụng local, rồi báo. Khi đó mới chạy chuỗi ticket ảnh, priority/SLA, notification, IT_AGENT ACK/assign/reply/resolve, ADMIN rules/SLA/users/dashboard, RBAC/IDOR và restart persistence bằng phiên thật; tài khoản không được duyệt cần tài khoản test do chủ dự án cho phép.
2. Cấu hình SMTP trong `.env` cục bộ và chỉ định recipient thử được phép. Sau đó mới xác minh transport, outbox/retry và SMTP accepted; inbox delivery cần bằng chứng riêng.
3. Xác nhận lịch giờ làm việc chính thức và URL vận hành để monitor đo đúng đối tượng. Duy trì monitor qua kỳ quan sát đủ dài; lập cấu hình startup/recovery lâu dài trên Windows.
4. Muốn chạy lại toàn bộ integration/browser API với nhiều ticket MySQL, cần một phương án test cho phép dọn fixture có phạm vi hoặc schema tạm cô lập. Không dùng các test hiện tại trái giới hạn `DELETE` của checkpoint này.

**Verdict: PARTIAL cho dự án.** Các phần riêng nêu PASS/BLOCKED/NOT VERIFIED theo bằng chứng thực thi ở trên. Không commit hoặc push.
