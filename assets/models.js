// assets/models.js
// Constants + normalize raw JSON + derive helpers (lead totals, KPI %, counters).
// Pure functions — không truy cập DOM.

import { numberValue, calcPercent, getCurrentMonth, getCurrentRange } from './ui.js';

// === Active month — nguồn DUY NHẤT cho cả thống kê và nhập liệu ===
// Lấy từ Range picker (sessionStorage). Nếu range > 1 tháng (quý/năm),
// dùng tháng cuối trong range làm tháng nhập (gần thực tế nhất).
// Fallback: config.thang_hien_tai → tháng hiện tại của hệ thống.
export function getActiveMonth(data) {
  const range = getCurrentRange();
  const months = Array.isArray(range?.months) ? range.months : [];
  if (months.length) return months[months.length - 1];
  return data?.config?.thang_hien_tai || getCurrentMonth();
}

// True nếu user đang chọn 1 tháng đơn lẻ (cho phép nhập liệu).
// False khi range là quý/năm — chỉ cho xem, không cho nhập per-week.
export function isSingleMonthRange() {
  const range = getCurrentRange();
  return Array.isArray(range?.months) && range.months.length === 1;
}

// === Navigation ===
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
  congviec: { title: 'Công Việc Trọng Tâm', kicker: 'Dashboard / Công việc' },
  xe: { title: 'Catalog Xe', kicker: 'Master / Catalog xe' },
  nhanvien: { title: 'Nhân Viên Kinh Doanh', kicker: 'Dashboard / Nhân viên' },
  'nhanvien-detail': { title: 'Chi Tiết Nhân Viên', kicker: 'Dashboard / Nhân viên / Chi tiết' },
  khachhang: { title: 'Quản Lý Khách Hàng', kicker: 'Dashboard / Khách hàng' },
  cskh: { title: 'CSKH Sau Giao Xe', kicker: 'Dashboard / CSKH' },
};

// === KH/CSKH metadata ===
// Legacy (v1) — giữ lại cho migration
export const KH_PROGRESS_META = {
  1: ['Chờ duyệt vay', 'is-warning'],
  2: ['NH thẩm định', 'is-info'],
  3: ['Chờ giải ngân', 'is-warning'],
  4: ['Chờ đăng ký xe', 'is-purple'],
  5: ['Chờ bàn giao', 'is-danger'],
  6: ['Hoàn thành', 'is-success'],
};

// V2 schema — 6 trạng thái pipeline 1 chiều
export const KH_STATUS_META = {
  du_ky:      ['🟡 Dự ký',      'is-warning'],
  moi_ky:     ['🔵 Mới ký',     'is-info'],
  dang_xu_ly: ['🟠 Đang xử lý', 'is-warning'],
  cho_giao:   ['🔵 Chờ giao',   'is-purple'],
  da_giao:    ['🟢 Đã giao',     'is-success'],
  dong_cskh:  ['✅ Đóng CSKH',  'is-success'],
};

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

export const LEGACY_ACTIVITY_CHANNELS = [
  { id: 'gio_live', label: 'Giờ live', loai: 'hoat_dong', don_vi: 'gio' },
  { id: 'luot_lai_thu', label: 'Lượt lái thử', loai: 'hoat_dong', don_vi: 'luot' },
  { id: 'so_tien_qc', label: 'Số tiền quảng cáo', loai: 'hoat_dong', don_vi: 'tien' },
];

function getLegacyChannelMeta(channelId) {
  return LEGACY_ACTIVITY_CHANNELS.find((channel) => channel.id === channelId) || null;
}

function normalizeLeadChannel(channel) {
  const legacy = getLegacyChannelMeta(channel?.id);
  const loai = channel?.loai === 'hoat_dong' ? 'hoat_dong' : (legacy?.loai || 'lead');
  const don_vi = loai === 'hoat_dong'
    ? (channel?.don_vi || legacy?.don_vi || 'so')
    : 'so';
  return {
    id: channel?.id,
    label: channel?.label || legacy?.label || channel?.id || 'Nội dung',
    loai,
    don_vi,
  };
}

function hasLegacyActivityData(allData, channelId) {
  return (allData?.nhanVien?.nhan_vien || []).some((employee) =>
    Object.values(employee?.lead_theo_thang || {}).some((monthBlock) => monthBlock && typeof monthBlock[channelId] === 'object')
  );
}

// Returns channels from config (user-customisable) or falls back to defaults.
export function getLeadChannels(allData) {
  const cfg = allData?.config?.lead_channels;
  const source = Array.isArray(cfg) && cfg.length ? cfg : DEFAULT_LEAD_CHANNELS;
  const channels = source.map(normalizeLeadChannel);
  const existingIds = new Set(channels.map((channel) => channel.id));

  LEGACY_ACTIVITY_CHANNELS.forEach((channel) => {
    if (!existingIds.has(channel.id) && hasLegacyActivityData(allData, channel.id)) {
      channels.push(channel);
    }
  });

  return channels;
}

export function getLeadMetricChannels(allData) {
  return getLeadChannels(allData).filter((channel) => channel.loai !== 'hoat_dong');
}

// Sum weekly tuan values for a channel object (supports legacy thuc_te flat value).
export function getLeadTuanTotal(channelObj) {
  if (!channelObj || typeof channelObj !== 'object') return Number(channelObj) || 0;
  if (channelObj.tuan && typeof channelObj.tuan === 'object') {
    return Object.values(channelObj.tuan).reduce((s, v) => s + (Number(v) || 0), 0);
  }
  return Number(channelObj.thuc_te) || 0; // legacy thuc_te
}

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

function slugifyGroupId(value, fallbackIndex = 1) {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base ? `nhom_${base}` : `nhom_${fallbackIndex}`;
}

function normalizeEmployeeGroups(rawGroups) {
  if (!Array.isArray(rawGroups) || !rawGroups.length) {
    return DEFAULT_EMPLOYEE_GROUPS.map((group) => ({ ...group }));
  }
  return rawGroups.map((group, index) => ({
    id: group?.id || slugifyGroupId(group?.ten, index + 1),
    ten: group?.ten || `Nhóm ${index + 1}`,
  }));
}

function normalizeEmployeeRecord(employee, groups) {
  const normalized = { ...employee };
  const validGroupIds = new Set(groups.map((group) => group.id));
  const fallbackGroupId = groups[0]?.id || DEFAULT_EMPLOYEE_GROUPS[0].id;
  const legacyGroupId = employee?.nhom && validGroupIds.has(employee.nhom)
    ? employee.nhom
    : groups.find((group) => group.ten === employee?.nhom)?.id;
  normalized.nhom_id = employee?.nhom_id && validGroupIds.has(employee.nhom_id)
    ? employee.nhom_id
    : (legacyGroupId || fallbackGroupId);
  normalized.loai_nhan_su = employee?.loai_nhan_su || 'chinh_thuc';
  delete normalized.nhom;
  return normalized;
}

export function getEmployeeGroups(allData) {
  return normalizeEmployeeGroups(allData?.config?.nhom_kinh_doanh);
}

export function getEmployeeGroupLabel(allData, nhomId) {
  if (!nhomId) return 'Chưa gán nhóm';
  const group = getEmployeeGroups(allData).find((item) => item.id === nhomId);
  return group?.ten || nhomId;
}

export function getEmployeesByGroup(allData, nhomId, options = {}) {
  const { includeInactive = false } = options;
  return (allData?.nhanVien?.nhan_vien || []).filter((employee) => {
    if (!includeInactive && employee.trang_thai === 'nghi_viec') return false;
    return employee.nhom_id === nhomId;
  });
}

export const TODO_MESSAGE = 'Chức năng này đã có khung dữ liệu thật, phần còn lại sẽ tiếp tục được mở rộng nếu cần.';

// === Normalize ===
export function normalizeData(rawData) {
  const currentMonth = rawData?.config?.thang_hien_tai || rawData?.kpi?.thang || rawData?.congViec?.thang || getCurrentMonth();
  const lichSu = Array.isArray(rawData?.lichSu?.lich_su)
    ? rawData.lichSu.lich_su
    : (Array.isArray(rawData?.kpi?.lich_su) ? rawData.kpi.lich_su : []);
  const nhomKinhDoanh = normalizeEmployeeGroups(rawData?.config?.nhom_kinh_doanh);
  const normalizedEmployees = Array.isArray(rawData?.nhanVien?.nhan_vien)
    ? rawData.nhanVien.nhan_vien.map((employee) => normalizeEmployeeRecord(employee, nhomKinhDoanh))
    : [];
  return {
    config: {
      thang_hien_tai: currentMonth,
      showroom: rawData?.config?.showroom || { ten: '', dia_chi: '', gdkd: '' },
      // backward compat với field cũ
      cong_ty: rawData?.config?.showroom?.ten || rawData?.config?.cong_ty || '',
      gdkd: rawData?.config?.showroom?.gdkd || rawData?.config?.gdkd || '',
      muc_tieu_thang: rawData?.config?.muc_tieu_thang || {},
      lead_channels: rawData?.config?.lead_channels || null,
      nhom_kinh_doanh: nhomKinhDoanh,
    },
    kpi: {
      thang: rawData?.kpi?.thang || currentMonth,
      xe_ky_moi: {
        muc_tieu: numberValue(rawData?.kpi?.xe_ky_moi?.muc_tieu),
        thuc_te: numberValue(rawData?.kpi?.xe_ky_moi?.thuc_te),
      },
      hd_xuat_thang: {
        muc_tieu: numberValue(rawData?.kpi?.hd_xuat_thang?.muc_tieu),
        thuc_te: numberValue(rawData?.kpi?.hd_xuat_thang?.thuc_te),
      },
      hd_ton_thang_cu: {
        tong: numberValue(rawData?.kpi?.hd_ton_thang_cu?.tong),
        da_giai_quyet: numberValue(rawData?.kpi?.hd_ton_thang_cu?.da_giai_quyet),
      },
      lead_phat_sinh: {
        muc_tieu: numberValue(rawData?.kpi?.lead_phat_sinh?.muc_tieu),
        thuc_te: numberValue(rawData?.kpi?.lead_phat_sinh?.thuc_te),
      },
      lich_su: lichSu,
    },
    lichSu: {
      lich_su: lichSu,
    },
    congViec: {
      thang: rawData?.congViec?.thang || currentMonth,
      su_kien_lai_thu: {
        muc_tieu: numberValue(rawData?.congViec?.su_kien_lai_thu?.muc_tieu),
        danh_sach: Array.isArray(rawData?.congViec?.su_kien_lai_thu?.danh_sach) ? rawData.congViec.su_kien_lai_thu.danh_sach : [],
      },
      videos: {
        tuyen_noi_dung: Array.isArray(rawData?.congViec?.videos?.tuyen_noi_dung) ? rawData.congViec.videos.tuyen_noi_dung : [],
        muc_tieu: numberValue(rawData?.congViec?.videos?.muc_tieu),
        da_hoan_thanh: numberValue(rawData?.congViec?.videos?.da_hoan_thanh),
      },
      livestream: {
        muc_tieu_gio: numberValue(rawData?.congViec?.livestream?.muc_tieu_gio),
        da_live_gio: numberValue(rawData?.congViec?.livestream?.da_live_gio),
        lich: Array.isArray(rawData?.congViec?.livestream?.lich) ? rawData.congViec.livestream.lich : [],
      },
      zalo_oa: {
        muc_tieu: numberValue(rawData?.congViec?.zalo_oa?.muc_tieu),
        thuc_te: numberValue(rawData?.congViec?.zalo_oa?.thuc_te),
        theo_tuan: Array.isArray(rawData?.congViec?.zalo_oa?.theo_tuan) ? rawData.congViec.zalo_oa.theo_tuan : [],
      },
    },
    xe: {
      xe: Array.isArray(rawData?.xe?.xe) ? rawData.xe.xe : [],
    },
    nhanVien: {
      nhan_vien: normalizedEmployees,
    },
    khachHang: {
      // V2 schema: flat array với FK
      khach_hang: Array.isArray(rawData?.khachHang?.khach_hang)
        ? rawData.khachHang.khach_hang
        // fallback: migrate cục bộ nếu vẫn còn dử liệu schema cũ
        : migrateKhachHangLegacy(rawData?.khachHang),
    },
  };
}

// Migration helper: nếu vẫn còn schema cũ {ton_thang_cu, ky_moi} thì convert
function migrateKhachHangLegacy(rawKH) {
  const result = [];
  if (!rawKH) return result;
  const STEP_TO_STATUS = { 1: 'dang_xu_ly', 2: 'dang_xu_ly', 3: 'dang_xu_ly', 4: 'cho_giao', 5: 'cho_giao', 6: 'da_giao' };
  const OLD_STATUS_MAP = {
    vua_ky: 'moi_ky', dang_lam_vay: 'dang_xu_ly',
    cho_xe_ve: 'cho_giao', san_sang: 'cho_giao', da_giao_xe: 'da_giao',
  };
  if (Array.isArray(rawKH.ton_thang_cu)) {
    rawKH.ton_thang_cu.forEach((item) => result.push({
      id: item.id, ten: item.ten || '', sdt: item.sdt || '', dia_chi: '',
      nhan_vien_id: null, xe_id: null,
      ghi_chu_ctkm: item.vuong_mac || '',
      trang_thai: STEP_TO_STATUS[item.buoc_hien_tai] || 'dang_xu_ly',
      ngay_du_kien_ky: null, ngay_ky: item.ngay_ky || null,
      ngay_giao_du_kien: item.du_kien_nhan_xe || null, ngay_giao_thuc_te: null,
      hinh_thuc_tt: item.hinh_thuc_tt || 'vay_von',
      ngan_hang: item.ngan_hang || '', so_tien_vay: numberValue(item.so_tien_vay),
      muc_dong_mong_muon: 0, so_hd: item.so_hd || '',
      tien_do: Array.isArray(item.cap_nhat)
        ? item.cap_nhat.map((u, i) => ({ ngay: u.ngay || '', buoc: i + 1, noi_dung: u.noi_dung || '' }))
        : [],
      cskh: [],
    }));
  }
  if (Array.isArray(rawKH.ky_moi)) {
    rawKH.ky_moi.forEach((item) => result.push({
      id: item.id, ten: item.ten || '', sdt: item.sdt || '', dia_chi: '',
      nhan_vien_id: null, xe_id: null,
      ghi_chu_ctkm: item.ghi_chu || '',
      trang_thai: OLD_STATUS_MAP[item.trang_thai] || 'moi_ky',
      ngay_du_kien_ky: null, ngay_ky: item.ngay_ky || null,
      ngay_giao_du_kien: item.du_kien_nhan_xe || null, ngay_giao_thuc_te: null,
      hinh_thuc_tt: item.hinh_thuc_tt || 'vay_von',
      ngan_hang: '', so_tien_vay: 0,
      muc_dong_mong_muon: numberValue(item.muc_dong_mong_muon),
      so_hd: item.so_hd || '',
      tien_do: [], cskh: [],
    }));
  }
  return result;
}

// === "Has data" checks (empty-state guards) ===
export function hasKpiData(kpi) {
  return Boolean(
    kpi.xe_ky_moi.muc_tieu ||
    kpi.xe_ky_moi.thuc_te ||
    kpi.hd_xuat_thang.muc_tieu ||
    kpi.hd_xuat_thang.thuc_te ||
    kpi.hd_ton_thang_cu.tong ||
    kpi.hd_ton_thang_cu.da_giai_quyet ||
    kpi.lead_phat_sinh.muc_tieu ||
    kpi.lead_phat_sinh.thuc_te ||
    kpi.lich_su.length
  );
}

export function hasCongViecData(congViec) {
  return Boolean(
    congViec.su_kien_lai_thu.muc_tieu ||
    congViec.su_kien_lai_thu.danh_sach.length ||
    congViec.videos.muc_tieu ||
    congViec.videos.da_hoan_thanh ||
    congViec.videos.tuyen_noi_dung.length ||
    congViec.livestream.muc_tieu_gio ||
    congViec.livestream.da_live_gio ||
    congViec.livestream.lich.length ||
    congViec.zalo_oa.muc_tieu ||
    congViec.zalo_oa.thuc_te ||
    congViec.zalo_oa.theo_tuan.length
  );
}

export function hasOperationalData(data) {
  return Boolean(
    hasKpiData(data.kpi) ||
    hasCongViecData(data.congViec) ||
    data.nhanVien.nhan_vien.length ||
    data.khachHang.khach_hang.length
  );
}

// Kiểm tra setup hoàn chỉnh trước khi nhập KH
export function isSetupComplete(data) {
  const co_xe = data.xe.xe.length > 0;
  const co_nv = data.nhanVien.nhan_vien.filter((nv) => nv.trang_thai !== 'nghi_viec').length > 0;
  const month = getActiveMonth(data);
  const mt = data.config.muc_tieu_thang?.[month];
  // Có ít nhất 1 mục tiêu = đủ điều kiện thêm KH (gating gốc)
  const co_muc_tieu = Boolean(mt && (mt.xe_ky_moi || mt.hd_xuat_thang || mt.lead_phat_sinh));
  // Đủ 3 mục tiêu công ty = setup chuẩn để dashboard hiển thị đầy đủ
  const muc_tieu_day_du = Boolean(mt && mt.xe_ky_moi && mt.hd_xuat_thang && mt.lead_phat_sinh);
  return { co_xe, co_nv, co_muc_tieu, muc_tieu_day_du, all: co_xe && co_nv && co_muc_tieu };
}

// === Derive helpers ===
export function getEmployeeLeadTotal(employee, month, channels = DEFAULT_LEAD_CHANNELS) {
  const block = employee?.lead_theo_thang?.[month] || {};
  return channels.reduce((sum, channel) => sum + getLeadTuanTotal(block[channel.id]), 0);
}

export function getEmployeeActivityTotal(employee, month, field) {
  const block = employee?.lead_theo_thang?.[month] || {};
  return getLeadTuanTotal(block[field]);
}

export function mapEmployeeKpi(employee, month) {
  const weekly = employee.kpi_tuan?.[month] || [];
  const target = weekly.reduce((sum, item) => sum + numberValue(item.muc_tieu_nv), 0);
  const result = weekly.reduce((sum, item) => sum + numberValue(item.ket_qua), 0);
  return calcPercent(result, target || 1);
}

export function formatPaymentType(value) {
  if (!value) return 'Chưa cập nhật';
  return PAYMENT_TYPE_META[value] || value.replaceAll('_', ' ');
}

export function countNotifications(data) {
  const allKh = data.khachHang.khach_hang;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = allKh.filter((kh) => {
    if (!kh.ngay_giao_du_kien || ['da_giao', 'dong_cskh'].includes(kh.trang_thai)) return false;
    const target = new Date(kh.ngay_giao_du_kien);
    if (Number.isNaN(target.getTime())) return false;
    target.setHours(0, 0, 0, 0);
    const delta = Math.round((target - today) / 86400000);
    return delta >= 0 && delta <= 3;
  }).length;
  const unresolved = allKh.filter((kh) =>
    kh.trang_thai === 'da_giao' &&
    Array.isArray(kh.cskh) &&
    kh.cskh.some((c) => c.trang_thai_xu_ly !== 'da_xu_ly')
  ).length;
  return upcoming + unresolved;
}

// === Xe helpers ===
export function suggestMaXe({ hang, dong, bien_the, mau, nam }) {
  const slug = (value, len) =>
    String(value || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/đ/gi, 'd')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, len || 999);
  const parts = [
    slug(hang, 6),
    slug(dong, 6),
    slug(bien_the, 4),
    slug(mau, 3),
    nam ? String(nam) : '',
  ].filter(Boolean);
  return parts.join('-');
}

export function formatXeFullName(xe) {
  if (!xe) return '';
  const segments = [xe.hang, xe.dong, xe.bien_the].filter(Boolean).join(' ');
  const tail = [xe.mau, xe.nam].filter(Boolean).join(' · ');
  return tail ? `${segments} · ${tail}` : segments;
}

// FK check: đếm KH đang tham chiếu xe này.
export function countKhByXeId(allData, xeId) {
  return (allData.khachHang?.khach_hang || []).filter((kh) => kh.xe_id === xeId).length;
}

// Derive: trả về tên đầy đủ của xe từ xe_id
export function getXeLabel(allData, xeId) {
  if (!xeId) return '';
  const xe = (allData.xe?.xe || []).find((x) => x.id === xeId);
  return xe ? formatXeFullName(xe) : xeId;
}

// Derive: trả về tên NV từ nhan_vien_id
export function getNvLabel(allData, nvId) {
  if (!nvId) return '';
  const nv = (allData.nhanVien?.nhan_vien || []).find((n) => n.id === nvId);
  return nv ? nv.ho_ten : nvId;
}

// === Init helper ===
export function ensureEmployeeMonth(employee, month, leadChannels) {
  const channels = leadChannels || DEFAULT_LEAD_CHANNELS;
  if (!employee.lead_theo_thang) employee.lead_theo_thang = {};
  if (!employee.lead_theo_thang[month]) employee.lead_theo_thang[month] = {};
  const lead = employee.lead_theo_thang[month];
  // Ensure all channels have {muc_tieu, tuan} structure (migrate old thuc_te flat)
  channels.forEach((ch) => {
    if (!lead[ch.id] || typeof lead[ch.id] !== 'object') {
      lead[ch.id] = { muc_tieu: 0, tuan: {} };
    } else if (!lead[ch.id].tuan) {
      lead[ch.id].tuan = lead[ch.id].thuc_te ? { 1: lead[ch.id].thuc_te } : {};
      delete lead[ch.id].thuc_te;
    }
  });
  // noi_dung only needs videos now (gio_live moved to lead_theo_thang)
  if (!employee.noi_dung) employee.noi_dung = {};
  if (!employee.noi_dung[month]) employee.noi_dung[month] = { videos: {} };
  else if (!employee.noi_dung[month].videos) employee.noi_dung[month].videos = {};
  if (!employee.kpi_tuan) employee.kpi_tuan = {};
  if (!employee.kpi_tuan[month]) employee.kpi_tuan[month] = [];
}

// === KPI Segments + KH Ton (Bước 5) ===

// Derive mảng segment per NV cho 1 KPI field qua các tháng trong range.
// kpiField: 'xe_ky_moi' | 'hd_xuat_thang' | 'hd_ton' | 'lead_phat_sinh'
// Trả [{nv_id, nv_ten, value, pct_personal, color}] sort desc theo value.
export function getKpiSegments(allData, kpiField, months) {
  if (!months?.length) return [];
  const allKh = allData.khachHang?.khach_hang || [];
  const nvList = (allData.nhanVien?.nhan_vien || []).filter((nv) => nv.trang_thai !== 'nghi_viec');
  const monthSet = new Set(months);
  const leadChannels = getLeadMetricChannels(allData);
  return nvList.map((nv) => {
    let value = 0;
    if (kpiField === 'xe_ky_moi') {
      value = allKh.filter((kh) => kh.nhan_vien_id === nv.id && kh.ngay_ky && monthSet.has(kh.ngay_ky.slice(0, 7))).length;
    } else if (kpiField === 'hd_xuat_thang') {
      value = allKh.filter((kh) => kh.nhan_vien_id === nv.id && kh.ngay_giao_thuc_te && monthSet.has(kh.ngay_giao_thuc_te.slice(0, 7))).length;
    } else if (kpiField === 'hd_ton') {
      const minMonth = months[0];
      value = allKh.filter((kh) =>
        kh.nhan_vien_id === nv.id &&
        kh.ngay_ky && kh.ngay_ky.slice(0, 7) < minMonth &&
        !kh.ngay_giao_thuc_te &&
        kh.trang_thai !== 'da_giao' && kh.trang_thai !== 'dong_cskh'
      ).length;
    } else if (kpiField === 'lead_phat_sinh') {
      value = months.reduce((sum, m) => {
        return sum + getEmployeeLeadTotal(nv, m, leadChannels);
      }, 0);
    }
    const personalTarget = months.reduce((sum, m) => {
      const nvMt = allData.config?.muc_tieu_thang?.[m]?.muc_tieu_nv?.[nv.id];
      return sum + (nvMt ? numberValue(nvMt[kpiField]) : 0);
    }, 0);
    const pct = personalTarget > 0 ? calcPercent(value, personalTarget) : null;
    let color;
    if (pct === null) color = 'var(--primary-light)';
    else if (pct >= 80) color = 'var(--success-light)';
    else if (pct >= 50) color = 'var(--warning-light)';
    else if (pct >= 20) color = 'var(--warning)';
    else color = 'var(--danger-light)';
    return { nv_id: nv.id, nv_ten: nv.ho_ten, value, pct_personal: pct, color };
  }).sort((a, b) => b.value - a.value);
}

// KH tồn: ký trước tháng đầu trong range và chưa giao xe.
// "Chưa giao" = thiếu ngay_giao_thuc_te VÀ status không phải da_giao/dong_cskh.
// Sort desc theo số ngày tồn.
export function getKhTon(allData, months) {
  if (!months?.length) return [];
  const minMonth = months[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isDelivered = (kh) => kh.ngay_giao_thuc_te
    || kh.trang_thai === 'da_giao'
    || kh.trang_thai === 'dong_cskh';
  return (allData.khachHang?.khach_hang || [])
    .filter((kh) => kh.ngay_ky && kh.ngay_ky.slice(0, 7) < minMonth && !isDelivered(kh))
    .map((kh) => {
      const d = new Date(kh.ngay_ky);
      return { ...kh, days_ton: Number.isNaN(d.getTime()) ? 0 : Math.round((today - d) / 86400000) };
    })
    .sort((a, b) => b.days_ton - a.days_ton);
}

// Xếp hạng NV: [{nv_id, nv_ten, xe_ky, xe_giao, lead, pct_muc_tieu}] sort desc xe_ky
export function getRanking(allData, months) {
  if (!months?.length) return [];
  const allKh = allData.khachHang?.khach_hang || [];
  const nvList = (allData.nhanVien?.nhan_vien || []).filter((nv) => nv.trang_thai !== 'nghi_viec');
  const monthSet = new Set(months);
  const leadChannels = getLeadMetricChannels(allData);
  return nvList.map((nv) => {
    const xe_ky = allKh.filter((kh) => kh.nhan_vien_id === nv.id && kh.ngay_ky && monthSet.has(kh.ngay_ky.slice(0, 7))).length;
    const xe_giao = allKh.filter((kh) => kh.nhan_vien_id === nv.id && kh.ngay_giao_thuc_te && monthSet.has(kh.ngay_giao_thuc_te.slice(0, 7))).length;
    const lead = months.reduce((sum, m) => {
      return sum + getEmployeeLeadTotal(nv, m, leadChannels);
    }, 0);
    const personalTarget = months.reduce((sum, m) => {
      const nvMt = allData.config?.muc_tieu_thang?.[m]?.muc_tieu_nv?.[nv.id];
      return sum + (nvMt ? numberValue(nvMt.xe_ky_moi) : 0);
    }, 0);
    const pct_muc_tieu = personalTarget > 0 ? calcPercent(xe_ky, personalTarget) : null;
    return { nv_id: nv.id, nv_ten: nv.ho_ten, xe_ky, xe_giao, lead, pct_muc_tieu };
  }).sort((a, b) =>
    (b.xe_ky - a.xe_ky)
    || (b.xe_giao - a.xe_giao)
    || (b.lead - a.lead)
    || a.nv_ten.localeCompare(b.nv_ten, 'vi')
  );
}

// getNvStats: KPI cá nhân NV trong range tháng.
// Trả { xe_ky, xe_giao, lead, pct_muc_tieu }
export function getNvStats(allData, nvId, months) {
  if (!months?.length || !nvId) return { xe_ky: 0, xe_giao: 0, lead: 0, pct_muc_tieu: null };
  const allKh = allData.khachHang?.khach_hang || [];
  const nv = (allData.nhanVien?.nhan_vien || []).find((n) => n.id === nvId);
  if (!nv) return { xe_ky: 0, xe_giao: 0, lead: 0, pct_muc_tieu: null };
  const monthSet = new Set(months);
  const leadChannels = getLeadMetricChannels(allData);
  const xe_ky = allKh.filter((kh) => kh.nhan_vien_id === nvId && kh.ngay_ky && monthSet.has(kh.ngay_ky.slice(0, 7))).length;
  const xe_giao = allKh.filter((kh) => kh.nhan_vien_id === nvId && kh.ngay_giao_thuc_te && monthSet.has(kh.ngay_giao_thuc_te.slice(0, 7))).length;
  const lead = months.reduce((sum, m) => {
    return sum + getEmployeeLeadTotal(nv, m, leadChannels);
  }, 0);
  const personalTarget = months.reduce((sum, m) => {
    const nvMt = allData.config?.muc_tieu_thang?.[m]?.muc_tieu_nv?.[nvId];
    return sum + (nvMt ? numberValue(nvMt.xe_ky_moi) : 0);
  }, 0);
  const pct_muc_tieu = personalTarget > 0 ? calcPercent(xe_ky, personalTarget) : null;
  return { xe_ky, xe_giao, lead, pct_muc_tieu };
}

export function getGroupSummaries(allData, months) {
  if (!months?.length) return [];
  const allKh = allData?.khachHang?.khach_hang || [];
  const leadChannels = getLeadMetricChannels(allData);
  const groups = getEmployeeGroups(allData);
  const monthSet = new Set(months);
  const minMonth = months[0];

  return groups.map((group) => {
    const members = getEmployeesByGroup(allData, group.id);
    const memberIds = new Set(members.map((member) => member.id));
    const xe_ky = allKh.filter((kh) => memberIds.has(kh.nhan_vien_id) && kh.ngay_ky && monthSet.has(kh.ngay_ky.slice(0, 7))).length;
    const xe_giao = allKh.filter((kh) => memberIds.has(kh.nhan_vien_id) && kh.ngay_giao_thuc_te && monthSet.has(kh.ngay_giao_thuc_te.slice(0, 7))).length;
    const du_ky = allKh.filter((kh) => memberIds.has(kh.nhan_vien_id) && kh.trang_thai === 'du_ky' && kh.ngay_du_kien_ky && monthSet.has(kh.ngay_du_kien_ky.slice(0, 7))).length;
    const hd_ton = allKh.filter((kh) =>
      memberIds.has(kh.nhan_vien_id) &&
      kh.ngay_ky && kh.ngay_ky.slice(0, 7) < minMonth &&
      !kh.ngay_giao_thuc_te &&
      kh.trang_thai !== 'da_giao' && kh.trang_thai !== 'dong_cskh'
    ).length;
    const lead = members.reduce((sum, member) => sum + months.reduce((monthSum, month) => monthSum + getEmployeeLeadTotal(member, month, leadChannels), 0), 0);
    const gio_live = members.reduce((sum, member) => sum + months.reduce((monthSum, month) => monthSum + getEmployeeActivityTotal(member, month, 'gio_live'), 0), 0);
    const luot_lai_thu = members.reduce((sum, member) => sum + months.reduce((monthSum, month) => monthSum + getEmployeeActivityTotal(member, month, 'luot_lai_thu'), 0), 0);
    const so_tien_qc = members.reduce((sum, member) => sum + months.reduce((monthSum, month) => monthSum + getEmployeeActivityTotal(member, month, 'so_tien_qc'), 0), 0);
    const target_xe_ky = members.reduce((sum, member) => sum + months.reduce((monthSum, month) => {
      const nvMt = allData?.config?.muc_tieu_thang?.[month]?.muc_tieu_nv?.[member.id];
      return monthSum + Number(nvMt?.xe_ky_moi || 0);
    }, 0), 0);
    const pct_xe_ky = target_xe_ky > 0 ? calcPercent(xe_ky, target_xe_ky) : null;
    const qc_per_lead = lead > 0 ? Math.round(so_tien_qc / lead) : 0;
    const members_sorted = members
      .map((member) => ({ ...member, ...getNvStats(allData, member.id, months) }))
      .sort((a, b) => (b.xe_ky - a.xe_ky) || (b.lead - a.lead));

    return {
      nhom_id: group.id,
      nhom_ten: group.ten,
      members: members_sorted,
      member_count: members.length,
      xe_ky,
      xe_giao,
      du_ky,
      hd_ton,
      lead,
      gio_live,
      luot_lai_thu,
      so_tien_qc,
      target_xe_ky,
      pct_xe_ky,
      qc_per_lead,
    };
  });
}

// getWeekOfMonth: tuần trong tháng theo quy ước ngày 1-7=tuần1, 8-14=tuần2, 15-21=tuần3, 22+=tuần4
export function getWeekOfMonth(dateStr) {
  if (!dateStr) return 0;
  const day = new Date(dateStr).getDate();
  if (Number.isNaN(day)) return 0;
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

export function getPreviousMonthKey(monthStr) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return '';
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthlySnapshot(allData, month) {
  const months = [month];
  const xeKyMoi = getKpiSegments(allData, 'xe_ky_moi', months).reduce((sum, item) => sum + item.value, 0);
  const hdXuat = getKpiSegments(allData, 'hd_xuat_thang', months).reduce((sum, item) => sum + item.value, 0);
  const leadPhatSinh = getKpiSegments(allData, 'lead_phat_sinh', months).reduce((sum, item) => sum + item.value, 0);
  const ranking = getRanking(allData, months).map((row) => ({ nv_id: row.nv_id, xe: row.xe_ky }));
  return {
    thang: month,
    xe_ky_moi: xeKyMoi,
    hd_xuat: hdXuat,
    lead_phat_sinh: leadPhatSinh,
    ranking,
  };
}

// === Performance tier (cho color-coding NV) ===
// Trả về tier dựa trên % mục tiêu cá nhân.
// excellent ≥100% · good 80–99% · average 50–79% · weak <50% · none (chưa có mục tiêu)
export function getPerformanceTier(pct) {
  if (pct === null || pct === undefined) return 'none';
  if (pct >= 100) return 'excellent';
  if (pct >= 80) return 'good';
  if (pct >= 50) return 'average';
  return 'weak';
}

export const PERFORMANCE_TIER_META = {
  excellent: { label: 'Vượt mục tiêu', emoji: '🔥', color: 'var(--success)',       dot: '#2e7d32' },
  good:      { label: 'Đạt tốt',       emoji: '✅', color: 'var(--success-light)', dot: '#66bb6a' },
  average:   { label: 'Trung bình',    emoji: '⚠️', color: 'var(--warning-light)', dot: '#ffa726' },
  weak:      { label: 'Cần hỗ trợ',    emoji: '🆘', color: 'var(--danger-light)',  dot: '#ef5350' },
  none:      { label: 'Chưa có mục tiêu', emoji: '·', color: 'var(--neutral)',     dot: '#90a4ae' },
};

// Số ngày trong range + tốc độ cần thiết để về đích.
// Hỗ trợ cả range nhiều tháng (quý/năm): nếu range chứa tháng hiện tại,
// daysPassed tính tới hôm nay; ngược lại tính cả range = đã đóng sổ.
export function getMonthPace(months, totalDone, target) {
  if (!months?.length) return null;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const containsCurrent = months.includes(todayKey);
  const isCurrentMonth = months.length === 1 && months[0] === todayKey;
  const [year, mon] = months[0].split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const totalDays = months.reduce((sum, m) => {
    const [y, mm] = m.split('-').map(Number);
    return sum + new Date(y, mm, 0).getDate();
  }, 0);
  // Tính số ngày đã trôi qua trong range
  let daysPassed = totalDays;
  if (containsCurrent) {
    daysPassed = months.reduce((sum, m) => {
      if (m > todayKey) return sum;
      if (m < todayKey) {
        const [y, mm] = m.split('-').map(Number);
        return sum + new Date(y, mm, 0).getDate();
      }
      return sum + today.getDate();
    }, 0);
  }
  const daysLeft = Math.max(0, totalDays - daysPassed);
  const dailyDone = daysPassed > 0 ? totalDone / daysPassed : 0;
  const dailyNeeded = daysLeft > 0 && target > totalDone ? (target - totalDone) / daysLeft : 0;
  return { daysInMonth, totalDays, daysPassed, daysLeft, dailyDone, dailyNeeded, isCurrentMonth, containsCurrent };
}

// Sức bán theo dòng xe: [{xe_id, xe_ten, so_ky, so_giao, top_nv_ten}]
export function getXeSucBan(allData, months) {
  if (!months?.length) return [];
  const allKh = allData.khachHang?.khach_hang || [];
  const xeList = allData.xe?.xe || [];
  const monthSet = new Set(months);
  return xeList
    .filter((xe) => xe.trang_thai !== 'ngung_ban')
    .map((xe) => {
      const kyList = allKh.filter((kh) => kh.xe_id === xe.id && kh.ngay_ky && monthSet.has(kh.ngay_ky.slice(0, 7)));
      const giaoList = allKh.filter((kh) => kh.xe_id === xe.id && kh.ngay_giao_thuc_te && monthSet.has(kh.ngay_giao_thuc_te.slice(0, 7)));
      // NV bán nhiều nhất (tính theo ký)
      const nvCount = {};
      kyList.forEach((kh) => { if (kh.nhan_vien_id) nvCount[kh.nhan_vien_id] = (nvCount[kh.nhan_vien_id] || 0) + 1; });
      const topNvId = Object.entries(nvCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const topNvTen = topNvId ? ((allData.nhanVien?.nhan_vien || []).find((n) => n.id === topNvId)?.ho_ten || topNvId) : '—';
      return { xe_id: xe.id, xe_ten: formatXeFullName(xe), so_ky: kyList.length, so_giao: giaoList.length, top_nv_ten: topNvTen };
    })
    .filter((row) => row.so_ky > 0 || row.so_giao > 0)
    .sort((a, b) => b.so_ky - a.so_ky);
}
