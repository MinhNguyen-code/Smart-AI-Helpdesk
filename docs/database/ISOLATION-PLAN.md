# Cô lập database — PARTIAL

## Kế hoạch và phạm vi

Chỉ dùng smart_it_helpdesk_new_dev và smart_it_helpdesk_new_test cho dự án này sau khi chủ dự án phê duyệt provisioning. Giữ nguyên hai schema cũ và mọi account hiện có. Đề xuất REVOKE/GRANT trên account cũ trong báo cáo trước đã bị thay thế bởi quyết định này.

SQL để duyệt nằm tại docs/database/provision-new-project.sql. Chủ dự án cần xác nhận tên schema/account mới chưa tồn tại trước khi chạy phần CREATE. Không dùng IF NOT EXISTS để tránh nhận nhầm tài nguyên có sẵn. Nếu gặp lỗi phải dừng và kiểm kê trạng thái, vì MySQL DDL không rollback toàn bộ script. Thay bốn placeholder bằng bốn secret riêng tại máy, không lưu SQL chứa secret vào Git. Chưa thực thi SQL này.

## Account

- sih_new_app@127.0.0.1 — CRUD chỉ trên schema new_dev, dùng runtime.
- sih_new_test@127.0.0.1 — CRUD chỉ trên schema new_test, dùng integration tests.
- sih_new_dev_migrate@127.0.0.1 — CRUD, CREATE, ALTER, INDEX, REFERENCES trên new_dev.
- sih_new_test_migrate@127.0.0.1 — cùng quyền migration trên new_test.

Không cấp DROP, quyền quản trị account hoặc GRANT OPTION. Không dùng root làm runtime. Migration down hiện có DROP TABLE, do đó npm script rollback đã bỏ để phù hợp yêu cầu không thực thi thao tác phá hủy. Mã migration gốc vẫn được giữ nguyên.

## Code và cấu hình

.env.example có schema mới, account runtime/test riêng và credential migration riêng. .env cục bộ được giữ nguyên để chủ dự án duyệt trước khi chuyển kết nối. Knex kiểm tra schema và account cấu hình, đồng thời kiểm tra DATABASE()/CURRENT_USER() trên mỗi connection được tạo trong pool. Migration CLI qua npm xác minh cấu hình trước mở connection và xác minh identity trước migrate.latest(). Seed cũng dùng guard. Raw Knex CLI qua knexfile vẫn phải đi qua guard của pool.

Schema migration hiện tại tạo 10 bảng nghiệp vụ, có FK, unique ticket code, unique email và notification deduplication. Chưa có persistent session table. MySQL DDL có thể để lại schema dở dang khi migration lỗi, cần kiểm kê và sửa có chủ đích, không tự rollback/drop. Migration, constraints và restart persistence chưa được xác minh trên server mới.

Test tích hợp đã chuẩn bị ghi user fixture END_USER không active và ticket trong transaction, đọc lại rồi chủ động rollback, xác nhận ticket không tồn tại sau rollback. UUID riêng tránh xung đột. Test không thay đổi tài khoản Google hoặc role mapping thật. Auto-increment có thể tăng dù rollback. Test không nằm trong npm test mặc định và chưa thực thi.

## Lệnh sau khi được phê duyệt và cấu hình .env

```powershell
npm.cmd run db:check
npm.cmd run db:check:test
npm.cmd run db:migrate
npm.cmd run db:migrate:test
npm.cmd run test:integration
npm.cmd test
```

db:check dùng runtime account. Migration dùng account migration riêng. Không tự chạy seed trong quy trình này. Chỉ chạy migration trên schema mới được xác nhận thuộc dự án. Các lệnh migration và integration vẫn chờ phê duyệt database, chưa có kết quả PASS.

## Bằng chứng thực thi hiện tại

node --test --test-reporter=tap server/tests/unit/*.test.js: exit 0, 12 pass, 0 fail, 0 skipped (11 ca kiểm thử và 1 test cha). Bao gồm test chặn schema cũ, root, account/host sai và nhầm môi trường, cùng kiểm thử phân loại tiếng Việt, SLA và lifecycle.

node --check server/scripts/databaseCommand.js và node --check server/tests/integration/database.test.js đều exit 0.

node server/scripts/databaseCommand.js check development: exit 1 DATABASE_TARGET_REJECTED với .env cũ. Guard từ chối trước khi mở kết nối. Đây là bằng chứng bảo vệ target PASS, không phải kết nối SQL PASS.

## Trạng thái

PASS — chuẩn bị cấu hình, guard và unit tests.
PARTIAL — toàn bộ checkpoint, chưa có integration trên schema mới.
BLOCKED — provisioning và credential mới chờ chủ dự án phê duyệt.
NOT VERIFIED — MySQL trên schema mới, migration, FK thực tế, API nghiệp vụ, ghi bền và restart persistence.

Cần chủ dự án duyệt SQL bốn account và hai schema mới. Sau đó cấu hình secret cục bộ, kiểm tra SELECT VERSION(), DATABASE(), CURRENT_USER(), áp dụng migration và kiểm kê constraints/history. Tiếp theo triển khai session MySQL và nghiệm thu HTTP nghiệp vụ cùng persistence qua restart.
