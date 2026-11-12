# Checkpoint tích hợp cô lập — PARTIAL

## Provisioning và kết nối PASS

Chủ dự án xác nhận trực tiếp provisioning và seed trong chat sau khi automatic approval từ chối ủy quyền qua attachment. Đã kiểm tra toàn bộ tên schema/account không trùng trước CREATE. Tạo smart_it_helpdesk_new_dev/test cùng bốn account sih_new_app, sih_new_test, sih_new_dev_migrate, sih_new_test_migrate tại 127.0.0.1. Mỗi account có secret random riêng, cấu hình .env. File khôi phục .env.provision.local được Git ignore. Root đã được thay khỏi cấu hình runtime, không lưu bản sao mật khẩu quản trị.

Cả hai kết nối Knex trả MySQL 8.4.13 và CURRENT_USER đúng account runtime riêng. GRANT đã escape underscore khi partial_revokes=0 để tránh wildcard schema. Không thay đổi schema/account lịch sử.

## Migration và seed PASS

Hai migration 20261110000001_create_initial_schema.js và 20261111000002_add_sessions_and_evidence.js đã áp dụng bằng account migration tương ứng. Mỗi schema có 13 bảng gồm 11 bảng ứng dụng và 2 bảng Knex. Migration bổ sung sessions và tickets.priority_evidence. Seed categories/rules/SLA chạy sau phê duyệt trực tiếp; không tạo tài khoản Google.

## Mã mới và tích hợp

Session Express lưu qua Knex vào MySQL, cookie SameSite=Lax hỗ trợ callback. CSRF token gắn session và kiểm tra Origin cho mutation. Ticket routes gồm list/search, create, detail, status và categories. Tạo ticket dùng transaction lưu priority evidence, SLA snapshot, history, audit và notification. Quyền xem ticket của END_USER dựa reporter_id, trạng thái dùng khóa dòng và version. Role thực tế được đọc lại từ users active. Chưa có luồng Google đăng nhập để sử dụng các route này qua UI bình thường.

## Test thực thi

- npm.cmd run db:check và db:check:test — kết nối và identity đúng.
- npm.cmd run db:migrate và db:migrate:test — thành công, lịch sử được kiểm kê sau đó.
- npm.cmd test — 17 pass, 0 fail (bao gồm 2 test cha).
- npm.cmd run test:integration — 3 pass, 0 fail sau sửa lỗi email fixture trùng giữa hai END_USER. Test dùng schema mới, không có endpoint bypass đăng nhập trong app.
- Integration gồm rollback ticket transaction, session qua đóng/mở pool, HTTP tạo ticket URGENT + SLA + notification, chặn xem ticket người khác, chặn thiếu CSRF, chuyển OPEN→IN_PROGRESS→RESOLVED và đọc lại MySQL.
- npm.cmd run build — PASS, Vite build 6.97 giây. Build hiện vẫn là UI preview cũ, chưa chứng minh frontend nghiệp vụ hoàn thành.
- /api/v1/health=200 và /api/v1/ready=200 trên new_dev.

## Phần chưa hoàn thành

Google OIDC chưa triển khai hoàn chỉnh; OAuth client còn thiếu và role mapping chưa được phê duyệt. CRUD rules/SLA, comments, assignment, private attachment API, notification UI, SQL analytics, worker cả hai SLA và frontend bảy màn hình nghiệp vụ còn thiếu. Browser E2E và screenshot comparison NOT VERIFIED. Session đã kiểm tra qua pool recreation; restart toàn bộ ứng dụng và ticket persistence qua restart chưa nghiệm thu. Không thực hiện folder audit post-MVP vì chưa đạt functional acceptance.

## Lệnh đã kiểm chứng

Chạy từ D:\Smart IT Helpdesk bằng PowerShell: npm.cmd run db:check, npm.cmd run db:check:test, npm.cmd test, npm.cmd run test:integration, npm.cmd run build.

Lệnh dev và worker hiện có nhưng chưa nghiệm thu vận hành hoàn chỉnh ở checkpoint này. Giữ nguyên các báo cáo lịch sử; báo cáo này ghi bằng chứng mới. Tổng thể MVP PARTIAL, không có cơ sở tuyên bố hoàn thành.
