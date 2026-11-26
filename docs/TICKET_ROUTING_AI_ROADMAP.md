# Kế hoạch phân tuyến ticket theo đơn vị và ứng dụng AI/LLM

> Cập nhật 25/11/2026: chủ dự án chọn tự giao cho người đang nhận việc ít ticket mở nhất và IT_AGENT đọc queue chung, chỉ xử lý trong nhóm. R1/R2 đã có code/migration mới/UI; CI 45596773838 PASS (MySQL 19/19, upgrade/restore cô lập), chưa bật local. Contract hiện hành của bản code tại [TICKET_ROUTING_SPEC.md](TICKET_ROUTING_SPEC.md), evidence tại [báo cáo routing](phase-reports/TICKET-ROUTING-2026-11-25.md). Nội dung ngày 19/11 dưới đây là roadmap lịch sử; lựa chọn auto-assignment ngày 25/11 thay bước duyệt từng ticket trong R1/R2. R3/LLM tiếp tục chưa triển khai.

Ngày lập: 19/11/2026. Trạng thái: **bốn nhóm khởi đầu đã được chủ dự án xác nhận; routing và LLM chưa triển khai**. Danh sách thành viên, quyền chuyển tuyến và migration vẫn chờ review riêng.

## 1. Nền tảng đã có và khoảng trống

Ứng dụng hiện là một tổ chức, ba vai trò `ADMIN`, `IT_AGENT`, `END_USER`. Ticket có `category_id`, `assignee_id`, priority P1–P4, deadline SLA snapshot, history và notification. API hiện cho Admin gán một IT_AGENT, IT_AGENT tự nhận; khi tạo ticket, hệ thống thông báo cho toàn bộ staff đang active. Schema **chưa có** đơn vị hỗ trợ, thành viên đơn vị, tuyến category→đơn vị, năng lực/ca trực hay subtask. Các service workflow năm trạng thái đang ở dạng đề xuất, chưa gắn router. Vì vậy không thể tuyên bố đã tự phân công cho từng đơn vị.

Phạm vi mục tiêu mới: một ticket có **đơn vị chịu trách nhiệm chính** và người xử lý trong đơn vị; khi một sự cố thực sự cần nhiều chuyên môn, ticket chính có thể có các **nhiệm vụ con** cho các đơn vị khác. Giữ một mã ticket và một luồng cập nhật cho người báo. Không tạo multi-tenant SaaS.

## 2. Luồng nghiệp vụ đề xuất

```text
Người dùng gửi ticket
  → rule-based priority P1–P4 + snapshot SLA hiện hành
  → xác định category và ứng viên đơn vị theo bảng tuyến đã duyệt
  → nếu đúng một tuyến hợp lệ: đề xuất đơn vị chính
     nếu thiếu/đụng tuyến: hàng chờ Admin/IT Agent điều phối
  → người có quyền xác nhận đơn vị và agent
  → đơn vị nhận/ACK, xử lý, phản hồi, hoàn tất
  → nếu cần nhiều đơn vị: đề xuất subtask → agent/Admin duyệt → giao việc
  → parent giữ SLA, history, notification và báo cáo tổng thể
```

Không cho bộ phân tuyến thay `priority`, response/resolution deadline hoặc trạng thái. `organization` vẫn P1 theo chính sách hiện hành. Ticket đã tạo giữ nguyên bằng chứng phân loại và SLA dù cấu hình tuyến thay đổi.

## 3. Quy tắc phân tuyến xác định được

Chủ dự án đã chọn **bốn nhóm mẫu làm cấu hình khởi đầu**. Truy vấn Knex chỉ đọc trong lượt bổ sung ngày 19/11 xác minh `DATABASE()/CURRENT_USER()` đúng account runtime rồi đọc `categories(name,is_active)` trên cả `smart_it_helpdesk_new_dev` và `smart_it_helpdesk_new_test`: mỗi schema có đúng bốn category dưới đây, tất cả đang active. Đây là **ánh xạ đề xuất để triển khai**, chưa có bản ghi đơn vị hay tuyến nào được tạo. Mã nhóm ổn định; không hardcode `category_id` tự tăng.

| Category hiện có | Mã nhóm đề xuất | Tên nhóm hiển thị |
| --- | --- | --- |
| `Mạng & Kết nối` | `NETWORK` | Network |
| `Phần mềm & Hệ thống LMS` | `APPLICATION_LMS` | Application/LMS |
| `Phần cứng & Thiết bị` | `HARDWARE_ONSITE` | Hardware/Onsite |
| `Tài khoản & Quyền truy cập` | `ACCOUNT_ACCESS` | Account/Access |

Ví dụ: ticket danh mục `Mạng & Kết nối` với mô tả mất Wi-Fi gợi ý `NETWORK`; ticket LMS gợi ý `APPLICATION_LMS`; máy in gợi ý `HARDWARE_ONSITE`; tài khoản/đăng nhập gợi ý `ACCOUNT_ACCESS`. Từ khóa ưu tiên như `server sập` hoặc `lỗi 500` **không tự xác định đơn vị** vì cùng một triệu chứng có thể thuộc hạ tầng hoặc ứng dụng. Category thiếu, inactive, không có tuyến, hoặc tín hiệu nội dung xung đột với category phải vào hàng chờ điều phối để staff xác nhận. Việc chủ dự án chọn bốn nhóm không tự phê duyệt quyền staff, seed hoặc migration.

1. Admin cấu hình thành viên active và ánh xạ category→một tuyến chính từ bốn nhóm trên; cho phép sửa tên hiển thị và thêm nhóm về sau mà vẫn giữ mã cho lịch sử.
2. Category active có một tuyến chính và có thể có tuyến dự phòng. Chỉ dùng keyword kỹ thuật để đề xuất khi danh mục không đủ rõ; danh mục và từ khóa mâu thuẫn thì đưa vào hàng chờ, không tự gán.
3. Ưu tiên đơn vị đủ năng lực và đang nhận việc. Số ticket mở, ca trực và SLA sắp đến hạn là **tín hiệu**, không tự thay quyền phê duyệt. Không chọn agent chỉ bằng số ticket nếu chưa có dữ liệu độ khó/thời gian rảnh.
4. Quyết định lưu `routing_version`, nguồn (`category`, `rule`, `manual`), ID cấu hình và lý do ngắn. Mọi đổi đơn vị/agent ghi actor, thời gian, old/new vào history/audit; ghi notification trong cùng transaction.
5. Nếu đơn vị bị vô hiệu hoặc không có người nhận, ticket vẫn tồn tại ở hàng chờ điều phối; cảnh báo P1/SLA tiếp tục hoạt động. Không tự gán cho tài khoản inactive.
6. Dùng `version` hiện có và row lock cho assignment/reassignment; retry cùng request không tạo history/notification trùng. Hai Admin thao tác đồng thời phải nhận một thành công và một 409 hoặc kết quả idempotent đã được định nghĩa.

## 4. Lộ trình dữ liệu và API (chưa áp dụng)

| Phase | Thay đổi đề xuất | Tiền điều kiện |
| --- | --- | --- |
| R1: tuyến đơn vị | Migration **mới** thêm `support_units`, `support_unit_memberships`, `category_unit_routes`; thêm nullable `tickets.owner_unit_id` và index thích hợp. Không backfill mù; ticket cũ có owner unit null và vẫn xem/xử lý như trước. | PR #2 đã tích hợp, bốn mã nhóm ở Mục 3, quyết định quyền staff, review DDL và kiểm kê schema mới trước write. |
| R2: quyết định và UI | Admin CRUD đơn vị/tuyến, hàng chờ chưa định tuyến, gợi ý tuyến, xác nhận/chuyển đơn vị, chọn agent thuộc đơn vị; hiển thị owner unit và lịch sử trong Ticket Detail/Kanban. | R1 test MySQL/rollback-forward PASS; API/RBAC contract được duyệt. |
| R3: nhiều đơn vị | Bảng `ticket_tasks` hoặc tương đương với parent ticket, unit, assignee, status, version, timestamps; subtask chỉ sau khi staff duyệt đề xuất phân rã. | Mô hình parent/subtask, SLA, analytics và quyền đọc đã được chốt; migration riêng. |

API đề xuất, chưa phải contract đang chạy: `GET /api/v1/support-units`; `GET /api/v1/tickets/:id/routing-suggestions`; `PATCH /api/v1/tickets/:id/owner-unit` với `{unit_id, version, reason}`; sau R3 mới có `POST /api/v1/tickets/:id/tasks` và endpoint giao nhiệm vụ. Admin quản lý tuyến; IT_AGENT chỉ nhận trong đơn vị được phép hoặc đưa yêu cầu chuyển tuyến; END_USER chỉ thấy đơn vị phụ trách công khai, không thấy ghi chú nội bộ hay danh sách nhân sự nhạy cảm. **Quyền IT_AGENT hiện xem toàn queue**; nếu muốn giới hạn theo đơn vị phải là quyết định sản phẩm riêng với kiểm thử IDOR đầy đủ.

Migration cần preflight `DATABASE()/CURRENT_USER()`, số hàng và index hiện hữu trên `smart_it_helpdesk_new_test`, rồi thử migration/test cô lập. Chỉ triển khai trên hai schema project-owned sau phê duyệt; không sửa migration cũ, không ghi hai schema lịch sử. MySQL DDL có thể tự commit, nên cần kế hoạch forward recovery và backup được chủ dự án duyệt trước rollout.

## 5. AI/LLM: trợ lý, không là nguồn quyết định cuối

**A0 — chuẩn hóa rule engine:** hoàn thiện alias, phủ định, fuzzy có giới hạn và evidence v2 sau gate PR #2. Hotfix hẹp hiện tại chỉ chặn vài mẫu phủ định trực tiếp; chưa phải v2. Đo false positive/false negative trên tập ca tiếng Việt trước khi mở rộng.

**A1 — gợi ý routing không LLM:** tính ứng viên từ category/rule/đơn vị, hiển thị lý do và nút duyệt. Đây là baseline để đo lợi ích thật của AI. Không có provider, không gửi dữ liệu ra ngoài.

**A2 — LLM thử nghiệm trên dữ liệu tổng hợp:** provider adapter chỉ nhận dữ liệu tối thiểu đã làm sạch, trả JSON theo schema: `suggested_unit_codes` (tối đa 3), `suggested_category_code` hoặc null, `subtask_proposals` (tối đa 5, chỉ mô tả ngắn), `reason`, `needs_review`. Server kiểm tra mã unit/category có tồn tại và active, giới hạn độ dài, từ chối trường thừa/JSON sai. Gợi ý chỉ hiện cho staff có quyền; không đổi DB ticket chính. [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) và [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output) đều hỗ trợ đầu ra theo schema; schema vẫn không thay kiểm tra nghiệp vụ phía server.

**A3 — pilot thật có kiểm soát:** chỉ sau khi chủ dự án duyệt nhà cung cấp, chi phí, nơi xử lý dữ liệu, chính sách lưu giữ, loại dữ liệu được chia sẻ và người duyệt. Intent job ghi trong transaction tạo ticket hoặc có reconciler chống mất job; worker có timeout, lease, retry/backoff, deduplication và kill switch. API tạo ticket không chờ LLM. Không gửi attachment, comment nội bộ, email, Google subject, cookie, token hoặc thông tin nhận dạng nếu không có chính sách riêng. Không lưu prompt/response thô mặc định.

Nội dung ticket là đầu vào không đáng tin. LLM không có quyền gọi SQL, gửi email, đổi priority/SLA/assignee/role hoặc thực thi mã. Mọi đầu ra được xem như gợi ý chưa tin cậy và cần người có quyền duyệt. Thiết kế này phù hợp với hướng dẫn [OWASP về prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/): hạn chế quyền, kiểm tra đầu ra và đặt con người ở bước có hệ quả. Tài liệu [AI_FALLBACK_DESIGN.md](AI_FALLBACK_DESIGN.md) chi tiết hóa job, privacy và lỗi provider; nó vẫn **DESIGN ONLY / DISABLED**.

## 6. Kiểm thử và tiêu chí nghiệm thu

| Gate | Tiêu chí cần chứng minh |
| --- | --- |
| R1 | Không mất ticket/assignee/history hiện có; FK/index đúng; ticket cũ có `owner_unit_id=null`; migration chỉ chạy trên schema mới đã duyệt. |
| R2 | Category rõ cho đúng một tuyến; mơ hồ về queue; Admin đổi unit có audit; agent inactive/ngoài unit không được nhận; END_USER không xem ticket khác; hai thao tác đồng thời không mất cập nhật; restart vẫn giữ tuyến. |
| R3 | Một parent và các task con không nhân đôi KPI ticket; trạng thái/SLA parent có định nghĩa; task chỉ hiển thị cho đúng staff; hai đơn vị xử lý độc lập nhưng người báo có một luồng tổng hợp. |
| A0/A1 | Bộ ca tiếng Việt gồm phủ định, alias, acronym, ảnh hưởng toàn tổ chức, rule xung đột; đo độ chính xác phân tuyến và tỷ lệ cần duyệt. Benchmark rule engine p95 ≤500 ms trên bộ 500 rule/20 KB; benchmark HTTP/MySQL/concurrency riêng. |
| A2/A3 | JSON sai/timeout/provider down không chặn tạo ticket; retry không sinh gợi ý trùng; prompt injection không làm lộ secret hay tự thay ticket; RBAC/IDOR, audit, redaction và chi phí được đo. Chỉ dùng ticket tổng hợp khi chưa có phê duyệt dữ liệu thật. |

Chưa có số đo accuracy/uptime hay bằng chứng LLM thật. Bốn nhóm khởi đầu đã được xác nhận; ngưỡng accuracy tối thiểu, thành viên nhóm, quyền xem/chuyển tuyến và ca trực vẫn phải được chốt trước khi bật auto-routing. Kết quả test fixture không được gọi là Google E2E.

## 7. Thứ tự triển khai tiếp

1. Chủ dự án review/merge PR #2; bảo toàn working tree trước khi chuyển branch. Hoàn tất các gate MVP còn mở: Google ADMIN/END_USER browser, MySQL integration chưa chạy, SMTP nếu là yêu cầu, availability đủ kỳ.
2. Dùng bốn nhóm và ánh xạ category ban đầu ở Mục 3; chốt người duyệt tuyến, thành viên/ca trực, quyền IT_AGENT và việc có cần subtask đa đơn vị ngay ở R1 không. Viết API/DDL migration mới và test plan để review.
3. Triển khai R1/R2 bằng rule xác định được, đo baseline thực tế; sau đó mới quyết định R3.
4. Triển khai A0/A1, đánh giá chất lượng. Chỉ thử A2 bằng dữ liệu tổng hợp; A3 chờ chính sách provider và dữ liệu được duyệt.
