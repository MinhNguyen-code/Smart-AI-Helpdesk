# Day 6 — Analytics và đối chiếu giao diện

**Ngày:** 12/11/2026. **Checkpoint: PARTIAL.** SQL aggregation và build PASS; dashboard của Admin thật chưa được mở trên browser.

## Đã triển khai

- `server/src/modules/analyticsRoutes.js`: `summary`, `daily`, `priorities`, `categories` đều lấy trực tiếp từ MySQL và chỉ ADMIN; lọc ngày hợp lệ tối đa 366 ngày, mặc định 7 ngày UTC.
- Tổng ticket, MTTA/MTTR theo giây, tỷ lệ SLA dựa trên ticket đã giải quyết và đạt cả hạn phản hồi lẫn hạn xử lý. Ticket đang mở không vào mẫu số; không có mẫu số trả `null`. Tỷ lệ danh mục/ưu tiên dùng tổng ticket cùng kỳ.
- `src/features/RealDashboard.jsx` hiển thị KPI, biểu đồ Recharts, ngày lọc, empty/error state. Chế độ preview vẫn ghi rõ là số liệu mẫu. Tắt animation ban đầu để biểu đồ xuất hiện ổn định trong ảnh/chế độ giảm chuyển động.
- Đã chụp 7 màn preview ở 1440×900, đối chiếu trực quan SCR-06/07 và SCR-05 với ảnh gốc. Rules, Login, Create Ticket, Kanban và Dashboard được kiểm không tràn ngang cấp trang ở 1440×900, 1280×800, 950×900, 768×1024, 390×844; bảng Rules mobile đã chỉnh để thấy cả nút sửa/xóa. Chưa đo pixel ở mọi màn/kích thước.

## Database/API

Không thêm migration. `GET /analytics/summary`, `/daily`, `/priorities`, `/categories`, query `startDate`, `endDate`; chi tiết mẫu số tại `docs/API_SPEC.md`.

## Kiểm thử

- `reportingApi.test.js` trên MySQL: hai ticket fixture cho tổng 2, MTTA 600 giây, MTTR 7200 giây, SLA 1/2 = 50%, phân bổ ưu tiên 1/1 và danh mục 100%; ngày sai trả 400. Bộ integration **6 pass, 0 fail**.
- `RealDashboard.test.jsx`: zero ticket hiển thị 0/trung bình không có dữ liệu và không lẫn KPI preview. Bộ frontend toàn suite **4 pass, 0 fail**.
- `npm.cmd run build`: **PASS** với Vite 7.3.8; cảnh báo chunk chính và Three.js trên 500 kB.
- Ảnh preview Dashboard: `docs/screenshots/day7-05-dashboard.png`. Playwright toàn bộ **4 pass, 0 fail**.

## Chưa xác minh

Dashboard trên tài khoản Admin thật và dữ liệu tổ chức có ý nghĩa. Đã kiểm tràn ngang cấp trang ở 5 kích thước nhưng chưa đối chiếu chi tiết bố cục/nhãn biểu đồ mọi kích thước. Chưa có benchmark tốc độ truy vấn/board hay uptime thực tế. Dữ liệu preview 120 ticket không phải số liệu sản xuất.

## Checkpoint kế tiếp

Nghiệm thu Admin browser với ticket mới tạo, chụp ảnh ở các kích thước còn lại, kiểm chứng KPI trước/sau trạng thái RESOLVED và đo thời gian tải.
