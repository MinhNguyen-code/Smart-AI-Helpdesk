# Tiến độ chức năng và phi chức năng — PARTIAL

Chủ dự án chốt React/Express, Google OIDC, ưu tiên P1–P4 và Email SMTP. Laravel/PSR-12 và bcrypt trong ảnh được thay bằng công nghệ đã chốt. OAuth credentials, SMTP và role mapping chưa hoàn tất.

Đã mở rộng ưu tiên và chuyển URGENT→P1, NORMAL→P3 trên hai schema mới. Giữ enum cũ để tương thích dữ liệu lịch sử. P2 mặc định 60/480 phút, P4 480/2880 phút là lựa chọn triển khai tạm thời, cần Admin review. P1/P3 giữ SLA cũ. Migration mới có tên 20261112000003_expand_priority_levels.js.

Worker kiểm tra cả response và resolution, kể cả hoàn tất muộn. Dùng khóa dòng ticket để tuần tự hóa các worker, kiểm tra deduplication theo từng recipient. Xử lý tối đa 100 ticket mỗi lượt với cursor, tự lên lịch sau khi lượt trước kết thúc và thử lại sau lỗi.

Test npm.cmd test đã thành công 17 kết quả pass, 0 fail. npm.cmd run test:integration có 4 pass, 0 fail. Test mới chứng minh worker đồng thời và chạy lặp không nhân đôi thông báo. Có một lần lỗi tạo ticket do mã classifier chưa được cập nhật khi script Python đọc UTF-8 sai; đã sửa và chạy lại thành công.

Chưa hoàn thành tất cả yêu cầu trong hai sơ đồ. Rules CRUD/UI, Kanban kéo thả, attachments, analytics MTTA/MTTR, Email SMTP, responsive và quản trị account còn cần triển khai. Auto-triage ≤500 ms, p95 Kanban <2 giây và uptime ≥99% chưa có phép đo đủ điều kiện. Không coi test unit là bằng chứng uptime. Browser E2E và visual acceptance chưa đạt.
