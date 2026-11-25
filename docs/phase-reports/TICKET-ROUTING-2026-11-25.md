# Phân tuyến theo nhóm và tự phân công — 25/11/2026

**PARTIAL — code đã triển khai, local chưa bật/migrate; CI migration và HTTP/MySQL đang chờ chạy.**

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

Đang kiểm chứng; sẽ cập nhật bằng run/head cụ thể, không dùng kết quả PR #2 để suy ra routing PASS.
