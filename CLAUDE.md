# CLAUDE.md — Context cho AI Assistant (v2)

> File này dành cho Claude (web hoặc Claude Code) khi làm việc với dự án.
> Đọc file này + [SPEC.md](SPEC.md) trước khi đề xuất bất kỳ thay đổi nào.

---

## Tóm tắt 30 giây

App quản lý nội bộ cho **GĐKD showroom ô tô tại Đắk Lắk**, 1 user, vanilla HTML/CSS/JS (ES Modules). Lưu data qua GitHub Contents API (JSON files trong `assets/data/`), deploy GitHub Pages.

**Triết lý cốt lõi (v2)**: NV-centric. Mọi thứ bắt đầu từ Nhân Viên. KH là transaction thuộc về NV, tham chiếu xe trong catalog. KPI là **derived** từ KH/NV — không gõ tay.

---

## Nguyên tắc làm việc với AI

1. **Đọc [SPEC.md](SPEC.md) trước** khi đề xuất thay đổi nghiệp vụ. SPEC v2 là nguồn sự thật duy nhất.
2. **Đọc [.github/copilot-instructions.md](.github/copilot-instructions.md)** để nắm convention code.
3. **Không đề xuất** đổi stack, thêm framework, hay viết lại từ đầu. Đã chốt vanilla + ES Modules.
4. **Không đề xuất** ô input "thực tế" cho KPI ở bất kỳ trang nào. KPI thực tế **chỉ derive**.
5. Khi không chắc về schema JSON, **hỏi user** thay vì đoán. Đặc biệt với khoá tiếng Việt.
6. Tiếng Việt cho mọi UI; comment code có thể tiếng Anh hoặc Việt.
7. Khi sửa data flow, luôn nghĩ theo **3 lớp**: master → transaction → derived.

---

## Stack & ràng buộc

| Layer | Công nghệ |
|---|---|
| Frontend | HTML5 + CSS3 + Vanilla JS (**ES Modules**, `<script type="module">`) |
| Backend | GitHub Contents API (`/repos/{owner}/{repo}/contents/...`) |
| Auth | Personal Access Token, lưu `localStorage.gdkd_token` |
| Hosting | GitHub Pages (static) |
| Repo | Phải để **Private** vì chứa dữ liệu KH |

**Cấm**: framework UI (React/Vue/Svelte), npm/build step, TypeScript, jQuery, Tailwind, Bootstrap.

---

## Cấu trúc file v2

```
/
├── *.html (10 file: login + 9 trang)
│   ├── login.html
│   ├── index.html               (Dashboard)
│   ├── kpi.html
│   ├── cong-viec.html
│   ├── xe.html                  ← MỚI (catalog xe)
│   ├── nhan-vien.html
│   ├── nhan-vien-detail.html
│   ├── khach-hang.html
│   └── cskh.html
├── README.md
├── SPEC.md
├── CLAUDE.md (file này)
├── PROMPTS.md
├── .github/copilot-instructions.md
└── assets/
    ├── style.css
    ├── app.js                   ← Entry, bootstrap
    ├── api.js                   ← GitHub API wrapper (readData/writeData/verifyToken)
    ├── models.js                ← Derive functions
    ├── ui.js                    ← Modal, toast, format helpers, stacked-bar render
    ├── notify.js
    ├── views/                   ← 1 module / trang
    └── data/
        ├── config.json
        ├── xe.json              ← MỚI
        ├── cong-viec.json       ← Chỉ cấp công ty
        ├── nhan-vien.json
        ├── khach-hang.json      ← Flat array với FK
        └── lich-su.json         ← Snapshot tháng cũ (optional)
```

**Đã xoá** so với v1: `kpi.json` (derive), `cskh.json` (gộp vào KH).

---

## Trạng thái build hiện tại

> Cập nhật phần này mỗi khi hoàn thành 1 bước trong PROMPTS.md.

- [x] **Bước 0 (legacy v1)**: app cũ với 6 file JSON, `app.js` IIFE 2000 dòng — đang chạy nhưng có lỗi logic và kiến trúc sai.
- [x] **Bước 1**: Refactor `app.js` → ESM (`api.js` / `models.js` / `ui.js` / `views/*`)
- [x] **Bước 2**: Master data — `xe.html` catalog + `nhan-vien.html` (`trang_thai`, `ngay_vao`)
- [x] **Bước 3**: `config.json` mục tiêu tháng + setup gating
- [x] **Bước 4**: `khach-hang.json` schema mới + form FK + migration data cũ
- [x] **Bước 5**: Dashboard mới (stacked bar + time range + click expand)
- [x] **Bước 6**: KPI page (derive + setup mục tiêu)
- [ ] **Bước 7**: NV detail 4 tab có form input
- [ ] **Bước 8**: CSKH filter view + reminders + snapshot tháng cũ
- [ ] **Bước 9**: Test responsive + deploy

---

## Quyết định kỹ thuật đã chốt (v2)

| Quyết định | Lý do |
|---|---|
| **NV-centric, KH là transaction** | GĐKD quản lý người làm, không quản lý từng đơn lẻ |
| **3 lớp data: master → transaction → derived** | Tránh data trùng, tránh lệch số liệu |
| **KPI thực tế chỉ derive** | Gõ tay sẽ lệch với KH thật. Chỉ mục tiêu là input |
| **`khach-hang.json` flat với FK** | Dễ aggregate cross-NV / cross-xe / cross-tháng |
| **Setup gating bắt buộc** | Không cho thêm KH khi chưa có Xe + NV + mục tiêu |
| **Form KH dùng dropdown FK** | NV và Xe phải chọn từ master, cấm gõ tự do |
| **ES Modules thay vì IIFE** | Tách `app.js` 2000 dòng thành module < 300 dòng |
| **`writeData` throw lỗi rõ ràng** | Không silent fallback localStorage như v1 |
| **Time Range Picker (tháng/quý/năm/tuỳ chỉnh)** | Em hỏi xem theo quý, theo năm hoặc tổ hợp tháng |
| **Stacked bar theo NV** | 1 thanh thấy tổng + đóng góp từng NV cùng lúc |
| **Click KPI card → expand** | Drill-down thấy ranking NV cho KPI đó |
| **Token + repo config gộp ở login** | Người dùng nhập 1 lần, không phải tìm modal Settings |
| **`Notification` API thay vì Web Push** | Push thật cần server |
| **Lưu token `localStorage`** | App 1 user, máy cá nhân |
| **GitHub Contents API thay vì Issues/Gists** | Có versioning tự nhiên, dễ debug |
| **Không build step** | Em trai sửa 1 file là deploy được |
| **Vanilla JS thay vì React** | Codebase nhỏ, không phụ thuộc, dễ học |

---

## Schema v2 — tham chiếu nhanh

Chi tiết trong [SPEC.md mục Schema JSON v2](SPEC.md). Tóm tắt:

```jsonc
// config.json
{
  "thang_hien_tai": "2026-05",
  "showroom": { "ten", "dia_chi", "gdkd" },
  "muc_tieu_thang": {
    "2026-05": {
      "xe_ky_moi": 20, "hd_xuat_thang": 18, "lead_phat_sinh": 150,
      "muc_tieu_nv": { "nv001": { "xe_ky_moi": 4 } }
    }
  }
}

// xe.json (master)
{ "xe": [{ "id", "ma_xe", "hang", "dong", "bien_the", "mau", "nam",
           "gia_niem_yet", "trang_thai" }] }

// nhan-vien.json (master + input theo tháng)
{ "nhan_vien": [{ "id", "ho_ten", "anh", "chuc_vu", "sdt", "trang_thai",
  "lead_theo_thang": { "2026-05": { fb_ca_nhan, mkt_cty, tiktok, ... } },
  "noi_dung":        { "2026-05": { gio_live, videos } },
  "muc_tieu_tuan":   { "2026-05": [{ tuan, muc_tieu }] }
}]}

// khach-hang.json (transaction — flat với FK)
{ "khach_hang": [{
  "id", "ten", "sdt",
  "nhan_vien_id",        // FK → nhan-vien.json
  "xe_id",               // FK → xe.json
  "trang_thai",          // du_ky | moi_ky | dang_xu_ly | cho_giao | da_giao | dong_cskh
  "ngay_du_kien_ky", "ngay_ky", "ngay_giao_du_kien", "ngay_giao_thuc_te",
  "hinh_thuc_tt", "ngan_hang", "so_tien_vay", "so_hd",
  "tien_do": [{ "ngay", "buoc", "noi_dung" }],
  "cskh":    [{ "ngay", "kenh", "danh_gia", "phan_hoi", "van_de",
                "trang_thai_xu_ly", "ghi_chu_noi_bo" }]
}]}

// cong-viec.json (chỉ cấp công ty)
{ "thang", "su_kien_lai_thu", "tuyen_noi_dung": [{id, ten}], "zalo_oa" }
```

---

## Câu hỏi mẫu để hỏi Claude (v2)

**Tốt**:
- "Đọc [SPEC.md](SPEC.md) mục Derived. Hàm `getNvStats` có cần thêm trường `cskh_can_xu_ly` để hiển thị badge ở card NV không?"
- "Trong `khach-hang.json`, KH có `trang_thai='du_ky'` thì `ngay_ky` để null đúng không? Nếu null thì KPI tháng có đếm KH này không?"
- "App cần wizard 4 bước setup. Hãy đề xuất state machine cho `setup-wizard`: bước nào hoàn thành thì cho qua bước nào?"
- "Stacked bar trong SPEC — segment màu xanh khi NV ≥80% mục tiêu cá nhân. Nhưng nếu NV chưa có mục tiêu cá nhân (`muc_tieu_nv[nvId]` undefined) thì lấy màu gì?"

**Tránh**:
- "Viết lại app này bằng React/Vue" (đã chốt vanilla)
- "Thêm Tailwind/Bootstrap" (đã chốt CSS variables thuần)
- "Thêm form gõ tay KPI thực tế" (sai triết lý — KPI luôn derive)
- "Tách thành nhiều repo" (1 repo duy nhất)
- "Gộp `khach-hang` vào `nhan-vien` (nest)" (đã chốt flat với FK)
- "Tách `cskh.json` riêng lại" (đã gộp vào KH)
- "Bỏ ES Modules, gộp lại 1 file" (đã chốt module hoá)
