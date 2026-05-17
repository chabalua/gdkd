// assets/models/constants.js
// Hằng số và metadata dùng chung — không phụ thuộc state, không phụ thuộc data.

export const NAV_ITEMS = [
  { id: 'dashboard', href: 'index.html', icon: '🏠', label: 'Tổng quan' },
  { id: 'kpi', href: 'kpi.html', icon: '🎯', label: 'KPI' },
  { id: 'congviec', href: 'cong-viec.html', icon: '✅', label: 'Công việc' },
  { id: 'xe', href: 'xe.html', icon: '🚗', label: 'Catalog xe' },
  { id: 'nhanvien', href: 'nhan-vien.html', icon: '👥', label: 'Nhân viên' },
  { id: 'khachhang', href: 'khach-hang.html', icon: '🚘', label: 'Khách hàng' },
  { id: 'cskh', href: 'cskh.html', icon: '💬', label: 'CSKH' },
];

export const PAGE_META = {
  dashboard: { title: 'Tổng Quan', kicker: 'Dashboard / Tổng quan' },
  kpi: { title: 'KPI Tháng', kicker: 'Dashboard / KPI' },
  'tuan-tong-hop': { title: 'Nhập Tuần (Cả Công Ty)', kicker: 'Dashboard / Nhập tuần' },
  congviec: { title: 'Công Việc Trọng Tâm', kicker: 'Dashboard / Công việc' },
  xe: { title: 'Catalog Xe', kicker: 'Master / Catalog xe' },
  nhanvien: { title: 'Nhân Viên Kinh Doanh', kicker: 'Dashboard / Nhân viên' },
  'nhanvien-detail': { title: 'Chi Tiết Nhân Viên', kicker: 'Dashboard / Nhân viên / Chi tiết' },
  khachhang: { title: 'Quản Lý Khách Hàng', kicker: 'Dashboard / Khách hàng' },
  cskh: { title: 'CSKH Sau Giao Xe', kicker: 'Dashboard / CSKH' },
  settings: { title: 'Thiết Lập', kicker: 'Dashboard / Thiết lập' },
};

// Pipeline 6 trạng thái 1 chiều. "Xuất hoá đơn" KHÔNG nằm ở đây — nó là
// cờ độc lập (kh.ngay_xuat_hd) vì có thể xảy ra song song bất kỳ status nào,
// và để không bị mất khi user chuyển status (gây tụt KPI Hoá đơn xuất).
export const KH_STATUS_META = {
  du_ky:      ['🟡 Dự ký',       'is-warning'],
  moi_ky:     ['🔵 Mới ký',      'is-info'],
  dang_xu_ly: ['🟠 Đang xử lý',  'is-warning'],
  cho_giao:   ['🔵 Chờ giao',    'is-purple'],
  da_giao:    ['🟢 Đã giao',     'is-success'],
  dong_cskh:  ['✅ Đóng CSKH',   'is-success'],
};

export const KH_STATUS_ORDER = Object.keys(KH_STATUS_META);

// Pipeline 1 chiều: chỉ cho phép giữ nguyên hoặc đi tới (index cao hơn).
// Ngoại lệ: từ "dong_cskh" có thể trở lại "da_giao" nếu cần mở lại CSKH.
// Trả [allowed, reason]. allowed=true → cho qua. allowed=false → reason để hiện toast.
export function isValidStatusTransition(from, to) {
  if (!from || from === to) return [true, ''];
  const fromIdx = KH_STATUS_ORDER.indexOf(from);
  const toIdx = KH_STATUS_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return [true, ''];
  // Reopen CSKH (dong_cskh → da_giao) — thường xảy ra khi KH phản hồi lại sau khi đã đóng.
  if (from === 'dong_cskh' && to === 'da_giao') return [true, ''];
  if (toIdx < fromIdx) {
    const [fromLabel] = KH_STATUS_META[from] || [from];
    const [toLabel] = KH_STATUS_META[to] || [to];
    return [false, `Không lùi trạng thái: ${fromLabel} → ${toLabel}. Pipeline KH chỉ đi 1 chiều để tránh lệch KPI. Nếu thật sự cần lùi, xoá KH và tạo mới.`];
  }
  return [true, ''];
}

export const CSKH_STATUS_META = {
  chua_xu_ly: ['Chưa xử lý', 'is-danger'],
  dang_xu_ly: ['Đang xử lý', 'is-warning'],
  da_xu_ly: ['Đã xử lý', 'is-success'],
};

export const PAYMENT_TYPE_META = {
  vay_von: 'Vay vốn',
  tien_mat: 'Tiền mặt',
  ket_hop: 'Kết hợp',
};

// === Lead channels ===
export const DEFAULT_LEAD_CHANNELS = [
  { id: 'fb_ca_nhan',    label: 'FB Cá nhân (QC)',        loai: 'lead' },
  { id: 'mkt_cty',       label: 'MKT Công ty phân bổ',   loai: 'lead' },
  { id: 'tiktok',        label: 'TikTok khai thác',       loai: 'lead' },
  { id: 'telesales',     label: 'Telesales',              loai: 'lead' },
  { id: 'sr_tiep_khach', label: 'SR tiếp khách',          loai: 'lead' },
  { id: 'di_thi_truong', label: 'Đi thị trường',          loai: 'lead' },
];

export const ACTIVITY_UNIT_META = {
  so: 'Số',
  gio: 'Giờ',
  luot: 'Lượt',
  tien: 'Tiền',
};

export const DEFAULT_DEPARTMENTS = [
  { id: 'kd_1', ten: 'Kinh doanh 1', loai: 'ban_hang' },
  { id: 'kd_2', ten: 'Kinh doanh 2', loai: 'ban_hang' },
  { id: 'mkt', ten: 'Marketing', loai: 'ho_tro' },
  { id: 'kt', ten: 'Kế toán', loai: 'ho_tro' },
];

export const STATIC_ACTIVITY_CHANNELS = [
  { id: 'gio_live', label: 'Giờ livestream', loai: 'hoat_dong', don_vi: 'gio' },
  { id: 'luot_lai_thu', label: 'Lượt lái thử', loai: 'hoat_dong', don_vi: 'luot' },
  { id: 'so_video', label: 'Số video', loai: 'hoat_dong', don_vi: 'so' },
  { id: 'so_tien_chay_quang_cao', label: 'Tiền chạy quảng cáo', loai: 'hoat_dong', don_vi: 'tien' },
  { id: 'so_tien_qc', label: 'Tiền chạy quảng cáo', loai: 'hoat_dong', don_vi: 'tien' },
];

export const DEFAULT_TASK_LIBRARY = [
  { id: 'fb_ca_nhan', ten: 'FB Cá nhân (QC)', phong_ban_ids: ['kd_1', 'kd_2'], loai: 'lead', don_vi: 'so' },
  { id: 'mkt_cty', ten: 'MKT công ty phân bổ', phong_ban_ids: ['kd_1', 'kd_2'], loai: 'lead', don_vi: 'so' },
  { id: 'tiktok', ten: 'TikTok khai thác', phong_ban_ids: ['kd_1', 'kd_2'], loai: 'lead', don_vi: 'so' },
  { id: 'telesales', ten: 'Telesales', phong_ban_ids: ['kd_1', 'kd_2'], loai: 'lead', don_vi: 'so' },
  { id: 'sr_tiep_khach', ten: 'SR tiếp khách', phong_ban_ids: ['kd_1', 'kd_2'], loai: 'lead', don_vi: 'so' },
  { id: 'di_thi_truong', ten: 'Đi thị trường', phong_ban_ids: ['kd_1', 'kd_2'], loai: 'lead', don_vi: 'so' },
  { id: 'sr', ten: 'Giới thiệu', phong_ban_ids: ['kd_1', 'kd_2'], loai: 'lead', don_vi: 'so' },
  { id: 'luot_lai_thu', ten: 'Lượt lái thử', phong_ban_ids: ['kd_1', 'kd_2'], loai: 'hoat_dong', don_vi: 'luot' },
  { id: 'gio_live', ten: 'Giờ livestream', phong_ban_ids: ['mkt'], loai: 'hoat_dong', don_vi: 'gio' },
  { id: 'so_video', ten: 'Số video', phong_ban_ids: ['mkt'], loai: 'hoat_dong', don_vi: 'so' },
  { id: 'so_tien_chay_quang_cao', ten: 'Tiền chạy quảng cáo', phong_ban_ids: ['mkt'], loai: 'hoat_dong', don_vi: 'tien' },
];

// === Master data — Xe catalog ===
export const XE_STATUS_META = {
  dang_ban: ['Đang bán', 'is-success'],
  sap_ve: ['Sắp về', 'is-info'],
  ngung_ban: ['Ngừng bán', 'is-danger'],
};

// === Master data — Nhân viên status ===
export const NV_STATUS_META = {
  dang_lam: ['Đang làm', 'is-success'],
  nghi_viec: ['Đã nghỉ', 'is-danger'],
};

export const LOAI_NHAN_SU_META = {
  chinh_thuc: ['Chính thức', 'is-success'],
  hoc_viec: ['Học việc', 'is-warning'],
  thu_viec: ['Thử việc', 'is-info'],
};

export const DEFAULT_EMPLOYEE_GROUPS = [
  { id: 'nhom_1', ten: 'Nhóm 1' },
  { id: 'nhom_2', ten: 'Nhóm 2' },
];

export const TODO_MESSAGE = 'Chức năng này đã có khung dữ liệu thật, phần còn lại sẽ tiếp tục được mở rộng nếu cần.';

export const PERFORMANCE_TIER_META = {
  excellent: { label: 'Vượt mục tiêu', emoji: '🔥', color: 'var(--success)',       dot: '#2e7d32' },
  good:      { label: 'Đạt tốt',       emoji: '✅', color: 'var(--success-light)', dot: '#66bb6a' },
  average:   { label: 'Trung bình',    emoji: '⚠️', color: 'var(--warning-light)', dot: '#ffa726' },
  weak:      { label: 'Cần hỗ trợ',    emoji: '🆘', color: 'var(--danger-light)',  dot: '#ef5350' },
  none:      { label: 'Chưa có mục tiêu', emoji: '·', color: 'var(--neutral)',     dot: '#90a4ae' },
};
