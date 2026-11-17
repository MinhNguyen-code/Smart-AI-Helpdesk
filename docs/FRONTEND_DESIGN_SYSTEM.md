# Smart IT Helpdesk — hệ thiết kế giao diện

**Cập nhật:** 17/11/2026. Bảy ảnh trong `Wireframe/` là tham chiếu chính và không bị chỉnh sửa. CSS hiện hành nằm trong `src/styles/design-system.css`, nạp sau `src/index.css`; các tên màu tương ứng cũng có trong `tailwind.config.js`.

## Hướng thiết kế

Giao diện dành cho người gửi yêu cầu, kỹ thuật viên và quản trị viên cần đọc nhanh trạng thái ticket và hạn SLA. Giữ nền trắng/xám nhạt, rail điều hướng hẹp, bảng rõ đường kẻ và điểm nhấn xanh vừa phải như wireframe. Đỏ chỉ báo mức P1 hoặc nguy cơ quá hạn; xanh lá xác nhận hoàn tất. Không dùng gradient hoặc hiệu ứng chuyển động liên tục.

| Token | Giá trị | Vai trò |
|---|---|---|
| `--color-canvas` | `#f6f7f9` | Nền khu vực làm việc |
| `--color-surface` | `#ffffff` | Form, bảng, card và dialog |
| `--color-ink` | `#202833` | Tiêu đề và nội dung chính |
| `--color-secondary` | `#536170` | Mô tả và nhãn phụ |
| `--color-border` | `#dce1e7` | Ranh giới thành phần |
| `--color-accent` | `#245bd6` | Hành động chính và focus |
| `--color-critical` | `#ad2e39` | P1, lỗi, SLA khẩn cấp |
| `--color-high` / `--color-warning` | `#a4510b` | P2 và cảnh báo sắp hạn |
| `--color-medium` | `#326b9a` | P3 và thông tin xử lý |
| `--color-low` | `#526479` | P4, ưu tiên thấp |
| `--color-success` | `#227249` | Đã giải quyết và trạng thái tốt |

Badge ưu tiên dùng nền nhạt tương ứng và chữ đậm; nhãn P1–P4 luôn hiện cùng màu. Ba cột Kanban dùng nền xanh dương/xanh lam/xanh lá rất nhạt để phân biệt Mới tạo, Đang xử lý, Đã giải quyết. Biểu đồ ưu tiên theo thứ tự đỏ/cam/xanh lam/xám xanh; cột số ticket dùng xanh dương. KPI có một đường màu mỏng phía trên, giữ phần số liệu trên nền trắng.
SLA còn tối đa 15 phút hiển thị cam với chữ “Còn … phút”; quá hạn hiển thị đỏ với chữ “Quá hạn … phút”; ticket đã giải quyết hiển thị xanh lá kèm nhãn. Quy tắc này áp dụng cho thẻ Kanban và chi tiết ticket.

Chữ dùng Inter với Segoe UI/Arial dự phòng. Thang chữ chính: chú thích 12 px, nhãn 13 px, thân 14 px, tiêu đề mục 21 px; tiêu đề trang co giãn 23–29 px. Khoảng cách dùng mốc 4/8/12/16/24/32 px. Control cao tối thiểu 42 px, bo góc 6 px; card 8 px, dialog 10 px. Nút và form có focus hiện rõ, lỗi được đặt cạnh tác vụ liên quan.

Các biến `--radius-control`, `--radius-card` và `--shadow-dialog` thống nhất viền/độ sâu; shadow chỉ dùng cho overlay. Breakpoint chính: 900 px cho bảng/khung trung gian, 650 px cho điều hướng mobile và cột đơn. Nội dung đã được kiểm thêm ở 950, 768, 390 và 375 px để bắt lỗi giữa breakpoint.

Trạng thái tương tác dùng cùng hệ thống: `:hover` cho nút và thẻ, `:focus-visible` cho bàn phím, `disabled` khi lưu/gửi, thông báo `role="alert"` khi lỗi và `role="status"` khi tải. Vùng kéo thả ảnh có viền đứt màu trung tính, đổi sang xanh khi kéo ảnh vào; chọn ảnh bằng nhãn gắn với input file vẫn hoạt động trên bàn phím. Không dùng màu như tín hiệu duy nhất: nhãn P1–P4 và chữ trạng thái SLA luôn đi kèm. Chuyển màu vùng kéo thả mất 160 ms; quy tắc `prefers-reduced-motion` của stylesheet loại bỏ chuyển động khi người dùng yêu cầu.

Độ tương phản tính trên nền trắng: chữ chính 14,86:1; chữ phụ 6,34:1; chữ chú thích 4,69:1; xanh hành động 5,93:1; đỏ cảnh báo 6,51:1; xanh hoàn tất 5,88:1. Đây là kiểm tra màu token, chưa phải kiểm thử truy cập toàn diện trên mọi trạng thái UI.

## Áp dụng theo bảy màn

| Wireframe | Màn hiện có | Cải tiến |
|---|---|---|
| SCR-01 | Login hai cột | Giữ Google OIDC; minh họa Three.js chỉ tải trên màn hình đủ rộng và khi không giảm chuyển động/tiết kiệm dữ liệu; có hình tĩnh dự phòng. |
| SCR-02 | Tạo ticket | Nhãn, ví dụ nhập, kiểm tra chuỗi trắng, chọn danh mục rõ ràng, dán/chọn/kéo thả ảnh, xem trước và phản hồi lỗi. |
| SCR-03 | Kanban | Giữ ba trạng thái; sắp xếp SLA gần nhất, lọc P1–P4, tìm kiếm có nhãn, thẻ P1 viền đỏ. Tablet cuộn từng cột; mobile xếp cột dọc. |
| SCR-04 | Chi tiết ticket | Dialog có tên truy cập được, cuộn nội dung trong dialog, cột SLA/metadata rõ nhãn và giữ thao tác theo quyền. |
| SCR-05 | Dashboard | Bốn KPI, cột ngày, tròn ưu tiên; số liệu live vẫn lấy API MySQL. Module biểu đồ tải riêng khi mở Dashboard. |
| SCR-06 | Danh sách Rules | Giữ bảng desktop, tìm kiếm, toggle và thao tác; mobile trình bày từng bản ghi có nhãn. |
| SCR-07 | Dialog Rule | Focus trường từ khóa khi mở, thông báo lỗi trong dialog, khóa nút lúc đang lưu, giữ chọn P1–P4. |

Chế độ `?preview=1` luôn được ghi nhãn là dữ liệu mẫu và không đăng nhập thay người dùng. Các màn live tiếp tục dùng session, API, quyền và MySQL hiện có. Không thay đổi backend hoặc schema trong lượt cải tiến giao diện này.

## Tham khảo phương pháp

- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): lập hệ màu/kiểu chữ và kiểm độ tương phản, focus, responsive trước khi giao diện hoàn tất.
- [Anthropic frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): quyết định thiết kế từ ngữ cảnh sản phẩm, dùng chuyển động tiết chế và chụp ảnh để tự kiểm.
- [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills): tách module biểu đồ nặng, kiểm focus, form, bàn phím và nội dung dài.
