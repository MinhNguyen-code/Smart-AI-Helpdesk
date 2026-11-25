# SMART IT HELPDESK — KẾ HOẠCH KIỂM THỬ (TEST PLAN)

## 1. Mục Tiêu & Phạm Vi Kiểm Thử
Kế hoạch kiểm thử nhằm đảm bảo chất lượng, tính đúng đắn và độ tin cậy của Smart IT Helpdesk theo các tiêu chuẩn kỹ thuật:
- **Unit & Integration Testing (Backend)**: Kiểm thử tính chính xác của thuật toán phân loại tiếng Việt, tính toán hạn SLA, chuyển đổi trạng thái ticket, phân quyền RBAC và các API endpoints.
- **Database Integration Testing**: Kiểm thử thao tác cơ sở dữ liệu trên schema kiểm thử chuyên biệt `smart_it_helpdesk_new_test`. Không ghi vào hai schema lịch sử `smart_it_helpdesk_dev` và `smart_it_helpdesk_test`.
- **Frontend Component Testing**: Kiểm thử các thành phần giao diện, bộ lọc, biểu mẫu tạo ticket, hiển thị đếm ngược thời gian SLA.
- **End-to-End Testing & Visual Verification**: Kiểm thử luồng nghiệp vụ tổng thể và đối chiếu trực quan với 7 ảnh wireframe thực tế.

---

## 2. Chiến Lược Kiểm Thử Theo Từng Thành Phần

### 2.1 Backend Unit & Integration Tests
1. **Rule Engine**:
   - Khớp từ khóa tiếng Việt có dấu và không dấu ("server sập" == "server sap").
   - Quy tắc ưu tiên cao nhất trong `P1`–`P4` được chọn khi nhiều quy tắc khớp.
   - Tác động toàn tổ chức (`organization`) tự động leo thang lên `P1`.
   - Bỏ qua các quy tắc đang ở trạng thái không kích hoạt (`is_active = false`).
2. **SLA Calculation & Monitoring**:
   - Tính toán chính xác thời hạn phản hồi và giải quyết dựa theo mức ưu tiên.
   - Bắt lỗi an toàn khi chính sách SLA bị thiếu.
   - Quét phát hiện ticket quá hạn và sinh cảnh báo với khóa chống lặp (`deduplication_key`).
3. **Ticket Lifecycle & RBAC**:
   - Cho phép các bước chuyển đổi hợp lệ: `OPEN -> IN_PROGRESS -> RESOLVED`.
   - Chặn chuyển đổi sai (ví dụ `OPEN -> RESOLVED` trực tiếp hoặc người dùng phổ thông tự đổi trạng thái).
   - Kiểm tra chống tấn công IDOR: End-User không thể xem hoặc bình luận vào ticket của người khác.

### 2.2 Frontend & Visual Testing
- Kiểm thử responsive trên các độ phân giải: `1440x900`, `1280x800`, `950x900`, `768x1024`, `390x844`.
- Đối chiếu pixel & bố cục từng màn hình (SCR-01 đến SCR-07) với ảnh gốc trong thư mục `Wireframe/`.

---

## 3. Các Lệnh Thực Thi Kiểm Thử
```powershell
# Chạy toàn bộ test suites
npm test

# Chạy riêng unit test backend (Rule engine & SLA)
npm run test:unit

# Chạy test tích hợp API với Supertest
npm run test:api

# Integration test trên schema smart_it_helpdesk_new_test
npm run test:integration

# Component test với Vitest và React Testing Library
npm run test:frontend

# Browser test dùng Microsoft Edge cài sẵn
npm run test:browser

# Browser thật kết nối Express/MySQL test, session fixture chỉ tồn tại trong test (không phải Google E2E)
npm run test:browser:api

# Regression của bản build production: ?preview=1 vẫn phải về Login
npm run test:browser:production

# Kiểm tra dependency và phép đo thuật toán riêng
npm audit --audit-level=moderate
npm run benchmark:triage
npm run benchmark:triage:api
npm run report:availability
```

### Bổ sung nghiệm thu 17/11/2026

```powershell
# Chỉ đọc: xác minh đúng hai schema dự án và tài khoản runtime.
npm.cmd run db:check
npm.cmd run db:check:test

# Chỉ có transaction thử và ROLLBACK; không chạy DELETE fixture.
node --test server/tests/integration/database.test.js

# Bản build production, API fixture cô lập trong browser; không ghi MySQL.
npm.cmd run build
npm.cmd run test:browser:production
npm.cmd run benchmark:kanban:production

# Cần Express chạy NODE_ENV=production ở cổng 5002, GET /ready chỉ đọc.
$env:NODE_ENV='production'; $env:PORT='5002'; node server/src/index.js
# Trong cửa sổ PowerShell khác:
npm.cmd run benchmark:readiness

# Health, readiness và trang web; log JSONL bỏ qua bởi Git.
node server/scripts/monitorAvailability.js --once
npm.cmd run report:availability
```

`test:integration`, `test:browser:api` và `benchmark:triage:api` hiện có thao tác `DELETE` fixture và một số bài chỉnh rồi khôi phục SLA policy trong `smart_it_helpdesk_new_test`. Không chạy các lệnh này khi quy định hiện hành cấm SQL phá hủy. Kết quả PASS trước đây giữ là bằng chứng lịch sử, không thay cho kiểm tra lại lượt này.

PR 2 bổ sung regression cho ghi chú internal trong ticket detail, quyền thay đổi khi role/active flag đổi, CSRF/Origin, logout, readiness payload và dọn session hết hạn. Bài `server/tests/integration/*.test.js` có ghi/xóa SQL nên chỉ được thực thi với schema test biệt lập được phê duyệt riêng; việc thêm assertion không đồng nghĩa đã chạy thành công. Workflow `.github/workflows/ci.yml` hiện chạy unit/API, frontend, build và dependency audit; chưa có MySQL integration job vì chưa provision service container/account test riêng trong CI.

Benchmark Kanban production dùng API fixture chỉ trong Playwright: 30 thẻ được render theo phân trang khi `total=30/300/3000`, 1/4/8 client, 40 lượt đo mỗi cấu hình. Nó đo UI production và không xác nhận tốc độ SQL với 3.000 ticket thật. Benchmark `/ready` đo Express production + MySQL thật nhưng không đo endpoint ticket. Xem `docs/benchmarks/kanban-production-fixture.json` và `docs/benchmarks/readiness-production.json`.

Monitor v2 chỉ tính mẫu khi cùng lịch giờ làm việc và có cả HTTP health, ready, web. Mặc định thứ Hai–Sáu 08:00–17:00 `Asia/Ho_Chi_Minh` theo timezone ưu tiên trong `Codex.md`; giờ bắt đầu/kết thúc vẫn là giả định chờ chủ dự án xác nhận. Cần cấu hình `MONITOR_ORIGIN` và `MONITOR_WEB_ORIGIN` thành URL vận hành thật và quan sát đủ ít nhất 10 ngày làm việc, độ phủ theo phút từ 95% trước khi kết luận 99%.

## 4. Tiêu chí nghiệm thu cuối và giới hạn bằng chứng

- Rule race: hai request cùng từ khóa chuẩn hóa phải cho đúng một 201, một 409 và đúng một hàng MySQL. Trước migration phải kiểm tra trùng và danh tính schema; chỉ dùng schema dự án đã duyệt.
- ACK/MTTA: endpoint staff ghi ACK một lần, khác `first_response_at`; dashboard có `mttaSeconds` và `firstResponseSeconds`; SLA vẫn dựa vào phản hồi public.
- RBAC/IDOR: khách 401; End-User không xem/đọc ảnh/bình luận/đổi trạng thái/phân công ticket của người khác; IT Agent chỉ tự nhận việc; chỉ Admin quản lý user, rules, SLA và analytics.
- Browser API test dùng `smart_it_helpdesk_new_test` và session fixture được ký trong test, bao phủ ticket ảnh → phân công → ACK → public reply → RESOLVED → notification → rule/SLA/users/dashboard. Kết quả này **không** xác nhận login Google của ba tài khoản thật.
- Google E2E ba vai trò cần phiên tương tác do chủ dự án mở. Không dùng mật khẩu, token hoặc cookie của người dùng trong báo cáo.
- SMTP: test retry bằng sender giả lập; chỉ gửi ra ngoài khi chủ dự án cấu hình provider và chỉ định recipient được phép. `sent` là SMTP accepted, chưa là inbox delivered.
- Worker: test khởi động lại trên Windows và kiểm chống lặp thông báo qua tiến trình mới. Monitor cần quan sát đủ giờ làm việc theo chính sách 99% trước khi công bố đạt uptime.
- Performance: đo triage thuần thuật toán riêng với triage HTTP/DB; Kanban p95 từ browser test trên 30 hàng MySQL test, ghi điều kiện máy và môi trường. Không suy từ preview hoặc dev sang SLA production. Availability chỉ được kết luận sau ít nhất 10 ngày làm việc và độ phủ mẫu theo phút ≥95%.
