# 📋 SPEC v3 — App Quản Lý GĐKD Showroom Ô Tô

> **Phiên bản 3** — schema gọn lại quanh `du_lieu[month].tuan[week][task_id]`.
> Triết lý 3 lớp NV-centric của v2 giữ nguyên; thay đổi là cách lưu input theo tuần
> và sự xuất hiện của 3 master mới: `phong_ban`, `nhiem_vu_lib`, `nhiem_vu_ids`.
> Runtime vẫn giữ compat layer đọc dữ liệu cũ v2 (`lead_theo_thang`, `noi_dung`,
> `muc_tieu_tuan`, `muc_tieu_thang`) và normalize về cùng shape, nên view code
> hiện tại không phải viết lại — xem mục **Compat layer** ở cuối.
> **Stack**: Vanilla HTML + CSS + JavaScript thuần | GitHub Contents API | GitHub Pages
> **User**: 1 người duy nhất (GĐKD showroom Đắk Lắk)

---

## 🎯 NGUYÊN TẮC CỐT LÕI — đọc trước khi sửa

### 1. NV là entity gốc, KH là transaction
GĐKD quản lý **năng suất nhân viên**, không quản lý từng khách hàng riêng lẻ. Khách hàng tồn tại như một **đơn hàng** thuộc về 1 NV và tham chiếu 1 dòng xe trong catalog.

### 2. Kiến trúc 3 lớp data — bắt buộc
```
LỚP 1 — MASTER DATA      (setup trước, ít đổi)
   xe.json               catalog xe đang bán
   nhan-vien.json        danh sách NV
   config.json           tháng hiện tại + mục tiêu tháng + cấu hình showroom
   cong-viec.json        sự kiện/Zalo OA cấp công ty (không thuộc NV nào)

LỚP 2 — TRANSACTION      (mỗi KH = 1 record, tham chiếu master)
   khach-hang.json       array phẳng, mỗi record có nhan_vien_id + xe_id

LỚP 3 — DERIVED          (tự tính, KHÔNG lưu file)
   KPI tháng/quý/năm, xếp hạng NV, sức bán theo dòng xe, pipeline KH
```

### 3. KPI thực tế chỉ derive — không bao giờ gõ tay
- `xe_ky_moi.thuc_te` = `count(KH có ngay_ky thuộc kỳ)` ← tính, không nhập
- `hd_xuat_thang.thuc_te` = `count(KH có ngay_giao_thuc_te thuộc kỳ)` ← tính
- `hd_ton_thang_cu` = `count(KH ngay_ky < kỳ && !ngay_giao_thuc_te && trạng thái chưa giao)` ← tính
- `lead_phat_sinh.thuc_te` = `sum(NV.du_lieu[m].tuan[w][task].thuc_te)` theo các task `loai='lead'` ← tính

GĐKD chỉ nhập **mục tiêu/thực tế từng nhiệm vụ tuần** trong week-grid của NV (và các master data: xe, NV, nhiệm vụ). Mọi con số tổng hợp tự suy ra.

### 4. Setup gating
App khoá bước nhập KH cho đến khi: có ít nhất 1 xe trong `xe.json`, có ít nhất 1 NV trong `nhan-vien.json`, có mục tiêu tháng trong `config.json`. Empty state hướng dẫn setup wizard.

### 5. Form bắt buộc dropdown reference
Khi thêm KH: ô **NV** và ô **Xe** là `<select>` lấy từ master data, **không** gõ chữ tự do. Đảm bảo FK toàn vẹn.

---

## 🏗️ TECH STACK — KHÔNG ĐỔI

| Layer | Công nghệ |
|---|---|
| Frontend | HTML5 + CSS3 + Vanilla JS (ES Modules) |
| Backend | GitHub Contents API |
| Auth | GitHub Personal Access Token (localStorage) |
| Hosting | GitHub Pages (repo Private) |
| Build | Không có build step |

**Cấm**: framework UI, npm/package.json, TypeScript, SCSS, jQuery, Bootstrap, Tailwind.

**Khác v1**: code JS chia thành ES Modules (`<script type="module">`), không còn 1 file IIFE 2000 dòng.

---

## 📂 CẤU TRÚC FILE

```
/
├── index.html                ← Dashboard (stacked bar + time range)
├── login.html
├── kpi.html                  ← KPI tháng/quý/năm (derive)
├── cong-viec.html            ← Công việc cấp công ty
├── xe.html                   ← Catalog xe (master data)  [MỚI]
├── nhan-vien.html            ← Danh sách NV
├── nhan-vien-detail.html     ← Chi tiết NV (4 tab có form input)
├── khach-hang.html           ← Bảng KH phẳng
├── cskh.html                 ← Filter view: KH đã giao cần CSKH
├── README.md
├── SPEC.md                   ← File này
├── CLAUDE.md
├── PROMPTS.md
├── .github/copilot-instructions.md
└── assets/
    ├── style.css
    ├── app.js                ← Entry: bootstrap + DOMContentLoaded
    ├── api.js                ← GitHub API wrapper, readData/writeData
    ├── events.js             ← Global event delegation (data-action)
    ├── notify.js             ← Reminder logic
    ├── ui.js                 ← Modal, toast, escapeHtml, format helpers
    ├── models.js             ← Barrel re-export 4 module dưới
    ├── models/
    │   ├── constants.js      ← NAV_ITEMS, *_META, DEFAULTS, PERFORMANCE_TIER_META
    │   ├── helpers.js        ← lookup/format/date/lead-channel/group helpers
    │   ├── normalize.js      ← normalizeData, serializeFilePayload, compat v2↔v3
    │   └── derive.js         ← getKpiSegments, getRanking, getNvStats, ...
    ├── components/
    │   ├── kpi-core.js       ← Render KPI card (dùng chung dashboard + kpi)
    │   └── week-grid.js      ← Bảng nhập tuần (desktop + mobile accordion)
    ├── modals/
    │   ├── customer.js       ← Form thêm/sửa KH
    │   ├── employee.js       ← Form thêm/sửa NV
    │   ├── xe.js             ← Form thêm/sửa xe
    │   ├── cskh.js           ← Thêm entry CSKH
    │   ├── admin.js          ← Quản lý phòng ban + nhiệm vụ
    │   ├── repo-settings.js  ← Cấu hình GitHub repo
    │   └── notifications.js  ← Danh sách reminder
    ├── views/
    │   ├── shell.js          ← Sidebar + topbar + bottom-nav + common cards
    │   ├── dashboard.js
    │   ├── kpi.js
    │   ├── cong-viec.js
    │   ├── xe.js
    │   ├── nhan-vien.js
    │   ├── nhan-vien-detail.js
    │   ├── khach-hang.js
    │   ├── cskh.js
    │   └── settings.js
    ├── img/
    └── data/
        ├── config.json
        ├── xe.json           [MỚI]
        ├── cong-viec.json    (chỉ cấp công ty)
        ├── nhan-vien.json    (không còn nest KH)
        ├── khach-hang.json   (flat với FK)
        └── lich-su.json      [MỚI — snapshot tháng cũ, optional]
```

`kpi.json` và `cskh.json` cũ **bị xoá**: KPI là derive, CSKH là array nội tại của KH.

---

## 🔐 AUTH

- Login: nhập GitHub PAT + (gộp luôn) repo owner / repo name / branch.
- `verifyToken` hiện kiểm token qua `/user`; quyền ghi repo được xác nhận ở bước đọc/ghi GitHub API và phải báo lỗi rõ ràng nếu thiếu.
- Token lưu `localStorage.gdkd_token`. Repo config lưu `gdkd_repo_owner|name|branch`.
- CRUD runtime là **local-first**: mọi thay đổi được ghi vào `gdkd_pending_writes` trước, overlay lên dữ liệu đọc ra, và chỉ đẩy lên GitHub khi user bấm đồng bộ.
- Mọi trang trừ login kiểm token đầu vào → redirect login nếu thiếu.

---

## 🗂️ SCHEMA JSON v3

### `config.json`
```jsonc
{
  "thang_hien_tai": "2026-05",
  "showroom": {
    "ten": "Omoda Đắk Lắk",
    "dia_chi": "...",
    "gdkd": "Tên em trai"
  },

  // Master: phòng ban (loai: "ban_hang" tính KPI, "ho_tro" không tính)
  "phong_ban": [
    { "id": "kd_1", "ten": "Kinh doanh 1", "loai": "ban_hang" },
    { "id": "kd_2", "ten": "Kinh doanh 2", "loai": "ban_hang" },
    { "id": "mkt",  "ten": "Marketing",    "loai": "ho_tro" },
    { "id": "kt",   "ten": "Kế toán",      "loai": "ho_tro" }
  ],

  // Master: thư viện nhiệm vụ — week-grid của NV chỉ chọn từ list này.
  // loai="lead" tính vào `lead_phat_sinh` của KPI tổng; loai="hoat_dong" chỉ là số đếm.
  "nhiem_vu_lib": [
    { "id": "fb_ca_nhan",  "ten": "FB Cá nhân (QC)", "phong_ban_ids": ["kd_1","kd_2"], "loai": "lead",      "don_vi": "so" },
    { "id": "mkt_cty",     "ten": "MKT Công ty",     "phong_ban_ids": ["kd_1","kd_2"], "loai": "lead",      "don_vi": "so" },
    { "id": "tiktok",      "ten": "TikTok khai thác","phong_ban_ids": ["kd_1","kd_2"], "loai": "lead",      "don_vi": "so" },
    { "id": "telesales",   "ten": "Telesales",       "phong_ban_ids": ["kd_1","kd_2"], "loai": "lead",      "don_vi": "so" },
    { "id": "luot_lai_thu","ten": "Lượt lái thử",    "phong_ban_ids": ["kd_1","kd_2"], "loai": "hoat_dong", "don_vi": "luot" },
    { "id": "gio_live",    "ten": "Giờ livestream",  "phong_ban_ids": ["mkt"],         "loai": "hoat_dong", "don_vi": "gio" },
    { "id": "so_video",    "ten": "Số video",        "phong_ban_ids": ["mkt"],         "loai": "hoat_dong", "don_vi": "so" }
    /* ... các nhiệm vụ khác */
  ]
}
```

**Không còn** `muc_tieu_thang` trong `config.json` v3 — mục tiêu được lưu phẳng ở `nhan_vien[*].du_lieu[m].tuan[w][task].muc_tieu`. Compat layer khi load sẽ tự tổng hợp lên `config.muc_tieu_thang` cho các view cũ.

### `xe.json` (master)
```jsonc
{
  "xe": [
    {
      "id": "x001",
      "ma_xe": "OMODA-C5-PRE-WHT-2025",
      "hang": "Omoda",
      "dong": "C5",
      "bien_the": "Premium",
      "mau": "Trắng, Đen, Xám",          // string — nhiều màu cách nhau bằng dấu phẩy
      "nam": 2025,
      "gia_niem_yet": 720000000,
      "trang_thai": "dang_ban"            // "dang_ban" | "sap_ve" | "ngung_ban"
    }
  ]
}
```

`khach_hang[].mau_xe` lưu màu chốt thực tế cho từng KH (chuỗi đơn, chọn từ list trong `xe.mau`).

### `nhan-vien.json` (master + tất cả input theo tuần)
```jsonc
{
  "nhan_vien": [
    {
      "id": "nv001",
      "ho_ten": "Lê Ngọc Nam",
      "anh": "",                          // path tương đối hoặc URL
      "chuc_vu": "TNBH",
      "sdt": "0335678385",
      "ngay_vao": "2025-04-01",
      "phong_ban_id": "kd_1",             // FK → config.phong_ban
      "loai_nhan_su": "chinh_thuc",       // "chinh_thuc" | "hoc_viec" | "thu_viec"
      "trang_thai": "dang_lam",           // "dang_lam" | "nghi_viec"

      // FK → config.nhiem_vu_lib — quyết định nhiệm vụ nào hiện trong week-grid của NV này
      "nhiem_vu_ids": [
        "fb_ca_nhan", "mkt_cty", "tiktok", "telesales",
        "luot_lai_thu"
      ],

      // Tất cả input/output theo tuần — schema phẳng duy nhất
      "du_lieu": {
        "2026-05": {
          "tuan": {
            "1": {
              "fb_ca_nhan":   { "muc_tieu": 5, "thuc_te": 4 },
              "mkt_cty":      { "muc_tieu": 8, "thuc_te": 6 },
              "luot_lai_thu": { "muc_tieu": 2, "thuc_te": 1 }
            },
            "2": { /* ... */ },
            "3": { /* ... */ },
            "4": { /* ... */ },
            "5": { /* tuần 5 chỉ dùng khi tháng có ngày 29+ */ }
          }
        },
        "2026-04": { "tuan": { "1": {}, "2": {}, "3": {}, "4": {}, "5": {} } }
      }
    }
  ]
}
```

**Quy tắc serializeNhanVienV3** (khi ghi lên GitHub):
- Chỉ giữ các cell có `muc_tieu` hoặc `thuc_te` khác 0.
- Tuần luôn có khung `1..5` (5 chỉ render UI khi tháng có ngày 29+).
- Trường `noi_dung[m].videos` của v2 được merge thành `du_lieu[m].tuan[1].so_video` khi serialize ngược.

### `khach-hang.json` (transaction — flat)
```jsonc
{
  "khach_hang": [
    {
      "id": "kh001",
      "ten": "Lê Văn C",
      "sdt": "0912345678",
      "dia_chi": "...",

      "nhan_vien_id": "nv001",            // FK → nhan-vien.json (bắt buộc)
      "xe_id": "x001",                    // FK → xe.json (bắt buộc)
      "mau_xe": "Trắng",                  // màu KH chốt — chọn từ xe.mau
      "kenh_lead": "fb_ca_nhan",          // FK → config.nhiem_vu_lib (loai="lead"), optional
      "ghi_chu_ctkm": "",                 // free text (không có module CTKM)

      "trang_thai": "dang_xu_ly",         // 1 trong 6 giá trị bên dưới
      "ngay_du_kien_ky": null,            // chỉ có khi trang_thai = "du_ky"
      "ngay_ky": "2026-04-15",            // null nếu chưa ký
      "ngay_giao_du_kien": "2026-05-20",
      "ngay_giao_thuc_te": null,          // null = chưa giao

      "hinh_thuc_tt": "vay_von",          // "vay_von" | "tien_mat" | "ket_hop"
      "ngan_hang": "VietinBank",
      "so_tien_vay": 500000000,
      "muc_dong_mong_muon": 200000000,    // mức trả góp/tháng KH muốn
      "so_hd": "HĐ-2026-04-001",

      // Timeline append-only — mỗi cột mốc 1 dòng
      "tien_do": [
        { "ngay": "2026-04-15", "buoc": 1, "noi_dung": "Ký HĐ, nhận hồ sơ vay" },
        { "ngay": "2026-04-20", "buoc": 2, "noi_dung": "NH bắt đầu thẩm định" },
        { "ngay": "2026-05-02", "buoc": 3, "noi_dung": "Chờ giải ngân" }
      ],

      // CSKH sau giao xe (chỉ điền khi ngay_giao_thuc_te !== null)
      "cskh": [
        {
          "ngay": "2026-05-25",
          "kenh": "zalo",                 // "dien_thoai" | "zalo" | "truc_tiep"
          "danh_gia": 4,                  // 1-5
          "phan_hoi": "Xe đẹp, nội thất rộng",
          "van_de": "Điều hoà hơi ồn",
          "trang_thai_xu_ly": "dang_xu_ly", // "chua_xu_ly" | "dang_xu_ly" | "da_xu_ly"
          "ghi_chu_noi_bo": "Đã hẹn KTV 28/5"
        }
      ]
    }
  ]
}
```

**6 trạng thái KH** (pipeline 1 chiều):
| Code | Hiển thị | Khi nào |
|---|---|---|
| `du_ky` | 🟡 Dự ký | NV báo "tuần này dự định ký KH này" — chưa có hợp đồng |
| `moi_ky` | 🔵 Mới ký | Vừa ký HĐ, chưa làm thủ tục vay/cọc |
| `dang_xu_ly` | 🟠 Đang xử lý | Hồ sơ vay đang chạy, chờ NH/giải ngân |
| `cho_giao` | 🟣 Chờ giao | Đã xong thủ tục, chờ xe về / chờ ngày giao |
| `da_giao` | 🟢 Đã giao | `ngay_giao_thuc_te` có giá trị |
| `dong_cskh` | ✅ Đóng CSKH | Đã giao + CSKH xong, không cần follow-up |

### `cong-viec.json` (chỉ cấp công ty)
```jsonc
{
  "su_kien_lai_thu": {
    "danh_sach": [
      { "ngay": "2026-05-12", "dia_diem": "TP. BMT", "so_kh": 12, "ghi_chu": "" }
    ]
  },
  "zalo_oa": {
    "muc_tieu": 500,
    "thuc_te": 312,
    "theo_tuan": [80, 90, 75, 67]
  }
}
```

**Bỏ** so với v2: `thang`, `tuyen_noi_dung` (videos/livestream/sự kiện-mục tiêu đều **derive** từ tổng các NV qua `du_lieu`).

### `lich-su.json` (optional — snapshot cuối tháng)
```jsonc
{
  "lich_su": [
    {
      "thang": "2026-04",
      "xe_ky_moi": 18, "hd_xuat": 16, "lead_phat_sinh": 142,
      "ranking": [{ "nv_id": "nv001", "xe": 5 }, ...]
    }
  ]
}
```
Tự sinh khi `config.thang_hien_tai` chuyển sang tháng mới — không cần gõ tay.

---

## 🧮 DERIVED — công thức gốc

Implement trong `assets/models/derive.js`. Tất cả nhận `allData` đã qua `normalizeData()`,
nên có cả `du_lieu` (v3) lẫn `lead_theo_thang` (compat v2).

```javascript
// === KPI segments per NV cho 1 KPI field qua nhiều tháng ===
getKpiSegments(allData, kpiField, months)
  // kpiField: 'xe_ky_moi' | 'hd_xuat_thang' | 'hd_ton' | 'lead_phat_sinh'
  // → trả [{nv_id, nv_ten, value, pct_personal, color}], sort desc theo value
  //
  // xe_ky_moi:      count(KH có ngay_ky thuộc months) per NV
  // hd_xuat_thang:  count(KH có ngay_giao_thuc_te thuộc months) per NV
  // hd_ton:         count(KH ngay_ky < months[0], chưa giao, status ≠ da_giao/dong_cskh)
  // lead_phat_sinh: sum(du_lieu[m].tuan[w][task].thuc_te) cho mọi task loai='lead'

// === Mục tiêu cá nhân ===
getEmployeeWeeklyTargetTotal(allData, nv, months, {loai}={})
  // Sum muc_tieu của các task trong week-grid, lọc theo loai ('lead' | 'hoat_dong' | 'all')

getEmployeeTargetTotal(allData, nv, months, kpiField)
  // Với kpiField='lead_phat_sinh' ưu tiên dùng weekly target từ du_lieu.
  // Các kpiField khác fallback về config.muc_tieu_thang.muc_tieu_nv (compat v2).

// === Stats và ranking ===
getNvStats(allData, nvId, months) = { xe_ky, xe_giao, lead, pct_muc_tieu }
getRanking(allData, months)       = [...nvList].sort desc theo (xe_ky, xe_giao, lead, tên)
getGroupSummaries(allData, months) // per phòng ban — totals + members_sorted

// === KH tồn và sức bán theo dòng xe ===
getKhTon(allData, months)    // KH ký trước months[0], chưa giao, sort desc theo days_ton
getXeSucBan(allData, months) // [{xe_id, xe_ten, so_ky, so_giao, top_nv_ten}]

// === Pace tháng/quý/năm ===
getMonthPace(months, totalDone, target)
  // → { daysInMonth, totalDays, daysPassed, daysLeft, dailyDone, dailyNeeded, ... }
  // Nếu range chứa tháng hiện tại: daysPassed tính tới hôm nay; ngược lại = totalDays.

// === Performance tier (cho color-coding NV) ===
getPerformanceTier(pct) // → 'excellent' | 'good' | 'average' | 'weak' | 'none'
```

Color rule trong `getKpiSegments`:
| pct cá nhân | Màu |
|---|---|
| null (chưa có mục tiêu) | `--primary-light` |
| ≥ 80 | `--success-light` |
| 50–79 | `--warning-light` |
| 20–49 | `--warning` |
| < 20 | `--danger-light` |

---

## 🖥️ CÁC TRANG

### `login.html`
- Form: token + (gộp) owner + repo + branch.
- Verify token có quyền `repo` rồi lưu localStorage.
- Redirect `index.html`.

### `index.html` — Dashboard

**Header**: tên showroom, **Time Range Picker** (xem dưới), nút notifications, đăng xuất.

**Time Range Picker**:
```
[ Tháng 5/2026 ▾ ]
   ├─ Tháng cụ thể     → input type="month"
   ├─ Quý              → Q1 (1+2+3) | Q2 | Q3 | Q4 + chọn năm
   ├─ Năm              → 12 tháng
   └─ Tuỳ chỉnh        → checkbox 12 tháng
```
State lưu trong URL hash (`#range=2026-Q2`) hoặc sessionStorage để reload không reset.

**4 thẻ KPI lớn** (collapsed default):
- Card cao 180-220px, số liệu font 32-40px, thanh tiến độ cao **18-22px** (lớn hơn v1).
- Stacked bar: mỗi NV 1 segment, độ rộng = số đếm của NV đó, tổng = thực tế. Phần thiếu so với mục tiêu = segment xám trống.
- Màu segment theo % cá nhân của NV (xanh ≥80, vàng 50-79, cam 20-49, đỏ <20).
- Dưới thanh: 2 hint nhanh (top 1 + warning thấp nhất).
- Click card → expand inline (desktop) / slide-up sheet (mobile).

**Card KPI expanded**:
```
┌───────────────────────────────────────────────────┐
│ 🚗 XE KÝ MỚI                              [▴]     │
│ 14 / 20    70%                                    │
│ [▓▓▓▓▓ stacked tổng theo NV ▓▓▓▓▓░░░░]            │
│ ─────────────────────────────────────────────     │
│ Đóng góp từng NV (sort theo số đã làm):           │
│ NV A  ████████████████  5/5  100% xanh            │
│ NV B  █████████████     4/5   80% xanh            │
│ NV C  ████████          3/5   60% vàng            │
│ NV D  █████             2/5   40% cam             │
│ NV E  ░                 0/5    0% đỏ              │
│ [Click tên → mở nhan-vien-detail.html?id=…]       │
└───────────────────────────────────────────────────┘
```

**HĐ tồn** card khác: expanded hiện danh sách KH tồn lâu nhất (sort `ngay_ky` cũ nhất), kèm NV phụ trách và số ngày tồn.

**Hàng dưới**: 4 thẻ Công việc (sự kiện lái thử / videos / livestream / Zalo OA) — videos và livestream cũng có stacked bar theo NV.

**Hàng cuối**: bảng "KH cần xử lý hôm nay" (top 5 KH có `ngay_giao_du_kien` ≤ 3 ngày tới).

### `kpi.html` — KPI page
- Time Range Picker (cùng component với Dashboard).
- 4 thẻ KPI lớn (cùng pattern stacked + expand).
- Bảng **Xếp hạng NV** sort theo cột bất kỳ (xe ký, xe giao, % mục tiêu).
- Bảng **Sức bán theo dòng xe**: mỗi dòng xe trong catalog → số ký / số giao / NV bán nhiều nhất.
- Nút `[Setup mục tiêu tháng]` mở modal **chỉ có cột mục tiêu** (không có thực tế).

### `xe.html` — Catalog xe (MỚI)
- Bảng: mã xe, hãng, dòng, biến thể, màu, năm, giá niêm yết, trạng thái.
- Form thêm/sửa xe.
- Filter theo hãng / trạng thái.
- Khoá xoá nếu đã có KH tham chiếu xe đó (báo "Có N KH đang dùng xe này").

### `cong-viec.html`
- Sự kiện lái thử (CRUD danh sách).
- Tuyến nội dung chuẩn (CRUD list các tuyến — dùng làm key cho NV).
- Zalo OA (số liệu mục tiêu/thực tế theo tuần).

### `nhan-vien.html` — Danh sách
- Grid card: ảnh, tên, lead tổng tháng, xe ký tháng, % mục tiêu cá nhân (tất cả derive).
- Card có mini bar % cá nhân.
- Click → detail. Nút "+ Thêm NV".

### `nhan-vien-detail.html` — Chi tiết NV (2 tab)

**Header**: ảnh + tên + tổng quan KPI cá nhân (derive: xe ký / giao / lead / % mục tiêu).

**Tab 1 — Nhập tuần** (week-grid):
- Bảng `Nhiệm vụ × (T1, T2, T3, T4, T5) × (muc_tieu, thuc_te)` lấy từ `nv.nhiem_vu_ids`.
- Mỗi cell autosave debounce 600ms, ghi vào `nv.du_lieu[month].tuan[w][task_id]`.
- Tuần 5 chỉ hiện khi tháng có ngày 29+.
- 2 dòng derive cuối bảng: **Dự ký** (count KH `du_ky` theo tuần), **Tỷ lệ CV** (du_ky/lead).
- Nút `[+ Gán thêm nhiệm vụ]` mở picker từ `config.nhiem_vu_lib` (lọc theo `phong_ban_id`).
- Khoá nhập khi range > 1 tháng (xem nhiều tháng, không cho gõ).
- Mobile: render kèm `mobile-lead-stack` (accordion) song song với bảng desktop, CSS ẩn theo media query.

**Tab 2 — KH của tôi**:
- Filter pill: `Tất cả | Dự ký | Mới ký | Đang xử lý | Chờ giao | Đã giao | Cần CSKH`.
- Card cho từng KH: tên + xe + trạng thái + bước hiện tại + nút sửa/xem timeline.
- Nút `[+ Thêm KH/Dự ký]` mở form thêm KH với `nhan_vien_id` prefilled.

### `khach-hang.html` — Bảng KH toàn công ty
- Bảng phẳng từ `khach-hang.json`, có thêm cột NV (lookup từ `nhan_vien_id`) và Xe (lookup từ `xe_id`).
- Filter: trạng thái, NV, hình thức TT, hãng xe, range ngày.
- Tìm kiếm: tên, SĐT, số HĐ.
- Form thêm KH: NV và Xe là `<select>` từ master.
- Click row → modal chi tiết KH với timeline `tien_do` + `cskh`.

### `cskh.html` — Filter view
- Filter `khach-hang.json` lấy ra: `trang_thai === 'da_giao'` AND có `cskh` entry với `trang_thai_xu_ly !== 'da_xu_ly'`, hoặc đã giao quá 7 ngày mà chưa có entry CSKH nào.
- Card: tên KH, xe, ngày giao, NV phụ trách, badge trạng thái CSKH, nút "Thêm phản hồi".
- Stats top: tổng đã giao tháng / cần xử lý / đã đóng CSKH.

---

## 🎨 DESIGN SYSTEM

### CSS variables
```css
:root {
  --primary: #1a3a5c;
  --primary-light: #2c5282;
  --accent: #e8a020;
  --success: #2e7d32;        /* ≥ 80% */
  --success-light: #66bb6a;
  --warning: #f57c00;        /* 50-79% */
  --warning-light: #ffa726;
  --danger: #c62828;         /* < 50% */
  --danger-light: #ef5350;
  --neutral: #cfd8dc;        /* segment trống trong stacked bar */
  --bg: #f4f6f9;
  --card: #ffffff;
  --text: #1c2b3a;
  --text-muted: #6b7c93;
  --border: #dce3ea;
  --radius: 12px;
  --radius-lg: 16px;
  --shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  --shadow-lg: 0 10px 24px rgba(26,58,92,.12);
}
```

### Stacked progress bar (component mới)
```html
<div class="stacked-bar" data-actual="14" data-target="20">
  <div class="stacked-bar-track">
    <div class="stacked-bar-segment" style="width: 25%; background: var(--success-light)"
         data-nv-id="nv001" data-tooltip="NV A: 5 xe (100%)"></div>
    <div class="stacked-bar-segment" style="width: 20%; background: var(--success-light)"></div>
    <div class="stacked-bar-segment" style="width: 15%; background: var(--warning-light)"></div>
    <div class="stacked-bar-segment" style="width: 10%; background: var(--danger-light)"></div>
    <!-- phần còn thiếu = neutral -->
  </div>
  <div class="stacked-bar-meta">
    <span class="stacked-bar-actual">14</span>/<span class="stacked-bar-target">20</span>
    <span class="stacked-bar-pct">(70%)</span>
  </div>
</div>
```

CSS: track height **18-22px** trên mobile, 22-28px desktop. Segment có border-right 1px trắng để tách rõ.

### Color rule
- Segment NV (cá nhân): xanh ≥80%, vàng 50-79%, cam 20-49%, đỏ <20% so với **mục tiêu cá nhân**.
- Track còn trống: `--neutral`.
- Thanh đơn (không stacked): vẫn theo rule cũ (success/warning/danger theo % tổng).

### Typography
- Be Vietnam Pro 700-800 cho `h1`, `h2`, `.kpi-number`.
- Noto Sans 400-500 cho body.

### Responsive
- `< 768px` mobile: stack dọc, bottom-nav 7 mục (mục tiêu rút xuống 5 — xem Checklist).
- `768-1024px` tablet: 2 cột.
- `> 1024px` desktop: sidebar trái + content 3-4 cột.

---

## 🔧 CORE FUNCTIONS — `assets/api.js`, `models.js`, `ui.js`

### `api.js`
```javascript
export async function readData(filename)
export async function writeData(filename, data)   // throws on GitHub error — KHÔNG silent fallback
export async function readAllData()
export async function verifyToken(token)
export function getToken() / setToken / clearToken
export function getRepoConfig() / saveRepoConfig
```

**Runtime hiện tại**: `writeData` vẫn ném lỗi rõ ràng khi GitHub fail, nhưng UI không gọi trực tiếp trong CRUD. `persistFile()` serialize payload rồi lưu vào `gdkd_pending_writes`; `pushPendingWrites()` mới là bước đẩy hàng loạt lên GitHub khi user chủ động đồng bộ. `readAllData()` luôn overlay pending writes local lên dữ liệu vừa đọc.

### `models.js` (barrel) + `models/*.js`
- `models.js` chỉ là `export * from './models/*.js'` — public API không đổi, 21 file import hiện tại không cần sửa.
- `constants.js`: hằng số (NAV, *_META, defaults).
- `helpers.js`: lookup theo id, format, date utils, lead-channel/group helpers.
- `normalize.js`: `normalizeData()` đọc raw JSON v3 và build compat layer (`lead_theo_thang`, `noi_dung`, `kpi_tuan`, `muc_tieu_thang`) cho các view chưa rewrite. `serializeFilePayload()` ngược lại — flatten về v3 trước khi push GitHub.
- `derive.js`: tất cả derive function (xem mục Derived).

### `ui.js`
```javascript
export function showToast(msg, type)
export function showModal(html, options)
export function closeModal()
export function confirmAction(msg, onConfirm)
export function escapeHtml(str)
export function formatCurrency(n)
export function formatDate(iso)
export function formatDateTime(iso)
export function calcPercent(actual, target)
export function renderStackedBar(segments, target)   // segments = [{nv_id, value, pct, color}]
export function renderRangeLabel(months)             // ["2026-04","2026-05"] → "Tháng 4-5/2026"
```

### `app.js` (entry)
```javascript
import { ... } from './api.js';
import { getCurrentRange, attachRangePicker } from './ui.js';
import { renderDashboard } from './views/dashboard.js';
// ... bootstrap dựa trên data-page
```

---

## 🔔 REMINDERS — `notify.js`

| Trigger | Nội dung |
|---|---|
| KH `ngay_giao_du_kien` trong 3 ngày tới | "⚠️ KH [Tên] (NV [Y]) dự kiến nhận xe [ngày]" |
| Thứ 6 18:00 | "📊 Tuần này [X] xe ký / mục tiêu [Y]" |
| Ngày 28 09:00 | "🎯 Còn [X] ngày — cần thêm [Y] xe đạt KPI" |
| KH `ngay_ky` > 30 ngày, chưa giao | "🚨 KH [Tên] tồn [X] ngày — cần gỡ vướng" |
| Sự kiện lái thử trong 2 ngày | "🚗 Sự kiện ngày [ngày] tại [địa điểm]" |
| KH `ngay_giao_thuc_te` > 7 ngày, chưa có entry CSKH | "💬 KH [Tên] đã giao [X] ngày, chưa CSKH" |

Dùng `Notification` API (browser-side), check khi mở app + interval 30 phút.

---

## 🔄 COMPAT LAYER v2 ↔ v3

Runtime giữ 2 shape song song để chưa phải rewrite các view và derive cũ:

**Khi đọc** (`normalizeData` trong `models/normalize.js`):
1. Input: file v3 phẳng (`du_lieu[m].tuan[w][task_id]`).
2. Output cho view dùng có cả:
   - `nv.du_lieu` (giữ nguyên v3)
   - `nv.lead_theo_thang[m][channel_id] = { muc_tieu, tuan: {1: actual, ...} }` (compat)
   - `nv.noi_dung[m].videos.tong` (compat — từ task `so_video`)
   - `nv.kpi_tuan[m] = [{tuan, muc_tieu_nv}]` (compat — sum target tuần lọc loai='lead')
   - `config.muc_tieu_thang[m].muc_tieu_nv[nvId].lead_phat_sinh` (compat — sum target lead)
   - `config.lead_channels` (compat — derive từ `nhiem_vu_lib`)

**Khi ghi** (`serializeFilePayload`):
1. Input: object trong memory (có cả v2 và v3 keys).
2. Output: file phẳng v3 — `serializeNhanVienV3` ưu tiên `lead_theo_thang.tuan` để tái tạo `du_lieu`, merge `noi_dung.videos` vào `tuan[1].so_video`.
3. `serializeConfigV3` chỉ giữ `thang_hien_tai`, `showroom`, `phong_ban`, `nhiem_vu_lib`.

**Mục tiêu kế tiếp**: rewrite derive functions để đọc trực tiếp `du_lieu` rồi xoá compat. Việc này lớn, cần test kỹ.

---

## 🚀 BUILD ORDER

Xem [PROMPTS.md](PROMPTS.md) — 8 bước với prompt chi tiết.

---

## ✅ CHECKLIST v3

Hoàn thành (đã chạy trên main):

- [x] Auth + repo config (verify quyền `repo` còn TODO)
- [x] Tách `app.js` cũ → `api.js` + `models/*` + `ui.js` + `views/*` + `modals/*` + `components/*`
- [x] `xe.html` CRUD catalog
- [x] `nhan-vien.html` CRUD master + `phong_ban_id` + `nhiem_vu_ids`
- [x] `config.json` v3 (`phong_ban` + `nhiem_vu_lib`, bỏ `muc_tieu_thang`)
- [x] `khach-hang.json` schema mới + form FK + `mau_xe` + `kenh_lead`
- [x] Dashboard stacked bar + time range picker + click expand
- [x] KPI page derive only
- [x] NV detail 2 tab (week-grid + KH của tôi)
- [x] CSKH filter view + reminders cơ bản
- [x] Snapshot tháng cũ → `lich-su.json` (loop nhiều tháng còn TODO)
- [x] Responsive mobile/desktop
- [x] Repo Private + deploy GitHub Pages

Còn lại:

- [ ] `verifyToken` thử `GET /repos/{owner}/{repo}` để xác nhận quyền repo
- [ ] Pipeline KH enforce 1 chiều (chặn lùi trạng thái)
- [ ] `ensureMonthlySnapshot` loop tất cả tháng thiếu, không chỉ tháng trước
- [ ] Polling 30s + pull-on-focus (giai đoạn 3 trong REFACTOR_v3_PROMPT.md)
- [ ] Rewrite derive đọc trực tiếp `du_lieu`, xoá compat layer
- [ ] Tách `style.css` (3983 dòng) thành core + components
- [ ] Mobile: gộp 7 bottom-nav xuống 5
