# 📐 NAMING CONVENTION — Chuẩn bị redesign UI

> File này là **giao kèo đặt tên** cho code + UI khi viết view layer mới song song với cũ.
> Áp dụng khi tạo file/biến/class CSS/copy mới. Code cũ chưa cần đụng — chỉ áp khi sửa.

---

## 1. Cấu trúc thư mục khi redesign

```
assets/
├── style-tokens.css        ← Single source of truth cho design tokens (đã có)
├── style.css               ← UI hiện tại — KHÔNG sửa, sẽ xoá khi redesign xong
├── style-next.css          ← UI mới — viết song song với style.css
├── views/                  ← Renderer cũ
├── views-next/             ← Renderer mới (mirror cấu trúc views/)
├── components/             ← Component cũ (kpi-core, week-grid)
├── components-next/        ← Component mới
└── ...
```

HTML page sẽ tạm chuyển đổi qua URL param: `index.html?ui=next` → bootstrap dùng `views-next/`.
Khi xong, xoá `views/`, `style.css`, đổi tên `views-next/` → `views/`.

---

## 2. Function naming

| Loại | Pattern | Ví dụ |
|---|---|---|
| **View renderer** | `render{Page}(data)` → HTML string | `renderDashboard(data)`, `renderKpiPage(data)` |
| **Component** | `create{Component}(props)` → HTML string | `createKpiCard({field, data, months})`, `createStackedBar({segments, total})` |
| **Modal** | `open{Entity}Modal(id?, options?)` → async void | `openCustomerModal(id, {prefillNvId})` |
| **Helper lookup** | `get{Thing}(data, ...args)` → value | `getNvLabel(data, nvId)`, `getXeLabel(data, xeId)` |
| **Derive (KPI)** | `get{Metric}(data, ...args)` → value/array | `getKpiSegments`, `getRanking`, `getNvStats` |
| **Predicate** | `is{Condition}(thing)` → boolean | `isKhValid(kh)`, `isSetupComplete(data)` |
| **Action handler** | `handle{Event}{Target}` hoặc gắn `data-action` | `handleSubmitCustomer`, `data-action="open-customer-create"` |
| **Persist** | `persistFile(filename, payload)` | đã có ở app.js |

**Quy ước**:
- Tên hàm tiếng Anh, tên biến tiếng Anh. **Tên label/UI string tiếng Việt.**
- KHÔNG mix tiếng Việt vào tên hàm (`tinhKpi` ❌, `getKpi` ✅).
- Function pure (no side effect) → đặt trong `models/`. Có DOM/IO → trong `views/` hoặc `events.js`.

---

## 3. CSS class naming

Adopt **BEM-lite**: `block__element--modifier`, nhưng giữ tên ngắn cho block phổ biến.

| Pattern | Khi dùng | Ví dụ |
|---|---|---|
| `.btn`, `.btn-primary` | Component nguyên tử (atomic) | `.btn.btn-primary`, `.btn.btn-soft` |
| `.card`, `.card.is-hero` | Component có biến thể | `.card.is-hero`, `.card.is-compact` |
| `.kpi-card__header` | BEM khi block có internal element | `.kpi-card__metrics`, `.kpi-card__chevron` |
| `.is-{state}` | State (modifier) | `.is-active`, `.is-expanded`, `.is-empty`, `.is-pending`, `.is-syncing` |
| `.has-{thing}` | Container có gì đó | `.has-error` (form field có lỗi) |

**Cấm**:
- `!important` — nếu phải dùng → có bug specificity, fix gốc.
- ID selector (`#dashboard`) — chỉ dùng cho element duy nhất + JS hook.
- Inline color trừ stacked-bar segment (dynamic).
- CSS rời rạc trong HTML view (template literal) — đẩy vào `style-next.css`.

**Phân tầng file CSS** (sau khi redesign xong):

```
style-tokens.css   ← :root variables
core.css           ← reset, base, layout primitives (sidebar, topbar, bottom-nav)
components.css     ← atomic components (btn, card, badge, input, modal)
views.css          ← page-specific overrides nếu cần (hạn chế)
```

---

## 4. Data attribute naming

Hiện đã dùng `data-action="..."` cho event delegation, `data-{entity}-{field}` cho data binding. Giữ.

| Pattern | Mục đích | Ví dụ |
|---|---|---|
| `data-action="verb-noun"` | Click handler trong events.js | `data-action="open-customer-create"` |
| `data-{entity}-{field}` | Hook DOM cho filter/search | `data-customer-row`, `data-customer-status="moi_ky"` |
| `data-page="..."` | Body attribute, chọn renderer | `data-page="dashboard"` |
| `data-id="..."` | ID record cho action | `data-id="kh001"` |

Tên action luôn `verb-noun-modifier`: `open-modal`, `delete-customer`, `flush-sync-now`.

---

## 5. Vietnamese microcopy glossary

Để tránh "1 chỗ nói KH, chỗ khác nói hồ sơ, chỗ khác nữa nói đơn hàng".

| Term | Dùng cho | KHÔNG dùng |
|---|---|---|
| **Khách hàng** (KH) | Bản ghi 1 người mua xe | hồ sơ, đơn hàng, customer |
| **Hợp đồng** (HĐ) | `kh.so_hd` — số hợp đồng vay/mua | đơn, contract |
| **Hoá đơn** | `kh.ngay_xuat_hd` — checkbox xuất HĐ | invoice (chỉ thấy trong code) |
| **Tiến độ** | Timeline `kh.tien_do[]` — các bước xử lý | progress, history |
| **CSKH** | Chăm sóc khách hàng sau giao xe | feedback, support |
| **Nhân viên** (NV) | Sales staff | employee, staff |
| **Mục tiêu** / **Thực tế** | Week-grid cell labels | MT / TT (cấm — quá tắt) |
| **Lead** | Khách quan tâm chưa chốt | prospect (giữ "lead" vì user quen) |
| **Đăng xuất** | Action xoá token | "Xoá token" (jargon IT) |
| **Đẩy lên GitHub** / **Tải bản mới** | Sync chip | "Đồng bộ ngay" (vague) |
| **Dự ký** | Status `du_ky` — KH dự định ký trong kỳ | dự kiến ký |
| **Mới ký** | Status `moi_ky` — vừa ký HĐ | đã ký |
| **Đang xử lý** | Status `dang_xu_ly` — hồ sơ vay đang chạy | processing |
| **Chờ giao** | Status `cho_giao` — đợi ngày giao | pending delivery |
| **Đã giao** | Status `da_giao` | delivered |
| **Đóng CSKH** | Status `dong_cskh` | closed |
| **Setup** | Cấu hình ban đầu (xe + NV + mục tiêu) | thiết lập, khởi tạo |

---

## 6. Verb cho button label

| Verb tiếng Việt | Ý nghĩa | Khi nào dùng |
|---|---|---|
| **+ Thêm X** | Tạo bản ghi mới | "+ Thêm khách hàng mới", "+ Thêm xe" |
| **Sửa X** | Edit bản ghi | "Sửa KH", "Sửa nhân viên" |
| **Xoá X** | Delete | "Xoá KH" (luôn confirm trước) |
| **Lưu** | Submit form | Button cuối modal |
| **Huỷ** | Cancel modal | Bên cạnh "Lưu" |
| **Đẩy lên / Tải về** | Sync GitHub | Sync chip |
| **Xem chi tiết** | Mở detail page | Link/button trên card |

**Tránh**: "Tạo", "Khởi tạo", "Lập" — quá generic. Dùng "Thêm" cho rõ.

---

## 7. Status check trước commit

Trước khi merge component mới vào main:

- [ ] Render được trong `storybook.html` standalone (không cần token).
- [ ] Mobile (≤430px) check trực quan — không scroll ngang, không cắt chữ.
- [ ] Microcopy dùng đúng glossary trên.
- [ ] Không có `!important` mới.
- [ ] Không có inline `style="..."` trừ value dynamic (width%, color segment).
- [ ] Không có `console.log` sót.
- [ ] Tên file/function/class tuân theo bảng pattern.
- [ ] `escapeHtml()` cho mọi giá trị từ data → HTML.

---

## 8. Khi gặp xung đột với code cũ

Code cũ KHÔNG cần refactor để khớp. Quy tắc:
- Đụng file cũ → chỉ sửa phần liên quan task hiện tại.
- Code mới (views-next, components-next, style-next.css) → 100% theo NAMING.
- Khi xoá code cũ (cuối quá trình), xoá luôn class/data-attr không còn ai dùng.

---

> Khi không chắc, hỏi tác giả (anh chabalua). Mục tiêu là **1 em trai biết HTML/CSS/JS cơ bản đọc 5 phút là hiểu**, không phải tối ưu cho engineer senior.
