# SMART IT HELPDESK — KẾ HOẠCH TRIỂN KHAI THEO GIAI ĐOẠN (IMPLEMENTATION PLAN)

Kế hoạch thực hiện dự án được chia thành 7 giai đoạn (Day 1 đến Day 7) theo đặc tả chuẩn của `Codex.md`.

---

## Giai Đoạn 1: DAY 1 — FOUNDATION (Nền Tảng Cốt Lõi)
- **Mục tiêu**: Thiết lập cấu trúc dự án chuẩn Monorepo tại `D:\Smart IT Helpdesk`, khởi tạo Git, cấu hình biến môi trường, scaffold Frontend (React + Vite + Tailwind CSS), xây dựng Express Backend, lớp kết nối MySQL qua Knex.js, tạo initial migrations, health/readiness endpoints, và bộ tài liệu kỹ thuật.
- **Tiêu chí nghiệm thu**:
  - Frontend khởi động thành công trên cổng 5173.
  - Backend khởi động thành công trên cổng 5000.
  - API Health (`/api/v1/health`) phản hồi 200 OK.
  - API Ready (`/api/v1/ready`) phản hồi chính xác trạng thái kết nối MySQL.
  - File cấu hình và tài liệu đầy đủ, không sửa đổi thư mục ngoài phạm vi.

## Giai Đoạn 2: DAY 2 — AUTHENTICATION & RBAC
- **Mục tiêu**: Tích hợp Google OAuth 2.0 PKCE, đối soát danh sách cho phép 3 tài khoản Gmail đề xuất, lưu trữ phiên đăng nhập bằng MySQL session store, AuthProvider, bảo vệ định tuyến client-side, màn hình Đăng nhập (SCR-01) bám sát Wireframe 01.
- **Tiêu chí nghiệm thu**:
  - Luồng Google Sign-In chuẩn OpenID Connect.
  - Gán đúng vai trò: `binmin109@gmail.com` (ADMIN), `nguyenbinhminh.1009.vn@gmail.com` (IT_AGENT), `nguyenbinhminh.2006.vn@gmail.com` (END_USER).
  - Từ chối các tài khoản Google ngoài danh sách phê duyệt.

## Giai Đoạn 3: DAY 3 — TICKET CORE
- **Mục tiêu**: Quản lý danh mục sự cố, Biểu mẫu tạo ticket (SCR-02), danh sách ticket, chi tiết ticket, luồng trao đổi thảo luận, phân công kỹ thuật viên, chuyển đổi trạng thái hợp lệ, tải lên file đính kèm an toàn vào `private-uploads`.
- **Tiêu chí nghiệm thu**:
  - Dữ liệu lưu bền vững trong MySQL với Database Transaction.
  - Phân quyền chặt chẽ: End-User chỉ xem ticket cá nhân; IT Agent và Admin xem toàn bộ hàng đợi.

## Giai Đoạn 4: DAY 4 — PRIORITY ENGINE & SLA
- **Mục tiêu**: Xây dựng thuật toán Rule-Based Priority Engine chuẩn hóa tiếng Việt NFD, tự động gán `URGENT` cho tác động diện rộng hoặc khớp từ khóa khẩn cấp, tính toán hạn xử lý cam kết SLA, Background Worker quét vi phạm SLA định kỳ, màn hình SCR-06 và SCR-07.
- **Tiêu chí nghiệm thu**:
  - Từ khóa "server sập" tự động kích hoạt mức `URGENT`.
  - Hạn phản hồi và hạn giải quyết được tính chính xác từ bảng `sla_policies`.
  - Worker quét vi phạm tự động tạo thông báo không trùng lặp (Idempotent).

## Giai Đoạn 5: DAY 5 — KANBAN & NOTIFICATIONS
- **Mục tiêu**: Bảng Kanban 3 cột tương tác (SCR-03), thẻ ticket hiển thị đếm ngược thời gian SLA và nhãn cảnh báo viền đỏ, Modal chi tiết Ticket (SCR-04), hộp thư thông báo trong ứng dụng cho đội ngũ kỹ thuật.
- **Tiêu chí nghiệm thu**:
  - Trạng thái Kanban đồng bộ trực tiếp với MySQL.
  - Kỹ thuật viên nhận thông báo ngay khi có ticket mới hoặc vi phạm SLA.

## Giai Đoạn 6: DAY 6 — DASHBOARD ANALYTICS & VISUAL POLISH
- **Mục tiêu**: Màn hình Báo cáo Thống kê (SCR-05) với 4 thẻ KPI (Tổng ticket, MTTA, MTTR, Tỷ lệ tuân thủ SLA), biểu đồ cột theo ngày, biểu đồ tròn mức ưu tiên; rà soát đối sánh trực quan 7 màn hình theo wireframes gốc, tối ưu responsive.
- **Tiêu chí nghiệm thu**:
  - 100% chỉ số được tính toán bằng truy vấn SQL tổng hợp (SQL aggregation), không tính toán giả lập ở React.
  - Tỷ lệ tuân thủ SLA và MTTA/MTTR chính xác theo công thức quy định.

## Giai Đoạn 7: DAY 7 — FULL INTEGRATION & ACCEPTANCE
- **Mục tiêu**: Thực hiện kịch bản kiểm thử tích hợp xuyên suốt từ đăng nhập Admin cấu hình luật -> End-User tạo ticket -> Phân loại ưu tiên -> Thông báo kỹ thuật viên -> IT Agent tiếp nhận & giải quyết -> Thống kê cập nhật trên Dashboard.
- **Tiêu chí nghiệm thu**:
  - Toàn bộ kịch bản E2E hoàn tất trơn tru.
  - Kiểm thử tự động đạt 100% test case trọng yếu.
  - Khởi động lại hệ thống dữ liệu không bị thất thoát.
  - Báo cáo kiểm toán thư mục dự án `docs/PROJECT_FOLDER_REVIEW.md`.
