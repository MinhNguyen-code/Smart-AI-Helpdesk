# Bật phân tuyến local và thêm năm IT_AGENT test — 26/11/2026

**PASS cho thiết lập local và kiểm tra được ghi dưới đây.** Chưa chạy lại Google E2E tạo ticket/phân công qua trình duyệt ở lượt này.

Chủ dự án yêu cầu thêm khoảng năm IT_AGENT mặc định để test chia ticket và đã chọn **“Cho phép bật local và cấu hình nhóm”**. Sau lần lệnh tạo hồ sơ bị ngắt, kiểm tra chỉ đọc xác nhận chưa có hồ sơ/nhóm/tuyến; chủ dự án tiếp tục yêu cầu **“chạy tiếp đi bro”**. Lượt tiếp tục đã hoàn tất phần thiết lập, không tạo trùng dữ liệu.

## Thiết lập đã áp dụng

| ID | Hồ sơ | Nhóm | Nhận việc |
| --- | --- | --- | --- |
| 4 | `[TEST] IT Mạng 01` | `NETWORK` — IT Mạng | Có |
| 5 | `[TEST] IT Mạng 02` | `NETWORK` — IT Mạng | Có |
| 6 | `[TEST] Ứng dụng LMS 01` | `APPLICATION_LMS` — Ứng dụng / LMS | Có |
| 7 | `[TEST] Phần cứng 01` | `HARDWARE_ONSITE` — Phần cứng / Tại chỗ | Có |
| 8 | `[TEST] Tài khoản 01` | `ACCOUNT_ACCESS` — Tài khoản / Quyền truy cập | Có |

Email thuộc domain `routing-test.example.invalid`. Đây là hồ sơ nhân sự tổng hợp để kiểm tra **người nhận phân công**, không phải tài khoản Google thật. Tất cả `role=IT_AGENT`, active, `google_sub=null`; không tạo mật khẩu, session, giả lập identity Google hoặc thêm đường đăng nhập bỏ qua OIDC. Ba tài khoản thật trước đó không đổi vai trò/trạng thái/thành viên. IT_AGENT thật hiện có vẫn chưa được tự gắn nhóm.

- `server/scripts/addRoutingTestAgents.js`: mặc định dry-run; `--apply --configure-routing` mới thêm hồ sơ/nhóm/membership/tuyến. Chỉ development đúng schema/account; giữ nguyên targetPolicy. Không ghi đè hồ sơ trùng nhưng khác role/tên/active/Google identity, không thay tuyến cũ xung đột hoặc bật lại nhóm inactive. Không xóa bản ghi. Ghi audit với actor null và nguồn `owner_authorized_cli_2026_11_26`, không giả mạo một phiên Admin.
- Bốn category active hiện có được ánh xạ theo tên sang bốn nhóm, dùng keywords trong `routingDefaults`. Có đúng 5 memberships và 4 category routes. `routing_settings` version **2**, `auto_assign=true`, giới hạn **10** ticket mở/người.
- Local `.env` đã đặt `TICKET_ROUTING_ENABLED=true`; các giá trị khác được đối chiếu giữ nguyên. `.env` và backup nằm trong vùng Git ignore, không đưa credentials/data backup vào source.
- API đã khởi động lại trên `http://localhost:5000`, frontend trên `http://localhost:5173`. Không khởi động thêm SLA/email worker ở lượt này.

## Backup, migration và bảo toàn dữ liệu

Trước write: xác minh `smart_it_helpdesk_new_dev` / `sih_new_app@127.0.0.1`. Backup SQL base-table schema + rows, file uploads và cấu hình trước bật cờ vào thư mục riêng dưới `server/private-uploads/.routing-recovery/` (Git-ignored); vị trí chính xác lưu local trong `work/routing-test-setup/backup-location.json`. SQL dump **29.454 bytes**, SHA256 **36fb3bb9858d277234bfd227defaa45620fdfa0646cf8cceb1ec1f59a34c1b03**. Backup SQL không gồm triggers/routines/events; chưa restore trên local.

Áp dụng duy nhất `20261125000007_add_ticket_routing.js`, đã đối chiếu nguyên file với nguồn CI `e3f0b867098e020256f1e95b79d90c7362010c1a`. Migration identity đúng `sih_new_dev_migrate@127.0.0.1`; pending chỉ có file này; migration count **6 → 7**. Không chạy seed/reset/down hoặc migration năm trạng thái.

Sau thêm hồ sơ/cấu hình, trước khi bật web: đối chiếu hash từng hàng cũ trên 12 bảng nghiệp vụ/session, chiếu về các cột trước migration với tickets. **86 hàng cũ giữ nguyên**, gồm **2 ticket RESOLVED**, ba user thật, comments/history/attachment/notification/outbox/rules/SLA/category/session/audit cũ. Hai entry file upload (một ảnh và `.gitkeep`) giữ nguyên hash. Cột owner_unit_id/routing_status/routing_evidence của hai ticket cũ vẫn null; không backfill hoặc chuyển người phụ trách.

## Kiểm chứng lượt tiếp tục

| Check | Kết quả |
| --- | --- |
| Apply setup | **5 created / 0 reused**, 4 nhóm, 5 memberships, 4 routes; transaction commit thành công |
| Dry-run sau apply | **would_create=0 / existing=5** |
| Unit routing + targetPolicy | **7/7 PASS**, không dùng fixture ghi/xóa DB |
| `GET /api/v1/ready` | **200**, `{status: READY}` với database đã migrate |
| Frontend local | **200** tại `localhost:5173` |
| Anonymous routing capabilities/users | Cả hai **401**, vẫn yêu cầu phiên xác thực thật |
| Read-only routing preview | **6/6 PASS** bằng category/keywords/membership/settings/workload đọc từ MySQL, dùng bộ đếm tải tạm trong bộ nhớ; không insert ticket |
| Git | Root vẫn `fix/security-ci-hardening@505baa8`; index giữ hash `68916b573c0743de27047468f735f318f9b7e5ec35a0836c08cfe9d518df0d4f`; không switch/reset/stash/commit/push/merge trong lượt thiết lập này |

Preview: `wifi/mất mạng` → Mạng 01; ticket `router` kế tiếp → Mạng 02; `LMS` → Ứng dụng LMS 01; `máy in` → Phần cứng 01; `mật khẩu/tài khoản` → Tài khoản 01; `wifi và máy in` → REVIEW_REQUIRED. Hai ca mạng chứng minh cách chọn ít ticket mở hơn bằng tải ảo; không được gọi là hai ticket đã ghi thành công qua HTTP. Evidence local tại `work/routing-test-setup/verification.json`.

## Cách thử trên web

Đăng nhập Google bằng END_USER hoặc Admin hiện có, vào **Tạo yêu cầu**, giữ **Tự động phân loại**, rồi gửi ticket có mô tả rõ như “Wifi phòng máy bị mất mạng”, “LMS không tải được bài học”, “Máy in không nhận lệnh”, “Quên mật khẩu tài khoản”. Mở detail để xem nhóm/người được giao. Gửi hai ticket mạng liên tiếp khi tải đều nhau để kiểm tra việc chia sang hai hồ sơ mạng. Admin xem/sửa cấu hình tại `/routing`.

Năm hồ sơ TEST chưa có Google identity nên không đăng nhập độc lập để xử lý. Có thể kiểm tra/giao lại/xử lý bằng Admin thật; để nghiệm thu riêng từng IT_AGENT bằng Google cần tài khoản Google thực và mapping được chủ dự án duyệt. Không chạy destructive integration fixtures hoặc cleanup dữ liệu local. Giữ workflow **OPEN → IN_PROGRESS → RESOLVED**; SMTP và LLM không thuộc lượt này.
