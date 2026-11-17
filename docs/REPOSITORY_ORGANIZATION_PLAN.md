# Kế hoạch tổ chức repository Smart IT Helpdesk

**Ngày kiểm kê:** 17/11/2026
**Phạm vi:** Bước 1, kiểm tra chỉ đọc đối với repository; tệp kế hoạch này là thay đổi duy nhất được tạo theo yêu cầu.
**Trạng thái:** ĐỀ XUẤT, chưa được chủ dự án duyệt để thực hiện Bước 2. Không tạo branch, `git mv`, sửa tài liệu khác, chạy test, migration, seed, commit hoặc push trong Bước 1.

**Ghi chú sau kiểm kê:** Chủ dự án đã phê duyệt Bước 2 giới hạn trong cuộc trao đổi ngày 17/11/2026. Các số liệu và đường dẫn cũ/mới dưới đây giữ nguyên như bản kế hoạch Bước 1; kết quả thực hiện và phép kiểm mới được ghi tại `docs/DAILY_PROGRESS.md`. Dòng trạng thái phía trên và kết luận “chờ duyệt” cuối tài liệu mô tả thời điểm Bước 1.

## 1. Nguyên tắc và kết luận

- Giữ project root `D:\Smart IT Helpdesk`. Không tạo repository lồng nhau.
- Giữ nguyên vị trí `src/`, `server/`, `e2e/`, `tests/`, `Diagrams/`, `Wireframe/`. Năm sơ đồ và bảy JPG là tài liệu gốc, không đổi tên, di chuyển, thay thế hoặc xóa.
- Giữ các migration, seed, SQL provisioning, test, ảnh và JSON bằng chứng nghiệm thu. Không động tới `.env`, credentials, uploads hoặc MySQL.
- Chỉ đề xuất **ba lần di chuyển tài liệu lịch sử** trong Bước 2. Không đề xuất xóa tệp nào. Mọi chỉnh sửa nội dung/đường dẫn ngoài kế hoạch này phải chờ phê duyệt Bước 2.
- Các báo cáo checkpoint phản ánh thời điểm được lập, không phải kết quả kiểm thử mới. Đặc biệt, ảnh preview/API fixture không chứng minh Google OIDC thật hoặc dữ liệu production.

## 2. Kiểm kê Git đầy đủ theo loại

Lệnh nguồn là `git ls-files` tại project root. Tám loại dưới đây **loại trừ nhau**; tổng là **258 tệp Git theo dõi** trước khi tạo tệp kế hoạch này. `git status --short --branch` trả về `## main...origin/main` và không có thay đổi khi bắt đầu kiểm kê. `git ls-files -s | Select-String '^160000'` không có kết quả (không có gitlink/submodule được theo dõi).

| Loại | Số tệp | Đường dẫn và nội dung đã kiểm kê |
|---|---:|---|
| Source và tài sản ứng dụng | 56 | `src/` (15 tệp không phải test), `server/src/` (20), `server/migrations/` (6), `server/seeds/` (1), `server/scripts/` (11), `server/private-uploads/.gitkeep`, `public/favicon.svg`, `index.html`. Bao gồm worker, kết nối DB, API, React, CSS, migration và script vận hành. |
| Configuration | 8 | `.env.example`, `.gitignore`, `knexfile.js`, `package.json`, `package-lock.json`, `postcss.config.js`, `tailwind.config.js`, `vite.config.js`. |
| Tests và cấu hình test | 30 | `server/tests/` (16), `src/features/*.test.jsx` (3), `tests/frontend/setup.js` (1), `e2e/` (6), `playwright.config.js`, `playwright.live.config.js`, `playwright.production.config.js`, `playwright.benchmark.config.js` (4). |
| Tài liệu và SQL tham chiếu | 32 | `AGENTS.md`, `Codex.md`, `README.md` (3); `docs/*.md` (12); `docs/phase-reports/*.md` (14); `docs/database/` (2, gồm SQL provisioning); `docs/references/wireframes_mapping.md` (1). |
| Ảnh chụp bằng chứng đang theo dõi | 62 | `docs/screenshots/` gốc (13), `acceptance-production/` (6), `design-review/` (15), `frontend-redesign/` (22), `live-api/` (6). Tổng 4.882.113 byte. |
| JSON benchmark đang theo dõi | 3 | `docs/benchmarks/kanban-production-fixture.json`, `kanban-test.json`, `readiness-production.json`. Tổng 2.510 byte; đây là bằng chứng có phương pháp/điều kiện đo khác nhau. |
| Skill bên thứ ba | 55 | `.agents/skills/oil-ui/` (54 tệp, 2.112.181 byte) và `skills-lock.json` (1). Gồm hướng dẫn, license, asset, script và test riêng của skill. |
| Tài liệu thiết kế gốc | 12 | `Diagrams/` (5: 3 PNG, 2 PlantUML) và `Wireframe/` (7 JPG). Tổng 638.850 byte. |
| **Tổng** | **258** | Có thể tái tạo danh sách đường dẫn chính xác bằng `git ls-files`. |

Các output cục bộ `dist/`, `node_modules/`, `test-results/`, `.oil-ui/`, `logs/` hiện tồn tại nhưng bị `.gitignore` loại khỏi Git; không thuộc 258 tệp trên. `server/private-uploads/` có `.gitkeep` theo dõi, còn file tải lên bị ignore. Không thao tác dọn các thư mục này.

### Cây tối thiểu cần giữ

```text
D:\Smart IT Helpdesk\
├── AGENTS.md, Codex.md, README.md, .env.example, package.json, package-lock.json
├── src/                  React, CSS, frontend tests
├── server/               Express, migrations, seeds, scripts, backend tests, workers
├── e2e/                  Playwright
├── tests/                Vitest setup
├── docs/
│   ├── *.md              đặc tả và tài liệu đang dùng
│   ├── database/         kế hoạch và SQL lịch sử
│   ├── references/       ánh xạ tới bảy ảnh gốc
│   ├── phase-reports/    báo cáo theo checkpoint
│   ├── screenshots/      ảnh bằng chứng theo ngữ cảnh chụp
│   └── benchmarks/       JSON bằng chứng hiệu năng
├── Diagrams/             giữ nguyên
├── Wireframe/            giữ nguyên
├── .agents/skills/oil-ui/ skill thiết kế đã ghim phiên bản
└── skills-lock.json
```

## 3. Bản đồ phụ thuộc đường dẫn đã kiểm tra

| Đường dẫn | Tham chiếu/nguồn ghi đã thấy | Quyết định |
|---|---|---|
| `Diagrams/`, `Wireframe/` | `AGENTS.md`, `Codex.md`, `README.md`, `docs/PROJECT_SPEC.md`, `docs/references/wireframes_mapping.md`, các báo cáo hình ảnh | **KEEP**; là nguồn gốc, không dùng đường dẫn giả `docs/references/wireframes/`. |
| `docs/API_SPEC.md` | `server/src/app.js:92` đưa ra đường dẫn tài liệu `/docs/API_SPEC.md`; `Codex.md`, báo cáo Day 3/4/6 | **KEEP**; không di chuyển đặc tả API. |
| `docs/DAILY_PROGRESS.md`, `docs/PROJECT_FOLDER_REVIEW.md` | `Codex.md:1754,1820`; `docs/IMPLEMENTATION_PLAN.md:54` tham chiếu folder review | **KEEP**; sửa số liệu cũ sau khi duyệt, không đổi đường dẫn. |
| `docs/phase-reports/` | `Codex.md`, `README.md`, `docs/DAILY_PROGRESS.md` | **KEEP**; lịch sử checkpoint cần truy xuất được. |
| `docs/screenshots/day7-*` | `e2e/wireframe.spec.js` ghi trực tiếp; báo cáo Day 4–7 và frontend review tham chiếu | **KEEP**; đổi chỗ sẽ làm hỏng đường dẫn ghi và chứng cứ. |
| `docs/screenshots/design-review/` | `e2e/design-review.spec.js` ghi trực tiếp; frontend review và final acceptance tham chiếu | **KEEP**. |
| `docs/screenshots/live-api/` | `e2e/live-api.spec.js` ghi trực tiếp; frontend review và final acceptance tham chiếu | **KEEP**; fixture dùng MySQL test, không xem là Google E2E. |
| `docs/screenshots/acceptance-production/` | `e2e/production-states.spec.js`, `e2e/production-benchmark.spec.js` ghi trực tiếp; final acceptance continuation tham chiếu | **KEEP**; fixture API của bundle production. |
| `docs/screenshots/frontend-redesign/` | `docs/FRONTEND_VISUAL_AUDIT.md` tham chiếu bộ before/after; chưa thấy script ghi bộ này trong các test Playwright hiện tại | **KEEP** để bảo toàn lịch sử so sánh. |
| `docs/benchmarks/` | `e2e/live-api.spec.js:202-204`, `e2e/production-benchmark.spec.js:6,21`, `server/scripts/benchmarkReadiness.js:35-36` ghi file; `docs/TEST_PLAN.md`, báo cáo nghiệm thu tham chiếu | **KEEP**; không gộp số đo fixture và MySQL. |
| `.agents/skills/oil-ui/`, `skills-lock.json` | Không tìm thấy import/reference từ React, Express, `package.json` hoặc Playwright; `.gitignore` chỉ bỏ qua `.oil-ui/`. Skill được tài liệu kiểm kê pre-push nêu rõ. | **KEEP** tạm thời; đây là phụ thuộc quy trình thiết kế của agent, không phải runtime Node. |

Đã tra cứu bằng `rg -n` trong JS/JSX/JSON, Markdown và các file cấu hình/test. Với ba tệp đề xuất di chuyển ở mục 5, tìm tên chính xác trên toàn repository: `docs/FRONTEND_VISUAL_AUDIT.md` chỉ xuất hiện thêm ở `docs/FRONTEND_REDESIGN_REPORT.md:13`; hai tên còn lại không có tham chiếu bằng đường dẫn. Không thấy liên kết tương đối tới tài sản cục bộ trong ba báo cáo; các đường dẫn ảnh là chuỗi từ project root. Việc rà soát này không phải phép kiểm tự động toàn bộ liên kết Markdown/URL sau di chuyển; Bước 3 phải quét lại.

## 4. Trùng lặp, tài liệu cũ và giá trị bằng chứng

| Nhóm | Kết quả kiểm kê | Hướng xử lý đề xuất sau phê duyệt |
|---|---|---|
| 62 PNG screenshot | SHA-256 có **41 hash duy nhất**; 21 bản là nội dung trùng trong các mốc chụp khác nhau. Ví dụ `day7-01-login.png`, `design-review/desktop/01-login.png`, `frontend-redesign/after/desktop/01-login.png` và `frontend-redesign/before/01-login.png` có cùng hash. Hai ảnh Kanban mang nhãn tải 30 và 3000 ticket trong `acceptance-production/` cũng cùng hash. | Giữ toàn bộ; không coi ảnh trùng là tệp có thể xóa, vì tên/thư mục biểu thị mốc và điều kiện nghiệm thu. Trong báo cáo sau cần phân biệt ảnh layout/fixture với dữ liệu thật. |
| `docs/FRONTEND_DESIGN_REVIEW.md`, `FRONTEND_REDESIGN_REPORT.md`, `FRONTEND_VISUAL_AUDIT.md` | Chồng lấn phạm vi frontend nhưng có ngày, phương pháp và kết quả khác nhau. Không có hai Markdown trùng byte (28 Markdown dưới `docs/`, 0 cặp hash trùng). | Chuyển cả ba báo cáo có ngày sang `phase-reports/`; **không** gộp/xóa. `FRONTEND_DESIGN_SYSTEM.md` vẫn là tài liệu thiết kế hiện hành ở `docs/`. |
| `docs/PROJECT_FOLDER_REVIEW.md` | Bản sơ bộ ngày 12/11 ghi 3 migration và một tập screenshot ít hơn; hiện có 6 migration và 62 screenshot. `Codex.md` yêu cầu đường dẫn cố định này. | Giữ đường dẫn; sau phê duyệt thêm ghi chú “bản sơ bộ/lịch sử” và liên kết kế hoạch hiện tại, không ghi đè số liệu lịch sử thành kết quả test mới. |
| `docs/DAILY_PROGRESS.md` | Dòng “Tiếp tục nghiệm thu 17/11” ghi browser preview 9/9, production 7/7. Báo cáo kiểm kê pre-push sau đó ghi 10/10 và 9/9. `docs/FRONTEND_REDESIGN_REPORT.md` ghi production 8/8 tại thời điểm riêng. | Sau phê duyệt gắn nhãn thời điểm cho từng snapshot, trỏ tới checkpoint mới nhất; chỉ cập nhật kết quả hiện hành sau khi chạy lại test. |
| `README.md`, `docs/references/wireframes_mapping.md` | Cây ví dụ trong README liệt kê `src/hooks/`, `src/utils/` chưa có trong Git. Mapping viết “bám sát 100%” trong khi báo cáo visual audit ghi các khác biệt có chủ ý và chưa đo pixel. README vẫn trỏ final acceptance gốc, chưa nêu bản continuation/pre-push mới hơn. | Sau phê duyệt sửa cách diễn đạt/cây tài liệu cho khớp hiện trạng và dẫn đúng báo cáo; không đổi yêu cầu gốc trong `Codex.md`. |
| `docs/phase-reports/` | Các số test khác nhau theo Day và thời điểm. `PRE-PUSH-AUDIT-2026-11-17.md` ghi lần kiểm tra sau: backend 22/22, frontend 4/4, preview 10/10, production fixture 9/9, build PASS; full MySQL integration không chạy lại trong lần đó. | Giữ tất cả như lịch sử có ngày. Không suy ra test đã PASS trong lượt kiểm kê này: **Bước 1 không chạy test**. |

### Đánh giá riêng skill và lockfile

`.agents/skills/oil-ui/SKILL.md` khai báo workflow UI/UX; `.agents/skills/oil-ui/LICENSE` là MIT. `skills-lock.json` (schema version 2) ghi nguồn `oil-oil/oil-ui`, commit cố định và `computedHash`; không chứa mật khẩu trong nội dung đã xem. Thư mục skill có 54 tệp, gồm asset, script, test, README đa ngôn ngữ và workflow riêng; khoảng 2,11 MB. Nó không nằm trong đường import/runtime ứng dụng nhưng có giá trị tái lập quy trình thiết kế và khả năng được agent tự phát hiện tại `.agents/skills/`. **Không xóa, di chuyển hoặc thay thế lockfile/skill trong đề xuất này.** Nếu chủ dự án muốn tách vendor skill về sau, cần checkpoint riêng để kiểm phiên bản, license, cách cài và khám phá skill trên máy khác.

## 5. Đề xuất đường dẫn cũ → mới cho Bước 2

Chỉ ba lần `git mv` sau đây được đề xuất. Bước 2 **chưa được phép bắt đầu**. Tên file giữ nguyên để giảm thay đổi; `phase-reports/` đã tồn tại.

| Đường dẫn hiện tại | Đường dẫn đề xuất | Lợi ích | Phụ thuộc và rủi ro | Hoàn tác |
|---|---|---|---|---|
| `docs/FRONTEND_DESIGN_REVIEW.md` | `docs/phase-reports/FRONTEND_DESIGN_REVIEW.md` | Đưa báo cáo ngày 16/11 ra khỏi nhóm đặc tả đang dùng. | Không thấy reference nội bộ bằng tên file; link bên ngoài Git có thể đang dùng URL cũ. Nội dung tham chiếu ảnh từ project root, cần quét lại sau move. | `git mv` ngược về đường dẫn cũ; xác nhận `git diff --check` và tham chiếu. |
| `docs/FRONTEND_REDESIGN_REPORT.md` | `docs/phase-reports/FRONTEND_REDESIGN_REPORT.md` | Đặt báo cáo cải tiến ngày 17/11 cạnh các checkpoint khác. | Trong nội dung có đường dẫn cũ tới `FRONTEND_VISUAL_AUDIT.md`; phải cập nhật sang đường dẫn mới. Link bên ngoài có thể cũ. | `git mv` ngược; khôi phục reference bằng chỉnh sửa có kiểm tra. |
| `docs/FRONTEND_VISUAL_AUDIT.md` | `docs/phase-reports/FRONTEND_VISUAL_AUDIT.md` | Gom bằng chứng đối chiếu có ngày vào lịch sử nghiệm thu. | `docs/FRONTEND_REDESIGN_REPORT.md:13` tham chiếu đường dẫn này; phải cập nhật đồng thời. Không di chuyển ảnh `frontend-redesign/`. | `git mv` ngược; khôi phục reference tại redesign report. |

**Không có đường dẫn cũ → mới** cho source, config, test, screenshot, benchmark, skill, `Diagrams/`, `Wireframe/`, `docs/PROJECT_FOLDER_REVIEW.md` hoặc tài liệu đặc tả. Việc sửa các mô tả cũ trong README/DAILY_PROGRESS/mapping là đề xuất nội dung tài liệu riêng, cần chủ dự án duyệt cùng Bước 2; không thay số liệu test nếu chưa chạy lại.

## 6. Phụ thuộc triển khai, kiểm chứng và rollback

1. Chủ dự án duyệt chính xác ba đường dẫn ở mục 5 và phạm vi sửa reference/tài liệu liên quan. Khi đó mới tạo branch `chore/repository-organization` từ trạng thái Git đã kiểm tra. Không push trực tiếp `main`.
2. Ghi lại `git status --short --branch`, `git ls-files` count và commit gốc. Dùng `git mv` đúng ba tệp; cập nhật reference trong báo cáo redesign và quét toàn bộ `rg` cho cả đường dẫn cũ/mới. Không thay logic, API, schema hoặc credentials.
3. Chạy `git diff --check`, `npm.cmd test`, `npm.cmd run test:frontend`, `npm.cmd run build`. Chỉ chạy browser preview/production fixture không ghi SQL thật sau khi xác nhận cấu hình; **không** chạy `test:browser:api`, full MySQL integration, migration/seed hay benchmark có fixture SQL ghi/xóa nếu chưa có phê duyệt SQL riêng.
4. Playwright preview/production fixture hiện ghi đè ảnh PNG Git theo dõi, và benchmark có thể ghi JSON theo dõi. Sau test, so sánh `git status` và hash; chỉ giữ thay đổi ảnh/JSON khi có mục đích và được review. Không tự xóa bằng `git clean -fdx`, không `reset --hard`.
5. Xuất before/after count và path diff, danh sách reference cũ còn sót, kết quả từng lệnh test và giới hạn của fixture. Sau đó chuẩn bị PR review từ branch đã duyệt; không push trực tiếp `main` hoặc tự merge.
6. Nếu move gây hỏng link hoặc test, `git mv` ngược ba tệp, sửa lại reference đã đổi, kiểm `git diff --check` và `git status`. Vì chưa có thay đổi business logic/DB, rollback chỉ ở Git working tree; không dùng lệnh reset phá hủy.

**Mốc đếm:** trước khi tạo kế hoạch là 258 tệp Git theo dõi. Tệp kế hoạch hiện là tệp mới chưa commit; nếu chủ dự án duyệt và đưa kế hoạch vào Git, số tệp theo dõi sẽ là 259. Ba lần di chuyển chỉ đổi path, không đổi số lượng. Chưa có phép đo before/after triển khai vì Bước 2 chưa diễn ra.

## 7. Lệnh kiểm kê và giới hạn bằng chứng

| Lệnh đọc đã dùng | Kết quả chính |
|---|---|
| `git status --short --branch` | `## main...origin/main`, sạch trước khi viết kế hoạch. |
| `git ls-files` và phân nhóm đường dẫn | 258 tệp; tổng các nhóm ở mục 2 bằng 258. |
| `git ls-files Diagrams Wireframe` | 5 sơ đồ và 7 ảnh gốc. |
| `git ls-files -s | Select-String '^160000'` | Không có gitlink/submodule. |
| `rg -n` đường dẫn trong `src/`, `server/`, `e2e/`, `tests/`, config, README, Codex và `docs/` | Xác định writers và reference ở mục 3; một reference tới tệp frontend dự định chuyển. |
| `Get-FileHash -Algorithm SHA256` trên 62 PNG | 41 nội dung duy nhất; không dùng hash để xóa chứng cứ. |
| `Get-FileHash -Algorithm SHA256` trên 28 Markdown dưới `docs/` | Không có cặp trùng byte. |
| `Get-Content` các config Playwright, package scripts, tài liệu và skill lock | Xác định test preview/production fixture khác live API/MySQL; skill không là phụ thuộc runtime. |

**Chưa chạy test/build/SQL hoặc kiểm tra link ngoài Git trong Bước 1.** Số test được nêu ở mục 4 là số **được báo cáo trong tài liệu lịch sử**, không phải kết quả xác minh mới. Trạng thái cho phép thực hiện Bước 2: **CHỜ CHỦ DỰ ÁN DUYỆT**.
