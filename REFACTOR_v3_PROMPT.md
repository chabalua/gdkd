# REFACTOR v3 — GĐKD App

> File này dùng để paste vào Claude Code / Copilot Chat / Cursor.
> Chia thành 3 GIAI ĐOẠN. Mỗi giai đoạn paste 1 lần, commit xong mới qua giai đoạn sau.
> KHÔNG paste cả 3 giai đoạn cùng lúc — AI sẽ tự ý cắt xén.

---

## TRẠNG THÁI THỰC TẾ (cập nhật 2026-05-11)

### Tóm tắt nhanh

- **Giai đoạn 1:** gần như xong. `migrate-v3.html` đã có, `assets/data/_backup_v2/` đã có, data runtime đang chạy trên schema v3 và `kpi.json` / `cskh.json` đã bị loại khỏi `assets/data/`.
- **Giai đoạn 2:** đã làm phần lớn UI/core. Đã có `settings.html` + `assets/views/settings.js`, `assets/components/week-grid.js`, `assets/components/kpi-core.js`, CRUD phòng ban/nhiệm vụ, NV detail 2 tab, shared KPI card, mobile fix cho NV detail, hỗ trợ chọn màu xe theo từng KH.
- **Giai đoạn 3:** mới làm **một phần**. Chưa có polling/focus refresh/retry queue kiểu VNM gốc. Thay vào đó hiện tại app dùng cơ chế **lưu nháp cục bộ + đồng bộ GitHub thủ công** qua `pending writes`.

### Sai khác giữa kế hoạch gốc và code hiện tại

- Trang Cài đặt đang dùng tên thật là `settings.html` + `assets/views/settings.js`, không phải `cai-dat.html`.
- Shared KPI component hiện là `assets/components/kpi-core.js`, không phải `assets/components/kpi-card.js`.
- CRUD phòng ban/nhiệm vụ hiện đang nằm trong `assets/modals/employee.js` và `assets/modals/admin.js`, chưa tách thành `phong-ban.js` / `nhiem-vu.js` / `gan-nhiem-vu.js` như prompt gốc.
- Sync không còn theo hướng “cứ nhập là phải đẩy GitHub ngay”. Hiện tại: ghi local draft trước, sau đó bấm **Đồng bộ** ở `settings.html`.

### Mục còn tồn thực sự

- Funnel 4 tầng riêng chưa được tách thành component `funnel.js`.
- `assets/events.js` chưa tách thành nhiều file con.
- Chưa có polling 30s + refresh on focus + retry queue tự động.
- Dashboard vẫn còn lệch một phần so với bố cục tối giản trong prompt gốc.

### Ghi chú bổ sung sau khi chốt dữ liệu xe

- Catalog xe hiện cho phép nhập nhiều màu trong cùng một dòng xe qua trường `mau` dạng danh sách.
- Form khách hàng đã có thêm `mau_xe` để lưu màu khách chốt thực tế mà không cần nhân bản `xe_id` theo từng màu.

---

## BỐI CẢNH CHUNG (paste ở mỗi giai đoạn)

App quản lý nội bộ cho Giám Đốc Kinh Doanh showroom Omoda Đắk Lắk. 1 user duy nhất. Repo: `chabalua/Omoda` (private). Stack giữ nguyên không đổi:

- Vanilla HTML + CSS + JS (ES Modules), không build step, không framework
- GitHub Contents API làm backend (giống pattern repo VNM của tôi)
- GitHub Pages hosting
- Token GitHub lưu localStorage

App đang ở SPEC v2 nhưng có nhiều legacy + mâu thuẫn. Refactor lên v3 với 7 thay đổi cốt lõi:

1. **Mọi nhập liệu chỉ xảy ra ở cấp NV theo tuần.** Bỏ mục tiêu cấp công ty / cấp tháng. Mục tiêu phòng ban = sum NV. Mục tiêu showroom = sum phòng ban.
2. **Đa phòng ban (không chỉ KD).** Marketing, Kế toán, vv. Mỗi phòng ban có loại (`ban_hang` / `ho_tro`).
3. **Thư viện nhiệm vụ động.** GĐKD tự định nghĩa nhiệm vụ, gán cho NV. Bỏ list 6 kênh cố định.
4. **5 tuần / tháng (T1–T5).** T5 ẩn nếu tháng 28 ngày.
5. **Phễu chuyển đổi 4 tầng** chỉ cho phòng ban `ban_hang`: Nhiệm vụ tổng → Dự ký → Ký → Giao.
6. **KH dự ký = minimal record** (chỉ cần tên + ngày dự kiến + NV).
7. **VNM-style sync**: optimistic UI + pull on focus + polling 30s + cache busting.

### Quy tắc tuyệt đối — KHÔNG ĐƯỢC VI PHẠM

**KHÔNG:**
- Thêm React / Vue / Svelte / jQuery / Tailwind / Bootstrap
- Thêm npm / package.json / build step / TypeScript / SCSS
- Thêm Firebase / Supabase / WebSocket / backend server
- Giữ schema legacy: `kpi.json`, `cskh.json`, `KH_PROGRESS_META`, `migrateKhachHangLegacy`, `LEGACY_ACTIVITY_CHANNELS`, override storage keys
- Silent fallback localStorage khi GitHub fail (phải throw + toast error)
- Tách mục tiêu thành "cấp công ty" + "cấp NV" — CHỈ có cấp NV
- File JS > 350 dòng (nếu vượt, tách module nhỏ hơn)
- Tự sửa file ngoài scope của giai đoạn đang làm

**PHẢI:**
- Mọi file đổi schema phải có migration script đi kèm
- Mọi action ghi data → push GitHub → toast feedback "✓ Đã đồng bộ" hoặc "⚠ Sync lỗi"
- Mọi modal đóng phải có nút Huỷ rõ ràng + click backdrop để đóng
- Mọi text UI tiếng Việt
- Mọi tên field JSON tiếng Việt không dấu snake_case

---

# GIAI ĐOẠN 1 — Dọn legacy + đổi schema + migration

## Mục tiêu

Xoá toàn bộ code chết, đổi schema sang v3, viết migration tự động chuyển data v2 hiện có sang v3 mà không mất bản ghi nào.

## File cần đụng

**Xoá hoàn toàn:**
- `assets/data/kpi.json`
- `assets/data/cskh.json`
- `migrate.html` (sẽ tạo `migrate-v3.html` mới)

**Sửa schema:**
- `assets/data/config.json` — schema mới (xem dưới)
- `assets/data/nhan-vien.json` — schema mới
- `assets/data/khach-hang.json` — cho phép minimal record
- `assets/data/cong-viec.json` — chỉ giữ sự kiện lái thử + Zalo OA, bỏ tuyến nội dung + livestream cấp công ty

**Sửa code:**
- `assets/api.js` — xoá `STORAGE_KEYS.overrides` cho `kpi.json` + `cskh.json` + `orphan-cskh.json`; xoá `readOverride` / `writeOverride` / `clearOverride` (silent fallback)
- `assets/app.js` — `persistFile` throw lỗi rõ ràng, không fallback localStorage. Toast "⚠ Sync GitHub lỗi: <msg>. Thử lại?" + giữ data trong memory để retry.
- `assets/models.js` — xoá `KH_PROGRESS_META`, `migrateKhachHangLegacy`, `LEGACY_ACTIVITY_CHANNELS`, `hasLegacyActivityData`, `getLegacyChannelMeta`. Đổi `normalizeData` để chỉ đọc schema v3 (không backward compat v1/v2 nữa vì đã migrate).
- `assets/notify.js` — kiểm tra không còn ref đến field legacy.

**Tạo mới:**
- `migrate-v3.html` — trang chạy migration 1 lần. UI: nút "Xem trước v2", nút "Chạy migration", log.

## Schema v3

### `config.json`

```jsonc
{
  "thang_hien_tai": "2026-05",
  "showroom": {
    "ten": "Omoda Đắk Lắk",
    "dia_chi": "...",
    "gdkd": "Hoàng Trọng Hiếu"
  },
  "phong_ban": [
    { "id": "kd_1", "ten": "Kinh doanh 1", "loai": "ban_hang" },
    { "id": "kd_2", "ten": "Kinh doanh 2", "loai": "ban_hang" },
    { "id": "mkt",  "ten": "Marketing",    "loai": "ho_tro" },
    { "id": "kt",   "ten": "Kế toán",      "loai": "ho_tro" }
  ],
  "nhiem_vu_lib": [
    { "id": "fb_qc",     "ten": "FB Cá nhân (QC)",     "phong_ban_id": "kd_1", "loai": "lead",      "don_vi": "so" },
    { "id": "mkt_phan_bo","ten": "MKT công ty phân bổ","phong_ban_id": "kd_1", "loai": "lead",      "don_vi": "so" },
    { "id": "tiktok",    "ten": "TikTok khai thác",    "phong_ban_id": "kd_1", "loai": "lead",      "don_vi": "so" },
    { "id": "telesales", "ten": "Telesales",           "phong_ban_id": "kd_1", "loai": "lead",      "don_vi": "so" },
    { "id": "sr_tk",     "ten": "SR tiếp khách",       "phong_ban_id": "kd_1", "loai": "lead",      "don_vi": "so" },
    { "id": "di_tt",     "ten": "Đi thị trường",       "phong_ban_id": "kd_1", "loai": "lead",      "don_vi": "so" },
    { "id": "luot_lai_thu","ten": "Lượt lái thử",      "phong_ban_id": "kd_1", "loai": "hoat_dong", "don_vi": "luot" },
    { "id": "gio_live",  "ten": "Giờ livestream",      "phong_ban_id": "mkt",  "loai": "hoat_dong", "don_vi": "gio" },
    { "id": "so_video",  "ten": "Số video",            "phong_ban_id": "mkt",  "loai": "hoat_dong", "don_vi": "so" },
    { "id": "tien_qc",   "ten": "Tiền chạy quảng cáo", "phong_ban_id": "mkt",  "loai": "hoat_dong", "don_vi": "tien" }
  ]
}
```

**Lưu ý:** Phòng ban `kd_1`, `kd_2` áp dụng cho cả 2 nhóm KD hiện có. Nhiệm vụ chung cho cả KD: copy ID `fb_qc`, `mkt_phan_bo`, `tiktok`, `telesales`, `sr_tk`, `di_tt` thêm bản sao với `phong_ban_id: "kd_2"` (đổi ID thành `fb_qc_2`, vv). Hoặc cho phép 1 nhiệm vụ thuộc nhiều phòng ban — đổi field thành `phong_ban_ids: ["kd_1", "kd_2"]`. Em **chọn cách `phong_ban_ids: []`** để gọn.

### `nhan-vien.json`

```jsonc
{
  "nhan_vien": [
    {
      "id": "nv001",
      "ho_ten": "Lê Ngọc Nam",
      "anh": "",
      "chuc_vu": "Nhân viên kinh doanh",
      "sdt": "0335678385",
      "ngay_vao": "2025-04-01",
      "phong_ban_id": "kd_1",
      "loai_nhan_su": "chinh_thuc",
      "trang_thai": "dang_lam",
      "nhiem_vu_ids": ["fb_qc", "mkt_phan_bo", "tiktok", "telesales", "sr_tk", "di_tt", "luot_lai_thu"],
      "du_lieu": {
        "2026-04": {
          "tuan": {
            "1": {
              "fb_qc":     { "muc_tieu": 16, "thuc_te": 14 },
              "telesales": { "muc_tieu": 5,  "thuc_te": 3  }
            },
            "2": { },
            "3": { },
            "4": { },
            "5": { }
          }
        }
      }
    }
  ]
}
```

**Khác v2:**
- Bỏ `lead_theo_thang`, `noi_dung`, `kpi_tuan`, `du_ky_tuan_nay`.
- Tất cả gộp vào `du_lieu[month].tuan[1-5][nhiem_vu_id] = { muc_tieu, thuc_te }`.
- Mục tiêu xe ký mới / HĐ xuất KHÔNG còn vì derive từ `khach-hang.json`.

### `khach-hang.json`

Giữ schema v2 nhưng nới validation:

- **Bắt buộc**: `id`, `ten`, `nhan_vien_id`, `trang_thai`
- **Khi `trang_thai = 'du_ky'`**: bắt buộc thêm `ngay_du_kien_ky` (week sẽ derive từ field này)
- **Mọi field khác optional**: `sdt`, `dia_chi`, `xe_id`, `ngay_ky`, `ngay_giao_du_kien`, `ngay_giao_thuc_te`, `hinh_thuc_tt`, `ngan_hang`, `so_tien_vay`, `so_hd`, `kenh_lead`
- Form "Thêm KH" có 2 mode:
  - **Quick (Dự ký)**: 3 ô — tên + NV + ngày dự kiến ký
  - **Full**: form đầy đủ như hiện tại
- Pipeline 6 trạng thái giữ nguyên: `du_ky → moi_ky → dang_xu_ly → cho_giao → da_giao → dong_cskh`

### `cong-viec.json`

```jsonc
{
  "su_kien_lai_thu": {
    "danh_sach": [
      { "id", "ngay", "dia_diem", "so_kh", "ghi_chu" }
    ]
  },
  "zalo_oa": {
    "muc_tieu": 500,
    "thuc_te": 312,
    "theo_tuan": [80, 90, 75, 67, 0]
  }
}
```

Bỏ `videos.tuyen_noi_dung`, `livestream`, mục tiêu video cấp công ty — đã chuyển thành nhiệm vụ trong `nhiem_vu_lib`.

## Migration v2 → v3 (script trong `migrate-v3.html`)

### Bước 1 — Đọc data cũ
Đọc `config.json`, `nhan-vien.json`, `khach-hang.json` qua `readData()`.

### Bước 2 — Xây `config.json` v3
- Giữ `thang_hien_tai`, `showroom`.
- `phong_ban`: lấy từ `nhom_kinh_doanh` (đổi `id` từ `nhom_1` → `kd_1`, `nhom_2` → `kd_2`, `ten` "Nhóm 1" → "Kinh doanh 1") + thêm `{ id: "mkt", ten: "Marketing", loai: "ho_tro" }` và `{ id: "kt", ten: "Kế toán", loai: "ho_tro" }`.
- `nhiem_vu_lib`: chuyển từ `lead_channels` cũ. Mỗi channel cũ:
  ```js
  {
    id: oldChannel.id,
    ten: oldChannel.label,
    phong_ban_ids: ["kd_1", "kd_2"],  // mặc định cho cả 2 KD
    loai: oldChannel.loai || 'lead',
    don_vi: oldChannel.don_vi || 'so'
  }
  ```

### Bước 3 — Xây `nhan-vien.json` v3
Với mỗi NV cũ:
- Đổi `nhom_id` → `phong_ban_id` (map `nhom_1` → `kd_1`).
- `nhiem_vu_ids`: lấy tất cả channel ID có entry trong `lead_theo_thang[month]` (bất kỳ tháng nào) — đó là nhiệm vụ NV đó đang theo.
- `du_lieu`: với mỗi tháng trong `lead_theo_thang`:
  ```js
  for (let week = 1; week <= 5; week++) {
    for (const [chId, chData] of Object.entries(oldMonth)) {
      const thucTe = chData.tuan?.[week] || 0;
      const mucTieu = week === 1 ? (chData.muc_tieu || 0) / 4 : 0;
      // hoặc giữ muc_tieu nguyên ở week 1, các tuần khác = 0
      if (thucTe || mucTieu) {
        nv.du_lieu[month].tuan[week][chId] = { muc_tieu: mucTieu, thuc_te: thucTe };
      }
    }
  }
  ```
- Bỏ `lead_theo_thang`, `noi_dung`, `kpi_tuan`, `du_ky_tuan_nay`.

### Bước 4 — Giữ `khach-hang.json` y nguyên
Không cần đổi gì (schema v3 chỉ nới validation, không thay shape).

### Bước 5 — Push lên GitHub
3 file mới: `config.json`, `nhan-vien.json`, `cong-viec.json` mới. Lưu file backup vào `assets/data/_backup_v2/` với timestamp suffix (vd `_backup_v2/nhan-vien-20260512.json`) trước khi ghi đè.

### UI `migrate-v3.html`
- Nút "1. Xem trước data v2"
- Nút "2. Xem preview v3" (chưa ghi, chỉ render JSON)
- Nút "3. Chạy migration" (push GitHub)
- Pre area hiển thị diff side-by-side
- Sau khi chạy → toast success + link về index.html

## Acceptance criteria Giai đoạn 1

- [x] Mở app sau migration, data runtime đang chạy trên schema v3
- [x] `assets/data/kpi.json`, `cskh.json` không còn
- [~] Runtime code đã bỏ legacy chính; ref còn lại chủ yếu nằm trong tài liệu/prompt cũ
- [~] `persistFile()` không silent fallback nữa; hiện lưu nháp cục bộ có chủ đích + cho đồng bộ GitHub sau
- [x] `migrate-v3.html` chạy được, có log
- [x] `_backup_v2/` tồn tại trong `assets/data/`

---

# GIAI ĐOẠN 2 — Refactor UI + components dùng chung

> Chỉ paste sau khi Giai đoạn 1 commit xong.

## Mục tiêu

Tách KPI card thành component dùng chung, viết lại NV detail với bảng tuần × nhiệm vụ, viết trang Cài đặt cho thư viện nhiệm vụ, viết Dashboard mới với phễu 4 tầng.

## Files cần đụng

**Tạo mới:**
- `cai-dat.html` — trang Cài đặt
- `assets/views/cai-dat.js` — render Cài đặt
- `assets/components/kpi-card.js` — KPI card dùng chung dashboard + kpi page
- `assets/components/nv-chip.js` — chip stack NV
- `assets/components/tier-legend.js` — legend tier
- `assets/components/funnel.js` — phễu 4 tầng (Tổng nhiệm vụ → Dự ký → Ký → Giao)
- `assets/components/week-grid.js` — bảng tuần × nhiệm vụ
- `assets/modals/phong-ban.js` — CRUD phòng ban
- `assets/modals/nhiem-vu.js` — CRUD thư viện nhiệm vụ
- `assets/modals/gan-nhiem-vu.js` — gán nhiệm vụ cho NV

**Sửa:**
- `assets/views/dashboard.js` — gọi `kpi-card.js` + `funnel.js`, bỏ code trùng lặp. Bỏ Group Split (đã có ở nhan-vien.html). Bỏ Watch list (đã có ở kpi.html).
- `assets/views/kpi.js` — gọi `kpi-card.js`, bỏ code trùng lặp
- `assets/views/nhan-vien.js` — bucket theo `phong_ban_id` (không phải `nhom_id`)
- `assets/views/nhan-vien-detail.js` — đơn giản hoá: chỉ 2 tab. Tab 1 "Nhập tuần" dùng `week-grid.js`. Tab 2 "Khách hàng" giữ pipeline + filter
- `assets/models.js` — viết lại `getNvStats`, `getRanking`, `getKpiSegments` với schema v3. Thêm `getFunnelStats(allData, scope, scopeId, months)` trả 4 tầng + 3 tỷ lệ.
- `assets/ui.js` — đổi `getWeekOfMonth()` thành rule 5 tuần
- `assets/events.js` — tách thành `assets/events/common.js` + `events/autosave.js` + `events/filters.js`

**Xoá:**
- `assets/modals/setup-muc-tieu.js` — không còn modal này
- `assets/modals/employee.js` — function `openManageModal` phần per-channel target. Thay bằng `gan-nhiem-vu.js` riêng.

## Spec chi tiết các component

### `components/kpi-card.js`

Export:
```js
export function renderKpiCard({ field, icon, label, unit, data, months, expandable }) → string
export function renderNvChipStack(segments, total) → string
export function renderNvExpandRows(segments) → string
export function renderKhTonRows(khTonList, allData) → string
```

Hiện tại code ở `dashboard.js` và `kpi.js` có 2 copy của các function này — gộp vào đây, 2 view đều import.

### `components/funnel.js`

Export:
```js
export function getFunnelStats(allData, scope, scopeId, months)
// scope: 'showroom' | 'phong_ban' | 'nv'
// scopeId: id của phòng ban hoặc nv (null nếu showroom)
// Trả: {
//   tang_1_nhiem_vu_tong: number,   // sum mọi nhiem_vu_id có loai='lead' của các NV thuộc scope
//   tang_2_du_ky: number,            // count KH du_ky có ngay_du_kien_ky trong months
//   tang_3_ky: number,               // count KH có ngay_ky trong months
//   tang_4_giao: number,             // count KH có ngay_giao_thuc_te trong months
//   ty_le_1_2: percent,              // tang_2 / tang_1 * 100
//   ty_le_2_3: percent,
//   ty_le_3_4: percent,
//   ty_le_tong: percent              // tang_4 / tang_1 * 100
// }

export function renderFunnel(stats, opts) → string
// Hiển thị 4 tầng dọc + 3 mũi tên với % giữa các tầng
```

### `components/week-grid.js`

```js
export function renderWeekGrid({ nvId, month, channels, data, canEdit }) → string
// channels = NV.nhiem_vu_ids đã map sang full object
// Render:
// - Header: T1 | T2 | T3 | T4 | T5 | Tổng | Mục tiêu | %
// - Mỗi hàng = 1 nhiệm vụ, 5 input số + 3 cell derive
// - T5 disabled nếu tháng có < 29 ngày
// - Inline autosave debounce 600ms
// - canEdit = false khi range picker không phải 1 tháng đơn lẻ
```

### `cai-dat.js`

Trang Cài đặt có 3 section:
1. **Thông tin showroom**: form đổi tên / địa chỉ / GĐKD
2. **Phòng ban**: list + CRUD. Mỗi row có nút Sửa / Xoá. Modal sửa: ten + loai (ban_hang/ho_tro).
3. **Thư viện nhiệm vụ**: list + CRUD. Filter theo phòng ban. Mỗi row: ten + loai + don_vi + phong_ban_ids (chip).

## NV Detail mới — 2 tab

### Tab 1 — Nhập tuần (`week-grid.js`)

```
[Tháng: T5/2026] [+ Gán thêm nhiệm vụ]

┌────────────────────────────────────────────────────────┐
│ Nhiệm vụ        T1   T2   T3   T4   T5  Tổng  MT  %   │
├────────────────────────────────────────────────────────┤
│ FB Cá nhân QC   16   14   12   18   _   60   80  75%  │
│ MKT phân bổ     20   22   18   25   _   85   100 85%  │
│ TikTok          10   8    12   15   _   45   60  75%  │
│ Telesales       5    4    6    7    _   22   30  73%  │
│ SR tiếp khách   3    2    4    3    _   12   15  80%  │
│ Đi thị trường   2    1    2    3    _   8    10  80%  │
│ Lượt lái thử    1    2    3    2    _   8    10  80%  │
├────────────────────────────────────────────────────────┤
│ TỔNG LEAD       64   59   67   78   _   268             │
│ Dự ký (derive)  4    3    5    2    _   14              │
│ Tỷ lệ CV %      6.3  5.1  7.5  2.6  _   5.2%            │
└────────────────────────────────────────────────────────┘
```

- Mỗi cell input là `<input type="number">` với `data-week-input` attribute
- Autosave debounce 600ms
- Hàng "Dự ký" và "Tỷ lệ CV" là derive, không cho edit

### Tab 2 — Khách hàng

- Filter pill: Tất cả / Dự ký / Mới ký / Đang xử lý / Chờ giao / Đã giao / Cần CSKH
- Filter kênh lead: chip theo `nhiem_vu_id` (chỉ những kênh NV này có)
- List card KH
- Nút `+ Thêm KH dự ký` (mode quick) và `+ Thêm KH đầy đủ`

## Dashboard mới — gọn 4 section

1. **Hero scoreboard**: donut tổng xe ký / mục tiêu showroom (sum mọi NV) + 4 mini chip
2. **4 KPI card**: Xe ký / HĐ xuất / HĐ tồn / Lead phát sinh — dùng `kpi-card.js`
3. **Phễu 4 tầng cấp showroom**: dùng `funnel.js`
4. **Bảng KH cần giao trong 3 ngày** (urgent table) — giữ nguyên

Bỏ:
- Top/Watch list (đã có ở KPI page)
- Group Split (đã có ở Nhân viên)
- Work cards (di chuyển vào Cài đặt > Hoạt động chung)

## Acceptance criteria Giai đoạn 2

- [x] `settings.html` CRUD được phần phòng ban / nhiệm vụ / GitHub config
- [ ] `dashboard.js` < 250 dòng (chưa đạt)
- [x] `kpi.js` đang ở mức gọn và dùng shared KPI component
- [x] Đã bỏ duplicate KPI card giữa `dashboard.js` và `kpi.js` bằng `assets/components/kpi-core.js`
- [x] NV detail có bảng 5 tuần, autosave debounce hoạt động
- [ ] Phễu 4 tầng riêng ở showroom level chưa tách thành component hoàn chỉnh
- [x] `getWeekOfMonth()` rule mới đã chạy theo T1–T5
- [ ] `events.js` chưa tách thành 3 file

---

# GIAI ĐOẠN 3 — VNM-style sync (local-first + polling)

> Chỉ paste sau khi Giai đoạn 2 commit xong.

## Mục tiêu

Thêm 3 thứ vào để app cảm giác như VNM repo của tôi:
1. Optimistic UI: số nhảy ngay khi gõ
2. Pull on focus: khi tab thành active → fetch lại
3. Polling: mỗi 30s khi tab active
4. Toast feedback "✓ Đã đồng bộ" sau mỗi push thành công

## Files đụng

**Sửa:**
- `assets/api.js` — thêm cache busting
- `assets/app.js` — thêm `pollManager`, focus/visibility listeners, `saveAndSync()` helper
- `assets/events/autosave.js` — dùng `saveAndSync()` thay cho `persistFile` trực tiếp

## Chi tiết

### `api.js` — cache busting

Trong `readRemoteData()`:
```js
const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}/${filename}?ref=${branch}&_t=${Date.now()}`;
```
Đảm bảo không bao giờ hit cache CDN GitHub.

### `app.js` — `saveAndSync()` helper

```js
export async function saveAndSync(filename, sliceKey, optimisticLabel = null) {
  // 1. UI đã được mutate trước khi gọi (local-first)
  // 2. Push GitHub
  try {
    await writeData(filename, appState.data[sliceKey]);
    if (optimisticLabel !== false) {
      showToast(`✓ ${optimisticLabel || 'Đã đồng bộ'}`, 'success', 1500);
    }
    return { ok: true };
  } catch (error) {
    showToast(`⚠ Sync lỗi: ${error.message}. Sẽ thử lại.`, 'error', 5000);
    // Push vào queue retry sau 10s
    enqueueRetry(filename, sliceKey);
    return { ok: false, error };
  }
}

const retryQueue = new Set();
function enqueueRetry(filename, sliceKey) {
  retryQueue.add(JSON.stringify({ filename, sliceKey }));
  setTimeout(processRetryQueue, 10000);
}
async function processRetryQueue() {
  if (!navigator.onLine) return setTimeout(processRetryQueue, 10000);
  for (const item of [...retryQueue]) {
    const { filename, sliceKey } = JSON.parse(item);
    try {
      await writeData(filename, appState.data[sliceKey]);
      retryQueue.delete(item);
      showToast(`✓ Đã sync ${filename} (retry)`, 'success', 2000);
    } catch {
      // giữ trong queue, thử lại lần sau
    }
  }
}
```

### `app.js` — Pull on focus + polling

```js
let pollTimer = null;
let isRefreshing = false;

async function refreshDataSilent() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const raw = await readAllData();
    const newData = normalizeData(raw);
    // So sánh sha hoặc timestamp — nếu khác thì rerender
    if (JSON.stringify(newData) !== JSON.stringify(appState.data)) {
      appState.data = newData;
      rerenderApp();
      // Toast nhẹ nếu user không phải người gây ra thay đổi
      showToast('🔄 Đã cập nhật dữ liệu mới', 'info', 1500);
    }
  } catch (e) {
    console.warn('Pull on focus failed', e);
  } finally {
    isRefreshing = false;
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(refreshDataSilent, 30000);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    refreshDataSilent();
    startPolling();
  } else {
    stopPolling();
  }
});
window.addEventListener('focus', refreshDataSilent);
window.addEventListener('online', refreshDataSilent);

// Khởi động lần đầu
startPolling();
```

### Đổi mọi `persistFile()` → `saveAndSync()`

Toàn bộ `assets/modals/*.js` và `assets/events/autosave.js` — thay:
```js
await persistFile('nhan-vien.json', appState.data.nhanVien, 'Đã lưu mục tiêu.');
```
Thành:
```js
await saveAndSync('nhan-vien.json', 'nhanVien', 'Đã lưu mục tiêu');
```

### Optimistic UI cho week-grid

Trong `events/autosave.js`, hàm xử lý `data-week-input`:
```js
input.addEventListener('input', () => {
  // 1. Mutate local IMMEDIATELY
  const nv = findNv(input.dataset.nvId);
  const cell = ensureCell(nv, input.dataset.month, input.dataset.tuan, input.dataset.nhiemVuId);
  cell.thuc_te = Number(input.value) || 0;
  
  // 2. Update derived UI cells (tổng, %, tỷ lệ CV) ngay tại chỗ
  recomputeDerivedCells(input);
  
  // 3. Debounce save sau 600ms
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveAndSync('nhan-vien.json', 'nhanVien', null), 600);
});
```

## Acceptance criteria Giai đoạn 3

- [ ] Sync đa thiết bị trong < 30s chưa có vì chưa làm polling/pull on focus
- [x] Gõ số ở week-grid → cell tổng / % nhảy ngay không chờ network
- [~] Khi chưa sync GitHub, app lưu nháp cục bộ và báo đồng bộ sau; chưa có retry tự động khi bật mạng lại
- [ ] Chưa có refresh tự động khi tab quay lại foreground
- [ ] Chưa có poll request mỗi 30s khi tab active

---

# CHECKLIST CUỐI CÙNG (paste sau cả 3 giai đoạn)

```
☐ Mọi file JS < 350 dòng
☑ Không còn data runtime phụ thuộc `kpi.json`, `cskh.json`; legacy ref còn lại chủ yếu nằm trong tài liệu cũ
☑ Schema `config.json` + `nhan-vien.json` đang chạy theo v3/bridge v3
☑ `migrate-v3.html` có sẵn, backup vào `_backup_v2/`
☑ `settings.html` CRUD được phòng ban / nhiệm vụ / GitHub config
☐ Dashboard đúng hoàn toàn spec tối giản `hero + 4 KPI + funnel + urgent table`
☑ NV detail: 2 tab (`week-grid` + KH), không còn tab lead/content/weekly cũ
☑ T5 hiển thị đúng ở tháng đủ 29+ ngày
☐ Phễu 4 tầng + 3 tỷ lệ render ở showroom/phòng ban/NV
☐ `saveAndSync` chưa làm; hiện tại dùng `persistFile` + `pending writes` + đồng bộ thủ công
☐ Polling 30s + focus refresh + retry queue chưa làm
☑ Mọi text UI chính đang là tiếng Việt
☐ Sync đa thiết bị real-time trong 30s chưa hoàn tất
```

---

# HƯỚNG DẪN SỬ DỤNG PROMPT NÀY

1. **Lưu file `REFACTOR_v3_PROMPT.md` vào root repo.**
2. **Commit Giai đoạn 1 trước**: paste section "BỐI CẢNH CHUNG" + "GIAI ĐOẠN 1" + checklist Giai đoạn 1 vào AI session mới. Sau khi AI làm xong, kiểm tra acceptance criteria, commit.
3. **Giai đoạn 2**: tạo session mới (đừng dùng tiếp session cũ — quá nhiều context). Paste "BỐI CẢNH CHUNG" + "GIAI ĐOẠN 2".
4. **Giai đoạn 3**: tương tự.
5. **Nếu AI lệch hướng**: nhắc lại bằng câu "Đọc lại mục QUY TẮC TUYỆT ĐỐI ở đầu prompt".

Mỗi giai đoạn 1 prompt chính + tối đa 2-3 prompt sửa lặt vặt. Tổng dự kiến: 9-12 prompts cho cả refactor. Ít hơn nhiều so với hiện tại đang lắt nhắt.
