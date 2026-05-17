# Omoda GĐKD App

App nội bộ cho Giám Đốc Kinh Doanh showroom ô tô tại Đắk Lắk — 1 user.

**Stack**: Vanilla HTML/CSS/JS (ES Modules) · GitHub Contents API · GitHub Pages · PWA

**Triết lý**: NV-centric, KPI derive từ dữ liệu thật, local-first sync.

## 🚀 Chạy local

```powershell
python -m http.server 8765
```

Mở `http://localhost:8765/index.html`

## 📁 Tài liệu

| File | Nội dung |
|---|---|
| `SPEC.md` | Đặc tả nghiệp vụ & schema v3 |
| `CLAUDE.md` | Context cho AI assistant |
| `STATUS.md` | Trạng thái dự án: đã làm, chưa làm, nên làm |
| `.github/copilot-instructions.md` | Quy ước code & ràng buộc |

## 🔄 Cơ chế đồng bộ

- **Local-first**: mọi CRUD ghi `localStorage` trước, không chặn UI
- **Thủ công**: user bấm "Đẩy lên GitHub" trong Thiết lập khi muốn đồng bộ
- **Multi-tab**: đồng bộ qua `storage` event + `BroadcastChannel`
- **Cảnh báo mất dữ liệu**: popup khi đóng tab còn pending writes

## ✅ Trạng thái hiện tại

Xem chi tiết trong [`STATUS.md`](STATUS.md). Tóm tắt:

- Đầy đủ 9 trang chức năng (Dashboard, KPI, Công việc, Catalog Xe, Nhân viên, Chi tiết NV, Khách hàng, CSKH, Thiết lập)
- Đã chuẩn hoá button system, sync flow cải thiện (2026-05-17)
- Còn thiếu: icon system, dark mode, dashboard widget system
