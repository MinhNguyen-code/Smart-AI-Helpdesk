# PR 2 — Security Hardening, Regression Testing & CI

Ngày kiểm tra: 17/11/2026. Branch làm việc: `fix/security-ci-hardening` từ `origin/main` sau khi PR #1 được chủ dự án review và cho phép merge. Commit nền: `396ffa7`. Bằng chứng kiểm thử dưới đây được thu thập trước khi PR 2 chạy trên GitHub Actions.

## A. Findings

| Hạng mục | Bằng chứng trước sửa | Ảnh hưởng | Trạng thái sau sửa |
| --- | --- | --- | --- |
| Ghi chú nội bộ | `server/src/modules/ticketRoutes.js`, `GET /tickets/:id`: `comments` lọc theo `visibility`, nhưng `history` trả mọi `COMMENT_ADDED` cùng actor, thời gian và ID comment. | Trung bình: chủ ticket biết metadata của ghi chú chỉ dành cho staff. | Đã lọc event comment bằng quan hệ tới comment public cùng ticket. ADMIN/IT_AGENT vẫn xem toàn bộ. Test SQL regression đã viết, chưa chạy trong lượt này. **PARTIAL**. |
| Health/readiness | `server/src/modules/system/systemRoutes.js` trả phiên bản Node, uptime, timestamp và đối tượng `dbHealth` chứa tên schema/mã lỗi. | Thấp đến trung bình: lộ chi tiết hạ tầng không cần cho probe công khai. | Chỉ trả trạng thái. `/ready` vẫn kiểm tra MySQL/schema thật; ghi log nội bộ khi readiness đổi trạng thái. API tests **PASS**. |
| Session hết hạn | `server/src/db/sessionStore.js` từ chối session hết hạn khi đọc nhưng không có công cụ dọn bản ghi cũ. | Trung bình về vận hành: bảng `sessions` có thể tăng liên tục. | Thêm cleanup theo lô, xác minh hạn lần nữa trước khi xóa, CLI dry-run mặc định. Chưa chạy cleanup trên DB local và chưa lên lịch vận hành. **PARTIAL**. |
| Auth/RBAC/CSRF | Route nghiệp vụ đọc `users.role` và `is_active` từ DB; callback OIDC dùng state/nonce/PKCE rồi regenerate session; logout destroy; mutation kiểm Origin và CSRF. `requireRole` cũ dùng role trong session nhưng không được route hiện tại gọi. | Chưa xác minh lỗi khai thác ở route đang dùng; cần bảo vệ bằng regression. | Thêm unit CSRF và integration assertions cho role/active thay đổi, logout, API admin. Unit **PASS**; integration SQL **NOT VERIFIED** trong lượt này. |
| CI | Chưa có workflow root `.github/workflows/ci.yml`. | Thiếu gate tự động cho PR/main. | Đã thêm workflow unit/API, frontend, build, audit high; chưa có MySQL container và chưa chạy remote. **PARTIAL**. |

## B. Changes và tương thích API

- Sửa `server/src/modules/ticketRoutes.js`: lọc `history` cho END_USER theo comment public; giữ schema JSON và dữ liệu lịch sử trong MySQL. Test tương ứng tại `server/tests/integration/ticketApi.test.js` bao phủ public/internal cho END_USER, IT_AGENT, ADMIN; test sở hữu ticket vốn có vẫn được giữ.
- Sửa `server/src/modules/system/systemRoutes.js`, `server/scripts/benchmarkReadiness.js`, `server/tests/api/health.test.js`: liveness `{status:"UP"}`, readiness `{status:"READY"}` hoặc `{status:"NOT_READY"}`. **Thay đổi response body có chủ ý**: bỏ trường chi tiết DB/runtime; status HTTP và ý nghĩa probe giữ nguyên. Monitor availability hiện tại đọc mã HTTP, không phụ thuộc các trường bị bỏ. Script benchmark đã đổi theo contract mới.
- Sửa `server/src/db/sessionStore.js`, `package.json`; thêm `server/scripts/cleanupSessions.js`, `server/tests/unit/sessionStore.test.js`: dọn tối đa 10 lô × 500 session hết hạn mỗi lần gọi; điều kiện xóa lặp lại `expires <= cutoff` để tránh xóa session vừa gia hạn. CLI không có `--apply` chỉ đếm; trước mọi truy vấn gọi `verifyTargetDatabase()` và pool Knex xác minh account/schema dự án. Log lỗi chỉ chứa mã lỗi, không chứa secret. Không tự bật lịch dọn và không chạy thao tác xóa trong phase này.
- Thêm `server/tests/unit/csrf.test.js`; mở rộng `server/tests/integration/userApi.test.js` và `server/tests/integration/sessions.test.js`. Các integration tests này tạo và xóa fixture trên schema test nên **chưa chạy** theo giới hạn hiện hành.
- Thêm `.github/workflows/ci.yml`; cập nhật `docs/API_SPEC.md` và `docs/TEST_PLAN.md` cho contract và giới hạn kiểm thử.
- Không đổi migration, schema, `.env`, credential, ảnh gốc, frontend runtime hoặc nghiệp vụ ngoài phạm vi.

## C. Test evidence trong lượt này

| Lệnh | Kết quả thực tế |
| --- | --- |
| `git diff --check` | Exit 0; không có lỗi whitespace. Git chỉ cảnh báo chuyển LF/CRLF khi chạm file. |
| `npm.cmd test` | Exit 0, **25 pass / 0 fail** sau các thay đổi. Bao gồm CSRF, cleanup session, auth thiếu session/callback lỗi và response health/readiness. Lần chạy sandbox ban đầu bị `EACCES` loopback; chạy lại ngoài sandbox theo quyền đã duyệt mới đạt kết quả này. |
| `$env:NODE_ENV='test'; npm.cmd test` | Exit 0, **25 pass / 0 fail** với mode mà workflow CI sẽ dùng. Lượt chạy local vẫn đọc cấu hình local; chưa tương đương runner sạch của GitHub. |
| `node --input-type=module -e "…request(app).get('/api/v1/ready')…"` | Exit 0; HTTP **200** với JSON `{"status":"READY"}` qua Express và MySQL hiện tại. Chỉ truy vấn đọc. |
| `npm.cmd run test:frontend` | Exit 0, **3 test files / 4 tests pass**. |
| `npm.cmd run build` | Exit 0, Vite build thành công. Còn cảnh báo chunk `SupportScene` >500 kB như trước; không thuộc PR bảo mật. |
| `.\\node_modules\\.bin\\playwright.cmd test e2e/production-guard.spec.js --config=playwright.production.config.js` | Exit 0, **1 pass / 0 fail**; bản build production không mở màn Admin qua `?preview=1` khi chưa đăng nhập. Test này không ghi SQL hay screenshot. |
| `npm.cmd audit --audit-level=high --json` | Exit 0, **0 vulnerabilities** ở mọi mức. Lần thử trong sandbox bị `ENOTFOUND registry.npmjs.org`; đã chạy lại với network được cho phép. |
| `node --check server/scripts/cleanupSessions.js` | Exit 0. |
| `npm.cmd run test:integration`, `npm.cmd run test:browser:api` | **NOT VERIFIED**; không chạy vì có tạo/xóa fixture SQL trong schema local. |
| `npm.cmd run test:browser`, bộ production states/benchmark | **NOT VERIFIED** lượt này; các spec còn lại ghi đè screenshot hoặc benchmark evidence hiện có. Browser preview cũng không chứng minh Google E2E thật. |
| `npm.cmd run session:cleanup -- --apply` | **NOT VERIFIED**; không chạy vì xóa session hết hạn trên DB local bị cấm trong phase này. |

`npm.cmd test` có một phép thử readiness dùng `SELECT` MySQL nếu cấu hình local sẵn có; không tạo, sửa hoặc xóa bản ghi. Các số PASS cũ của integration không được tính là kết quả của lượt này.

## D. GitHub Actions CI

Workflow `.github/workflows/ci.yml` chạy khi PR vào `main` và push lên `main`, với quyền `contents: read`, Node 24, `npm ci`, `npm test` dưới `NODE_ENV=test`, frontend tests, production build, và `npm audit --audit-level=high`. Các bước bắt buộc không dùng `continue-on-error`. CI không dùng OAuth/SMTP credential thật.

Chưa có MySQL integration job: các test hiện tại viết/xóa fixture và có bài đổi SLA policy rồi khôi phục; cần service container, schema/account test chỉ thuộc CI và rà toàn bộ fixture/seed trước khi bật. `server/src/db/targetPolicy.js` hiện đòi `CURRENT_USER()` khớp account `@127.0.0.1`; kết nối qua Docker bridge trong runner phải được thiết kế và xác minh riêng trước khi mở rộng identity policy. **Chưa có bằng chứng GitHub Actions PASS ở thời điểm ghi báo cáo này.** `npm ci` cũng chưa được kiểm chứng trong runner sạch.

## E. Verdict và bước tiếp

| Hạng mục | Trạng thái |
| --- | --- |
| Sửa lọc internal note/history trong code | **PASS** (review source); hành vi MySQL thật **NOT VERIFIED** lượt này. |
| Health/readiness public contract và API tests | **PASS**. |
| Auth/CSRF unit và source review | **PASS**; regression SQL cho role, active, logout và ticket **NOT VERIFIED**. |
| Session cleanup an toàn ở mức unit | **PASS**; chạy thật và lên lịch **NOT VERIFIED**. |
| Frontend tests, build, audit high | **PASS**. |
| GitHub Actions workflow trong repo | **PARTIAL**; chưa có bằng chứng chạy remote tại thời điểm ghi báo cáo, integration CI chưa cấu hình. |
| Toàn PR 2 | **PARTIAL**. |

Bước tiếp theo: review diff và quan sát GitHub Actions khi PR 2 được mở. Muốn nâng lên PASS cần chạy integration trên MySQL service container riêng với account/schema test CI, xác minh history/role/session bằng HTTP, và xem kết quả workflow thực tế. Lên lịch cleanup chỉ sau khi môi trường đích và chính sách vận hành được duyệt.
