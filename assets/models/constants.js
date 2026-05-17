// assets/models/constants.js
// Hằng số và metadata dùng chung — không phụ thuộc state, không phụ thuộc data.

// iconName: tên Lucide icon trong assets/components/icons.js (M2+).
// icon (emoji): fallback nếu chỗ nào chưa refactor sang renderIcon.
export const NAV_ITEMS = [
  { id: 'dashboard', href: 'index.html', icon: '🏠', iconName: 'home', label: 'Tổng quan' },
  { id: 'kpi', href: 'kpi.html', icon: '🎯', iconName: 'target', label: 'KPI' },
  { id: 'congviec', href: 'cong-viec.html', icon: '✅', iconName: 'calendar', label: 'Công việc' },
  { id: 'xe', href: 'xe.html', icon: '🚗', iconName: 'car', label: 'Catalog xe' },
  { id: 'nhanvien', href: 'nhan-vien.html', icon: '👥', iconName: 'users', label: 'Nhân viên' },
  { id: 'khachhang', href: 'khach-hang.html', icon: '🚘', iconName: 'file-text', label: 'Khách hàng' },
  { id: 'cskh', href: 'cskh.html', icon: '💬', iconName: 'message-square', label: 'CSKH' },
];

export const PAGE_META = {
  dashboard: { title: 'Tổng Quan', kicker: 'Dashboard / Tổng quan' },
  kpi: { title: 'KPI Tháng', kicker: 'Dashboard / KPI' },
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
// Label bỏ emoji circle — UI dùng tier-dot SVG render màu theo class.
export const KH_STATUS_META = {
  du_ky:      ['Dự ký',       'is-warning'],
  moi_ky:     ['Mới ký',      'is-info'],
  dang_xu_ly: ['Đang xử lý',  'is-warning'],
  cho_giao:   ['Chờ giao',    'is-purple'],
  da_giao:    ['Đã giao',     'is-success'],
  dong_cskh:  ['Đóng CSKH',   'is-success'],
};

export const KH_STATUS_ORDER = Object.keys(KH_STATUS_META);

// Cho phép chuyển đổi trạng thái tự do — GĐKD có thể chọn bất kỳ trạng thái nào.
// Trả [allowed, reason]. allowed=true → cho qua.
export function isValidStatusTransition(from, to) {
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

// emoji giữ làm fallback ngắn (1 ký tự dot). Các view nên dùng tier-dot SVG
// với màu `dot` thay vì emoji để giữ visual nhất quán Calendly.
export const PERFORMANCE_TIER_META = {
  excellent: { label: 'Vượt mục tiêu',    emoji: '●', color: 'var(--success)',       dot: 'var(--color-success)' },
  good:      { label: 'Đạt tốt',          emoji: '●', color: 'var(--success-light)', dot: 'var(--color-success-light)' },
  average:   { label: 'Trung bình',       emoji: '●', color: 'var(--warning-light)', dot: 'var(--color-warning)' },
  weak:      { label: 'Cần hỗ trợ',       emoji: '●', color: 'var(--danger-light)',  dot: 'var(--color-danger)' },
  none:      { label: 'Chưa có mục tiêu', emoji: '○', color: 'var(--neutral)',       dot: 'var(--color-steel-gray)' },
};
