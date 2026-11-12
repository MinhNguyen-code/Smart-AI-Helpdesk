# Chẩn đoán MySQL — PARTIAL

## Bằng chứng

Ứng dụng nạp DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME và DB_TEST_NAME bằng dotenv. Cấu hình hiện tại chọn TCP 127.0.0.1:3306, user root, mật khẩu trống. Knex/mysql2 thực tế trả ER_ACCESS_DENIED_ERROR với using password: NO và root@localhost. Đây là thông tin đăng nhập của tiến trình Node. Đăng nhập mysql.exe thành công do chủ dự án báo cáo không chứng minh tiến trình Node có cùng mật khẩu.

MySQL84 RUNNING, phiên bản 8.4.13 và hai schema tồn tại là kết quả chủ dự án cung cấp. Chưa xác minh độc lập VERSION(), CURRENT_USER() hoặc danh sách bảng do server từ chối xác thực. Host trong lỗi là host client server nhận diện. Tài khoản được chọn chính xác cần CURRENT_USER() sau khi đăng nhập thành công.

Lệnh node server/scripts/diagnoseDatabase.js đã thực thi ngoài sandbox. Knex development thất bại xác thực. Test báo DB_USER_MISSING. HTTP qua Supertest thực sự gọi Express và đường Knex/mysql2: /api/v1/health trả 200 UP, /api/v1/ready trả 503 NOT_READY. Chưa có truy vấn SQL thành công. Exit 0 của script chỉ thể hiện hoàn tất chẩn đoán.

## Sửa mã

Knex bỏ fallback root, thêm DB_TEST_USER/DB_TEST_PASSWORD và host/port test tùy chọn. Config backend dùng chung nguồn kết nối Knex. Pool min=0, giới hạn max vẫn là dev 10 và test 5, connect timeout 5 giây, timezone UTC. Pool không giải quyết được mật khẩu sai.

Readiness yêu cầu kết nối thật và tên database khớp. Bỏ fallback giả lập tên database khi SELECT DATABASE() không trả tên. Phản hồi HTTP che thông báo lỗi driver.

## Chủ dự án kiểm kê chỉ đọc bằng phiên mysql.exe đã đăng nhập

```sql
SELECT VERSION(), USER(), CURRENT_USER();
SELECT User, Host, plugin, account_locked
FROM mysql.user
WHERE User IN ('root', 'helpdesk_app', 'helpdesk_test');
SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA IN ('smart_it_helpdesk_dev', 'smart_it_helpdesk_test')
ORDER BY TABLE_SCHEMA, TABLE_NAME;
SELECT TABLE_SCHEMA, TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA IN ('smart_it_helpdesk_dev', 'smart_it_helpdesk_test');
```

TABLE_ROWS là ước lượng. Không đọc hoặc xuất dữ liệu cá nhân. Kiểm kê migration chỉ thực hiện khi xác nhận bảng knex_migrations tồn tại. Hai schema hiện có phải được giữ nguyên.

## Kết quả cập nhật cuối phiên

.env đã được cập nhật cục bộ trong lúc kiểm tra. Chạy lại script thành công qua Knex với MySQL 8.4.13, DATABASE()=smart_it_helpdesk_dev, USER() và CURRENT_USER() cùng root@localhost. HTTP /health=200 UP và /ready=200 READY. Lỗi xác thực ban đầu đã hết với credential hiện tại. Root chỉ được dùng cho các truy vấn chẩn đoán chỉ đọc trong phiên này, vẫn cần đổi runtime account.

Kiểm kê chỉ đọc thấy dev có 16 bảng và 7 migration (20261026000100 đến 20261026000700). Test có 20 bảng và 16 migration, có organizations và organization_memberships. Các migration này khác migration 20261110000001 của workspace. Hai schema có lịch sử khác nhau. TABLE_ROWS chỉ là ước lượng, không dùng để kết luận rỗng. Chưa xác nhận quyền sử dụng hai schema cho ứng dụng mới. Không áp dụng migration hiện tại vào chúng.

Đã đọc mysql.user và SHOW GRANTS. Hai account helpdesk_app@127.0.0.1 và helpdesk_test@127.0.0.1 đã tồn tại, không bị khóa và dùng caching_sha2_password. App có ALL PRIVILEGES trên schema dev. Test có SELECT, INSERT, UPDATE, DELETE, CREATE, REFERENCES, INDEX, ALTER trên schema test. Cần xác nhận các account này có phục vụ ứng dụng khác trước khi thay đổi quyền.

## SQL đề xuất cần chủ dự án phê duyệt

Các lệnh dưới đây thu hẹp quyền account đã tồn tại. Chỉ chạy sau khi xác nhận không làm gián đoạn ứng dụng khác và đã tách tài khoản migration. Chưa thực thi các lệnh này.

```sql
REVOKE ALL PRIVILEGES ON smart_it_helpdesk_dev.* FROM 'helpdesk_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_it_helpdesk_dev.* TO 'helpdesk_app'@'127.0.0.1';
REVOKE CREATE, REFERENCES, INDEX, ALTER ON smart_it_helpdesk_test.* FROM 'helpdesk_test'@'127.0.0.1';
SHOW GRANTS FOR 'helpdesk_app'@'127.0.0.1';
SHOW GRANTS FOR 'helpdesk_test'@'127.0.0.1';
```

Không cần tạo account mới nếu chủ dự án cho phép dùng hai account hiện có. Nếu chưa biết mật khẩu, việc reset cần phê duyệt riêng vì có thể ảnh hưởng client khác. Không tự chuyển sang account host localhost, không cấp host wildcard.

## Cấu hình cần hoàn tất

Đặt DB_USER=helpdesk_app và DB_PASSWORD bằng mật khẩu account tương ứng trong .env. Đặt DB_TEST_USER=helpdesk_test và DB_TEST_PASSWORD riêng. Giữ TCP 127.0.0.1:3306. Không đưa mật khẩu vào chat. dotenv mặc định giữ biến môi trường đã tồn tại, vì vậy khởi động lại Node và kiểm tra override khi sửa .env.

Chạy node server/scripts/diagnoseDatabase.js để kiểm tra lại bằng account quyền thấp. Hiện test config chưa có DB_TEST_USER, nên kết nối bằng account test vẫn BLOCKED. Inventory schema test trong phiên này dùng kết nối quản trị chỉ đọc.

Regression đã chạy node --test --test-reporter=tap server/tests/api/health.test.js server/tests/unit/config.test.js server/tests/unit/ticketPolicy.test.js, exit 0, 15 pass (13 ca kiểm thử và 2 test cha), 0 fail, 0 skipped. Kiểm thử HTTP có gọi Knex/MySQL thật. Luồng nghiệp vụ ghi ticket và persistence sau restart vẫn NOT VERIFIED.

Tổng thể PARTIAL. SQL connectivity và HTTP readiness thành công với credential root hiện tại. Chuyển runtime sang tài khoản quyền thấp, xác minh account test và quyết định schema phù hợp còn chờ chủ dự án. Không có thay đổi account, quyền, schema hoặc dữ liệu trong quá trình chẩn đoán.
