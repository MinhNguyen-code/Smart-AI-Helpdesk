# Phân tuyến theo nhóm và tự phân công — 25/11/2026

**PASS trong phạm vi code + CI/fixture UI; PARTIAL cho rollout/nghiệm thu Google routing local. Local chưa bật hoặc migrate.**

Chủ dự án chọn tự giao cho kỹ thuật viên đang nhận việc có ít ticket mở nhất, cho phép IT_AGENT đọc hàng chờ chung nhưng chỉ xử lý trong nhóm. Đặc tả đầy đủ tại [TICKET_ROUTING_SPEC.md](../TICKET_ROUTING_SPEC.md).

## Đã triển khai

- Migration số 7 thêm bốn bảng cấu hình và ba trường nullable/index/FK tickets; không backfill, giữ ba trạng thái MVP, từ chối down phá tuyến.
- Phân loại category/keyword tiếng Việt xác định được; auto category khi có một dấu hiệu rõ; mơ hồ/xung đột về hàng chờ điều phối. Chọn người active đúng nhóm đang nhận việc theo tải OPEN/IN_PROGRESS toàn hệ thống, giới hạn và tie-break ổn định.
- Transaction khóa cấu hình chung trước ticket, READ COMMITTED bảo vệ phân bổ đồng thời; version/CSRF/role/membership guards; history/audit và notification/outbox cùng transaction.
- Quyền đọc queue công khai; xử lý dành cho người phụ trách đúng nhóm/Admin; privacy internal history/evidence; SLA notification chỉ tới nhóm phụ trách/Admin. Tắt cờ không nới quyền ticket đã routed.
- Admin `/routing`: bản nháp bốn nhóm, thành viên, availability, tải, category→unit/keywords; agent tự đổi nhận việc; Kanban nhãn/lọc server; detail hiển thị nhóm, quyền và chuyển tuyến có lý do. Không tự gán tài khoản thật vào nhóm.
- CI-only upgrade rehearsal và HTTP/MySQL routing suite. Mở rộng restore fixture để có dữ liệu thực trong bốn bảng mới và routed ticket.

## Kiểm chứng cục bộ đã có

| Check | Kết quả |
| --- | --- |
| Unit policy phân tuyến | 5/5 PASS |
| Guard CLI/test từ chối non-CI trước DB imports | 1/1 PASS |
| Frontend routing RTL | 8/8 PASS |
| Backend unit/API offline | 35/35 PASS, chưa gồm guard vừa thêm; config-only 5/5 PASS riêng. Test có kết nối dùng MySQL port 1 đóng; không fixture/migrate local. |
| Frontend trước khi thêm routing RTL | 8 files / 15 tests PASS; lần cuối toàn bộ/snapshot sẽ ghi tiếp dưới đây |
| Build | PASS, trước các chỉnh cuối; sẽ kiểm lại snapshot cuối |
| Routing MySQL local | SKIP theo guard, đúng yêu cầu; không được tính PASS |

Lần đầu API test bị EACCES loopback trong sandbox; chạy lại được cấp quyền loopback với MySQL port 1 và PASS. Không sửa assertion để che lỗi. Test matcher RTL và child Node test-context đã được sửa; các nhóm tương ứng đã chạy lại PASS.

## Git và rollout

Giữ nguyên root `fix/security-ci-hardening@505baa8`, root index và mọi thay đổi ngoài phạm vi. Nhánh routing mới sẽ tích hợp code đã tách ở draft #3 UI, #4 worker, #5 priority và #6 CI evidence; PR #2 chưa merge. Đây là snapshot để kiểm chứng kết hợp các dependency, không merge main thay chủ dự án. Không đưa pending five-state migration/module, screenshots cá nhân, `.env`, private uploads, monitoring logs hoặc reference directories vào commit.

Local `.env`, database dev/test, reference `Diagrams/`/`Wireframe/` và `targetPolicy.js` giữ nguyên. Bước bật local còn cần duyệt migration cụ thể và cấu hình thành viên thực tế; chưa có nghiệm thu Google routing hoặc uptime/accuracy mới.

## Kết quả cuối snapshot/CI

- Draft [PR #7](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/pull/7); prerequisite commit `9b6d55890b2c58e9735bdb42cfddd9274e71731d` tập hợp nguyên các nhóm nguồn đã xuất bản, feature commit ban đầu `7c9582cc5276f924d87e4f7b71fa09e6c338c39f`. Root branch/HEAD/index giữ nguyên.
- Snapshot sạch `7c9582c`: backend offline **31/31** + config-only **5/5**, frontend **23/23**, production build, actionlint và diff whitespace **PASS**. Snapshot không có `.env`; không mở kết nối DB thành công.
- CI lần đầu [45595925615](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/actions/runs/45595925615): unit/build/audit **PASS**. MySQL upgrade preservation **PASS** (6→7 migrations, dữ liệu cũ nguyên, routing null, latest lần hai no-op); integration **16 pass / 2 fail** (một assertion auto category và parent của nó). Các child RBAC/privacy, reroute/SLA, availability, concurrency và SLA recipient đều PASS; restore chưa chạy do fail ở integration. Đã sửa nguyên nhân: decision có category suy ra nhưng initialRouting chưa đưa category_id vào INSERT. Assertion không bị nới.
- Browser UI fixtures lần đầu phát hiện auto category không được chọn khi capability đến muộn; đã remount riêng select theo capability và thêm RTL regression. Ca status dùng locator theo role/name đúng accessibility tree, vẫn assert disabled.
- Kiểm lại sau sửa: routing RTL **9/9 PASS**; `npx.cmd playwright test --config=playwright.routing.config.js` **6/6 PASS**. API được intercept hoàn toàn, không khởi động backend/kết nối DB/Google. Đã tự xem ảnh Admin desktop/mobile và detail agent ngoài nhóm; 1440×900, 768×1024, 390×844 không tràn ngang; lưu rồi tải lại đọc lại membership, conflict giữ draft. Evidence local: `docs/screenshots/ticket-routing-2026-11-25/`. Không coi fixture browser là Google/MySQL E2E.
- Bổ sung ca IT_AGENT tự báo sự cố không được tự nhận hoặc tự đáp ứng first-response SLA, tải xuyên nhóm và race route/reassignment.

### CI sau sửa đã xác minh

Nguồn kiểm chứng: head `ca527c645c212d6bc5e1d6431ea64047551eca2e`, [CI run 45596773838](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/actions/runs/45596773838). Cả hai job completed/success; MySQL job `139144795650`, unit/build job `139144795964`.

| Phạm vi | Kết quả đã đọc trong log |
| --- | --- |
| Backend unit/API | **36 pass / 0 fail** trên CI; các draft backend workflow năm trạng thái không có trong snapshot này |
| Frontend | **24/24**, 9 files; snapshot sạch local cùng head cũng **24/24** và build PASS |
| Build/dependency audit | **PASS**, **0 vulnerabilities** |
| MySQL identities | MySQL 8.4.13; `smart_it_helpdesk_new_test`, runtime `sih_new_test@127.0.0.1`, migration `sih_new_test_migrate@127.0.0.1`; không nới policy |
| Upgrade rehearsal | **PASS** 6→7; mọi trường ticket cũ, comments/history giữ nguyên; routing nullable null; gọi latest lần hai không thêm migration |
| Integration | **19 pass / 0 fail / 0 skipped** = 9 ca legacy + routing parent và 9 child scenarios. Không phải 19 luồng Google |
| Phân bổ đồng thời | 18 HTTP tạo ticket: 8 giao A, 8 giao B, 2 chờ nhóm ở capacity 8. Hai self-claim cùng version: 200/409; route và reassign cùng version: 200/409; không người ngoài nhóm hoặc giao quá tải. Đây là invariant fixture, chưa phải đo công suất production |
| Tải đọc HTTP/MySQL | 104 mẫu đo + 5 warmup, concurrency 1/4/8, 0 lỗi; p95 9.971/15.687/20.462 ms. Chỉ GET detail một ticket tổng hợp, không phải benchmark auto-routing write hoặc Google |
| Backup/restore | **PASS**, 18 bảng: so hash schema và toàn hàng bằng nhau trên service CI mới thứ hai. Có hàng ở support_units/memberships/category routes và routed ticket. Không gồm file private uploads hoặc local/production recovery |
| Artifact/teardown | `mysql-operational-evidence`, 5 JSON files, artifact `15012927474`, 4,945 bytes, SHA256 ZIP `b2e039745dd9d97b825a6890b457266b4ccaecdd1cd889897d3b347d5d2e246c`; giữ 7 ngày. Không SQL dump/credential; hai service và network được tháo **PASS** |

Browser **6/6** dùng UI fixture API chặn toàn bộ request tới backend. Đã xem ảnh Admin desktop/mobile và agent ngoài nhóm; chưa có independent visual review. Những kiểm chứng trên không nâng schema local, không cấu hình nhân sự thật, không thay việc nghiệm thu Google sau rollout. Chỉ một migration routing mới được thêm; không có `server/migrations-pending` hoặc backend ticketWorkflow trong branch.

### Còn lại trước khi dùng local

Chủ dự án duyệt riêng thay đổi schema local đang chứa dữ liệu nghiệm thu và backup/recovery; kiểm đúng database/account trước write. Sau đó migrate số 7, bật cờ và restart API; Admin chọn thành viên thực tế cho bốn nhóm và nghiệm thu Google bằng ticket tổng hợp. Chưa có quyết định membership thật, không tự đặt agent hiện có vào mọi nhóm. Không merge PR/main trong lượt này.
