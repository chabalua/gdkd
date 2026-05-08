# Hướng dẫn cho GitHub Copilot (v2)

> File này được Copilot tự động đọc trong mọi phiên làm việc tại VS Code.
> KHÔNG cần paste lại trong từng prompt. Copilot phải tuân thủ các quy tắc dưới đây.
> Khi mâu thuẫn với gợi ý "thông minh", **luôn ưu tiên file này + SPEC.md + CLAUDE.md**.

---

## 1. Bối cảnh dự án

App quản lý nội bộ cho **Giám Đốc Kinh Doanh (GĐKD) showroom ô tô tại Đắk Lắk**.
Sử dụng cá nhân, **1 user duy nhất**. Không phải SaaS.

**Triết lý cốt lõi (v2)**:
- **NV-centric**: mọi thứ bắt đầu từ Nhân Viên. KH là **transaction** thuộc về 1 NV và tham chiếu 1 xe trong catalog.
- **3 lớp data**: master (xe, NV, config) → transaction (KH) → derived (KPI, ranking, view).
- **KPI thực tế = derive**, không bao giờ gõ tay. GĐKD chỉ nhập **mục tiêu**, **lead theo kênh**, **nội dung/live**, và **chi tiết KH**.

---

## 2. Tech stack — KHÔNG ĐƯỢC THAY ĐỔI

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | HTML5 + CSS3 + Vanilla JS (**ES Modules**) | KHÔNG dùng React, Vue, jQuery, Tailwind, Bootstrap, Svelte |
| Backend | GitHub Contents API | Đọc/ghi file JSON trong `assets/data/` |
| Auth | GitHub Personal Access Token | Lưu `localStorage.gdkd_token` + repo config |
| Hosting | GitHub Pages | Static, không có server |
| Build | KHÔNG có build step | Mở `index.html` là chạy được |

**Tuyệt đối không thêm**: npm, package.json, webpack, vite, TypeScript, SCSS, framework UI.

**Khác v1**: code chia thành ES Modules, mỗi file < 350 dòng. HTML dùng `<script type="module" src="...">`.

---

## 3. Quy ước code

### JavaScript
- **ES2020+** thuần (async/await, optional chaining, template literals, spread).
- **ES Modules**: dùng `import`/`export`, không IIFE 1 file lớn.
- Mỗi module < 350 dòng. Vượt → tách thêm.
- Không dùng `var`. `const` mặc định, `let` khi reassign.
- Hàm `camelCase`. Async function bắt buộc prefix `async`.
- Không `eval`, không `innerHTML` với data chưa qua `escapeHtml()`.
- Mọi fetch GitHub API qua wrapper trong [`assets/api.js`](../assets/api.js) — KHÔNG fetch trực tiếp ở view.
- Try/catch mọi gọi API; lỗi hiển thị bằng `showToast(msg, 'error')`. **`writeData` ném lỗi rõ ràng — không silent fallback localStorage**.

### HTML
- Tiếng Việt toàn bộ UI: `placeholder`, `aria-label`, `title`, button text.
- `lang="vi"` trên `<html>`.
- Viewport meta cho responsive.
- Header chung (showroom + range picker + đăng xuất) + nav chung (sidebar desktop / bottom-nav mobile).
- HTML file chỉ là shell mỏng (~16 dòng) — view render từ JS module qua `data-page` attribute trên `<body>`.

### CSS
- **Bắt buộc** dùng CSS variables trong [`assets/style.css`](../assets/style.css) (xem mục 5).
- Mobile-first: viết mobile trước, media query mở rộng.
- KHÔNG dùng `!important` trừ khi fix bug Safari iOS.
- Class kebab-case: `.kpi-card`, `.btn-primary`, `.stacked-bar-segment`.

### JSON (data files)
- Khoá theo **snake_case tiếng Việt không dấu**: `xe_ky_moi`, `nhan_vien_id`, `hinh_thuc_tt`.
- Ngày ISO: `"2025-07-15"`.
- Tiền VND số nguyên: `500000000` (KHÔNG `"500.000.000"`).
- Indent 2 spaces (`JSON.stringify(data, null, 2)`).
- ID: prefix theo entity — `nv001`, `x001`, `kh001`. Auto-increment.

---

## 4. Cấu trúc file v2

```
/
├── login.html
├── index.html               (Dashboard)
├── kpi.html
├── cong-viec.html
├── xe.html                  ← MỚI v2 (catalog xe)
├── nhan-vien.html
├── nhan-vien-detail.html
├── khach-hang.html
├── cskh.html
├── README.md
├── SPEC.md                  ← Spec đầy đủ
├── CLAUDE.md                ← Context cho Claude
├── PROMPTS.md               ← Prompt build từng bước
├── .github/
│   └── copilot-instructions.md   (file này)
└── assets/
    ├── style.css
    ├── app.js               ← Entry, bootstrap DOMContentLoaded
    ├── api.js               ← getToken, readData, writeData, verifyToken
    ├── models.js            ← Derive functions (getKpiThucTe, getNvStats, ...)
    ├── ui.js                ← showModal, showToast, escapeHtml, format*, renderStackedBar
    ├── notify.js            ← Reminder logic
    ├── views/               ← 1 module / trang
    │   ├── dashboard.js, kpi.js, cong-viec.js, xe.js,
    │   ├── nhan-vien.js, nhan-vien-detail.js,
    │   └── khach-hang.js, cskh.js
    ├── img/
    └── data/
        ├── config.json      (mục tiêu tháng + showroom info)
        ├── xe.json          (master — catalog)
        ├── cong-viec.json   (chỉ cấp công ty)
        ├── nhan-vien.json   (master + lead/nội dung input theo tháng)
        ├── khach-hang.json  (transaction — flat array với FK)
        └── lich-su.json     (snapshot tháng cũ, optional)
```

**Đã xoá so với v1**: `kpi.json` (derive), `cskh.json` (gộp vào khach-hang).

---

## 5. Design system — CSS variables

```css
:root {
  --primary: #1a3a5c;
  --primary-light: #2c5282;
  --accent: #e8a020;
  --success: #2e7d32;        /* ≥ 80% mục tiêu cá nhân */
  --success-light: #66bb6a;
  --warning: #f57c00;        /* 50-79% */
  --warning-light: #ffa726;
  --danger: #c62828;         /* < 20% */
  --danger-light: #ef5350;
  --neutral: #cfd8dc;        /* segment trống stacked-bar */
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

### Quy tắc màu thanh tiến độ

**Stacked bar (segment theo NV)** — dựa vào % cá nhân:
- `≥ 80%` → `--success-light`
- `50-79%` → `--warning-light`
- `20-49%` → `--warning` (cam đậm hơn)
- `< 20%` → `--danger-light`
- NV không có mục tiêu cá nhân → `--primary-light` (xám xanh trung tính)

**Thanh đơn (không stacked)** — dựa vào % tổng:
- `≥ 80%` → `--success`
- `50-79%` → `--warning`
- `< 50%` → `--danger`

### Stacked bar dimension
- Mobile: track height **18-22px**, segment border-right 1px trắng.
- Desktop: track height **22-28px**.
- Card chứa: tối thiểu cao 200px, số liệu font 32-40px.

### Font
Be Vietnam Pro 700-800 (h1, h2, .kpi-number) + Noto Sans 400-500 (body), import từ Google Fonts.

---

## 6. Core API wrapper — đã có trong [`assets/api.js`](../assets/api.js)

KHÔNG viết lại ở view. Chỉ `import`:

```javascript
// assets/views/dashboard.js
import { readAllData, writeData } from '../api.js';
import { showToast, escapeHtml, renderStackedBar } from '../ui.js';
import { getKpiSegments, getNvStats } from '../models.js';
```

### `api.js`
```javascript
export async function readData(filename)
export async function writeData(filename, data)   // throws nếu GitHub fail
export async function readAllData()
export async function verifyToken(token, owner, repo)
export function getToken() / setToken(t) / clearToken()
export function getRepoConfig() / saveRepoConfig({owner, repo, branch})
```

### `models.js`
```javascript
export function getCurrentMonth()
export function getXeKyMoi(allData, months)
export function getHdXuat(allData, months)
export function getHdTon(allData, months)
export function getLeadTotal(nv, month)
export function getNvStats(allData, nvId, months)
export function getKpiSegments(allData, kpiField, months)   // → [{nv_id, value, pct_personal, color}]
export function getRanking(allData, kpiField, months)
export function isSetupComplete(allData)                    // → {co_xe, co_nv, co_muc_tieu, all}
```

### `ui.js`
```javascript
export function showToast(msg, type)
export function showModal(html, options)
export function closeModal()
export function confirmAction(msg, onConfirm)
export function escapeHtml(str)
export function formatCurrency(n)         // 1500000000 → "1,5 tỷ"
export function formatDate(iso)           // "2025-07-15" → "15/07/2025"
export function calcPercent(actual, target)
export function renderProgressBar(pct)
export function renderStackedBar({segments, target, height})
export function renderRangePicker(currentRange, onChange)
export function getCurrentRange()         // đọc sessionStorage
export function getRangeLabel(range)
```

---

## 7. Bảo mật & những điều CẤM

- **CẤM** hardcode token trong code. Token chỉ đến từ form login.
- **CẤM** log token ra console.
- **CẤM** dùng `innerHTML` với data chưa qua `escapeHtml()`.
- **CẤM** push file JSON dữ liệu thật KH lên repo public — repo phải **Private**.
- **CẤM** thêm thư viện ngoài (ngoại trừ Google Fonts).
- **CẤM** tự ý đổi schema trong [SPEC.md](../SPEC.md) — thấy thiếu trường thì hỏi user.
- **CẤM** thêm form/input KPI thực tế ở bất kỳ trang nào — KPI luôn derive.
- **CẤM** nest `khach_hang` vào trong `nhan_vien` — đã chốt flat với FK.
- **CẤM** silent fallback localStorage trong `writeData` — phải throw lỗi rõ ràng.

---

## 8. Hành vi mong đợi của Copilot

- Khi user mở 1 HTML mới: gợi ý template chuẩn (16 dòng): `<!DOCTYPE>`, `lang="vi"`, viewport, `<link href=Google Fonts>`, `<link assets/style.css>`, `<body data-page="..." data-require-auth="true">`, `<div data-app-root>`, `<script type="module" src="assets/app.js">`.
- Khi gặp `readData(`: gợi ý đúng filename (`'xe.json'`, `'nhan-vien.json'`, `'khach-hang.json'`, `'config.json'`, `'cong-viec.json'`). KHÔNG gợi ý `'kpi.json'` hay `'cskh.json'` (đã xoá).
- Khi gặp class CSS: ưu tiên class đã có trong `style.css`.
- Khi tính KPI %: dùng `calcPercent()`, KHÔNG `a/b*100`.
- Khi format tiền/ngày: dùng `formatCurrency()` / `formatDate()`.
- Khi cần range tháng (Dashboard / KPI): gọi `getCurrentRange()` từ `ui.js`, KHÔNG hardcode `getCurrentMonth()`.
- Khi viết form thêm/sửa KH: ô NV và Xe phải là `<select>` lấy từ `nhan-vien.json` / `xe.json` — KHÔNG `<input type="text">`.
- Khi viết tính count KPI: filter `khach-hang.khach_hang` theo `ngay_ky` (xe ký) hoặc `ngay_giao_thuc_te` (xe giao), KHÔNG đọc từ `kpi.json`.

---

## 9. Tham khảo nhanh schema v2

Chi tiết trong [SPEC.md](../SPEC.md). Tóm tắt:

| File | Khoá gốc |
|---|---|
| `config.json` | `thang_hien_tai`, `showroom`, `muc_tieu_thang[m].{xe_ky_moi,hd_xuat_thang,lead_phat_sinh,muc_tieu_nv}` |
| `xe.json` | `xe[]` với `id`, `ma_xe`, `hang`, `dong`, `bien_the`, `mau`, `nam`, `gia_niem_yet`, `trang_thai` |
| `cong-viec.json` | `thang`, `su_kien_lai_thu`, `tuyen_noi_dung[]`, `zalo_oa` |
| `nhan-vien.json` | `nhan_vien[]` với `id`, `ho_ten`, `trang_thai`, `lead_theo_thang[m]`, `noi_dung[m]`, `muc_tieu_tuan[m]` |
| `khach-hang.json` | `khach_hang[]` với `nhan_vien_id`, `xe_id`, `trang_thai`, `tien_do[]`, `cskh[]` |
| `lich-su.json` | `lich_su[]` snapshot tháng cũ |

**Trạng thái KH** (6 giá trị, pipeline 1 chiều):
`du_ky → moi_ky → dang_xu_ly → cho_giao → da_giao → dong_cskh`

---

## 10. Khi gặp tình huống chưa rõ

Copilot **KHÔNG tự ý**:
- Thêm chức năng ngoài SPEC v2.
- Đổi cấu trúc thư mục.
- Thêm dependency.
- Đổi tên hàm trong `api.js` / `models.js` / `ui.js`.
- Suggest gõ tay KPI thực tế.
- Tách lại `cskh.json` hay `kpi.json`.
- Dùng pattern v1 (IIFE, single file, `appState.data`, `normalizeData` cũ).

Thay vào đó, để comment `// TODO: hỏi GĐKD` và làm phần đã rõ.
