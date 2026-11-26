# Sửa F1–F5 và khảo sát deployment — 26/11/2026

**PASS cho kiểm tra local đã nêu; PARTIAL cho CI của source mới và deployment.** Owner đã đồng ý sửa toàn bộ F1–F5, sau đó tìm hiểu deploy. Không commit/push/merge, không ghi fixture/migrate/seed vào database local, không thuê host hoặc deploy thật.

## Phạm vi sửa

| Finding | Thay đổi | Xác minh |
| --- | --- | --- |
| F1 — backup/backend bị Vite phục vụ | `vite.config.js` dùng allowlist frontend entry/src/public/dependencies và giữ/bổ sung deny defaults cho secret, backend, work, Git, CI evidence. Backups giữ nguyên trên đĩa nhưng nằm ngoài cây Vite cho phép phục vụ; không di chuyển/xóa dữ liệu để sửa quyền HTTP. | Canary private GET/plain/raw/url/import và `@fs` đều 403; fake env canary 403; real backup config/SQL, `.env`, backend source **HEAD 403**, frontend 200. Không GET secret backup body. |
| F2 — seed thiếu P1/P3 | Insert P1–P4 idempotent với unique priority/on-conflict ignore; không ghi đè target/active flag đã chỉnh. Workflow bỏ đoạn chèn bù P1/P3, dùng CLI seed thật sau migrate. | Hai unit regressions PASS: bắt đầu với P2/P4, seed thiếu P1/P3; seed lặp giữ policy Admin inactive/custom. Real SQL fresh-seed/HTTP test đã thêm cho CI, chưa chạy ở source mới. |
| F3 — UI chỉ tìm 30 ticket đầu | API validate search/priority/sort/page, lọc và sort toàn bộ tập được phân quyền trước limit/offset; `total` sau lọc. UI có phân trang, counter hiện/tổng, search debounce 250ms, reset trang khi đổi điều kiện, query không bị mất khi global search chuyển từ overview sang Kanban. Preview vẫn lọc trong bộ nhớ và giữ thay đổi trong phiên. | SQL compilation unit giữ ownership + grouped OR và order trước pagination; hai production browser regressions tìm được ticket thứ 31, chuyển trang, lọc P1 và sort SLA toàn cục qua query; global search giữ từ khóa. |
| F4 — skip link che menu | Dời vị trí link khi focus xuống dưới header, giữ semantics/focus/keyboard. | Existing mobile test giữ nguyên thao tác Tab → click menu → close → form validation và PASS; không dùng force-click hoặc bỏ assertion. |
| F5 — browser suite lệch UI và chưa có CI | Cập nhật copy/illustration/loading/availability fixtures và server-filter contract; giữ loading/error/retry/production guard/focus assertions. Browser configs dùng port riêng, không start backend/reuse live server; Windows dùng Edge, Linux dùng Chromium. Thêm `browser-regression` job và script routing. | 28/28 browser local PASS. YAML parse PASS, ba job, browser không có DB service, MySQL vẫn không publish port. GitHub job mới chưa chạy vì chưa publish. |

File mới chính: `server/src/modules/ticketListQuery.js`; unit `referenceSeed.test.js`, `ticketListQuery.test.js`; CI-only integration `setupAndTicketList.test.js`; browser `private-files.spec.js`, `ticket-pagination.spec.js`, `previewFixture.js`. Không mount workflow năm trạng thái, không chạy migration số mới, không thay `targetPolicy.js`.

## Kiểm thử và giới hạn chính xác

Kiểm thử dùng snapshot source-only tại `work/stabilization-2026-11-26/test-snapshot.json`; không copy `.env`, database, upload thật hoặc backup. Dependencies trỏ tới bộ đã cài theo lockfile hiện hữu. Không gọi đây là source đã commit/PR head mới.

| Check | Kết quả |
| --- | --- |
| Backend unit/API trừ config, `NODE_ENV=test`, `DB_TEST_PORT=1` | **40/40 PASS**; readiness unavailable là dự kiến, không kết nối DB thành công |
| Config-only, port 3306, không tạo kết nối | **5/5 PASS** |
| Backend tổng ở source local tổng hợp | **45/45 PASS**; gồm 5 pure unit cases draft workflow có sẵn, không bật runtime/migration mở rộng |
| Seed + query + CI guard focused regression | **5/5 PASS**; CI guard được chạy lại PASS sau rà kích thước fixture code 32 ký tự và cleanup `session_id` |
| Frontend, `npm.cmd run test:frontend -- --maxWorkers=2` | **9 files / 24 tests PASS** |
| Production build | **PASS**, 2040 modules |
| `npm.cmd run test:browser` | **11/11 PASS**: original preview/accessibility + private-file canaries |
| `npm.cmd run test:browser:routing` | **6/6 PASS**, synthetic API fixtures |
| `npm.cmd run test:browser:production` | **11/11 PASS**: existing states/guard + two pagination/search regressions |
| Browser tổng | **28/28 PASS** |
| Workflow YAML parse bằng temporary `js-yaml` | **PASS**; không sửa dependency/lockfile để thêm parser |
| Scoped whitespace/syntax checks | **PASS** |
| MySQL integration cho code mới / GitHub CI mới | **CHƯA CHẠY**: Docker không có trên execution host, không publish source theo phạm vi đã chọn. Không thay bằng test ghi vào DB local. CI thành công trước đó tại `f0f66a4` không chứng minh source sửa này. |

Lần frontend đầu chạy song song nhiều browser có một timeout lazy dashboard; chạy riêng dashboard 3/3 PASS, sau đó full suite với hai worker 24/24 PASS, giữ nguyên assertions dashboard. Lần browser đầu đã lộ hai giả định fixture sai trong bản test mới: `.env` không tồn tại bị SPA fallback 200 và illustration cố ý ẩn trên mobile. Đổi sang **file canary có thật không chứa secret** và assert layout mobile/desktop đã duyệt; chạy lại đầy đủ suite 11/11. Không che failure bằng retry tự động, force-click, skip test hoặc nới assertion lỗi chức năng.

Ca MySQL mới chỉ được bật ở service CI có đủ guard trước DB imports; unit guard kiểm tra invocation local bị từ chối. Ca này xác minh đủ bốn SLA, rollback một chỉnh policy Admin synthetic, tạo P1/P3 qua HTTP rồi test ownership/search/page/priority/SLA trên hơn 30 rows. Cleanup chỉ synthetic IDs trong CI. Các credentials migration vẫn bị loại khỏi seed/test child processes; hai MySQL service và exact schema/account/host giữ nguyên.

Đã xem ảnh production Kanban 390px: ba cột xếp dọc theo layout hiện tại, search/filter và các nút Trang trước/Trang tiếp nằm trong viewport. Suite kiểm tra thêm 1440/1280/950/768/390px; ảnh không chứng minh Google/routing E2E thật.

## Runtime local và bảo toàn

- API cũ PID 5020 đã được xác minh command line rồi restart riêng bằng `node server/src/index.js`, không bật SLA/email worker hoặc chạy database command. API5000 readiness 200, frontend5173 200, anonymous filtered ticket request 401.
- SELECT trước/sau: exact `smart_it_helpdesk_new_dev` / `sih_new_app@127.0.0.1`; users **8**, tickets **2 đều RESOLVED**, comments **2**, history **15**, attachment **1**, notifications/outbox **10/10**, groups **4**, memberships **5**, routes **4**, SLA **4**, migrations **7**. Các count, state, priority và hồ sơ TEST đã đọc bằng nhau trước/sau. Không coi kiểm tra count là hash toàn bộ dữ liệu hoặc nghiệm thu Google mới.
- Không chạy seed mới trên local. File backup SQL/config/upload, `.env`, ba Google identities, năm hồ sơ TEST và memberships giữ nguyên; các đường backup thật chỉ được probe HEAD.
- `targetPolicy.js` giống nguyên blob `46331350b1842fad32976bc0f917da3de1515c68` đã có. Root vẫn `fix/security-ci-hardening@505baa8`; index giữ hash trước sửa; staged diff rỗng. References 5 diagrams/7 wireframes được đối chiếu hash. Không đổi thư mục tham chiếu hoặc worktree khác.
- Snapshot/copy nguồn trước sửa ở `work/stabilization-2026-11-26/before/` giữ các thay đổi local có sẵn để review; không reset/stash/checkout. Các server browser thử nghiệm đã tự dừng, giữ API và Vite gốc đang chạy.

## Deployment research

Đã đối chiếu tài liệu và giá chính thức của DigitalOcean, Railway, Render, Vite, Express session/proxy, Nginx và Google OAuth. [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) có bảng chi phí, sơ đồ, các bước deploy và tham số cấu hình.

Đề xuất VPS 2 GiB làm mốc đo tải cho MVP, cùng domain HTTPS, static `dist/`, API/SLA/MySQL và ảnh private bền vững. Đây là lựa chọn kiến trúc, không phải chứng minh chịu tải/uptime. Trước deploy cần production target/account mới giữ strict identity, hỗ trợ production trong config/CLI, trusted reverse proxy + secure cookie và kiểm soát cổng/bind/storage. Source chưa có đủ các cấu hình này; không lách guard hoặc dùng development DB local cho website public. SMTP tiếp tục để sau. Chưa tạo tài nguyên cloud, mua dịch vụ, đổi DNS/OAuth hoặc bật auto-deploy.

**Bước kế tiếp:** review/publish nhóm sửa khi có yêu cầu, chạy CI ba job trên đúng commit mới, rồi chuẩn bị production sau khi chốt provider/domain. `main` và các PR GitHub cũ chưa được cập nhật bởi lượt sửa local này.
