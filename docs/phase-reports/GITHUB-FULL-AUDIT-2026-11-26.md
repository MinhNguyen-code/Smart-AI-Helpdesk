# Kiểm tra chức năng và mã nguồn GitHub — 26/11/2026

> Cập nhật sau audit: owner đã đồng ý sửa F1–F5. Xem [bản sửa ổn định cùng ngày](MVP-STABILITY-FIXES-2026-11-26.md): 45 backend, 24 frontend và 28 browser local PASS; bản sửa chưa commit/push, CI mới và deployment chưa chạy. Nội dung bên dưới giữ checkpoint audit trước khi sửa và các SHA GitHub đã kiểm tra.

**Kết luận: PARTIAL — lõi MVP và phân tuyến đã qua kiểm thử CI, nhưng chưa thể xác nhận toàn bộ sản phẩm đạt nghiệm thu.** Có hai lỗi ưu tiên P1 trên bản ứng viên hiện tại, hai lỗi chức năng P2 đã tái hiện và bộ browser regression cần cập nhật. Nhánh mặc định `main` vẫn chưa nhận các PR bảo mật/UI/worker/phân tuyến.

Lượt này là review và kiểm chứng. Không sửa runtime/workflow/seed, không đổi schema hoặc dữ liệu nghiệp vụ, không commit/push/merge, không đăng review/comment lên GitHub. Chỉ thêm báo cáo và công cụ/evidence audit local; bổ sung liên kết kết quả vào báo cáo bảo mật. Không chạy destructive integration fixtures trên database local hoặc production.

## Phiên bản đã kiểm tra

Repository: [MinhNguyen-code/Smart-AI-Helpdesk](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk).

| Phạm vi | SHA / trạng thái xác minh qua GitHub |
| --- | --- |
| `main` | `396ffa79e48e6d968457a3549d9097fb1f372265`; nhánh mặc định |
| [PR #2](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/pull/2), security/CI | `505baa8c443079ad49e1a81979f4c0c3cc10810d`; OPEN, chưa merge |
| [PR #3](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/pull/3), UI/nghiệm thu | `0888d74cefbfc959214b0e7f6ce3a12399fd943f`; draft OPEN |
| [PR #4](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/pull/4), SLA worker | `d107532d0382d37805f4ac653c9c059e1957317e`; draft OPEN |
| [PR #5](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/pull/5), phủ định từ khóa | `bd519b72d5e2d2468331ad943b0f6dc1e86cb452`; draft OPEN |
| [PR #6](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/pull/6), evidence vận hành | `c4074dde1cff434da1a3f9c6a5314392eef8b143`; draft OPEN |
| [PR #7](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/pull/7), phân tuyến | `f0f66a41aeb174fd53862c0808735aa3f4cddb6a`; draft OPEN, chưa merge |
| Worktree gốc | Vẫn `fix/security-ci-hardening@505baa8`; có các thay đổi local từ trước |

PR #7 chứa các phần tiền đề của #2–#6, hơn `main` 10 commit / 83 file thay đổi. Audit thực thi trên hai bản trích xuất Git theo đúng SHA của `main` và PR #7, không checkout hoặc thay index/worktree gốc. Lockfile hai bản giống nhau (`fb67a7637bd19068ae7f775e5de2edfdcd3c7771`); dùng dependencies đã cài tương ứng để chạy local, còn CI chạy `npm ci` mới.

Đối chiếu 88 file runtime/config/scripts/migration đã công bố của PR #7 với local: **không có khác biệt nội dung sau chuẩn hóa CRLF**, không thiếu file. Local còn helper `server/scripts/addRoutingTestAgents.js`, tài liệu thiết lập 26/11 và bản dự thảo workflow chưa công bố trong PR #7. Tên nhánh hiện tại của worktree không đại diện cho toàn bộ nội dung đang chạy.

Inventory: `main` 259 file Git, PR #7 307 file Git. Quét marker credential trên lần lượt 156/204 file văn bản hiện tại, không thấy Google client-secret/token/private-key theo các mẫu đã quét; không có `.env` thật hoặc `backup.sql` trong hai cây Git, `private-uploads` chỉ có `.gitkeep`. Đây là kiểm tra cây source hiện tại và mẫu xác định, không phải chứng nhận toàn bộ lịch sử Git không có secret. Nhánh UI thử nghiệm cũ `codex/defense-ui` được ghi nhận trong inventory; không thay đổi worktree tham chiếu của nhánh đó.

## Phát hiện cần xử lý

### F1 — P1: Vite dev server phục vụ file backup riêng tư khi chưa đăng nhập

Vị trí: [`vite.config.js:21–30`](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/blob/f0f66a41aeb174fd53862c0808735aa3f4cddb6a/vite.config.js#L21), áp dụng cả `main` và PR #7. Server lấy project root làm vùng phục vụ, không chặn `server/private-uploads/**`. `.gitignore` chỉ chặn Git, không tạo quyền truy cập HTTP. Backend có kiểm tra attachment, nhưng đường dẫn trực tiếp qua Vite bỏ qua backend.

Bằng chứng an toàn:

- Trên Vite local đang chạy, **HEAD** đến bản backup `environment.before` trả **200**, length **1.471 bytes**, bằng kích thước file; `database.sql` trả **200**, length **29.454 bytes**. Chỉ đọc headers, không GET/in nội dung backup thật. `.env` gốc trả 403; bản sao đổi tên không được mặc định bảo vệ tương tự.
- Trên bản PR #7 tạm, tạo canary không chứa secret dưới `server/private-uploads/.audit-synthetic/environment.before`: unauthenticated **GET 200**, body khớp canary. Không dùng nội dung bí mật để chứng minh.
- Probe file ảnh UUID không đuôi trả 500; không tính đó là bằng chứng tải ảnh thành công.

Ảnh hưởng đã xác minh giới hạn ở **dev server có thể truy cập được**, hiện dùng loopback. Không có bằng chứng đã bị bên ngoài đọc, và chưa kiểm tra cấu hình static server production. Cần deny toàn bộ thư mục backend/private uploads/backup khỏi Vite, đồng thời đặt backup ngoài web root được phục vụ; giữ cơ chế attachment có xác thực. Phải giữ các deny mặc định khi bổ sung cấu hình. Review này chưa áp dụng thay đổi đó.

### F2 — P1: Cài mới đúng hướng dẫn vẫn thiếu SLA P1 và P3

Vị trí: [`server/seeds/01_initial_data.js:9–15`](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/blob/f0f66a41aeb174fd53862c0808735aa3f4cddb6a/server/seeds/01_initial_data.js#L9), kết hợp [`migration priority`](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/blob/f0f66a41aeb174fd53862c0808735aa3f4cddb6a/server/migrations/20261112000003_expand_priority_levels.js#L8). Có trên cả `main` và PR #7.

Migration tạo P2/P4 trên schema rỗng. Seed chỉ thêm P1/P3 nếu toàn bộ bảng SLA rỗng, nên sau `db:migrate` rồi `db:seed` vẫn chỉ có P2/P4. Ticket thông thường mặc định P3 và sự cố P1 sẽ nhận **503 `SLA policy unavailable`** ở [`ticketRoutes.js:79–82`](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/blob/f0f66a41aeb174fd53862c0808735aa3f4cddb6a/server/src/modules/ticketRoutes.js#L79).

Đã chạy chính migration/seed đã công bố trên adapter Knex trong bộ nhớ: sau migrate `[P2,P4]`, sau seed vẫn `[P2,P4]`. Đây là tái hiện logic offline, không được gọi là lần cài mới MySQL local. CI có đoạn thêm P1/P3 riêng trước seed nên CI xanh không kiểm chứng đúng đường cài mới trong README. Database local hiện có đủ bốn policy và không bị lỗi này.

Cần seed idempotent theo từng priority còn thiếu, giữ policy Admin đã chỉnh, và thêm kiểm chứng schema rỗng → migrate → seed → tạo ticket mà không chèn bù từ workflow.

### F3 — P2: Không tìm/xem được ticket ngoài 30 bản ghi đầu qua danh sách

Vị trí: [`src/App.jsx:160–179`](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/blob/f0f66a41aeb174fd53862c0808735aa3f4cddb6a/src/App.jsx#L160), [`375–380`](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/blob/f0f66a41aeb174fd53862c0808735aa3f4cddb6a/src/App.jsx#L375). Backend hỗ trợ `page/search` nhưng giới hạn 30 mỗi trang; UI không gửi hai tham số này, không có chuyển trang và chỉ lọc/sắp xếp mảng vừa tải.

Tái hiện trên PR #7 bằng fixture 31 ticket: tải 30 card, tìm mã ticket thứ 31 cho 0 card; chỉ có request `/api/v1/tickets`, không request `search` hoặc trang 2, không có nút phân trang. Không insert dữ liệu thật. Việc này cũng làm bộ lọc ưu tiên/sắp SLA không đại diện toàn bộ hàng chờ. Mã nguồn `main` có cùng giới hạn UI.

Cần kết nối tìm kiếm/lọc/phân trang với API hoặc cơ chế tải toàn bộ có giới hạn phù hợp. Bộ đếm cần nói rõ số đang hiển thị và tổng số.

### F4 — P2: Link bỏ qua điều hướng che nút menu mobile khi được focus

Vị trí: [`src/styles/design-system.css:72–77`](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/blob/f0f66a41aeb174fd53862c0808735aa3f4cddb6a/src/styles/design-system.css#L72), cùng header [`AppShell.jsx`](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/blob/f0f66a41aeb174fd53862c0808735aa3f4cddb6a/src/components/AppShell.jsx#L96).

Ở viewport 390px, bấm Tab đưa focus vào `.skip-link`; link fixed tại top 12px, z-index 100 che tâm nút menu `(42,29.5)`. `elementFromPoint` trả `.skip-link`, bấm menu bị intercept và `aria-expanded` vẫn false. Bộ test mobile sẵn có cũng timeout vì cùng lý do. Đây là lỗi UI tái hiện được, không chỉ selector cũ. Cần bố trí link/menu không chồng vùng tương tác và giữ truy cập bàn phím.

### F5 — P2: CI xanh chưa bao gồm browser regression; nhiều test không khớp UI mới

[Workflow PR #7](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/blob/f0f66a41aeb174fd53862c0808735aa3f4cddb6a/.github/workflows/ci.yml) chạy unit/API, frontend, build, audit, MySQL; chưa chạy Playwright. Kết quả browser mới là **19 PASS / 6 FAIL trên 25 ca**:

| Suite | Kết quả | Nguyên nhân fail |
| --- | --- | --- |
| `routing.contract.spec.js` | **6/6 PASS** | Admin save/read/conflict, hàng chờ ngoài nhóm, automatic category, ba viewport |
| `wireframe.spec.js` + `design-review.spec.js` | **7/10 PASS** | Copy preview cũ; `.scene-static` đã bị thay bằng illustration SVG; lỗi menu F4 |
| `production-guard.spec.js` + `production-states.spec.js` | **6/9 PASS** | Text loading toolbar cũ; fixture thiếu availability endpoint tạo alert thứ hai và locator không đủ cụ thể; kỳ vọng `.scene-static`/3D cũ |

Năm failure về assertion/fixture cần được cập nhật theo hành vi đã duyệt, giữ kiểm tra loading/error/retry/accessibility thay vì xóa test. Failure thứ sáu là F4. Production guard chặn `?preview=1` trên bản build **PASS**. Chưa thể kết luận mọi browser flow đạt chỉ từ unit hoặc CI hiện tại.

Preview suite được chạy nguyên assertion trên Vite riêng port 5193, middleware chặn mọi `/api` thật; suite routing và production dùng fixture riêng. Lần dựng harness đầu gặp Windows short-path/allow-list và được loại khỏi kết quả sản phẩm; đã sửa đường dẫn canonical của harness, kiểm tra HTML 200 rồi chạy lại toàn bộ 10 ca. Không sửa app hoặc assertion để làm xanh.

## Khoảng trống ở nhánh mặc định

`main` chưa nhận PR #2: [`ticketRoutes.js:93–97` ở main](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/blob/396ffa79e48e6d968457a3549d9097fb1f372265/server/src/modules/ticketRoutes.js#L93) lọc nội dung comment public nhưng trả toàn bộ history, gồm metadata comment nội bộ. PR #2 đã có sửa và PR #7 kế thừa; CI mới kiểm chứng privacy trên bản ứng viên, **không biến `main` thành đã sửa**. Cần ưu tiên tích hợp bản bảo mật đã review cùng các thay đổi liên quan; chưa thực hiện merge trong lượt audit.

Tương tự, clone `main` không có chức năng routing mới. Không dùng trạng thái local hoặc draft PR làm bằng chứng rằng phiên bản mặc định đã phát hành đủ tính năng.

## Ma trận chức năng

| Chức năng | Bằng chứng và kết luận tại bản PR #7 |
| --- | --- |
| Google OIDC, allowlist, ba vai trò | Source kiểm tra state/nonce/PKCE, verified email, active/approved account, regenerate session. Google thật ba vai trò đã có báo cáo nghiệm thu 25/11; **không chạy lại Google thật trong audit 26/11**, không giả lập đăng nhập local. |
| END_USER tạo ticket, ảnh, quyền sở hữu | **PASS CI HTTP/MySQL**: classification, ownership, attachment, lifecycle; browser form contract PASS. Cài mới còn F2. |
| IT_AGENT nhận/ACK/phản hồi/resolve | **PASS CI** cho luồng ba trạng thái, quyền và version/concurrency; không nâng workflow năm trạng thái. |
| Chia ticket đúng nhóm/người | **PASS CI**: category/keywords, bốn nhóm, người active/available ít ticket mở nhất, tải toàn bộ nhóm, capacity, tie-break và loại reporter. Mơ hồ/xung đột chuyển review; hết người phù hợp vào TEAM_QUEUE. |
| Truy cập chéo nhóm | **PASS CI**: thấy hàng chờ public, chặn xử lý/ảnh/nội bộ trái quyền; restrictions vẫn giữ với ticket đã route khi tắt flag. |
| Admin phân tuyến | **PASS CI + browser contract**: sửa thành viên/tuyến/availability, chống stale version, reroute cần reason, không mất priority/SLA/status, chặn bỏ nhóm/thành viên đang có việc. |
| Rules và SLA P1–P4 | **PASS CI** CRUD/validation/phân quyền/persistence; seed cài mới FAIL theo F2, local đủ bốn policy. |
| Users/roles/active | **PASS CI** cho allowlist và thay quyền/active/CSRF; không gán fake Google identity. |
| Notifications, lịch sử, ảnh, phiên/restart | **PASS CI** cho recipient isolation/privacy và restart Express/session persistence. Google/restart local thật là bằng chứng 25/11 riêng; audit này không restart app local. |
| Dashboard/analytics | **PASS CI SQL** cho số liệu và quyền Admin; browser loading/error/retry cơ bản PASS. |
| Kanban/list/search/sắp SLA | Unit/basic browser PASS; **PARTIAL** vì F3, F4 và các assertion/fixture cũ F5. |
| SLA worker tự chạy | Logic/retry/deduplication **PASS unit + CI**. Process local hiện chạy `node server/src/index.js` không có `--with-sla-worker`; không thấy worker riêng. **Chưa hoạt động tự động ở phiên local hiện tại**; cần khởi động/supervise khi triển khai vận hành. Audit không tự bật worker ghi DB. |
| Email SMTP | Retry/outbox **PASS CI với sender giả**. SMTP thật chưa xác minh, tiếp tục để sau theo quyết định chủ dự án; 10 outbox local còn tồn tại. |
| Backup/restore, tải, uptime | **PASS trong phạm vi CI** ở phần dưới; chưa chứng minh full production recovery, tải thực hay uptime 99%. |
| PENDING_USER/CLOSED, alias/fuzzy, AI/LLM | Không thuộc runtime đã nghiệm thu. Workflow mở rộng còn draft không mount/migrate; classification hiện là rules/keywords có phủ định giới hạn, không phải LLM. |

## Kiểm thử mới đã hoàn tất

| Check | `main` đúng SHA | PR #7 đúng SHA |
| --- | --- | --- |
| Backend unit/API local | **22/22 PASS** | **36/36 PASS** |
| Frontend Vitest local | **4/4 PASS**, 3 file | **24/24 PASS**, 9 file |
| Production build local | **PASS** | **PASS** |
| Dependency audit, lockfile giống nhau | **0 vulnerability** tại lần audit | **0 vulnerability** |
| Browser | Không chạy lại suite trên main | **19/25 PASS**, chi tiết F5 |

Local backend được tách config-only với test port 3306; các unit/API có thể mở kết nối dùng port 1 trên snapshot không `.env`. HTTP tests được chạy với quyền loopback cần thiết, không đổi assertion. Không chạy `test:integration`, migration hoặc seed trên database local. `git diff --check main..PR7` PASS.

Đã chạy lại toàn bộ [Actions run **45598203904, attempt 2**](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/actions/runs/45598203904/attempts/2), đúng SHA `f0f66a4`, kết thúc **08:17:01 ngày 26/11/2026, giờ Việt Nam**:

- `unit-and-build`, job `139624547920`: **SUCCESS**, backend 36/36, frontend 24/24, build và audit PASS.
- `mysql-integration`, job `139624548303`: **SUCCESS**, **19/19 test, 0 fail**. Các test gồm transaction rollback, outbox fake send/retry, analytics/notifications, HTTP restart, session, rules/SLA, users, ticket lifecycle và routing parent/nine child cases.
- Upgrade **6 → 7 migrations**: ticket/comments/history cũ giữ nguyên, routing lịch sử null, migrate lặp lại no-op.
- CI routing chạy 18 create đồng thời, kiểm tra capacity/toàn cục và 200/409 với version cạnh tranh. Đây là dữ liệu synthetic trong CI, không tạo ticket local.
- Read smoke: 104 request sau 5 warmup, **0 lỗi**. Với concurrency 1/4/8, p95 lần lượt **6,038 / 14,475 / 15,215 ms**. Chỉ GET detail một ticket synthetic với MySQL, không đại diện write load, Google E2E hay công suất production.
- Restore sang **dịch vụ MySQL CI thứ hai mới**: **18 bảng**, schema/row hashes bằng nhau. Không kiểm tra khôi phục file attachment, secrets/cấu hình hoặc recovery production; không restore local.

Hai service không publish host port, không persistent DB volume; Node dùng network namespace của service. Schema/account CI vẫn đúng `smart_it_helpdesk_new_test`, `sih_new_test@127.0.0.1`, `sih_new_test_migrate@127.0.0.1`. Migration credentials được bỏ khỏi seed/test child processes, artifacts chỉ JSON không SQL dump. `targetPolicy.js` và các kiểm tra strict schema/`CURRENT_USER()` giữ nguyên. Rerun không cần thay/push workflow.

## Xác minh local chỉ đọc và bảo toàn

SELECT xác nhận `smart_it_helpdesk_new_dev` / `sih_new_app@127.0.0.1`, routing enabled, health/target/routingReady true. Có 8 users, 2 ticket đều RESOLVED, 2 comments, 15 history, 1 attachment, 10 notifications/10 outbox, 4 groups, 5 memberships, 4 routes, 4 SLA policies và 7 migrations. Năm hồ sơ TEST id 4–8 active IT_AGENT, chưa có Google identity: dùng để nhận phân công thử; không thể tự đăng nhập Google bằng domain giả. Không thêm account/role/session trong audit.

Root HEAD vẫn `505baa8`; index SHA256 vẫn `68916b573c0743de27047468f735f318f9b7e5ec35a0836c08cfe9d518df0d4f`; staged diff rỗng. Hash của **5 file Diagrams + 7 wireframe gốc** giữ nguyên. Không thay đổi thư mục reference hoặc worktree tham chiếu. Dev server phục vụ audit riêng đã dừng sau kiểm tra; API5000/frontend5173 gốc được giữ nguyên.

Evidence local: `work/github-audit-2026-11-26/` chứa manifest SHA, `static-source-audit.json`, `ci-attempt-2.json`, `fresh-install-sla-repro.json`, `browser-findings.json`, `mobile-focus-repro.json`, `local-read-only-state.json`, screenshots và failure contexts. Evidence về backup thật chỉ có headers/metadata, không lưu body secret; các artifact có đường dẫn local không được coi là nội dung đã công bố lên GitHub.

## Thứ tự xử lý đề xuất

1. Chặn private uploads/backup khỏi Vite và chuyển backup ngoài web root; kiểm chứng bằng canary, không dùng secret thật.
2. Sửa seed từng priority còn thiếu; kiểm tra fresh-install CI không có bước chèn bù.
3. Tích hợp thay đổi bảo mật đang chờ và review các PR tiền đề/phân tuyến theo một chuỗi rõ ràng. Chưa merge tự động vì đây là lượt audit.
4. Sửa phân trang/tìm kiếm toàn bộ hàng chờ, vùng focus/menu mobile; cập nhật browser contracts rồi đưa các suite thích hợp vào CI.
5. Nghiệm thu routing qua Google thật với IT_AGENT có identity và membership thật; hoàn thiện cách chạy SLA worker. Tiếp tục hoãn SMTP và AI đến sau ổn định MVP ba trạng thái; thu thập đủ bằng chứng vận hành trước khi tuyên bố uptime 99%.
