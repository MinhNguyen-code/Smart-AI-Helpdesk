# Tiến độ triển khai ngày 11/11/2026

## Trạng thái PARTIAL

Đã xem trực quan cả bảy JPG trong Wireframe và ba PNG trong Diagrams. Giữ nguyên tệp tham chiếu. Đã cập nhật chỉ dẫn root và đường dẫn wireframe trong Codex.md. Các tên màn hình chuẩn hóa là nhãn logic, tra cứu tên gốc qua bảng ánh xạ.

Đã bỏ thao tác tự động tạo ba tài khoản trong seed. Onboarding và kích hoạt vai trò cần xác nhận của chủ dự án và luồng Google xác minh danh tính.

Đã thêm server/src/modules/ticketPolicy.js gồm chuẩn hóa tiếng Việt, khớp cụm từ, phân loại URGENT/NORMAL với snapshot quy tắc, tính SLA theo phút lịch và kiểm tra chuyển trạng thái. Module này chưa được nối vào API ticket hoặc MySQL, vì vậy chưa nghiệm thu nghiệp vụ tích hợp.

## Bằng chứng thực thi

- node --test --test-reporter=tap server/tests/unit/ticketPolicy.test.js — 5 pass, 0 fail, 0 skipped, exit 0.
- Probe mysql2 với SELECT VERSION(), DATABASE() — sandbox trả EACCES. Thử lại ngoài sandbox trả ER_ACCESS_DENIED_ERROR. Chưa có truy vấn SQL thành công.
- Liệt kê Windows services bị từ chối truy cập Service Control Manager.
- Chưa chạy migration hoặc seed. Chưa commit hoặc push.

## Phần còn lại

Chủ dự án đang cập nhật .env và sẽ xác nhận database dev/test được phép sử dụng. Chưa có xác nhận mới tại thời điểm ghi báo cáo. Cần hoàn thiện session MySQL, Google OIDC, onboarding, API ticket, rules, SLA, notifications, analytics, upload riêng và frontend tích hợp. Kiểm thử API-to-MySQL, Google thật, browser, restart persistence và build của thay đổi này chưa được nghiệm thu.

Checkpoint tiếp theo là xác minh thông tin kết nối và quyền database sau xác nhận, bổ sung preflight bắt buộc cho đường ghi, tích hợp policy vào giao dịch tạo ticket và hoàn thiện xác thực. Toàn bộ MVP vẫn PARTIAL.
