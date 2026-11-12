# SMART IT HELPDESK — KẾ HOẠCH KIỂM THỬ (TEST PLAN)

## 1. Mục Tiêu & Phạm Vi Kiểm Thử
Kế hoạch kiểm thử nhằm đảm bảo chất lượng, tính đúng đắn và độ tin cậy của Smart IT Helpdesk theo các tiêu chuẩn kỹ thuật:
- **Unit & Integration Testing (Backend)**: Kiểm thử tính chính xác của thuật toán phân loại tiếng Việt, tính toán hạn SLA, chuyển đổi trạng thái ticket, phân quyền RBAC và các API endpoints.
- **Database Integration Testing**: Kiểm thử thao tác cơ sở dữ liệu trên schema kiểm thử chuyên biệt `smart_it_helpdesk_test`. Tuyệt đối không xóa dữ liệu trên môi trường phát triển `smart_it_helpdesk_dev`.
- **Frontend Component Testing**: Kiểm thử các thành phần giao diện, bộ lọc, biểu mẫu tạo ticket, hiển thị đếm ngược thời gian SLA.
- **End-to-End Testing & Visual Verification**: Kiểm thử luồng nghiệp vụ tổng thể và đối chiếu trực quan với 7 ảnh wireframe thực tế.

---

## 2. Chiến Lược Kiểm Thử Theo Từng Thành Phần

### 2.1 Backend Unit & Integration Tests
1. **Rule Engine**:
   - Khớp từ khóa tiếng Việt có dấu và không dấu ("server sập" == "server sap").
   - Quy tắc mức `URGENT` ghi đè mức `NORMAL`.
   - Tác động toàn tổ chức (`organization`) tự động leo thang lên `URGENT`.
   - Bỏ qua các quy tắc đang ở trạng thái không kích hoạt (`is_active = false`).
2. **SLA Calculation & Monitoring**:
   - Tính toán chính xác thời hạn phản hồi và giải quyết dựa theo mức ưu tiên.
   - Bắt lỗi an toàn khi chính sách SLA bị thiếu.
   - Quét phát hiện ticket quá hạn và sinh cảnh báo với khóa chống lặp (`deduplication_key`).
3. **Ticket Lifecycle & RBAC**:
   - Cho phép các bước chuyển đổi hợp lệ: `OPEN -> IN_PROGRESS -> RESOLVED`.
   - Chặn chuyển đổi sai (ví dụ `OPEN -> RESOLVED` trực tiếp hoặc người dùng phổ thông tự đổi trạng thái).
   - Kiểm tra chống tấn công IDOR: End-User không thể xem hoặc bình luận vào ticket của người khác.

### 2.2 Frontend & Visual Testing
- Kiểm thử responsive trên các độ phân giải: `1440x900`, `1280x800`, `950x900`, `768x1024`, `390x844`.
- Đối chiếu pixel & bố cục từng màn hình (SCR-01 đến SCR-07) với ảnh gốc trong thư mục `Wireframe/`.

---

## 3. Các Lệnh Thực Thi Kiểm Thử
```powershell
# Chạy toàn bộ test suites
npm test

# Chạy riêng unit test backend (Rule engine & SLA)
npm run test:unit

# Chạy test tích hợp API với Supertest
npm run test:api
```
