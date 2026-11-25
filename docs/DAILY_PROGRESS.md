# SMART IT HELPDESK — NHẬT KÝ TIẾN ĐỘ HẰNG NGÀY (DAILY PROGRESS)

## Phân tuyến theo nhóm — 25/11/2026, sau nghiệm thu MVP

Chủ dự án chọn auto-assign cho người đúng nhóm đang nhận việc có ít ticket mở nhất; IT_AGENT đọc hàng chờ chung, chỉ xử lý trong nhóm. Code migration số 7/API/UI/guards và bộ kiểm tra CI đã thêm, mặc định tắt. Local chưa migrate, chưa cấu hình thành viên thật, không đổi ba trạng thái MVP. Tiến độ và số kiểm chứng cuối: [TICKET-ROUTING-2026-11-25.md](phase-reports/TICKET-ROUTING-2026-11-25.md). Các checkpoint lịch sử dưới đây giữ nguyên theo ngày.

| Giai đoạn | Ngày thực hiện | Mục tiêu trọng tâm | Trạng thái | Báo cáo chi tiết |
|---|---|---|---|---|
| **Day 1** | 10/11/2026 | Nền tảng React/Vite, Express, Knex, migration đầu tiên, health/ready và tài liệu | **PARTIAL tại checkpoint** (MySQL thật được nghiệm thu ngày 11/11; kết quả test lịch sử chưa đủ log để xác minh) | `docs/phase-reports/DAY-01-REPORT.md` |
| **Day 2** | 12/11/2026 | Google OIDC, allowlist ba vai trò, session MySQL, RBAC, login theo wireframe 01 | **PARTIAL** (ba account đã liên kết Google; chưa nghiệm thu đầy đủ vai trò, từ chối ngoài allowlist và logout) | `docs/phase-reports/DAY-02-REPORT.md` |
| **Day 3** | 12/11/2026 | Ticket Core, chi tiết/hội thoại/lịch sử, phân công, ảnh đính kèm riêng tư, phân quyền và test MySQL | **PARTIAL** (API + test MySQL PASS; chưa nghiệm thu trọn luồng UI bằng phiên Google thật và restart persistence) | `docs/phase-reports/DAY-03-REPORT.md` |
| **Day 4** | 12/11/2026 | Rules CRUD, SLA P1–P4, worker và màn hình SCR-06/07 | **PARTIAL** (API/MySQL và giao diện mẫu PASS; chưa kiểm tra browser bằng Admin thật) | `docs/phase-reports/DAY-04-REPORT.md` |
| **Day 5** | 12/11/2026 | Kanban 3 cột, chi tiết ticket và thông báo trong ứng dụng | **PARTIAL** (API notification/MySQL PASS; chưa chạy luồng ticket mới trên browser thật) | `docs/phase-reports/DAY-05-REPORT.md` |
| **Day 6** | 12/11/2026 | Dashboard SQL, MTTA/MTTR/SLA, biểu đồ và ảnh 7 màn | **PARTIAL** (aggregation test PASS; kiểm tràn ngang 5 màn/5 kích thước; chưa nghiệm thu Admin browser) | `docs/phase-reports/DAY-06-REPORT.md` |
| **Day 7** | 12/11/2026; cập nhật 17/11 | Hồi quy, unique Rules, ACK/MTTA, SMTP outbox, worker recovery, browser API/MySQL, performance và availability monitor | **PARTIAL** (luồng API/MySQL bằng session test PASS; Google ADMIN/END_USER thật, SMTP thật và uptime 99% còn chờ điều kiện ngoài) | `docs/phase-reports/DAY-07-REPORT.md`, `docs/phase-reports/FINAL-ACCEPTANCE-2026-11-17.md` |

## Tiếp tục nghiệm thu 17/11/2026

Backend unit/API 22/22, MySQL transaction rollback 1/1, frontend 4/4, browser wireframe 9/9, browser production 7/7, build PASS và npm audit 0 vulnerabilities. Full MySQL integration/live browser API chưa chạy lại vì các script hiện có dùng `DELETE` fixture và cập nhật tạm policy, trái giới hạn SQL lượt này. Benchmark bundle production với API fixture: Kanban p95 262/1100/1604 ms tại 1/4/8 client, 40 lượt mỗi mức, 0 lỗi; không là phép đo MySQL nhiều ticket. `/ready` production + MySQL thật p95 5,7/6,1/11,8 ms, 0/120 lỗi. Monitor v2 kiểm cả web, health, ready với timezone `Asia/Ho_Chi_Minh`; snapshot 04:19 local có 5 mẫu v2 ngoài giờ, uptime 99% vẫn NOT VERIFIED. Google ADMIN/END_USER và SMTP thật vẫn chờ điều kiện ngoài. Báo cáo chi tiết: `docs/phase-reports/FINAL-ACCEPTANCE-CONTINUATION-2026-11-17.md`.

## Tổ chức repository — 17/11/2026

Các số liệu ở mục trên là snapshot nghiệm thu trước đó, được giữ nguyên. Báo cáo kiểm kê sau mốc này tại `docs/phase-reports/PRE-PUSH-AUDIT-2026-11-17.md` ghi preview 10/10 và production fixture 9/9 ở lần chạy riêng. Theo `docs/REPOSITORY_ORGANIZATION_PLAN.md`, Bước 2 chỉ chuyển ba báo cáo frontend có ngày tháng vào `docs/phase-reports/` và đồng bộ tham chiếu/tài liệu. Lần kiểm chứng riêng cho Bước 2: `npm.cmd test` 22/22 sau khi chạy lại với quyền loopback (lần đầu 14/22 vì `EACCES` loopback), `npm.cmd run test:frontend` 4/4, `npm.cmd run build` PASS, production browser guard fixture 1/1. Không chạy migration, seed hoặc test MySQL ghi/xóa; không dùng fixture để xác nhận Google E2E. Trạng thái nghiệm thu chức năng tổng thể vẫn **PARTIAL**.

## Google thật và ổn định MVP — 25/11/2026

**PASS cho kịch bản nghiệm thu đã quan sát:** chủ dự án trực tiếp đăng nhập Google ba vai trò trong Edge; END_USER tạo ticket tổng hợp kèm ảnh, IT_AGENT nhận/ACK/phản hồi/giải quyết, ADMIN kiểm Rules/SLA/users/dashboard. END_USER bị 404 khi đọc ticket người khác; END_USER/IT_AGENT bị 403 khi đọc users. Restart API giữ phiên ADMIN và nguyên ticket/ảnh/comments/history/notification; END_USER sau đó mở thông báo và đọc kết quả RESOLVED. Chỉ tạo/xử lý một ticket nghiệm thu có nhãn; không chạy fixture SQL, migration hay cleanup local.

Sửa hai lỗi frontend được phát hiện: chi tiết vừa tạo không tải lại ảnh/lịch sử, và lỗi tạm thời 429/503 bị hiểu nhầm thành đăng xuất. Frontend **15/15**, build **PASS**, lặp lại trên snapshot nhánh UI sạch. Nhóm worker: backend snapshot sạch **27/27** qua hai lần chạy không kết nối DB thành công. Nhóm priority hotfix: **6/6**, benchmark tổng hợp 500 rule/20 KB p95 **5,328 ms**, chỉ trong tiến trình. CI PR #2 tại `505baa8` xác minh **9/9 MySQL integration** trong service cô lập.

Chủ dự án chọn giữ **ba trạng thái**, SMTP để sau, lịch uptime tạm Mon–Fri 08:00–17:00 giờ Việt Nam. Không bật workflow năm trạng thái, alias/fuzzy v2, routing hay AI. Tổng dự án vẫn **PARTIAL** cho các phạm vi chưa nghiệm thu như tài khoản ngoài allowlist, backup/restore và uptime. Chi tiết: `docs/phase-reports/REAL-GOOGLE-ACCEPTANCE-2026-11-25.md` và `docs/phase-reports/LOCAL-CHANGE-REVIEW-2026-11-25.md`.
