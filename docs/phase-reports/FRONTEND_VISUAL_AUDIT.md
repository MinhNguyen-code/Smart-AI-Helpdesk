# Đối chiếu trực quan 7 wireframe — 17/11/2026

## Phạm vi và phương pháp

Nguồn gốc là bảy JPG trong `Wireframe/`. Ảnh trước lượt chỉnh này ở `docs/screenshots/frontend-redesign/before/`; ảnh sau ở `after/desktop/` và `after/mobile/`. Ảnh chụp từ Edge/Playwright ở chế độ preview có nhãn; đây là bằng chứng bố cục, **không phải** bằng chứng dữ liệu MySQL hay đăng nhập Google thật. So sánh thủ công theo cấu trúc, thứ bậc thông tin và trạng thái tương tác; chưa đo sai lệch pixel định lượng.

| Màn | Wireframe gốc (tên rút gọn) | So sánh trước/sau | Kết quả và khác biệt còn lại |
|---|---|---|---|
| SCR-01 Login | `1791984801876_...jpg` | `01-login.png` | Giữ hai cột desktop và một cột mobile, Google OIDC theo quyết định đã duyệt. Ảnh gốc có form mật khẩu; ứng dụng không hỗ trợ kiểu đăng nhập đó. Minh họa Three.js chỉ tải khi phù hợp. |
| SCR-02 Tạo ticket | `1791984953566_...jpg` | `02-create-ticket.png` | Giữ form trung tâm và các trường chính; thêm danh mục theo API, vùng chọn/kéo thả ảnh với phản hồi và xem trước. Ảnh gốc vẽ sẵn tệp đính kèm; ảnh sau chụp trạng thái form trống. |
| SCR-03 Kanban | `1791985471445_...jpg` | `03-kanban.png` | Giữ rail, ba cột, thẻ P1 viền đỏ và SLA; thêm bộ lọc ưu tiên cạnh sắp xếp và tìm kiếm. Mobile xếp cột dọc, không tràn ngang. Preview có 6 ticket minh họa thay vì 17 trong ảnh gốc. |
| SCR-04 Chi tiết | `1791985886780_...jpg` | `04-ticket-detail.png` | Giữ dialog hai phần, SLA và trao đổi; mobile xếp dọc, có ảnh riêng phần SLA tại `after/mobile/04-ticket-detail-sla.png`. Preview không có tệp đính kèm thực. Ghi chú nội bộ chưa có hợp đồng API, không tạo dữ liệu giả. |
| SCR-05 Dashboard | `1791986159563_...jpg` | `05-dashboard.png` | Giữ bốn KPI và biểu đồ cột/tròn; màn live dùng API, ảnh preview ghi nhãn dữ liệu mẫu. Màn live có biểu đồ danh mục bổ sung. |
| SCR-06 Rules | `1791986296193_...jpg` | `06-rules-list.png` | Giữ bảng, tìm kiếm, bật/tắt, sửa/xóa và nút thêm. Mobile chuyển bảng thành bản ghi có nhãn; phần chính sách SLA được bổ sung dưới Rules. |
| SCR-07 Rule dialog | `1791986298736_...jpg` | `07-rule-dialog.png` | Giữ hộp thoại giữa trang với từ khóa, P1–P4, Hủy/Lưu; thêm kích hoạt, lỗi trong dialog và khóa nút lúc lưu. |

Mọi đường dẫn so sánh trong bảng là tên tệp tương ứng dưới cả `before/` và `after/desktop/`. `after/mobile/` chứa 7 ảnh cùng tên và thêm ảnh chi tiết SLA. Không có thay đổi Git trong `Diagrams/` hoặc `Wireframe/`; kiểm kê còn 5 và 7 tệp.

## Kiểm tra responsive và khả năng sử dụng

- Playwright kiểm tra không tràn ngang ở 1440, 1280, 950, 768, 390 và 375 px cho Login, Tạo ticket, Kanban, Dashboard; Rules cũng được kiểm ở cả sáu độ rộng.
- Test browser kiểm dialog Rules trên mobile, focus/menu, form và reduced motion. Test mới kiểm lọc P1, trả về tất cả và kéo thả ảnh hợp lệ/không hợp lệ.
- Ảnh desktop/mobile chỉ xác nhận bố cục preview. Tương tác thật qua Google và phân quyền ADMIN/END_USER vẫn cần phiên được chủ dự án mở. Kiểm tra trình đọc màn hình thủ công và tương phản ở mọi trạng thái chưa thực hiện.

## Ưu tiên còn lại

1. Kiểm end-to-end có phiên Google thật cho ba vai trò và đối chiếu ảnh trên trang live.
2. Nếu cần ghi chú nội bộ trong SCR-04, phê duyệt hợp đồng API/quyền trước khi thêm UI.
3. Đo thời gian tải trên môi trường triển khai thật; benchmark hiện tại dùng API fixture cục bộ.
