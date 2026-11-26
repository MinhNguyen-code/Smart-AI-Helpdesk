# Phân loại và phân công ticket — R1/R2

Ngày 25/11/2026. Chủ dự án đã chọn: **tự giao cho người đang nhận việc, ít ticket mở nhất; IT_AGENT xem hàng chờ chung nhưng chỉ xử lý ticket trong nhóm mình**. Giữ `OPEN → IN_PROGRESS → RESOLVED`, priority P1–P4 và SLA hiện hành.

## Hành vi

- Admin quản lý nhóm, thành viên, trạng thái nhận việc, giới hạn tải và tuyến danh mục tại `/routing`. Nút tạo bốn nhóm chỉ tạo **bản nháp**, chưa ghi DB. Thành viên phải được Admin chọn thực tế; ứng dụng không tự cấp vai trò hoặc mặc định một người thuộc cả bốn nhóm.
- Bốn nhóm khởi đầu: `NETWORK`, `APPLICATION_LMS`, `HARDWARE_ONSITE`, `ACCOUNT_ACCESS`. Ánh xạ theo tên category thực tế, không hardcode ID. Có thể thêm nhóm, đổi tên hoặc tạm ngừng; mã nhóm giữ ổn định.
- Khi phân tuyến được bật, người gửi có thể chọn danh mục hoặc “Tự động phân loại”. Server chuẩn hóa dấu tiếng Việt/hoa thường và khớp cụm từ ở ranh giới từ, từng trường và từng mệnh đề. Chặn các phủ định trực tiếp `không bị`, `không còn`, `chưa`, `đã hết`; đây không phải bộ hiểu ngôn ngữ tổng quát.
- Chọn tự động: một nhóm khớp từ khóa → giao nhóm; đúng một category khớp → lưu category đó. Nếu nhiều category cùng một nhóm cùng khớp thì nhóm được xác định, category vẫn null. Không có dấu hiệu hoặc khớp nhiều nhóm → `REVIEW_REQUIRED`, không đoán người nhận.
- Chọn category cụ thể: một tuyến active → dùng tuyến đó; keyword của nhóm khác, nhiều nhóm hoặc category chưa có tuyến → `REVIEW_REQUIRED`. Không tự thay category đã chọn bằng suy đoán khác.
- `ASSIGNED`, `TEAM_QUEUE`, `REVIEW_REQUIRED` là trạng thái **phân tuyến riêng**, không thêm cột trạng thái vào workflow ba bước. Không có người đủ điều kiện hoặc đạt tải tối đa → `TEAM_QUEUE` trong đúng nhóm. Admin nhận thông báo khi cần điều phối.
- Người đủ điều kiện: tài khoản active, vai trò IT_AGENT, thành viên đúng nhóm active, đang nhận việc, không phải người báo và chưa đạt giới hạn. Tải là tổng số ticket `OPEN`/`IN_PROGRESS` được giao trên mọi nhóm, gồm ticket cũ. Mặc định 10, Admin chỉnh 1–100.
- Chọn tải thấp nhất; bằng tải chọn người lâu chưa được giao nhất, tiếp theo ID nhỏ nhất. Lưu thời điểm giao trên mọi membership của người đó để người thuộc nhiều nhóm không được ưu tiên sai.
- Giao việc ngay khi tạo; không tự chia lại các ticket đang mở khi sửa cấu hình, bật nhận việc hoặc giải quyết một ticket. Ticket chờ nhóm có thể được thành viên đủ tải tự nhận; Admin có thể chuyển/giao lại với lý do.

## Quyền

| Người dùng | Đọc | Xử lý ticket đã phân tuyến |
| --- | --- | --- |
| END_USER | Ticket của mình; nội dung công khai | Phản hồi công khai/đính kèm của mình |
| IT_AGENT ngoài nhóm | Hàng chờ chung, detail, ảnh và phản hồi công khai | Không ACK, đổi trạng thái, phân công, phản hồi hoặc tải ảnh lên |
| Thành viên cùng nhóm chưa được giao | Như trên và ghi chú nội bộ | Chỉ tự nhận ticket chưa có người nếu đang nhận việc và còn tải; không giành ticket đã giao |
| Thành viên đang phụ trách | Như trên | ACK, phản hồi public/internal, ảnh và ba trạng thái MVP |
| ADMIN | Tất cả | Quản lý cấu hình, giao/chuyển nhóm/người; đổi người đã giao phải có lý do |

Người báo là IT_AGENT vẫn được phản hồi/đính kèm công khai cho ticket của mình nhưng không tự xử lý hoặc xem nội bộ qua tư cách người báo. Role/is_active được đọc lại từ DB; mutation kiểm tra lại người và membership trong transaction. Internal comment, history COMMENT_ADDED tương ứng/orphan và lý do ROUTED không lộ cho END_USER/agent ngoài nhóm. Attachment vẫn là nội dung công khai của ticket đối với các staff được xem hàng chờ chung.

Ticket lịch sử có `routing_status=null` giữ quyền MVP cũ và không bị backfill. Admin có thể chủ động đưa một ticket cũ chưa giải quyết vào phân tuyến. Tắt cờ chỉ dừng tạo/phân tuyến mới; **không bỏ quyền bảo vệ của ticket đã có routing_status**. Phải giữ code mới khi đã có dữ liệu phân tuyến.

## API

Tất cả dùng phiên server hiện có; mutation bắt buộc Origin + CSRF. Không có endpoint bỏ qua Google.

| Endpoint | Quyền / contract |
| --- | --- |
| `GET /api/v1/routing/capabilities` | User active; `{enabled}` |
| `GET /api/v1/routing/settings` | ADMIN, bật cờ; version, auto_assign, max_open_per_agent, units/members, routes, active agents + open_count, categories/defaults |
| `PUT /api/v1/routing/settings` | ADMIN; `{version,auto_assign,max_open_per_agent,units:[{code,name,is_active,members:[{user_id,is_available}]}],routes:[{category_id,unit_code,keywords:[]}]}`. Lưu toàn cấu hình atomically, tăng version, audit. Tối đa 20 nhóm/200 memberships/200 routes/20 keywords mỗi route. |
| `GET /api/v1/routing/units` | ADMIN/IT_AGENT; danh sách nhóm active, không lộ email/thành viên cho END_USER |
| `GET /api/v1/routing/me` | IT_AGENT; `{enabled,version,units:[{id,name,is_available}]}` |
| `PATCH /api/v1/routing/availability` | IT_AGENT; `{version,unit_id,is_available}`; chỉ membership của chính mình, tăng version và audit |
| `PATCH /api/v1/tickets/:id/routing` | ADMIN; `{version,unit_id,reason,assignee_id?}`. Bỏ assignee_id = tự chọn; null = chờ nhóm; số = chọn người hợp lệ. Giữ category, priority/evidence, deadlines, ACK và workflow status. Ticket RESOLVED bị 409. |
| `PATCH /api/v1/tickets/:id/assign` | Với ticket routed: chỉ người hợp lệ đúng nhóm; IT_AGENT chỉ tự nhận ticket chưa giao. `{version,assignee_id,reason?}`; lý do bắt buộc nếu thay người đang phụ trách. |
| `POST /api/v1/tickets` | Khi bật cờ cho phép category_id null/không truyền để tự phân loại; các trường owner_unit_id/assignee_id/routing_status từ client bị bỏ qua. |
| `GET /api/v1/tickets?routing_status=...` | Lọc server trước phân trang, giữ quyền đọc hiện tại. Ticket trả owner unit/status và routing_permissions; evidence chỉ cho Admin/thành viên nội bộ. |

Version cũ → 409, không ghi một phần; client giữ draft cấu hình và yêu cầu tải lại, detail ticket tải lại sau xung đột. Không bỏ thành viên đang có ticket mở hoặc ngừng nhóm còn ticket mở (409); cần chuyển trước. Đổi role/tạm khóa user không tự chuyển ticket của họ: Admin cần chủ động giao lại; bộ chọn luôn loại user inactive/không còn IT_AGENT.

## Transaction và thông báo

READ COMMITTED + singleton `routing_settings FOR UPDATE` serialize các lần phân bổ và đổi cấu hình. Lock theo thứ tự cấu hình → ticket → users/memberships; đếm tải sau lock thấy commit mới nhất. Cách này phù hợp quy mô MVP, chưa phải bộ lập lịch phân tán. Cùng version: chỉ một thao tác giao/chuyển thành công, thao tác còn lại 409.

Ticket + kết quả phân tuyến + history/audit + notification/outbox ghi cùng transaction. Tạo ticket/SLA breach gửi Admin và người được giao; nếu chưa giao thì gửi thành viên đang nhận việc trong nhóm; cần điều phối chỉ gửi Admin. Thông báo dùng mã ticket, không chứa nội bộ. SLA alert vẫn chống trùng theo ticket/nghĩa vụ/người nhận. Cấu hình không thay snapshot priority/SLA của ticket cũ.

## Dữ liệu và rollout

Migration mới duy nhất: `server/migrations/20261125000007_add_ticket_routing.js`:

- Bốn bảng: `routing_settings`, `support_units`, `support_unit_memberships`, `category_unit_routes`.
- Tickets: nullable owner_unit_id (FK RESTRICT), routing_status enum, routing_evidence JSON; index owner_unit_id/status. Không backfill, không seed thành viên.
- Preflight trong migration xác minh selected database và exact migration account bằng `assertIdentity`. `targetPolicy.js`, Knex identity guards và account allowlist không đổi.
- Down từ chối chạy tự động để tránh xóa tuyến/lịch sử. MySQL DDL có implicit commit: khi lỗi dừng rollout, kiểm schema và forward recovery có review; không rollback phá dữ liệu.
- `TICKET_ROUTING_ENABLED=false` mặc định. Readiness khi bật cờ kiểm có routing_settings và cột routing_status; schema chưa nâng không báo READY.

Chỉ CI mới chạy fixtures/migration ở lượt này. Node container chia network namespace với MySQL service, không có host ports/volume DB, account/schema chỉ trong service, không secrets local/production. `ciRoutingMigration.js` và `routingApi.test.js` kiểm đủ dấu hiệu GitHub-hosted CI **trước import DB/dotenv**, rồi xác minh CURRENT_USER/DATABASE thật. Migration rehearsal đi từ sáu migration MVP có ticket tổng hợp → migration mới; kiểm giữ nguyên ticket/comment/history và routing null, chạy latest lần hai không thêm migration. Integration chạy HTTP/session MySQL tổng hợp, không phải Google browser acceptance.

Để bật local sau khi CI PASS: chủ dự án duyệt riêng migration số 7 trên `smart_it_helpdesk_new_dev` bằng `sih_new_dev_migrate@127.0.0.1`, xác nhận backup schema + private uploads và kế hoạch forward recovery. Sau migrate/kiểm schema, bật cờ, restart API, Admin chọn thành viên thực tế và lưu tuyến; nghiệm thu ticket tổng hợp bằng Google theo nhóm. Không chạy fixture/seed/reset/destructive integration local. Không tự sửa `.env` trong lượt chuẩn bị này.

## Phạm vi chưa triển khai

Không LLM/provider, alias/fuzzy v2, phân rã nhiều nhóm/subtask, lịch ca tự động, ước lượng độ khó hoặc tự lấy lại ticket khi người dùng vắng. “Đang nhận việc” là trạng thái do agent/Admin khai báo, không suy ra từ online Google. Chưa đo accuracy trên dữ liệu thật hoặc tải phân tuyến quy mô lớn; benchmark CI concurrency chỉ xác minh invariant chia tải của fixtures.

Kết quả kiểm chứng và giới hạn hiện tại: [báo cáo routing](phase-reports/TICKET-ROUTING-2026-11-25.md).
