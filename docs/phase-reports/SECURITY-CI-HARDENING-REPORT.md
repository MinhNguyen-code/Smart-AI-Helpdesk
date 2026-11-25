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

## D. GitHub Actions CI (checkpoint 17/11/2026)

Workflow `.github/workflows/ci.yml` chạy khi PR vào `main` và push lên `main`, với quyền `contents: read`, Node 24, `npm ci`, `npm test` dưới `NODE_ENV=test`, frontend tests, production build, và `npm audit --audit-level=high`. Các bước bắt buộc không dùng `continue-on-error`. CI không dùng OAuth/SMTP credential thật.

Chưa có MySQL integration job: các test hiện tại viết/xóa fixture và có bài đổi SLA policy rồi khôi phục; cần service container, schema/account test chỉ thuộc CI và rà toàn bộ fixture/seed trước khi bật. `server/src/db/targetPolicy.js` hiện đòi `CURRENT_USER()` khớp account `@127.0.0.1`; kết nối qua Docker bridge trong runner phải được thiết kế và xác minh riêng trước khi mở rộng identity policy. **Chưa có bằng chứng GitHub Actions PASS ở thời điểm ghi báo cáo này.** `npm ci` cũng chưa được kiểm chứng trong runner sạch.

## E. Verdict và bước tiếp (checkpoint 17/11/2026)

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

## F. Isolated MySQL CI job — 25/11/2026

### Inspected scope and current PR

- GitHub metadata inspected for [PR #2](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/pull/2): **open, unmerged**, head `fix/security-ci-hardening` at `829e762ba5714755d9f3e612e53302ee760382b7`; local branch and HEAD match. No branch switch, fetch, reset, stash, commit, push or merge performed.
- Inspected `.github/workflows/ci.yml`, `knexfile.js`, `server/src/db/targetPolicy.js`, pool identity checks, database CLI, all six active migrations, reference seed, and all integration test files. Existing unrelated tracked/untracked application changes were retained. `Diagrams/` contains five files and `Wireframe/` seven original JPGs; neither directory was modified.
- Only this report and `.github/workflows/ci.yml` changed for this request. Database policy, application configuration, integration fixtures, active/pending migrations, seeds and package scripts remain unchanged.

### Job behavior implemented (runtime NOT VERIFIED)

- Added independent `mysql-integration` job on GitHub-hosted `ubuntu-latest`, timeout 20 minutes, inheriting `contents: read`. Existing PR/main triggers and `unit-and-build` job remain unchanged. There is no `continue-on-error` or database test skip added.
- Fresh `mysql:8.4` service with health check; no host port mapping, host database mount or persistent data volume configured. A separate `node:24-bookworm` test container shares the **service container network namespace** using `--network container:<service-id>`. Thus its `127.0.0.1:3306` targets that service, without the Docker bridge account mismatch. It does not use runner host networking. See [Docker networking](https://docs.docker.com/engine/network/) and [GitHub service lifecycle](https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers).
- Service-local schema `smart_it_helpdesk_new_test` and accounts `sih_new_test@127.0.0.1` / `sih_new_test_migrate@127.0.0.1` are disposable CI instances of the existing allowlisted names. Names are deliberately unchanged to preserve strict policy. CI uses explicit throwaway passwords, with no repository/environment secrets or local credentials. Root is used only through `docker exec` inside the service to provision accounts; application tests do not use root.
- Runtime grant: `SELECT, INSERT, UPDATE, DELETE` on that schema only. Migration grant adds `CREATE, ALTER, DROP, INDEX, REFERENCES` on that schema only; no global grants or grant option. Migration credentials are removed from seed and test subprocess environments.
- Explicit test host, port, schema and account variables are passed into the clean Node container. No host environment is forwarded wholesale; an unexpected root `.env` fails the step before installation/database commands. Upload fixtures use container-local `/tmp/helpdesk-ci-uploads`. No OAuth/SMTP credentials are supplied.
- Sequence: `npm ci --include=dev`; `npm run db:check:test` (runtime identity); `npm run db:migrate:test` (migration identity and all six active migrations); CI-only reference-data completion and normal seed using runtime account; `npm run test:integration`. Every pool still checks selected schema and exact authenticated `CURRENT_USER()` including `@127.0.0.1`; wildcard accounts remain rejected. No rollback/drop/truncate command is run by the workflow.
- Fresh-schema prerequisite found by source inspection: priority migration inserts P2/P4, while the seed only adds P1/P3 if the whole policy table is empty. CI therefore inserts the missing P1/P3 reference rows before invoking the existing seed for categories/rules. This runs only in the fresh service after runtime identity verification; production migration/seed behavior is unchanged.
- Existing `test:integration` serializes files with `--test-concurrency=1`. This matters because ticket/rule fixtures temporarily update shared SLA rows and restore them; fixtures also insert/delete synthetic rows and test transaction rollback. These writes are authorized only within the disposable CI service for this request.

### Exact test scope

At the inspected PR head, the integration glob contains **nine tracked files**: `database`, `emailOutbox`, `reportingApi`, `restartHttp`, `ruleApi`, `sessions`, `slaWorker`, `ticketApi`, and `userApi` (all `.test.js`). They cover transaction rollback, outbox retry/idempotence with a fake sender, SQL analytics and recipient isolation, HTTP restart persistence, rule/SLA permissions and persistence, session persistence/expiry, SLA breach deduplication, ticket lifecycle/ownership/attachments/internal-history privacy, and account role/active changes/CSRF/logout.

The local worktree additionally has untracked `pr2HistoryPrivacy.test.js` and `ticketWorkflow.test.js`, with opt-in environment gates. Those flags are not enabled by this change, those files are not part of the inspected PR head, and pending five-state migrations are not applied. If later added to the repository, the existing glob will discover them, but their opt-in scenarios are still outside this job's enabled scope. Local unit/frontend runs below include unrelated worktree changes and are not evidence for a clean PR checkout.

### Fresh local verification

| Check | Actual result on 25/11/2026 |
| --- | --- |
| `actionlint 1.7.7 -shellcheck='' -pyflakes='' .github/workflows/ci.yml` | **PASS**, exit 0, including after the final workflow edit. Official release downloaded into a temporary directory; ShellCheck/Pyflakes not available, so not claimed. |
| `bash -n` on both extracted workflow shell blocks and the inner container shell | **PASS**, all three exit 0. Parsing only; no Docker/SQL executed. |
| `node --input-type=module --check` on extracted CI seed JavaScript | **PASS**, exit 0; syntax only, no SQL executed. |
| Backend unit/API checks | **PASS**, 26/26 with `NODE_ENV=test`, explicit test account/schema and unused `127.0.0.1:1`; then config-only file **PASS**, 5/5 at port 3306 (it opens no DB connection). Total **31 pass / 0 fail** across two invocations. Readiness correctly returned unavailable; no local DB was queried or mutated. |
| Initial `npm.cmd test` attempt with test port 1 | Exit 1: 20 pass / 11 fail; sandbox blocked HTTP loopback (`EACCES`), and config assertion expects port 3306. The split rerun above allowed HTTP outside the sandbox while retaining port 1 for all connection-capable tests. No test assertion was changed. |
| `npm.cmd run test:frontend` | **PASS**, 6 files / 12 tests. |
| `npm.cmd run build` | **PASS**, Vite 7.3.8, 2042 modules transformed. |
| Scoped `git diff --check -- .github/workflows/ci.yml docs/phase-reports/SECURITY-CI-HARDENING-REPORT.md` | **PASS**, exit 0. |
| Whole-worktree `git diff --check` | Existing unrelated `src/components/SupportVisual.jsx:149` blank line at EOF; preserved. |
| `npm ci`, migrations, seeds and integration suite against the new MySQL service | **NOT VERIFIED locally**: Docker is not installed/available on this Windows execution host. No integration command, fixture SQL or cleanup apply was run against a local/non-CI database. |
| GitHub Actions execution of the new job | **NOT VERIFIED**: change remains local by request; no commit, push or dispatch. Historical CI results do not verify this new job. |

**Verdict: PARTIAL.** CI job and static checks are implemented; real MySQL service startup, SQL grants, fresh migrations/seeding, all nine integration tests and container teardown still require the first GitHub Actions run after owner review/publication. Existing test failures, if any on that run, must be investigated before claiming integration PASS. This change does not establish Google browser acceptance or production readiness.

## Routing extension — 25/11/2026, separate from the original PR #2 checkpoint

Current GitHub metadata rechecked: PR #2 remains open/unmerged at `505baa8c443079ad49e1a81979f4c0c3cc10810d`. Its earlier isolated service run [45523061343](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/actions/runs/45523061343) passed the original nine MySQL integration tests; the historical NOT VERIFIED section above predates that run. Draft #6 adds isolated read-load and database restore evidence, not local/production recovery.

New routing scope is described in [TICKET_ROUTING_SPEC.md](../TICKET_ROUTING_SPEC.md) and [the routing verification report](TICKET-ROUTING-2026-11-25.md). It adds a **separate CI-only guarded** upgrade rehearsal from the six-migration schema and `routingApi.test.js` (opt-in `RUN_ROUTING_DB=1` only inside the service-network Node container). The suite enables routing only in its own process; existing integration files retain the flag-off MVP behavior. Strict targetPolicy, exact `CURRENT_USER()` account checks, CI schema/accounts, no host DB ports/volumes and absence of `.env`/production secrets remain intact. Tests validate shared public queue plus group/assignee write restrictions, internal privacy, CSRF/version/availability and concurrent workload/capacity. The second fresh CI service also restores routing tables/rows; JSON artifacts exclude SQL dump and credentials. No local database migration, destructive integration, reset, restore or cleanup is authorized by these CI checks. No five-state migration is enabled. Exact run/head/results are recorded in the routing report after execution, rather than inferred from PR #2.

**Verified routing scope:** [PR #7](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/pull/7), source `ca527c645c212d6bc5e1d6431ea64047551eca2e`, [run 45596773838](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/actions/runs/45596773838): both jobs success; backend 36/36, frontend 24/24, build/audit success (0 vulnerabilities). MySQL **19/19, no skips**: nine original cases plus routing parent/nine child cases. Guarded six→seven migration preserves historical ticket/comments/history and null routing; concurrent 18 creates allocate 8/8 plus 2 queue at capacity 8; competing same-version claims and route/reassign produce 200/409. Restore compares schema/row hashes for **18 tables** including synthetic routing rows on the second isolated service. Five JSON artifacts uploaded (7 days); both containers/network removed successfully. Initial run 45595925615 found an inferred category persistence defect; fixed in source, assertions retained. Local UI fixture browser 6/6 is separate from MySQL/Google acceptance. No local schema or real memberships were changed, no strict identity check or reference file was modified, and no PR was merged. Detailed limits and metrics remain in the routing report.
