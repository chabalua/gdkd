# 📋 SPEC v2 — App Quản Lý GĐKD Showroom Ô Tô

> **Phiên bản 2** — viết lại theo kiến trúc 3 lớp NV-centric.
> Thay thế hoàn toàn SPEC v1 (kiến trúc cũ trộn lẫn data, KPI gõ tay).
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
- `hd_ton_thang_cu` = `count(KH ngay_ky < kỳ && !ngay_giao_thuc_te)` ← tính
- `lead_phat_sinh.thuc_te` = `sum(NV.lead_theo_thang[m])` ← tính

GĐKD chỉ nhập **mục tiêu**, **lead theo kênh** và **nội dung/live** từng NV. Mọi con số tổng hợp tự suy ra.

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
    ├── models.js             ← Derive functions (getKpiThucTe, getNvStats…)
    ├── ui.js                 ← Modal, toast, escapeHtml, format helpers
    ├── notify.js             ← Reminder logic
    ├── views/
    │   ├── dashboard.js
    │   ├── kpi.js
    │   ├── cong-viec.js
    │   ├── xe.js
    │   ├── nhan-vien.js
    │   ├── nhan-vien-detail.js
    │   ├── khach-hang.js
    │   └── cskh.js
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
- `verifyToken` phải kiểm cả `/user` **và** thử `GET /repos/{owner}/{repo}` để xác nhận token có quyền `repo`. Nếu thiếu: hiện thông báo cụ thể.
- Token lưu `localStorage.gdkd_token`. Repo config lưu `gdkd_repo_owner|name|branch`.
- Mọi trang trừ login kiểm token đầu vào → redirect login nếu thiếu.

---

## 🗂️ SCHEMA JSON v2

### `config.json`
```jsonc
{
  "thang_hien_tai": "2026-05",
  "showroom": {
    "ten": "Omoda Đắk Lắk",
    "dia_chi": "...",
    "gdkd": "Tên em trai"
  },
  "muc_tieu_thang": {
    "2026-05": {
      "xe_ky_moi": 20,
      "hd_xuat_thang": 18,
      "lead_phat_sinh": 150,
      "muc_tieu_nv": {              // map nv_id → mục tiêu cá nhân tháng
        "nv001": { "xe_ky_moi": 4 },
        "nv002": { "xe_ky_moi": 3 }
      }
    }
  }
}
```

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
      "mau": "Trắng",
      "nam": 2025,
      "gia_niem_yet": 720000000,
      "trang_thai": "dang_ban"      // "dang_ban" | "sap_ve" | "ngung_ban"
    }
  ]
}
```

### `nhan-vien.json` (master + input theo tháng)
```jsonc
{
  "nhan_vien": [
    {
      "id": "nv001",
      "ho_ten": "Nguyễn Văn A",
      "anh": "assets/img/nv001.jpg",
      "chuc_vu": "Nhân viên kinh doanh",
      "sdt": "0901234567",
      "ngay_vao": "2024-03-01",
      "trang_thai": "dang_lam",      // "dang_lam" | "nghi_viec"

      // Input thủ công theo tháng (lead chưa thành KH → không có transaction để derive)
      "lead_theo_thang": {
        "2026-05": {
          "fb_ca_nhan":   { "muc_tieu": 20, "thuc_te": 14 },
          "mkt_cty":      { "muc_tieu": 30, "thuc_te": 22 },
          "tiktok":       { "muc_tieu": 15, "thuc_te":  8 },
          "sr_tiep_khach": 6,             // số trần, không có mục tiêu
          "di_thi_truong": 4,
          "telesales":    { "muc_tieu": 10, "thuc_te":  7 }
        }
      },

      // Input thủ công theo tháng (output content marketing)
      "noi_dung": {
        "2026-05": {
          "gio_live": { "muc_tieu": 8, "thuc_te": 5 },
          "videos": {                     // key = id tuyến nội dung trong cong-viec.json
            "so_sanh_xe": 2,
            "trai_nghiem": 1,
            "hoi_dap":    3,
            "review":     1
          }
        }
      },

      // Input thủ công: mục tiêu tuần (du_ky và ket_qua DERIVE từ khach-hang.json)
      "muc_tieu_tuan": {
        "2026-05": [
          { "tuan": 1, "muc_tieu": 1 },
          { "tuan": 2, "muc_tieu": 1 },
          { "tuan": 3, "muc_tieu": 1 },
          { "tuan": 4, "muc_tieu": 1 }
        ]
      }
    }
  ]
}
```

### `khach-hang.json` (transaction — flat)
```jsonc
{
  "khach_hang": [
    {
      "id": "kh001",
      "ten": "Lê Văn C",
      "sdt": "0912345678",
      "dia_chi": "...",

      "nhan_vien_id": "nv001",            // FK bắt buộc
      "xe_id": "x001",                    // FK bắt buộc
      "ghi_chu_ctkm": "",                 // free text (không có module CTKM)

      "trang_thai": "dang_xu_ly",         // 1 trong 6 giá trị bên dưới
      "ngay_du_kien_ky": null,            // chỉ có khi trang_thai = "du_ky"
      "ngay_ky": "2026-04-15",            // null nếu chưa ký
      "ngay_giao_du_kien": "2026-05-20",
      "ngay_giao_thuc_te": null,          // null = chưa giao

      "hinh_thuc_tt": "vay_von",          // "vay_von" | "tien_mat" | "ket_hop"
      "ngan_hang": "VietinBank",
      "so_tien_vay": 500000000,
      "muc_dong_mong_muon": 200000000,
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
  "thang": "2026-05",
  "su_kien_lai_thu": {
    "muc_tieu": 4,
    "danh_sach": [
      { "ngay": "2026-05-12", "dia_diem": "TP. BMT", "so_kh": 12, "ghi_chu": "" }
    ]
  },
  "tuyen_noi_dung": [                    // chuẩn dùng chung cho mọi NV
    { "id": "so_sanh_xe",  "ten": "So sánh xe" },
    { "id": "trai_nghiem", "ten": "Trải nghiệm thực tế" },
    { "id": "hoi_dap",     "ten": "Hỏi đáp" },
    { "id": "review",      "ten": "Review xe mới" }
  ],
  "zalo_oa": {
    "muc_tieu": 500,
    "thuc_te": 312,
    "theo_tuan": [80, 90, 75, 67]
  }
}
```

`videos.muc_tieu` và `livestream` cấp công ty được **derive** từ tổng các NV — không lưu trong file này.

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

Implement trong `assets/models.js`:

```javascript
// Xe ký mới trong khoảng tháng (vd ['2026-05'] hoặc ['2026-04','2026-05','2026-06'] cho Q2)
getXeKyMoi(allData, months)   = khach_hang.filter(k =>
                                  k.ngay_ky && months.includes(k.ngay_ky.slice(0,7)))

getHdXuat(allData, months)    = khach_hang.filter(k =>
                                  k.ngay_giao_thuc_te &&
                                  months.includes(k.ngay_giao_thuc_te.slice(0,7)))

getHdTon(allData, months)     = khach_hang.filter(k =>
                                  k.ngay_ky &&
                                  k.ngay_ky.slice(0,7) < months[0] &&
                                  !k.ngay_giao_thuc_te)

getLeadTotal(nv, month)       = sum 6 kênh trong nv.lead_theo_thang[month]

getNvStats(allData, nvId, months) = {
  xe_ky_moi:  count khach_hang theo nv + months
  hd_xuat:    count đã giao
  lead_total: sum lead_theo_thang qua các tháng
  gio_live:   sum noi_dung[m].gio_live.thuc_te
  videos:     sum noi_dung[m].videos qua các tuyến
  muc_tieu:   từ config.muc_tieu_thang.muc_tieu_nv[nvId]
  pct:        actual / target * 100, capped 100
}

getRanking(allData, kpi_field, months) = [...nv].sort by stats[kpi_field] desc
```

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

### `nhan-vien-detail.html` — Chi tiết NV (4 tab có FORM)

**Header**: ảnh + tên + tổng quan KPI cá nhân (derive: xe ký / giao / lead / % mục tiêu tháng).

**Tab 1 — Lead theo kênh**:
- Bảng 6 kênh × (mục tiêu | thực tế | %).
- Nút `[Cập nhật lead tháng X]` mở modal: 6 cặp input cho 6 kênh.

**Tab 2 — Nội dung & Live**:
- Card "Giờ live": thanh tiến độ + nút sửa.
- Card "Videos theo tuyến": list tuyến từ `cong-viec.tuyen_noi_dung`, mỗi tuyến 1 input số.
- Modal `[Cập nhật nội dung tháng X]`.

**Tab 3 — KPI tuần**:
- Bảng 4 tuần × (mục tiêu_nv | dự ký | kết quả).
- `mục tiêu_nv` input được. `dự ký` = count KH `du_ky` của NV trong tuần. `kết quả` = count KH `ngay_ky` trong tuần. Cả 2 cột phải đều **derive**, không sửa.
- Nút `[Setup mục tiêu tuần]`.

**Tab 4 — KH của tôi** (gộp dự ký + ký + tồn + đã giao + CSKH):
- Filter pill: `Tất cả | Dự ký | Mới ký | Đang xử lý | Chờ giao | Đã giao | Cần CSKH`.
- Card cho từng KH: tên + xe + trạng thái + bước hiện tại + nút sửa/xem timeline.
- Nút `[+ Thêm KH/Dự ký]` mở form **`khach-hang` Thêm mới với `nhan_vien_id` pre-fill** = NV đang xem.

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
- `< 768px` mobile: stack dọc, bottom-nav 5 mục.
- `768-1024px` tablet: 2 cột.
- `> 1024px` desktop: sidebar trái + content 3-4 cột.

---

## 🔧 CORE FUNCTIONS — `assets/api.js`, `models.js`, `ui.js`

### `api.js`
```javascript
export async function readData(filename)
export async function writeData(filename, data)   // throws on GitHub error — KHÔNG silent fallback
export async function readAllData()
export async function verifyToken(token, owner, repo)  // kiểm /user + /repos/{o}/{r}
export function getToken() / setToken / clearToken
export function getRepoConfig() / setRepoConfig
```

**Khác v1**: `writeData` ném lỗi rõ ràng khi GitHub fail. Modal sẽ hiển thị "Save lên GitHub thất bại — thử lại?". Không bao giờ ghi localStorage thay thế GitHub một cách lặng lẽ.

### `models.js`
Tất cả derive function (xem mục Derived).

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

## 🚀 BUILD ORDER

Xem [PROMPTS.md](PROMPTS.md) — 8 bước với prompt chi tiết.

---

## ✅ CHECKLIST v2

- [ ] Auth + repo config + verify quyền `repo`
- [ ] Tách `app.js` cũ → `api.js` + `models.js` + `ui.js` + `views/*`
- [ ] `xe.html` CRUD catalog
- [ ] `nhan-vien.html` CRUD master
- [ ] `config.json` mục tiêu tháng + setup wizard
- [ ] `khach-hang.json` schema mới + form FK
- [ ] Dashboard stacked bar + time range picker + click expand
- [ ] KPI page derive only + setup mục tiêu modal
- [ ] NV detail 4 tab có form input đầy đủ
- [ ] CSKH filter view
- [ ] Reminders chạy đúng
- [ ] Snapshot tháng cũ → `lich-su.json`
- [ ] Responsive mobile/desktop
- [ ] Repo Private + deploy GitHub Pages
