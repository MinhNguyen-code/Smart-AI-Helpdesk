# BẢNG ÁNH XẠ 7 ẢNH THIẾT KẾ WIREFRAME GỐC

Tài liệu này xác nhận và ghi nhận đối chiếu chi tiết 7 tệp hình ảnh wireframe gốc được lưu trữ tại thư mục `Wireframe/` theo đúng yêu cầu bảo toàn dữ liệu tham chiếu (Read-only).

---

## 1. Danh Sách Ánh Xạ Chi Tiết

| Mã Màn Hình | Tên File Gốc Trong `Wireframe/` | Dung Lượng | Tên Màn Hình Logic | Mô Tả Bố Cục Giao Diện Thực Tế |
|---|---|---|---|---|
| **SCR-01** | `1791984801876_521214220891521771_521214220891521771_9885f96fbcf847753292da33e71705db.jpg` | 110,923 bytes | **Đăng Nhập (Login)** | Bố cục 2 cột: Cột trái giới thiệu cổng CNTT BTEC FPT & minh họa bàn làm việc; Cột phải hộp đăng nhập với Google Sign-In và thông báo bảo mật. |
| **SCR-02** | `1791984953566_521214220891521771_521214220891521771_49f6a9e4e391115747793a0fa89a546d.jpg` | 80,778 bytes | **Tạo Yêu Cầu Hỗ Trợ (Create Ticket)** | Biểu mẫu căn giữa trang: Tiêu đề sự cố, Mức độ ảnh hưởng (Cá nhân, Phòng ban, Toàn tổ chức), Mô tả sự cố chi tiết (hỗ trợ Ctrl+V dán ảnh trực tiếp), Xem trước file đính kèm, Nút Hủy và Gửi. |
| **SCR-03** | `1791985471445_521214220891521771_521214220891521771_7e1fffe1e26b3700b14d8b065806678b.jpg` | 76,264 bytes | **Bảng Kanban Tương Tác (Kanban Board)** | 3 cột trạng thái: MỚI TẠO (OPEN), ĐANG XỬ LÝ (IN PROGRESS), ĐÃ GIẢI QUYẾT (RESOLVED); Thanh lọc theo SLA và ô tìm kiếm mã/tiêu đề; Thẻ ticket viền đỏ nổi bật khi ở mức P1 - URGENT và đồng hồ đếm ngược SLA. |
| **SCR-04** | `1791985886780_521214220891521771_521214220891521771_b8b66d315010cf814337d8c47e5fc087.jpg` | 123,107 bytes | **Chi Tiết Ticket & SLA (Detail Modal)** | Hộp thoại chi tiết lớn: Cột trái xem mô tả đầy đủ, ảnh chụp lỗi, dòng thời gian trao đổi phản hồi 2 chiều, ô nhập tin nhắn và đính kèm; Cột phải hộp cảnh báo SLA SẮP HẾT HẠN (viền đỏ), chọn Trạng thái, Kỹ thuật viên phụ trách, Nhãn từ khóa nhận diện RULE-BASED. |
| **SCR-05** | `1791986159563_521214220891521771_521214220891521771_d175ffb4b10256f8775a5010e50f5fdc.jpg` | 64,644 bytes | **Báo Cáo Hiệu Suất (Dashboard)** | 4 thẻ KPI đầu trang (Tổng số Ticket, MTTA tiếp nhận TB, MTTR xử lý TB, Tỷ lệ tuân thủ SLA 95%); Biểu đồ cột thể hiện số ticket theo ngày trong tuần; Biểu đồ tròn/donut phân bổ mức độ ưu tiên P1/P2/P3/P4. |
| **SCR-06** | `1791986296193_521214220891521771_521214220891521771_6a4d9f489bd7328b27f6346ec969fcdb.jpg` | 44,911 bytes | **Danh Sách Quy Tắc Từ Khóa (Rules List)** | Bảng quản lý quy tắc: Tìm kiếm từ khóa, Cột Từ khóa, Hành động gán (Set: P1 - Urgent), Công tắc chuyển đổi trạng thái Active/Inactive, Thao tác Sửa/Xóa, Nút "+ Thêm Quy Tắc Mới". |
| **SCR-07** | `1791986298736_521214220891521771_521214220891521771_8d08755335cd2561db194ce9a91c99e4.jpg` | 46,664 bytes | **Hộp Thoại Quy Tắc (Rule Dialog Modal)** | Modal căn giữa thêm mới hoặc chỉnh sửa quy tắc: Trường nhập Từ khóa, Dropdown chọn Mức độ ưu tiên (P1, P2, P3, P4), Nút Hủy và Lưu quy tắc. |

---

## 2. Quy Chuẩn Thiết Kế Giao Diện
- Không tạo các ảnh wireframe giữ chỗ (placeholder) khi đã có 7 ảnh thiết kế thực tế.
- Tất cả các màn hình React trong thư mục `src/` sẽ được triển khai bám sát 100% bố cục, màu sắc, khoảng cách và kiểu dáng nút/thẻ/bảng từ các file ảnh trên.
