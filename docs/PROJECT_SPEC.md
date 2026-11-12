# SMART IT HELPDESK — ĐẶC TẢ DỰ ÁN (PROJECT SPECIFICATION)

## 1. Thông Tin Chung
- **Tên dự án**: Smart IT Helpdesk for System Reliability Management
- **Tên tiếng Việt**: Hệ thống quản lý ticket phản hồi sự cố có ưu tiên tự động
- **Mục tiêu nghiên cứu**:
  1. Kỹ thuật độ tin cậy trong hệ thống người dùng mạng (Reliability Engineering in Networked User Systems).
  2. Chiến lược phòng ngừa lỗi (Error Prevention Strategies).
- **Phạm vi kiến trúc**: Ứng dụng đơn tổ chức (Single-organization MVP). Không xây dựng hệ thống đa người thuê (Multi-tenant SaaS), không tích hợp cổng thanh toán hay đăng ký gói dịch vụ.

---

## 2. Báo Cáo Đối Soát và Xử Lý Mâu Thuẫn Yêu Cầu (Conflict Resolution)

Trước khi tiến hành viết code, toàn bộ workspace bao gồm `Codex.md`, `AGENTS.md`, thư mục `Diagrams/` và `Wireframe/` đã được kiểm tra kỹ lưỡng. Dưới đây là bảng phân tích mâu thuẫn và quyết định kiến trúc:

| STT | Vấn đề / Khía cạnh | Tài liệu thiết kế cũ (Diagrams / Wireframe) | Đặc tả MVP phê duyệt (Codex.md / AGENTS.md) | Quyết định xử lý chính thức |
|---|---|---|---|---|
| 1 | **Thư mục gốc & đường dẫn** | `Codex.md` gợi ý tên thư mục `smart-it-helpdesk/` | `AGENTS.md` bắt buộc: Thư mục gốc là `D:\Smart IT Helpdesk`. Tuyệt đối không tạo thư mục lồng `smart-it-helpdesk`. | **Tuân thủ AGENTS.md**: Toàn bộ mã nguồn, cấu hình, migrations và tài liệu đặt trực tiếp tại `D:\Smart IT Helpdesk`. |
| 2 | **Vị trí ảnh Wireframe** | `Codex.md` ghi đường dẫn `docs/references/wireframes/` với tên `01-login.jpg` .. `07-rule-dialog.jpg` | Thư mục thực tế là `Wireframe/` với tên file gốc dạng băm/timestamp của chủ dự án (VD: `1791984801876_...jpg`). | **Giữ nguyên Wireframe/**: Không đổi tên, di chuyển hay xóa các file gốc. Tạo bảng ánh xạ 1-1 trong tài liệu đối soát. |
| 3 | **Mô hình tổ chức** | `Smart_IT_Helpdesk_SaaS_PROPOSED.puml` đề xuất bảng `organizations`, `organization_memberships`, `ownership_scope` | `Codex.md` Mục 2: "Single-organization application. Do not build Multi-Tenant SaaS. Do not implement billing or organization switching." | **Tuân thủ Codex.md**: Xây dựng kiến trúc Single-Organization tinh gọn, không tạo bảng tổ chức đa người thuê gây phức tạp không cần thiết. |
| 4 | **Số lượng cấp độ ưu tiên** | `Smart_IT_Helpdesk_ERD.puml` có 4 cấp độ: `P1, P2, P3, P4`. Wireframe hiển thị P1, P2, P3, P4. | `Codex.md` Mục 10: Quy tắc phân loại gồm 2 cấp độ cốt lõi: `URGENT` (Khẩn cấp) và `NORMAL` (Bình thường). | **Thống nhất giải pháp**: Thiết kế hệ thống với 2 mức ưu tiên chính thức theo Codex (`URGENT` và `NORMAL`). Ở tầng hiển thị Kanban và giao diện, ánh xạ trực quan tương thích với nhãn Wireframe (P1: URGENT, P2/P3: NORMAL). |
| 5 | **Phân quyền người dùng (Roles)** | `Smart_IT_Helpdesk_ERD.puml` có 4 vai trò: `end_user`, `it_helpdesk`, `it_manager`, `admin`. | `Codex.md` Mục 2 & 9: Đúng 3 vai trò: `ADMIN`, `IT_AGENT`, `END_USER`. | **Tuân thủ Codex.md**: 3 vai trò chuẩn: `ADMIN`, `IT_AGENT`, `END_USER`. |
| 6 | **Cơ chế xác thực (Auth)** | Wireframe 01 và `Non-Functional.png` vẽ trường mật khẩu và Bcrypt. `Smart_IT_Helpdesk_ERD.puml` có cột `password_hash`. | `Codex.md` Mục 3 & 5: Sử dụng Google OpenID Connect / OAuth 2.0 PKCE. Không lưu trữ mật khẩu người dùng, không tạo cơ chế đăng nhập mật khẩu cục bộ. | **Tuân thủ Codex.md**: Triển khai xác thực Google Sign-In chuẩn OpenID Connect với session phía server. Giữ giao diện hai cột của Wireframe 01 nhưng thay luồng nhập mật khẩu bằng nút Google Sign-In chính thức và thông báo đăng nhập hỗ trợ tài khoản BTEC FPT. |
| 7 | **Trạng thái vòng đời Ticket** | `Smart_IT_Helpdesk_ERD.puml` có 5 trạng thái: `open`, `in_progress`, `pending_user`, `resolved`, `closed`. | `Codex.md` Mục 11 & Wireframe 03 (Kanban): 3 trạng thái chuẩn: `OPEN` (Mới tạo), `IN_PROGRESS` (Đang xử lý), `RESOLVED` (Đã giải quyết). | **Tuân thủ Codex.md & Wireframe 03**: Triển khai 3 trạng thái tương ứng 3 cột Kanban: `OPEN`, `IN_PROGRESS`, `RESOLVED`. |
| 8 | **Công nghệ backend** | `Diagrams/Non-Functional.png` ghi chú chuẩn PSR-12 (Laravel). | `Codex.md` Mục 3: Node.js + Express + Knex + MySQL. | **Tuân thủ Codex.md**: Công nghệ chuẩn là Node.js + Express + Knex.js + MySQL 8.x. |

---

## 3. Ánh Xạ Wireframe Gốc và Màn Hình Ứng Dụng

| ID Màn hình | Tên màn hình | File ảnh gốc trong `Wireframe/` | Nội dung giao diện chính |
|---|---|---|---|
| **SCR-01** | **Đăng nhập (Login)** | `1791984801876_..._9885f96fbcf847753292da33e71705db.jpg` | Giao diện 2 cột: Cột trái giới thiệu cổng CNTT BTEC FPT & minh họa bàn làm việc; Cột phải đăng nhập với Google, điều khoản hỗ trợ. |
| **SCR-02** | **Tạo Ticket mới (Create Ticket)** | `1791984953566_..._49f6a9e4e391115747793a0fa89a546d.jpg` | Biểu mẫu căn giữa: Tiêu đề, Mức độ ảnh hưởng (Cá nhân, Phòng ban, Toàn tổ chức), Mô tả chi tiết (hỗ trợ Ctrl+V dán ảnh), Đính kèm file, Nút Hủy và Gửi. |
| **SCR-03** | **Bảng Kanban (Kanban Board)** | `1791985471445_..._7e1fffe1e26b3700b14d8b065806678b.jpg` | 3 cột (MỚI TẠO, ĐANG XỬ LÝ, ĐÃ GIẢI QUYẾT), thanh tìm kiếm & sắp xếp SLA, thẻ ticket hiển thị mã, mức ưu tiên, đếm ngược thời gian SLA. |
| **SCR-04** | **Chi tiết Ticket & SLA (Detail Modal)**| `1791985886780_..._b8b66d315010cf814337d8c47e5fc087.jpg` | Modal chi tiết: Cột trái mô tả, ảnh đính kèm, luồng trao đổi phản hồi; Cột phải hộp cảnh báo SLA đếm ngược, chuyển trạng thái, người phụ trách, tag từ khóa Rule-Based. |
| **SCR-05** | **Báo cáo Thống kê (Dashboard)** | `1791986159563_..._d175ffb4b10256f8775a5010e50f5fdc.jpg` | 4 thẻ KPI (Tổng ticket, MTTA, MTTR, Tỷ lệ tuân thủ SLA), Biểu đồ cột Ticket theo ngày, Biểu đồ tròn Phân bổ mức độ ưu tiên. |
| **SCR-06** | **Danh sách Quy tắc Từ khóa (Rules List)**| `1791986296193_..._6a4d9f489bd7328b27f6346ec969fcdb.jpg` | Bảng quản lý từ khóa tự động phân loại ưu tiên (Từ khóa, Hành động gán, Trạng thái Active/Inactive, Sửa/Xóa quy tắc), dành riêng cho Admin. |
| **SCR-07** | **Hộp thoại Thêm/Sửa Quy tắc (Rule Dialog)**| `1791986298736_..._8d08755335cd2561db194ce9a91c99e4.jpg` | Dialog modal thêm mới/chỉnh sửa từ khóa: Nhập từ khóa, Chọn mức độ ưu tiên (P1 - Urgent / P2/P3 - Normal), Nút Hủy và Lưu. |

---

## 4. Tài Khoản Khởi Tạo và Phân Quyền
Hệ thống cấu hình danh sách cho phép (Allowlist) với 3 tài khoản Google thực tế được đề xuất:
1. `binmin109@gmail.com` -> Vai trò **ADMIN**
2. `nguyenbinhminh.1009.vn@gmail.com` -> Vai trò **IT_AGENT**
3. `nguyenbinhminh.2006.vn@gmail.com` -> Vai trò **END_USER**

Hệ thống bảo đảm tài khoản chỉ được kích hoạt sau khi xác thực thành công qua Google và có vai trò hợp lệ trong cơ sở dữ liệu.
