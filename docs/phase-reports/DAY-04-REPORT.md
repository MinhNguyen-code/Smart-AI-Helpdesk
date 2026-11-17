# Day 4 — Priority Rules và SLA

**Ngày:** 12/11/2026. **Checkpoint: PARTIAL.** API và MySQL đã kiểm chứng; giao diện Admin thật chưa được nghiệm thu trên browser.

## Đã triển khai

- Rules CRUD và SLA Policies P1–P4 trong `server/src/modules/ruleRoutes.js`, chỉ ADMIN, đối chiếu vai trò từ MySQL ở mỗi request; mutation yêu cầu session/Origin/CSRF. Thay đổi có transaction và `audit_logs`.
- Từ khóa được chuẩn hóa NFD, bỏ dấu/`đ`, so khớp cả cụm. Ticket lưu lý do, bằng chứng quy tắc và hạn SLA tại thời điểm tạo. Mức mặc định P3; ảnh hưởng toàn tổ chức lên P1.
- `src/features/RulesPage.jsx` hiển thị danh sách, tìm kiếm, bật/tắt, thêm/sửa/xóa có xác nhận; trình sửa chính sách P1–P4. SCR-06/07 bám hai ảnh gốc trong `Wireframe/`.
- Worker `server/src/workers/slaWorker.js` quét hạn phản hồi/giải quyết, khóa ticket và chống trùng qua `deduplication_key` theo ticket, nghĩa vụ, người nhận. Worker là tiến trình riêng qua `npm.cmd run worker:sla`; chưa thiết lập tự khởi động như Windows Service.
- `docs/API_SPEC.md` đã cập nhật request/response và giới hạn chính sách.

## Database

Không provision hoặc migrate trong lượt này. Migration P1–P4 và dữ liệu tham chiếu thuộc checkpoint trước. Chỉ integration test viết fixture vào `smart_it_helpdesk_new_test` và dọn sau khi chạy; không ghi hai schema lịch sử.

## Kiểm thử

- `npm.cmd test`: **20 pass, 0 fail** (phân loại, NFD, hạn, lifecycle, auth/API).
- `npm.cmd run test:integration`: **6 pass, 0 fail**; `ruleApi.test.js` chứng minh ADMIN CRUD, 401/403, duplicate 409, P1–P4 và khôi phục P2 sau test; `slaWorker.test.js` chứng minh hai lần quét đồng thời chỉ sinh một cảnh báo cho mỗi nghĩa vụ/người nhận.
- `npm.cmd run test:frontend`: **4 pass, 0 fail** toàn suite; hai bài Rules kiểm tra add/delete và chỉnh SLA trong preview.
- `npm.cmd run test:browser`: **4 pass, 0 fail** toàn suite; ảnh SCR-06/07 tại `docs/screenshots/day7-06-rules-list.png`, `day7-07-rule-dialog.png`, thêm ảnh Rules ở 5 kích thước yêu cầu và dialog mobile 390px. Đây là **preview**, không chứng minh API của phiên Admin thật.

## Chưa xác minh

Browser đăng nhập Admin thật, CRUD bằng UI và kiểm tra audit trực tiếp sau thao tác. Kiểm thử hiệu năng quy tắc và worker trên tải lớn. Rule keyword hiện kiểm tra trùng trong transaction nhưng DB chưa có unique constraint trên `normalized_keyword`; hai insert đồng thời có thể vượt qua kiểm tra.

## Checkpoint kế tiếp

Đăng nhập Admin thật, thử CRUD/SLA trên dữ liệu được phép, xác nhận ticket mới nhận chính sách mới và ticket cũ giữ deadline snapshot; giám sát worker dài hạn.
