# 📊 STATUS.md — Trạng thái dự án GĐKD App

> Cập nhật: 2026-05-17
> App quản lý nội bộ cho GĐKD showroom Omoda Đắk Lắk.

---

## ✅ ĐÃ LÀM ĐƯỢC

### Kiến trúc & Nền tảng
- [x] SPEC v3 với schema NV-centric, 3 lớp data (master → transaction → derived)
- [x] Stack vanilla HTML/CSS/JS (ES Modules), không build step, không framework
- [x] GitHub Contents API làm backend, GitHub Pages hosting
- [x] Local-first CRUD: lưu localStorage trước, user chủ động đẩy lên GitHub
- [x] BroadcastChannel đồng bộ giữa nhiều tab
- [x] PWA: manifest.json, standalone mode, apple-mobile-web-app
- [x] Design tokens tách riêng `style-tokens.css`
- [x] Migration v2 → v3 hoàn tất, backup data cũ đã xoá

### Tính năng chính
- [x] Dashboard với hero scoreboard, top/watch list, group split, stacked bar KPI
- [x] KPI page: derive hoàn toàn từ KH/NV, ranking, sức bán theo dòng xe
- [x] Catalog xe (master data) với filter hãng/trạng thái
- [x] Quản lý nhân viên theo phòng ban, search, filter
- [x] Chi tiết NV: 2 tab (Nhập tuần + KH của tôi), week-grid nhập mục tiêu/thực tế
- [x] Quản lý khách hàng: pipeline 6 trạng thái, FK đến NV + Xe, filter đa chiều
- [x] CSKH sau giao xe: filter view, reminder
- [x] Công việc cấp công ty: sự kiện lái thử, Zalo OA
- [x] Thiết lập: quản lý phòng ban, thư viện nhiệm vụ, đồng bộ GitHub
- [x] Form KH: dropdown FK cho NV + Xe, chọn màu xe từ catalog

### UX & UI (đợt cải thiện 2026-05-17)
- [x] Chuẩn hoá button system: Sửa→Chỉnh sửa, Chi tiết→Xem hồ sơ, đồng bộ variant
- [x] Component `button-toolbar.js` — renderBtn, renderBtnGroup, rowActions
- [x] Component `sync-status.js` — sync chip dùng chung shell.js + events.js
- [x] Bỏ "Đăng xuất" khỏi topbar, rút gọn sync chip text
- [x] Đổi "Lưu local"→"Lưu", toast "Đã lưu tạm..."→"Đã lưu."
- [x] Xoá mục "Nhập tuần" khỏi nav (đã có trong chi tiết NV)
- [x] beforeunload warning khi có pending writes chưa đẩy
- [x] SHA conflict detection: bắt lỗi 409/422 khi ghi GitHub
- [x] Retry UI trong settings: hiện file lỗi kèm thông báo

---

## 🔲 CHƯA LÀM / ĐANG LÀM DỞ

### Ưu tiên cao
- [ ] **Icon system**: thay emoji bằng SVG inline (🔔⚙️🏠🎯🚗...)
- [ ] **Dashboard Widget System**: cho phép GĐKD tự bật/tắt/sắp xếp widget
- [ ] **Chuẩn hoá layout**: gộp 15 class card, thống nhất filter toolbar, page header
- [ ] **Dark mode**: thêm `[data-theme="dark"]` vào `style-tokens.css`
- [ ] **Skeleton loading**: hiện placeholder khi đang fetch data

### Ưu tiên vừa
- [ ] Funnel 4 tầng (nhiệm vụ → dự ký → ký → giao) chưa tách component riêng
- [ ] `assets/events.js` còn ~250 dòng, có thể tách filter helpers riêng
- [ ] Animation/transition cho modal, toast, card hover
- [ ] Modal: focus trap, ESC to close
- [ ] Accessibility: ARIA labels đầy đủ, skip-link, reduced-motion

### Ưu tiên thấp
- [ ] Service worker cho offline support thực sự
- [ ] Keyboard shortcuts (Ctrl+K search, Ctrl+N new)
- [ ] Drag-to-reorder cho widget dashboard và danh sách NV
- [ ] Export PDF báo cáo KPI
- [ ] Automated test với Playwright

---

## 📁 Cấu trúc file hiện tại

```
/
├── index.html               Dashboard
├── kpi.html                 KPI derive
├── cong-viec.html           Công việc cấp công ty
├── xe.html                  Catalog xe (master)
├── nhan-vien.html           Danh sách NV
├── nhan-vien-detail.html    Chi tiết NV (tab nhập tuần + KH)
├── khach-hang.html          Bảng KH phẳng
├── cskh.html                CSKH filter view
├── settings.html            Thiết lập + đồng bộ GitHub
├── login.html               Login (đã đơn giản hoá)
├── SPEC.md                  Đặc tả schema v3
├── CLAUDE.md                Context cho AI assistant
├── README.md                Hướng dẫn sử dụng
├── STATUS.md                File này
├── manifest.json            PWA manifest
├── .nojekyll                GitHub Pages config
└── assets/
    ├── style.css            CSS chính
    ├── style-tokens.css     Design tokens (màu, font, spacing, shadow)
    ├── app.js               Entry: bootstrap, state, sync
    ├── api.js               GitHub Contents API wrapper
    ├── ui.js                Toast, modal, format helpers
    ├── events.js            Global event delegation
    ├── notify.js            Reminder logic
    ├── models.js            Barrel re-export
    ├── models/
    │   ├── constants.js     NAV_ITEMS, PAGE_META, STATUS_META, tier meta
    │   ├── helpers.js       Lookup, format, date, lead-channel helpers
    │   ├── normalize.js     normalizeData, serializeFilePayload, compat v2↔v3
    │   └── derive.js        KPI segments, ranking, stats, snapshot
    ├── components/
    │   ├── kpi-core.js      KPI card render (dùng chung dashboard + kpi)
    │   ├── week-grid.js     Bảng nhập tuần (desktop + mobile accordion)
    │   ├── button-toolbar.js Hệ thống nút chuẩn (renderBtn, renderBtnGroup)
    │   └── sync-status.js   Sync chip component (shell.js + events.js dùng chung)
    ├── views/               1 module / trang
    │   ├── shell.js         Sidebar + topbar + bottom-nav
    │   ├── dashboard.js, kpi.js, cong-viec.js, xe.js
    │   ├── nhan-vien.js, nhan-vien-detail.js
    │   ├── khach-hang.js, cskh.js, settings.js
    ├── modals/              Form CRUD modal
    │   ├── customer.js, employee.js, xe.js, cskh.js
    │   ├── admin.js, repo-settings.js, notifications.js
    └── data/
        ├── config.json      Cấu hình + phòng ban + thư viện nhiệm vụ
        ├── xe.json          Catalog xe
        ├── nhan-vien.json   Danh sách NV + dữ liệu tuần
        ├── khach-hang.json  KH flat với FK
        ├── cong-viec.json   Công việc cấp công ty
        └── lich-su.json     Snapshot tháng cũ
```

---

## 🗺️ Lộ trình khuyến nghị tiếp theo

| Thứ tự | Việc | Thời gian dự kiến | Tác động |
|---|---|---|---|
| 1 | Icon system (SVG thay emoji) | 1 buổi | Chuyên nghiệp rõ rệt |
| 2 | Dashboard Widget System | 1-2 buổi | GĐKD tự custom được |
| 3 | Dark mode | 1 buổi | tokens đã sẵn sàng |
| 4 | Skeleton loading + animation | 1 buổi | UX mượt hơn |
| 5 | Chuẩn hoá layout (gộp card, filter bar) | 1-2 buổi | CSS dễ bảo trì |
| 6 | Accessibility + focus trap | 1 buổi | Chuẩn WCAG cơ bản |
