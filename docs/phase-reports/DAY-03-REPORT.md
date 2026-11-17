# Báo cáo Day 3 — Ticket Core

**Ngày:** 12/11/2026
**Trạng thái:** **PARTIAL**. API Ticket Core và kiểm thử MySQL đạt; chưa nghiệm thu luồng giao diện với phiên Google thật và lưu bền vững qua restart toàn ứng dụng.

## 1. Mục tiêu

Theo `Codex.md`: danh mục, tạo/danh sách/chi tiết ticket, bình luận, phân công, chuyển trạng thái, ảnh đính kèm riêng tư, lịch sử; End-User chỉ xem ticket của mình, staff xử lý đúng quyền. Giao diện bám wireframe 02 và 04.

## 2. Đã triển khai

- Backend: ticket và category APIs đã có; thêm `GET /agents` chỉ cho staff. Danh sách/chi tiết trả tên người gửi, người phụ trách và tác giả phản hồi mà không trả email.
- Ảnh: upload multipart `file` qua session + CSRF, tối đa 10 MB, PNG/JPEG/WebP kiểm tra cả MIME lẫn chữ ký file. Ghi tên ngẫu nhiên vào `server/private-uploads`, metadata vào MySQL và sự kiện `ATTACHMENT_ADDED` trong cùng transaction; xóa file nếu transaction lỗi. Download kiểm tra quyền ticket và buộc `Content-Disposition: attachment`, `nosniff`.
- Frontend: form tạo ticket nhận ảnh thực và báo rõ nếu ticket đã lưu nhưng ảnh tải lên lỗi. Modal chi tiết hiện danh mục, mức ảnh hưởng, lịch sử, bình luận, ảnh, phân công và trạng thái. Chế độ mẫu vẫn được gắn nhãn, tách khỏi MySQL.
- Quyền: End-User chỉ xem/tải ảnh của ticket do mình tạo; staff xem hàng đợi; IT Agent tự nhận phân công, Admin có quyền phân công. Chuyển trạng thái yêu cầu version và theo thứ tự hợp lệ.

## 3. API

`GET /categories`, `GET /agents`, `GET|POST /tickets`, `GET /tickets/:id`, `GET|POST /tickets/:id/comments`, `PATCH /tickets/:id/assign`, `PATCH /tickets/:id/status`, `POST /tickets/:id/attachments`, `GET /tickets/:id/attachments/:attachmentId` dưới `/api/v1`. Chi tiết request/response tại `docs/API_SPEC.md`.

## 4. Database và bảo vệ dữ liệu

Không có migration mới. Dùng bảng đã phê duyệt trong `smart_it_helpdesk_new_dev` và `smart_it_helpdesk_new_test`. Không đụng schema lịch sử. Integration test tạo fixture riêng trong test schema và dọn sau test; file fixture cũng được xóa. Tên tệp nội bộ là UUID, không dùng tên file người dùng làm đường dẫn.

## 5. Giao diện

`src/App.jsx` và `src/features/TicketDetail.jsx` nối API thật với form/modal. Các ảnh gốc trong `Wireframe/` được giữ nguyên. Đã mở chi tiết ticket trên browser ở chế độ mẫu và thấy đủ các vùng mô tả, tệp, phản hồi, nhật ký, SLA, danh mục, mức ảnh hưởng và ưu tiên. Chưa có screenshot nghiệm thu bằng tài khoản Google thật.

## 6. Lệnh và kết quả

- `npm.cmd test`: **20 pass, 0 fail**.
- `npm.cmd run test:integration`: **4 pass, 0 fail**, gồm rollback, session qua đóng/mở pool, SLA worker và HTTP ticket. Test HTTP xác nhận tạo ticket P1, SLA, quyền sở hữu, phản hồi, phân công, chuyển trạng thái, Admin access, chặn trạng thái sai (409), upload ảnh thật, chặn file giả (400), chặn người khác tải ảnh (404), download hợp lệ (200).
- `npm.cmd run build`: **PASS**, lần cuối 6.00 giây sau toàn bộ thay đổi; Vite cảnh báo hai chunk trên 500 kB.
- Backend dev đã khởi động lại sau chỉnh sửa cuối, kết nối schema phát triển mới thành công.

## 7. Rủi ro và giới hạn

Upload ảnh sau khi tạo ticket là hai request; nếu ảnh lỗi, ticket vẫn được lưu và UI thông báo rõ để tải lại trong modal. Browser với phiên Google thật chưa được dùng cho bài kiểm tra Day 3; chưa có kiểm chứng restart toàn ứng dụng và đọc lại ticket. Kiểm thử MIME dựa chữ ký định dạng cơ bản, chưa phân tích sâu toàn bộ cấu trúc ảnh. Vì vậy không gọi checkpoint là PASS.

## 8. Checkpoint kế tiếp

Đăng nhập tài khoản End-User thật, tạo ticket kèm ảnh, tải ảnh, xác nhận ngoài chủ sở hữu bị chặn; IT Agent phản hồi/nhận ticket; Admin phân công; restart ứng dụng và đọc lại ticket; lưu screenshot nghiệm thu. Sau đó chuyển Day 4 rules và SLA.

## Bổ sung nghiệm thu 12/11 — vẫn PARTIAL

`ticketApi.test.js` tiếp tục xác nhận upload ảnh giả bị từ chối rồi retry ảnh hợp lệ 201, quyền tải ảnh, lifecycle và notification. Sau khi RESOLVED, một tiến trình Node mới kết nối riêng schema `_new_test` đọc lại status trước khi fixture được dọn; chứng minh ticket đã lưu MySQL qua ranh giới tiến trình. `npm.cmd run test:integration` cuối: **6 pass, 0 fail**. Browser thật mới kiểm tra Kanban IT_AGENT rỗng và phiên qua restart; chưa tạo ticket bằng End-User trên browser, nên Day 3 vẫn **PARTIAL**.
