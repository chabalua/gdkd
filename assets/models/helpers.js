// assets/models/helpers.js
// Lookup, format, date, lead channel & employee group helpers.
// Pure functions — không DOM, không IO.

import { getCurrentMonth, getCurrentRange, numberValue } from '../ui.js';
import {
  DEFAULT_LEAD_CHANNELS,
  STATIC_ACTIVITY_CHANNELS,
  DEFAULT_EMPLOYEE_GROUPS,
  PAYMENT_TYPE_META,
} from './constants.js';

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

// === Lead channel helpers ===
function getStaticChannelMeta(channelId) {
  return STATIC_ACTIVITY_CHANNELS.find((channel) => channel.id === channelId) || null;
}

export function normalizeLeadChannel(channel) {
  const fallback = getStaticChannelMeta(channel?.id);
  const loai = channel?.loai === 'hoat_dong' ? 'hoat_dong' : (fallback?.loai || 'lead');
  const don_vi = loai === 'hoat_dong'
    ? (channel?.don_vi || fallback?.don_vi || 'so')
    : 'so';
  return {
    id: channel?.id,
    label: channel?.label || channel?.ten || fallback?.label || channel?.id || 'Nội dung',
    loai,
    don_vi,
  };
}

function hasActivityData(allData, channelId) {
  return (allData?.nhanVien?.nhan_vien || []).some((employee) => {
    const hasCanonicalData = Object.values(employee?.du_lieu || {}).some((monthBlock) =>
      Object.values(monthBlock?.tuan || {}).some((weekBlock) => weekBlock && typeof weekBlock[channelId] === 'object')
    );
    if (hasCanonicalData) return true;
    return Object.values(employee?.lead_theo_thang || {}).some((monthBlock) => monthBlock && typeof monthBlock[channelId] === 'object');
  });
}

// Returns channels from config (user-customisable) or falls back to defaults.
export function getLeadChannels(allData) {
  const cfg = allData?.config?.lead_channels;
  const source = Array.isArray(cfg) && cfg.length ? cfg : DEFAULT_LEAD_CHANNELS;
  const channels = source.map(normalizeLeadChannel);
  const existingIds = new Set(channels.map((channel) => channel.id));

  STATIC_ACTIVITY_CHANNELS.forEach((channel) => {
    if (!existingIds.has(channel.id) && hasActivityData(allData, channel.id)) {
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

export function isDeliveredStatus(status) {
  return status === 'da_giao' || status === 'dong_cskh';
}

export function hasDeliveredDate(customer) {
  return Boolean(customer?.ngay_giao_thuc_te);
}

export function isDeliveredCustomer(customer) {
  return isDeliveredStatus(customer?.trang_thai);
}

export function isDeliveredCustomerInRange(customer, monthsOrSet) {
  const monthSet = monthsOrSet instanceof Set ? monthsOrSet : new Set(monthsOrSet || []);
  return isDeliveredCustomer(customer)
    && hasDeliveredDate(customer)
    && monthSet.has(customer.ngay_giao_thuc_te.slice(0, 7));
}

export function getEmployeeTaskMonthTarget(employee, month, taskId) {
  const weekEntries = Object.values(employee?.du_lieu?.[month]?.tuan || {})
    .map((weekBlock) => weekBlock?.[taskId])
    .filter(Boolean);
  if (weekEntries.length) {
    return weekEntries.reduce((sum, metrics) => sum + numberValue(metrics?.muc_tieu), 0);
  }
  return numberValue(employee?.lead_theo_thang?.[month]?.[taskId]?.muc_tieu);
}

export function getEmployeeTaskMonthActual(employee, month, taskId) {
  const weekEntries = Object.values(employee?.du_lieu?.[month]?.tuan || {})
    .map((weekBlock) => weekBlock?.[taskId])
    .filter(Boolean);
  if (weekEntries.length) {
    return weekEntries.reduce((sum, metrics) => sum + numberValue(metrics?.thuc_te), 0);
  }
  return getLeadTuanTotal(employee?.lead_theo_thang?.[month]?.[taskId]);
}

export function getEmployeeTaskMonthActualByIds(employee, month, taskIds) {
  for (const taskId of taskIds || []) {
    const weekEntries = Object.values(employee?.du_lieu?.[month]?.tuan || {})
      .map((weekBlock) => weekBlock?.[taskId])
      .filter(Boolean);
    if (weekEntries.length) {
      return weekEntries.reduce((sum, metrics) => sum + numberValue(metrics?.thuc_te), 0);
    }
    const compatActual = getLeadTuanTotal(employee?.lead_theo_thang?.[month]?.[taskId]);
    if (compatActual) return compatActual;
  }
  return 0;
}

export function setEmployeeTaskMonthTarget(employee, month, taskId, target) {
  if (!employee.du_lieu) employee.du_lieu = {};
  if (!employee.du_lieu[month]) employee.du_lieu[month] = { tuan: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} } };
  if (!employee.du_lieu[month].tuan) employee.du_lieu[month].tuan = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
  for (let week = 1; week <= 5; week += 1) {
    if (!employee.du_lieu[month].tuan[week]) employee.du_lieu[month].tuan[week] = {};
    if (!employee.du_lieu[month].tuan[week][taskId]) {
      employee.du_lieu[month].tuan[week][taskId] = { muc_tieu: 0, thuc_te: 0 };
    }
    employee.du_lieu[month].tuan[week][taskId].muc_tieu = week === 1 ? numberValue(target) : 0;
  }

  if (!employee.lead_theo_thang) employee.lead_theo_thang = {};
  if (!employee.lead_theo_thang[month]) employee.lead_theo_thang[month] = {};
  if (!employee.lead_theo_thang[month][taskId]) employee.lead_theo_thang[month][taskId] = { muc_tieu: 0, tuan: {} };
  employee.lead_theo_thang[month][taskId].muc_tieu = numberValue(target);
}

export function setEmployeeTaskWeekMetrics(employee, month, week, taskId, { muc_tieu = 0, thuc_te = 0 } = {}) {
  if (!employee.du_lieu) employee.du_lieu = {};
  if (!employee.du_lieu[month]) employee.du_lieu[month] = { tuan: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} } };
  if (!employee.du_lieu[month].tuan) employee.du_lieu[month].tuan = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
  if (!employee.du_lieu[month].tuan[week]) employee.du_lieu[month].tuan[week] = {};
  employee.du_lieu[month].tuan[week][taskId] = {
    muc_tieu: numberValue(muc_tieu),
    thuc_te: numberValue(thuc_te),
  };
}

export function pruneEmployeeTasks(employee, allowedTaskIds) {
  const allowedIds = new Set((allowedTaskIds || []).filter(Boolean));
  employee.nhiem_vu_ids = Array.from(allowedIds);

  Object.values(employee?.du_lieu || {}).forEach((monthBlock) => {
    Object.values(monthBlock?.tuan || {}).forEach((weekBlock) => {
      Object.keys(weekBlock || {}).forEach((taskId) => {
        if (!allowedIds.has(taskId)) delete weekBlock[taskId];
      });
    });
  });

  Object.values(employee?.lead_theo_thang || {}).forEach((monthBlock) => {
    Object.keys(monthBlock || {}).forEach((taskId) => {
      if (!allowedIds.has(taskId)) delete monthBlock[taskId];
    });
  });

  if (!allowedIds.has('so_video')) {
    Object.values(employee?.noi_dung || {}).forEach((monthBlock) => {
      if (monthBlock?.videos) monthBlock.videos = {};
    });
  }
}

// === Employee group helpers ===
export function slugifyGroupId(value, fallbackIndex = 1) {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base ? `nhom_${base}` : `nhom_${fallbackIndex}`;
}

export function normalizeEmployeeGroups(rawGroups) {
  if (!Array.isArray(rawGroups) || !rawGroups.length) {
    return DEFAULT_EMPLOYEE_GROUPS.map((group) => ({ ...group }));
  }
  return rawGroups.map((group, index) => ({
    id: group?.id || slugifyGroupId(group?.ten, index + 1),
    ten: group?.ten || `Nhóm ${index + 1}`,
  }));
}

export function getEmployeeGroups(allData) {
  if (Array.isArray(allData?.config?.phong_ban) && allData.config.phong_ban.length) {
    return allData.config.phong_ban.map((department, index) => ({
      id: department?.id || `phong_ban_${index + 1}`,
      ten: department?.ten || `Phòng ban ${index + 1}`,
    }));
  }
  return normalizeEmployeeGroups(allData?.config?.nhom_kinh_doanh);
}

export function getEmployeeGroupLabel(allData, nhomId) {
  if (!nhomId) return 'Chưa gán phòng ban';
  const group = getEmployeeGroups(allData).find((item) => item.id === nhomId);
  return group?.ten || nhomId;
}

export function getEmployeesByGroup(allData, nhomId, options = {}) {
  const { includeInactive = false } = options;
  return (allData?.nhanVien?.nhan_vien || []).filter((employee) => {
    if (!includeInactive && employee.trang_thai === 'nghi_viec') return false;
    return (employee.phong_ban_id || employee.nhom_id) === nhomId;
  });
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

export function getXeColorOptions(xe) {
  if (!xe) return [];
  if (Array.isArray(xe.mau_sac)) {
    return [...new Set(xe.mau_sac.map((item) => String(item || '').trim()).filter(Boolean))];
  }
  return [...new Set(String(xe.mau || '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean))];
}

export function formatXeColorSummary(xe) {
  const colors = getXeColorOptions(xe);
  if (colors.length) return colors.join(', ');
  return String(xe?.mau || '').trim();
}

export function formatXeFullName(xe, selectedColor = '') {
  if (!xe) return '';
  const segments = [xe.hang, xe.dong, xe.bien_the].filter(Boolean).join(' ');
  const colorLabel = String(selectedColor || '').trim() || formatXeColorSummary(xe);
  const tail = [colorLabel, xe.nam].filter(Boolean).join(' · ');
  return tail ? `${segments} · ${tail}` : segments;
}

// FK check: đếm KH đang tham chiếu xe này.
export function countKhByXeId(allData, xeId) {
  return (allData.khachHang?.khach_hang || []).filter((kh) => kh.xe_id === xeId).length;
}

// Derive: trả về tên đầy đủ của xe từ xe_id
export function getXeLabel(allData, xeId, selectedColor = '') {
  if (!xeId) return '';
  const xe = (allData.xe?.xe || []).find((x) => x.id === xeId);
  return xe ? formatXeFullName(xe, selectedColor) : xeId;
}

// Derive: trả về tên NV từ nhan_vien_id
export function getNvLabel(allData, nvId) {
  if (!nvId) return '';
  const nv = (allData.nhanVien?.nhan_vien || []).find((n) => n.id === nvId);
  return nv ? nv.ho_ten : nvId;
}

// === Format helpers ===
export function formatPaymentType(value) {
  if (!value) return 'Chưa cập nhật';
  return PAYMENT_TYPE_META[value] || value.replaceAll('_', ' ');
}

// === Date helpers ===
// getWeekOfMonth: tuần trong tháng theo quy ước 5 tuần, ngày 29+ = tuần 5.
export function getWeekOfMonth(dateStr) {
  if (!dateStr) return 0;
  const day = new Date(dateStr).getDate();
  if (Number.isNaN(day)) return 0;
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  if (day <= 28) return 4;
  return 5;
}

export function getPreviousMonthKey(monthStr) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return '';
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
