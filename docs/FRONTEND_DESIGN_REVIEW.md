# Đối chiếu cải tiến giao diện với bảy wireframe

**Ngày:** 16/11/2026. **Phạm vi:** React, CSS/Tailwind và kiểm thử Playwright trong `D:\Smart IT Helpdesk`. Tệp gốc trong `Wireframe/` và `Diagrams/` được giữ nguyên. Không thay đổi API, OAuth, RBAC, session, MySQL hoặc schema cho lượt cải tiến này.

## Audit ban đầu

- Bảy màn đã có React và ảnh Playwright cũ tại `docs/screenshots/day7-*.png`. Bố cục desktop nhìn chung bám ảnh gốc, nhưng chữ phụ và vùng bấm nhỏ; CSS chủ yếu nằm trong `src/index.css` với nhiều giá trị màu/khoảng cách lặp lại.
- Form tạo ticket dựa nhiều vào validation mặc định, chọn ảnh bằng input ẩn `display:none`, Ctrl+V chỉ xử lý ảnh ở preview. Bảng Rules thu bốn cột quá chật trên điện thoại. Dialog hiển thị lỗi API ở phía sau overlay.
- Recharts được import ngay trong `src/App.jsx`, khiến bundle chính trước cải tiến khoảng 905 KB minified. Three.js đã lazy load nhưng vẫn được dựng dù minh họa Login bị ẩn trên điện thoại.

## Kết quả đối chiếu trực quan

Ảnh sau cải tiến nằm trong `docs/screenshots/design-review/desktop/` và `docs/screenshots/design-review/mobile/`; mỗi thư mục có ảnh SCR-01 đến SCR-07. SCR-04 mobile có thêm `04-ticket-detail-sla.png` sau khi cuộn dialog đến phần SLA.

| Màn | Đã giữ theo ảnh gốc | Khác biệt còn lại |
|---|---|---|
| SCR-01 Login | Bố cục hai cột, tiêu đề lớn, vùng minh họa và khối đăng nhập. | Form mật khẩu của ảnh gốc được thay bằng Google OIDC theo đặc tả; minh họa 3D bàn làm việc thay hình người. Mobile thu về một cột. |
| SCR-02 Tạo ticket | Form giữa trang, tiêu đề/ảnh hưởng/mô tả/ảnh và hai nút cuối. | Danh mục bổ sung theo MVP; ảnh chỉ hiện sau khi người dùng chọn/dán, còn ảnh gốc vẽ trạng thái đã đính kèm. |
| SCR-03 Kanban | Rail hẹp, ba trạng thái, tìm kiếm, thẻ P1 viền đỏ và SLA. | Preview có sáu ticket minh họa so với 17 trong ảnh gốc; dữ liệu live vẫn lấy API. Mobile xếp ba nhóm dọc để tránh thẻ bị cắt. |
| SCR-04 Chi tiết | Dialog hai cột desktop, hội thoại trái, SLA và metadata phải. | Preview chưa có tệp ảnh như ảnh gốc; nhật ký ticket bổ sung bên dưới. Trên mobile hai cột xếp dọc và cuộn trong dialog. |
| SCR-05 Dashboard | Bốn KPI, biểu đồ cột và biểu đồ tròn với bảng màu trung tính. | Có báo cáo danh mục bổ sung ở màn live; preview dùng số mẫu có nhãn, màn live dùng API MySQL. |
| SCR-06 Rules | Tìm kiếm, bảng quy tắc, toggle, sửa/xóa và nút thêm. | Có thẻ cấu hình SLA P1–P4 bên dưới theo MVP; trên mobile mỗi quy tắc hiển thị thành hàng thông tin có nhãn. |
| SCR-07 Rule dialog | Modal ở giữa với từ khóa, ưu tiên, Hủy/Lưu. | Thêm checkbox kích hoạt, thông báo lỗi nội bộ và trạng thái đang lưu. |

## Kiểm chứng

| Lệnh/kiểm tra | Kết quả |
|---|---|
| `npm.cmd run test:frontend` | **PASS**, 4 test / 3 file |
| `npm.cmd run test:browser` | **PASS**, 8 test, gồm bảy màn, desktop/mobile, 375–1440 px, focus/menu, form và reduced motion |
| `npm.cmd run build` | **PASS**; bundle chính ~451 KB minified, Dashboard tải riêng. Three.js ~522 KB chỉ tải có điều kiện ở Login desktop; vẫn có cảnh báo chunk >500 KB. |
| `git diff --check` | **PASS**, exit 0. `Diagrams/` và `Wireframe/` không có thay đổi Git; còn 5 và 7 tệp gốc. |
| HTTP read-only sau restart Express | `/api/v1/health=200`, `/api/v1/ready=200` trên schema dự án hiện có. |

Trước restart, dev server lâu chạy trả 429 cho health/ready vì limiter đã hết quota sau nhiều lượt kiểm thử; sau restart hai endpoint trả 200. Không thay đổi limiter trong lượt thiết kế này.

Ảnh Playwright là chế độ preview có nhãn, dùng để đối chiếu bố cục. Không dùng ảnh này làm bằng chứng cho luồng Google với ba vai trò, số liệu MySQL thật hay tốc độ tải thực tế. Chưa có so sánh pixel định lượng vì kích thước, nội dung minh họa và luồng đăng nhập của wireframe khác hệ thống đã phê duyệt.

## Kiểm tra tiếp 17/11/2026

`docs/screenshots/live-api/` chứa ảnh từ browser Edge kết nối Express và MySQL **test**, dùng session fixture riêng. Có ảnh form tạo ticket với ảnh, Kanban End-User, chi tiết Agent có ACK/ảnh, Rules và Dashboard Admin. Điều khiển chọn ảnh trong chi tiết đã được làm đồng nhất với form tạo ticket. Năm viewport được duyệt được kiểm với trang API thật; bảy màn vẫn có ảnh preview desktop/mobile. Bản build production đã được mở trong Edge với `?preview=1` và chỉ thấy Login; preview không thể truy cập Rules khi chưa xác thực. Google E2E thật vẫn chờ chủ dự án mở phiên ADMIN và END_USER.
