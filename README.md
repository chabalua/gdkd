# Omoda GDKD App

App nội bộ cho GĐKD showroom ô tô tại Đắk Lắk.

Runtime hiện tại dùng Vanilla JS ES Modules, dữ liệu JSON trong `assets/data/`, và mô hình lưu **local-first**:
- Mọi CRUD ghi vào `localStorage.gdkd_pending_writes` trước.
- Giao diện đọc dữ liệu bằng cách overlay pending writes local lên dữ liệu JSON.
- Người dùng chủ động bấm đồng bộ để đẩy các thay đổi lên GitHub Contents API.
- Nhiều tab mở song song đồng bộ local qua `storage` event và `BroadcastChannel`.

## Cấu trúc chính

- `assets/app.js`: bootstrap app, local draft persistence, sync chip, auto refresh.
- `assets/api.js`: GitHub API wrapper, token/repo config, pending writes.
- `assets/models/normalize.js`: normalize dữ liệu v2/v3 và serialize payload trước khi lưu.
- `assets/views/*`: render từng trang.
- `assets/modals/*`: CRUD modal cho xe, nhân viên, khách hàng, CSKH, thiết lập.

## Chạy local

Vì app dùng `fetch()` để đọc JSON, không mở trực tiếp bằng `file://`.

Ví dụ:

```powershell
python -m http.server 8765
```

Sau đó mở:

```text
http://localhost:8765/index.html
```

## Trạng thái đã kiểm gần đây

- Đã sửa lỗi mất dữ liệu nhập tuần của nhân viên khi chuyển trang.
- Đã sửa lỗi mất `mau_xe` khi lưu/sửa khách hàng.
- Đã giữ lại các trường runtime quan trọng khi serialize `nhan-vien.json`, `khach-hang.json`, `cong-viec.json`.
- Đã kiểm smoke test các trang chính: dashboard, KPI, công việc, xe, nhân viên, chi tiết nhân viên, khách hàng, CSKH, thiết lập.
- Đã kiểm CRUD cùng tab cho nhân viên, xe, khách hàng.
- Đã kiểm sync nhiều tab: thêm xe ở một tab và form khách hàng ở tab khác nhận dropdown mới mà không cần reload.

## Tài liệu liên quan

- `SPEC.md`: đặc tả nghiệp vụ và schema v3.
- `CLAUDE.md`: context làm việc cho AI assistant trong repo này.
- `.github/copilot-instructions.md`: quy ước code và ràng buộc dự án.
