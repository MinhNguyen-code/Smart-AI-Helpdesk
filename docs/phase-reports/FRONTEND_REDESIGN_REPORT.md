# Báo cáo cải tiến frontend — 17/11/2026

**Kết luận: PARTIAL.** Bảy màn theo wireframe đã có trong ứng dụng và được đối chiếu, các cải tiến có kiểm thử đã hoàn tất. Nghiệm thu Google ba vai trò, MySQL browser E2E và hiệu năng mạng thực chưa được chứng minh trong lượt này.

## Thay đổi và quyết định thiết kế

- Giữ hệ màu sáng, rail hẹp, card/bảng viền nhẹ và cảnh báo SLA như `Wireframe/`. Dùng token, chữ, khoảng cách và trạng thái đã thống nhất trong `docs/FRONTEND_DESIGN_SYSTEM.md`.
- `src/features/CreateTicket.jsx`: chọn, dán hoặc kéo thả ảnh PNG/JPG/WebP tối đa 10 MB; xem trước; xóa để chọn lại cùng tệp; lỗi ở cạnh vùng tải. Ticket vẫn tạo qua API hiện có. Nếu ticket đã lưu nhưng tải ảnh lỗi, thông báo hướng người dùng mở ticket để thử lại bằng form đính kèm hiện có.
- `src/App.jsx`: thêm lọc ưu tiên P1–P4 cho Kanban, kết hợp với tìm kiếm/sắp xếp và reset khi đổi tuyến. Không thay đổi trạng thái ticket bằng bộ lọc.
- `src/App.jsx`: tải Rules và User Management khi mở tuyến ADMIN tương ứng; có trạng thái tải truy cập được. Bundle chính giảm từ 455.03 xuống 426.22 KB minified (130.63 xuống 126.37 KB gzip); hai trang riêng lần lượt 20.14 và 9.50 KB minified.
- `src/styles/design-system.css`: trạng thái kéo thả nhận diện được, chuyển màu ngắn; giữ focus và reduced motion hiện có.
- `e2e/wireframe.spec.js` và `e2e/production-states.spec.js`: kiểm bộ lọc ở preview và production API fixture, ảnh kéo thả hợp lệ và tệp sai định dạng. Không thêm dữ liệu mẫu vào ứng dụng live.
- Ảnh trước/sau và nhận xét từng màn trong `docs/phase-reports/FRONTEND_VISUAL_AUDIT.md`.

Không chỉnh Google OIDC, session, RBAC, API, backend business logic, migration, schema, email hoặc worker. Không cài skill bằng script từ Internet; tham khảo trực tiếp [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [Anthropic frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) và [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills).

## Kiểm chứng thực tế

| Lệnh | Kết quả 17/11/2026 | Phạm vi |
|---|---|---|
| `npm.cmd test` | PASS, 22/22 | Unit và API; lần chạy sandbox đầu tiên 14/22 vì `EACCES` loopback, chạy lại với quyền loopback 22/22. |
| `npm.cmd run test:frontend` | PASS, 4/4, 3 tệp | Component/frontend. |
| `npm.cmd run test:browser` | PASS, 10/10 | Edge preview có nhãn; không phải Google E2E. |
| `npm.cmd run test:browser:production` | PASS, 8/8 | Production bundle với API fixture; có kiểm guard preview, năm độ rộng và lọc P1 mà không gọi thêm API. |
| `npm.cmd run benchmark:kanban:production` | PASS, 1/1 | Production bundle + Edge, API fixture cục bộ, 40 navigation/kịch bản. |
| `npm.cmd run build` | PASS | 2037 module, index JS 426.22 KB / 126.37 KB gzip; Three.js 522.14 / 130.46 KB gzip vẫn cảnh báo >500 KB nhưng tải có điều kiện trên Login. |
| `npm.cmd audit --audit-level=high --json` | PASS, 0 lỗ hổng | 466 dependency trong báo cáo npm. |
| `git diff --check`; `git diff --name-only -- Diagrams Wireframe` | PASS; không có đường dẫn gốc thay đổi | Không commit/push. |

Các bộ `test:integration` và `test:browser:api` **không chạy lại** vì test hiện có thao tác fixture SQL có xóa/thay đổi dữ liệu trong schema test; yêu cầu lượt này cấm SQL phá hủy. Kết quả lịch sử của chúng không được tính là kiểm chứng mới.

## Hiệu năng

| Khối lượng fixture | Trước lượt này, p95 | Sau lượt này, p50 / p95 / p99 | Lỗi sau lượt này |
|---|---:|---:|---:|
| 30 ticket, 1 client | 262 ms | 152 / 168 / 173 ms | 0/40 |
| 300 ticket, 4 client | 1100 ms | 391 / 468 / 476 ms | 0/40 |
| 3000 ticket, 8 client | 1604 ms | 710 / 806 / 812 ms | 0/40 |

Nguồn số sau lượt: `docs/benchmarks/kanban-production-fixture.json`. Chỉ render trang đầu 30 thẻ. Số trước lấy từ lần đo trước đó; chênh lệch giữa các lần có thể do máy/chế độ chạy, **không quy cho bộ lọc/tách chunk là nguyên nhân tăng tốc**. Cả ba p95 đều dưới mục tiêu 2 giây trong môi trường fixture. Chưa đo mạng triển khai hay MySQL thật. Bundle chính giảm từ 453.88 KB minified ở bản đầu lượt xuống 426.22 KB (27.66 KB); chưa xử lý cảnh báo chunk Three.js vì tải đã có điều kiện và việc tách sâu thêm chưa có lợi ích thực đo.

## Phạm vi nghiệm thu còn thiếu

Các màn bổ sung đã được rà soát ở mức mã nguồn: `UsersPage` có trạng thái vai trò/duyệt tài khoản; `NotificationMenu` hiển thị số chưa đọc và danh sách; `RulesPage` chứa SLA Policies; điều hướng/đăng xuất nằm trong `App.jsx`. Chúng dùng chung token, focus, thông báo lỗi và breakpoint. Chưa có ảnh trước/sau độc lập cho các màn này trong lượt redesign.

- Google OIDC browser cho ADMIN và END_USER cần phiên tương tác hợp lệ của chủ dự án; không dùng fixture để thay bằng chứng này.
- Nghiệm thu trực quan live API/MySQL ở từng vai trò, upload/retry với lỗi mạng thật và xác nhận ảnh riêng tư chưa chạy lại trong lượt thiết kế này.
- Ghi chú nội bộ của Ticket Detail chưa có API/quyền được phê duyệt; chưa tạo giao diện giả.
- Chưa có tiến độ upload theo byte; hiện có trạng thái bận và phản hồi lỗi/thử lại. Cần kiểm duyệt luồng upload trước khi thay transport.
- Kiểm screen reader thủ công, đo tương phản ở mọi trạng thái và Core Web Vitals trên môi trường triển khai thật chưa xác minh.

## Bảo vệ dự án

`Diagrams/` còn 5 tệp và `Wireframe/` còn 7 tệp, không đổi. Worktree đã có nhiều thay đổi trước lượt này; báo cáo này chỉ quy các mục liệt kê ở trên cho lượt redesign. Không đổi schema/credential, không chạy migration hoặc SQL ghi, không commit/push.
