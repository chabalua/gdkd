# PROMPTS.md — Build từng bước cho Copilot / Claude (v2)

> Dùng các prompt dưới đây để giao việc cho AI từng bước.
> Trước mỗi prompt, đảm bảo AI đã có context: dán [SPEC.md](SPEC.md) + [CLAUDE.md](CLAUDE.md) + [.github/copilot-instructions.md](.github/copilot-instructions.md), hoặc nhắc AI đọc 3 file đó.
> Tick checkbox trong [CLAUDE.md](CLAUDE.md) sau mỗi bước hoàn thành.

---

## Bước 1 — Refactor `app.js` IIFE → ES Modules

**Mục tiêu**: Tách 2051 dòng `app.js` đơn (IIFE) thành nhiều module nhỏ, không thay đổi behavior, chuẩn bị nền cho v2.

**Prompt**:
```
Tách assets/app.js (IIFE 2051 dòng) thành các module ES Modules:
- assets/api.js: getToken, setToken, clearToken, verifyToken, getRepoConfig,
  saveRepoConfig, readData, writeData, readAllData. writeData KHÔNG silent
  fallback localStorage khi GitHub fail — phải throw rõ ràng và caller xử lý.
- assets/ui.js: escapeHtml, formatCurrency, formatDate, formatDateTime,
  calcPercent, getCurrentMonth, showToast, showModal, closeModal, confirmAction,
  renderProgressBar.
- assets/models.js: normalizeData, mapLeadTotal, mapEmployeeKpi, hasKpiData,
  hasCongViecData, hasOperationalData, countNotifications, ensureEmployeeMonth.
- assets/views/dashboard.js, kpi.js, cong-viec.js, nhan-vien.js,
  nhan-vien-detail.js, khach-hang.js, cskh.js: 1 hàm render export default.
- assets/app.js (mới, ngắn): bootstrap DOMContentLoaded, đọc data-page,
  gọi đúng view, attach common events.

HTML đổi: <script src="assets/app.js"></script> → <script type="module"
src="assets/app.js"></script>. Bỏ <script src="assets/notify.js">, import
trong app.js thay vì global.

Yêu cầu:
- Mỗi file < 350 dòng. Nếu vượt, tách thêm.
- Không đổi data flow, không đổi tên hàm public của API.
- Verify mọi trang vẫn render được như cũ (login, dashboard, KPI, công việc,
  NV, NV detail, KH, CSKH).
```

**DoD**: app cũ vẫn chạy đúng như trước, nhưng code đã chia module ESM.

---

## Bước 2 — Master data: `xe.html` + `nhan-vien.html` CRUD

**Mục tiêu**: Có đầy đủ catalog xe và danh sách NV trước khi nhập KH.

**Prompt**:
```
Tạo trang xe.html theo SPEC mục "xe.html — Catalog xe":
- Bảng cột: mã xe, hãng, dòng, biến thể, màu, năm, giá niêm yết, trạng thái.
- Form thêm/sửa: id auto-generate (x001, x002...), ma_xe gợi ý theo
  pattern HANG-DONG-BIENTHE-MAU-NAM, gia_niem_yet input number format VND.
- Filter: hãng (chip), trạng thái (chip).
- Khoá xoá nếu xe đó được tham chiếu trong khach-hang.json (chuẩn bị cho FK
  validation, dù khach-hang chưa migrate).
- File data: assets/data/xe.json {"xe": []}
- view: assets/views/xe.js
- Thêm vào sidebar/bottom nav: ⚙️ Catalog xe.

Cập nhật nhan-vien.html (đang có nhưng yếu):
- Trường mới: trang_thai (dang_lam | nghi_viec), ngay_vao.
- Form thêm/sửa NV đầy đủ. Card list hiện trạng thái nghỉ việc dạng badge xám.
- Chưa làm tab detail bên trong (để bước 7).
```

**DoD**: thêm/sửa/xoá xe và NV đầy đủ. Data lưu lên GitHub thành công.

---

## Bước 3 — `config.json` mục tiêu tháng + setup gating

**Mục tiêu**: GĐKD nhập mục tiêu tháng (cty + cá nhân), app khoá thêm KH nếu chưa setup đủ.

**Prompt**:
```
Mở rộng config.json theo SPEC:
{
  "thang_hien_tai": "2026-05",
  "showroom": { "ten", "dia_chi", "gdkd" },
  "muc_tieu_thang": { "2026-05": {
    "xe_ky_moi", "hd_xuat_thang", "lead_phat_sinh",
    "muc_tieu_nv": { "<nv_id>": { "xe_ky_moi": 4 } }
  }}
}

Trang kpi.html bổ sung nút [Setup mục tiêu tháng] mở modal:
- Nhóm 1: mục tiêu công ty (3 input).
- Nhóm 2: mục tiêu cá nhân từng NV (lặp qua nhan_vien, mỗi NV 1 input
  xe_ky_moi cho tháng hiện tại).
- Lưu vào config.muc_tieu_thang[thang_hien_tai].

Setup gating: tạo helper isSetupComplete() trong models.js trả về object
{ co_xe, co_nv, co_muc_tieu, all }. Trên các trang khach-hang.html (chưa
có form thêm KH) và Dashboard, nếu chưa all thì hiển thị card cảnh báo
"Cần setup [Xe / NV / Mục tiêu] trước khi nhập KH" với nút điều hướng.

Trang đầu tiên user vào (sau login) nếu !all → redirect index.html với
banner setup-wizard ở đầu trang.
```

**DoD**: nhập mục tiêu lưu được; nếu thiếu master data, app chặn đúng chỗ.

---

## Bước 4 — `khach-hang.json` schema mới + form FK

**Mục tiêu**: Migration sang schema flat với FK, form thêm KH dùng dropdown reference.

**Prompt**:
```
Migrate khach-hang.json từ schema cũ {ton_thang_cu[], ky_moi[]} sang schema
v2 {khach_hang: []} theo SPEC mục "khach-hang.json (transaction — flat)".

Viết script migration 1 lần (chạy trong console hoặc trang ẩn /migrate.html):
- ton_thang_cu[*] → khach_hang với trang_thai suy ra từ buoc_hien_tai
  (1-2 → "dang_xu_ly", 3 → "dang_xu_ly", 4-5 → "cho_giao", 6 → "da_giao").
- ky_moi[*] → khach_hang với trang_thai map từ field cũ trang_thai
  (vua_ky → "moi_ky", dang_lam_vay → "dang_xu_ly", cho_xe_ve → "cho_giao",
   san_sang → "cho_giao", da_giao_xe → "da_giao").
- nhan_vien_id và xe_id để null cho data cũ (chưa map được). Hiển thị badge
  cảnh báo "Cần gán NV / Xe" trên các record này.
- cskh.json (cũ) → mỗi entry tìm KH theo ten_kh, push vào khach.cskh[]. Nếu
  không tìm được, để vào file orphan-cskh.json để xử lý tay.

Sau migration, viết form thêm/sửa KH mới:
- Field NV: <select> options từ nhan-vien.json (chỉ NV trang_thai='dang_lam').
- Field Xe: <select> options từ xe.json (chỉ trang_thai='dang_ban'/'sap_ve'),
  hiển thị "Omoda C5 Premium · Trắng · 720tr".
- Field trang_thai: dropdown 6 giá trị. Khi đổi, ẩn/hiện các field phụ
  (ngay_du_kien_ky chỉ hiện khi du_ky; ngay_giao_thuc_te chỉ hiện khi da_giao).
- Section "Tiến độ": list timeline + nút "+ Thêm cập nhật" (ngày, bước, nội
  dung). Append-only, không cho xoá entry cũ.
- Section "CSKH" (chỉ hiện khi trang_thai='da_giao'): list cskh + nút thêm.

Validation:
- nhan_vien_id và xe_id BẮT BUỘC. Form không submit được nếu null.
- Nếu trang_thai chuyển sang 'da_giao' mà ngay_giao_thuc_te trống → báo lỗi.
```

**DoD**: data cũ migrate xong; thêm KH mới qua dropdown FK; xoá `cskh.json`.

---

## Bước 5 — Dashboard mới (stacked bar + time range + click expand)

**Mục tiêu**: Dashboard đẹp, dễ nhìn, drill-down theo NV.

**Prompt**:
```
Viết lại assets/views/dashboard.js theo SPEC mục "index.html — Dashboard".

Component cần làm:
1) ui.js thêm:
   - renderStackedBar({segments, target, height}): trả HTML thanh stacked.
     segments = [{nv_id, nv_ten, value, pct_personal, color}].
   - renderRangePicker(currentRange, onChange): dropdown 4 mode (tháng cụ
     thể / quý / năm / tuỳ chỉnh). State lưu trong sessionStorage key
     "gdkd_range". Format range = {months: ["2026-04","2026-05"]}.
   - getRangeLabel(range): "Tháng 5/2026" | "Quý 2/2026" | "Năm 2026" |
     "Tháng 4-5/2026".

2) models.js thêm:
   - getKpiSegments(allData, kpi_field, range): với mỗi NV tính value và
     pct_personal so với mục tiêu cá nhân (hoặc null nếu không có), trả
     mảng segment đã sort desc theo value.
   - getKhTon(allData, range): KH ngay_ky < range[0] && !ngay_giao_thuc_te,
     sort theo số ngày tồn desc.

3) Dashboard layout:
   - Header: showroom name + RangePicker + nút notification + đăng xuất.
   - 4 KPI card (collapsed): Xe ký mới / HĐ xuất / HĐ tồn / Lead phát sinh.
     Card cao 200px, số 36px, thanh 22px. Trong thanh vẽ stacked segments.
     Dưới thanh hiện 2 hint: "🥇 NV {topNvName}" và "⚠️ NV {worstNvName}"
     (NV % thấp nhất hoặc 0).
   - Click card → toggle expanded inline. Expanded hiện danh sách NV (sort
     desc theo value), mỗi NV 1 row: avatar + tên + thanh ngang riêng (độ
     dài = value/maxValue * 100%, màu = pct_personal) + "X/Y (Z%)". Click
     tên → mở nhan-vien-detail.html?id=...
   - HĐ tồn card khác: expanded hiện top 10 KH tồn lâu nhất (tên, NV, số
     ngày tồn, vướng mắc).
   - Hàng dưới: 4 thẻ Công việc trọng tâm. Videos và Livestream cũng dùng
     stacked bar theo NV (derive từ noi_dung).
   - Hàng cuối: bảng "Cần xử lý hôm nay" (KH có ngay_giao_du_kien trong 3 ngày).

4) Mobile: card xếp dọc, expanded thành slide-up sheet (position fixed
   bottom, animate slideUp).
```

**DoD**: Dashboard hiển thị đúng theo range chọn; click expand thấy NV
breakdown; thanh đủ to + dễ nhìn; mobile responsive.

---

## Bước 6 — KPI page (derive only + setup mục tiêu)

**Mục tiêu**: KPI page chỉ hiển thị derive, không còn form gõ "thực tế".

**Prompt**:
```
Viết lại assets/views/kpi.js theo SPEC mục "kpi.html — KPI page":
- Cùng RangePicker với Dashboard.
- 4 thẻ KPI lớn (cùng pattern stacked + expand như Dashboard) — có thể
  reuse component renderKpiCardStacked.
- Bảng "Xếp hạng NV": cột nv, xe ký, xe giao, lead, % mục tiêu cá nhân.
  Sort được. Click tên → NV detail.
- Bảng "Sức bán theo dòng xe": cho mỗi xe trong xe.json hiển thị số ký +
  số giao trong range + tên NV bán nhiều nhất xe đó.
- Nút [Setup mục tiêu tháng] mở modal đã viết bước 3, KHÔNG có cột "thực tế".

Xoá hoàn toàn:
- File data/kpi.json (data cũ migrate vào ... thực ra KPI là derive nên xoá
  luôn, không cần migrate).
- Modal cũ "Cập nhật KPI" có cột thực tế trong app.js v1.
- Mọi reference đến kpi.thuc_te trong code.
```

**DoD**: KPI page chạy hoàn toàn từ derive; không còn input "thực tế" ở
đâu cả; xoá `kpi.json`.

---

## Bước 7 — NV detail 4 tab có form input

**Mục tiêu**: Tab nhân viên detail có đủ form nhập lead, nội dung, mục
tiêu tuần; tab 4 thành Pipeline KH.

**Prompt**:
```
Viết lại assets/views/nhan-vien-detail.js theo SPEC mục "nhan-vien-detail.html":

Header: avatar + tên + tổng quan KPI cá nhân (derive từ getNvStats với
range = tháng hiện tại). 4 mini chip: Xe ký / Giao / Lead / % mục tiêu.

Tab 1 — Lead theo kênh:
- Bảng 6 hàng × 4 cột (Kênh / Mục tiêu / Thực tế / %).
- Nút [Cập nhật lead tháng X] mở modal:
  - 3 hàng có cặp (mục tiêu | thực tế): fb_ca_nhan, mkt_cty, tiktok, telesales.
  - 2 hàng số trần: sr_tiep_khach, di_thi_truong.
  - Submit ghi vào nhan_vien[i].lead_theo_thang[thang_hien_tai].

Tab 2 — Nội dung & Live:
- Card "Giờ live": thanh tiến độ + nút sửa modal (cặp mục tiêu | thực tế).
- Card "Videos theo tuyến nội dung": list từ cong_viec.tuyen_noi_dung; mỗi
  tuyến 1 input số. Nút sửa modal.

Tab 3 — KPI tuần:
- Bảng 4 tuần × 4 cột (Tuần / Mục tiêu NV / Dự ký / Kết quả).
- "Mục tiêu NV" input được trực tiếp inline (debounce 500ms autosave) hoặc
  qua modal [Setup mục tiêu tuần].
- "Dự ký" = count khach_hang where nhan_vien_id===nv.id && trang_thai='du_ky'
  && tuần của ngay_du_kien_ky thuộc tuần i.
- "Kết quả" = count khach_hang where nhan_vien_id===nv.id && ngay_ky thuộc tuần i.

Tab 4 — KH của tôi:
- Filter pill: Tất cả | Dự ký | Mới ký | Đang xử lý | Chờ giao | Đã giao | Cần CSKH.
  ("Cần CSKH" = trang_thai='da_giao' và (chưa có cskh hoặc có cskh
  trang_thai_xu_ly !== 'da_xu_ly')).
- List card cho mỗi KH: tên + xe + badge trạng thái + bước hiện tại + nút
  "Sửa" (mở form khach-hang) và nút "Xem timeline".
- Nút [+ Thêm KH/Dự ký] mở form khach-hang Thêm mới với nhan_vien_id pre-fill
  = id NV hiện tại; trang_thai mặc định = 'du_ky' (user đổi được).

Tất cả modal trong tab 1-3 sau khi save đều rerender đúng tab đang mở,
không reload trang.
```

**DoD**: 4 tab có CRUD đầy đủ; tab 4 hoạt động như pipeline; thêm KH dự ký
từ tab 4 → tự pre-fill NV.

---

## Bước 8 — CSKH filter view + reminders + snapshot tháng cũ

**Mục tiêu**: CSKH page hoàn chỉnh; reminder chạy; tháng mới tự snapshot.

**Prompt**:
```
A. Viết lại assets/views/cskh.js theo SPEC mục "cskh.html":
- Filter từ khach_hang: trang_thai='da_giao' VÀ (cskh.length === 0 sau
  ngay_giao_thuc_te > 7 ngày HOẶC có cskh entry trang_thai_xu_ly !== 'da_xu_ly').
- Card với badge số sao, kênh, NV phụ trách. Nút "Thêm phản hồi" → modal
  add cskh entry.
- Stats top: tổng đã giao trong range / cần xử lý / đã đóng CSKH.

B. Viết lại notify.js theo SPEC mục "Reminders":
- Hàm checkReminders(allData) trả mảng notification {type, message, target_url}.
- Trigger 6 loại như SPEC bảng.
- Push qua Notification API nếu có quyền; luôn push vào panel notification
  trong app (dropdown từ icon chuông header).
- setInterval 30 phút check lại; check ngay khi load app.

C. Auto snapshot tháng cũ:
- Khi readAllData() chạy, so sánh getCurrentMonth() với config.thang_hien_tai.
- Nếu month thật > config.thang_hien_tai (đã sang tháng mới):
  - Tính KPI tháng cũ từ khach-hang.json + nhan-vien.json.
  - Push vào lich-su.json: { thang, xe_ky_moi, hd_xuat, lead_phat_sinh, ranking }.
  - Cập nhật config.thang_hien_tai = current month.
  - Khởi tạo config.muc_tieu_thang[current_month] = clone của tháng trước
    (user chỉnh sau).
- Một lần. Toast "Đã chuyển sang tháng X. Mục tiêu được clone từ tháng trước,
  kiểm tra và cập nhật."
```

**DoD**: CSKH page chạy đúng; nhận notification; sang tháng mới có snapshot
tự động.

---

## Bước 9 — Test responsive + deploy

**Mục tiêu**: App ổn định trên mobile và desktop, chạy được trên GitHub Pages.

**Prompt**:
```
1. Test responsive 3 breakpoint:
   - Mobile (< 768px): bottom nav, card stack dọc, modal full screen, expanded
     dashboard card thành slide-up sheet.
   - Tablet (768-1024px): sidebar thu gọn icon-only, content 2 cột.
   - Desktop (> 1024px): sidebar full, content 3-4 cột, expanded card inline.
   Sửa CSS chỗ nào vỡ layout.

2. Test flow end-to-end:
   - Login → setup wizard (xe → NV → mục tiêu).
   - Thêm KH dự ký từ tab 4 NV detail.
   - Chuyển KH dự ký → mới ký → đang xử lý → chờ giao → đã giao.
   - Thêm CSKH cho KH đã giao.
   - Đổi range Dashboard sang Quý → KPI cập nhật đúng.

3. Deploy GitHub Pages:
   - Repo phải Private.
   - Settings → Pages → Source: main branch / root.
   - Verify URL https://<user>.github.io/<repo>/ load được.
   - Check token PAT trong production: nhập token đúng repo, verify.

4. Tài liệu:
   - Cập nhật README.md: 5 dòng quickstart.
   - Tick xong các checkbox trong CLAUDE.md mục "Trạng thái build".
```

**DoD**: app chạy ổn cả 3 breakpoint, deploy thành công, README có quickstart.

---

## Phụ lục — Cách dùng prompt với Claude Code / Copilot

1. **Trước mỗi phiên**, mở 3 file [SPEC.md](SPEC.md), [CLAUDE.md](CLAUDE.md),
   [.github/copilot-instructions.md](.github/copilot-instructions.md) trong cùng workspace để Copilot index được.
2. **Với Claude Code**: paste nguyên prompt của bước cần làm, kèm `@SPEC.md @CLAUDE.md`.
3. **Với Copilot Chat**: tương tự, dùng `#file:SPEC.md`.
4. **Sau mỗi bước**: kiểm tra DoD, commit, tick checkbox CLAUDE.md.
5. **Nếu AI lệch hướng** (đề xuất framework, gõ tay KPI, nest KH vào NV, v.v.):
   nhắc bằng câu "Tuân thủ [CLAUDE.md mục Quyết định kỹ thuật đã chốt v2] và [SPEC.md mục Nguyên tắc cốt lõi]".
