# Báo cáo Ngày 2 — Google OIDC và RBAC

**Dự án:** Smart IT Helpdesk
**Ngày checkpoint:** 12/11/2026
**Workspace:** `D:\Smart IT Helpdesk`
**Kết luận: PARTIAL.** Cấu hình OAuth, allowlist ba vai trò và liên kết Google trong MySQL đã có bằng chứng; luồng đăng nhập/đăng xuất và ranh giới quyền chưa được kiểm thử đầy đủ từ trình duyệt bằng cả ba vai trò.

## 1. Mục tiêu

Tích hợp Google OpenID Connect Authorization Code + PKCE, callback, allowlist, ánh xạ `ADMIN`/`IT_AGENT`/`END_USER`, session MySQL, bảo vệ route, login theo wireframe 01, onboarding có kiểm soát và kiểm thử xác thực.

## 2. Mã đã triển khai

- `server/src/modules/authRoutes.js`: bắt đầu OAuth, tạo state/nonce/PKCE, xác minh callback bằng thư viện OIDC, yêu cầu email đã xác minh, kiểm tra allowlist trong MySQL, liên kết Google `sub`, xoay session, cung cấp `/me` và logout.
- `server/src/db/sessionStore.js`: lưu session phía server trong MySQL. `server/src/middleware/authMiddleware.js`: kiểm tra đăng nhập/vai trò ở backend. Frontend kiểm tra `/auth/me`, chỉ hiển thị điều hướng phù hợp và cung cấp nút Google trên login hai cột.
- `server/scripts/approveInitialUsers.js`: kiểm tra schema và MySQL account trước khi ghi, dry-run mặc định, `--apply` chỉ chèn account còn thiếu; từ chối trường hợp role hoặc trạng thái account hiện hữu xung đột. Chủ dự án đã xác nhận ánh xạ ba vai trò trong chat. Không công bố địa chỉ email hoặc secret trong báo cáo.
- Đường dẫn `?preview=1` là chế độ xem giao diện với dữ liệu trong bộ nhớ, không phải đăng nhập hay dữ liệu thật.

## 3. API và database

| Endpoint | Chức năng | Bằng chứng |
|---|---|---|
| `GET /api/v1/auth/google` | Chuyển tới Google | HTTP 302, `location_host=accounts.google.com`, có cookie session |
| `GET /api/v1/auth/google/callback` | Xác minh danh tính và liên kết tài khoản | Có mã; test từ chối callback không có OIDC transaction |
| `GET /api/v1/auth/me` | Đọc phiên hiện tại | Test trả 401 nếu chưa đăng nhập |
| `POST /api/v1/auth/logout` | Hủy phiên, xóa cookie | Có mã; chưa có test đầy đủ với phiên Google thật |

Chỉ dùng `smart_it_helpdesk_new_dev` qua account runtime `sih_new_app@127.0.0.1`. Dry-run trước onboarding: `existing=0 would_create=3`; lệnh đã phê duyệt `node server/scripts/approveInitialUsers.js --apply`: `created=3`; dry-run sau đó: `existing=3 would_create=0`. Kiểm tra read-only mới nhất cho thấy `approved_rows=3`, `active_rows=3`, mỗi vai trò có **một** account đã liên kết Google `sub`. Không in danh tính, `sub`, cookie hay credentials. Phép đọc này chứng minh trạng thái DB, không thay thế kiểm thử UI/session.

## 4. Frontend và ảnh chụp

Trang login hai cột theo wireframe 01, dùng nút Google; minh họa bên trái dùng Three.js. Đã xem trực tiếp ở 1440×900 và 390×844 trong phiên phát triển frontend. Chưa lưu ảnh nghiệm thu riêng cho Day 2 vào repo. Chưa có bằng chứng trực tiếp về từng trang sau khi đăng nhập bằng cả ba vai trò.

## 5. Kiểm thử đã thực hiện

- Kiểm tra `.env` chỉ ở mức `SET`/`EMPTY`: Client ID và Client Secret đều `SET`; không in giá trị.
- Khởi động lại backend: kết nối schema mới thành công. `GET /api/v1/ready` trả **200**.
- `npm.cmd test` ngày 12/11: **20 pass, 0 fail**. Trong đó test auth xác nhận `/me` trả 401 khi chưa có session và callback không có transaction OIDC bị từ chối. Suite hiện chưa mô phỏng trọn vẹn callback Google thật.
- `npm.cmd run build` ngày 12/11: **PASS**, 16.86 giây, cảnh báo hai chunk trên 500 kB.

## 6. Rủi ro và tiêu chí còn thiếu

Chủ dự án thông báo đăng nhập đã hoàn thành; trạng thái liên kết Google trong DB phù hợp với thông tin này. Vẫn cần kiểm tra từng vai trò trả về từ `/auth/me`, tài khoản ngoài allowlist bị từ chối, logout làm mất hiệu lực session và khả năng khôi phục session sau khởi động lại. Chưa có lệnh Admin đầy đủ để quản lý vòng đời người dùng ngoài onboarding ba tài khoản ban đầu. Day 2 chỉ nâng lên **PASS** khi các tiêu chí trên có kết quả kiểm thử trực tiếp và lưu bằng chứng.

## 7. Checkpoint tiếp theo

Hoàn tất xác minh Day 2 còn thiếu, rồi nghiệm thu Day 3 Ticket Core: tạo và đọc lại ticket thật từ MySQL, quyền xem theo reporter, phân công và chuyển trạng thái hợp lệ, phản hồi, lịch sử và tệp đính kèm riêng tư.

## Bổ sung nghiệm thu 12/11 — vẫn PARTIAL

Đã đăng nhập Google thật trong browser bằng một tài khoản được duyệt; ứng dụng hiển thị `IT_AGENT`, Kanban từ MySQL và chặn trực tiếp `/rules`. Sau khi restart Express/Vite, phiên vẫn tồn tại; đăng xuất xong truy cập `/kanban` quay về login. `npm.cmd test` cuối: **20 pass, 0 fail**. Chưa xác minh browser với ADMIN, END_USER hoặc tài khoản ngoài allowlist, nên Day 2 vẫn **PARTIAL**.

## Bổ sung 16/11 — vẫn PARTIAL

Admin API và trang `/users` đã có danh sách cho phép, phê duyệt email, đổi vai trò/trạng thái; kiểm tra quyền từ MySQL và không liên kết Google giả. Integration test trên schema dự án đạt **7/7** toàn bộ suite, bao gồm từ chối role khác, email trùng, chống tự khóa và kiểm tra bản ghi Google chưa liên kết. Cấu hình mẫu và mã nguồn không còn giá trị email cá nhân mặc định; `SESSION_SECRET` thực là bắt buộc ngoài môi trường test. Chưa có phiên Admin/End-User Google thật trong browser để nghiệm thu toàn bộ ranh giới vai trò.
