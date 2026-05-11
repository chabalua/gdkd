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
  settings: { title: 'Thiết Lập', kicker: 'Dashboard / Thiết lập' },
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

const DEFAULT_DEPARTMENTS = [
  { id: 'kd_1', ten: 'Kinh doanh 1', loai: 'ban_hang' },
  { id: 'kd_2', ten: 'Kinh doanh 2', loai: 'ban_hang' },
  { id: 'mkt', ten: 'Marketing', loai: 'ho_tro' },
  { id: 'kt', ten: 'Kế toán', loai: 'ho_tro' },
];

const STATIC_ACTIVITY_CHANNELS = [
  { id: 'gio_live', label: 'Giờ livestream', loai: 'hoat_dong', don_vi: 'gio' },
  { id: 'luot_lai_thu', label: 'Lượt lái thử', loai: 'hoat_dong', don_vi: 'luot' },
  { id: 'so_video', label: 'Số video', loai: 'hoat_dong', don_vi: 'so' },
  { id: 'so_tien_chay_quang_cao', label: 'Tiền chạy quảng cáo', loai: 'hoat_dong', don_vi: 'tien' },
  { id: 'so_tien_qc', label: 'Tiền chạy quảng cáo', loai: 'hoat_dong', don_vi: 'tien' },
];

const DEFAULT_TASK_LIBRARY = [
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

function getStaticChannelMeta(channelId) {
  return STATIC_ACTIVITY_CHANNELS.find((channel) => channel.id === channelId) || null;
}

function normalizeLeadChannel(channel) {
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
  const compatGroupId = employee?.phong_ban_id && validGroupIds.has(employee.phong_ban_id)
    ? employee.phong_ban_id
    : (employee?.nhom_id && validGroupIds.has(employee.nhom_id) ? employee.nhom_id : null);
  const legacyGroupId = employee?.nhom && validGroupIds.has(employee.nhom)
    ? employee.nhom
    : groups.find((group) => group.ten === employee?.nhom)?.id;
  normalized.nhom_id = compatGroupId || legacyGroupId || fallbackGroupId;
  normalized.phong_ban_id = normalized.nhom_id;
  normalized.loai_nhan_su = employee?.loai_nhan_su || 'chinh_thuc';
  delete normalized.nhom;
  return normalized;
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

export const TODO_MESSAGE = 'Chức năng này đã có khung dữ liệu thật, phần còn lại sẽ tiếp tục được mở rộng nếu cần.';

function mapLegacyGroupId(groupId) {
  if (groupId === 'nhom_1') return 'kd_1';
  if (groupId === 'nhom_2') return 'kd_2';
  return groupId || 'kd_1';
}

function normalizeDepartments(rawDepartments, rawGroups) {
  const base = Array.isArray(rawDepartments) && rawDepartments.length
    ? rawDepartments.map((department, index) => ({
      id: department?.id || `pb_${index + 1}`,
      ten: department?.ten || `Phòng ban ${index + 1}`,
      loai: department?.loai === 'ho_tro' ? 'ho_tro' : 'ban_hang',
    }))
    : normalizeEmployeeGroups(rawGroups).map((group, index) => ({
      id: mapLegacyGroupId(group.id || `nhom_${index + 1}`),
      ten: group.ten?.replace(/^Nhóm\s+/i, 'Kinh doanh ') || `Kinh doanh ${index + 1}`,
      loai: 'ban_hang',
    }));
  const next = [...base];
  DEFAULT_DEPARTMENTS.forEach((department) => {
    if (!next.some((item) => item.id === department.id)) {
      next.push({ ...department });
    }
  });
  return next;
}

function normalizeTaskLibrary(rawTasks, rawChannels) {
  const source = Array.isArray(rawTasks) && rawTasks.length
    ? rawTasks
    : (Array.isArray(rawChannels) && rawChannels.length
      ? rawChannels.map((channel) => ({
        id: channel.id,
        ten: channel.label || channel.ten || channel.id,
        phong_ban_ids: ['kd_1', 'kd_2'],
        loai: channel.loai || 'lead',
        don_vi: channel.don_vi || 'so',
      }))
      : DEFAULT_TASK_LIBRARY);

  const deduped = [];
  const seen = new Set();
  source.forEach((task) => {
    const id = task?.id;
    if (!id || seen.has(id)) return;
    seen.add(id);
    const phong_ban_ids = Array.isArray(task?.phong_ban_ids) && task.phong_ban_ids.length
      ? task.phong_ban_ids.filter(Boolean)
      : [task?.phong_ban_id || 'kd_1'];
    deduped.push({
      id,
      ten: task?.ten || task?.label || id,
      phong_ban_ids,
      loai: task?.loai === 'hoat_dong' ? 'hoat_dong' : 'lead',
      don_vi: task?.don_vi || 'so',
    });
  });
  DEFAULT_TASK_LIBRARY.forEach((task) => {
    if (!seen.has(task.id)) deduped.push({ ...task });
  });
  return deduped;
}

function buildCompatChannels(taskLibrary) {
  return taskLibrary.map((task) => normalizeLeadChannel({
    id: task.id,
    label: task.ten,
    loai: task.loai,
    don_vi: task.don_vi,
  }));
}

function buildCompatGroups(departments) {
  return departments
    .filter((department) => department.loai === 'ban_hang')
    .map((department, index) => ({
      id: department.id,
      ten: department.ten || `Nhóm ${index + 1}`,
    }));
}

function collectEmployeeTaskIds(employee) {
  const ids = new Set(Array.isArray(employee?.nhiem_vu_ids) ? employee.nhiem_vu_ids : []);
  Object.values(employee?.du_lieu || {}).forEach((monthBlock) => {
    Object.values(monthBlock?.tuan || {}).forEach((weekBlock) => {
      Object.keys(weekBlock || {}).forEach((taskId) => ids.add(taskId));
    });
  });
  return Array.from(ids);
}

function buildCompatEmployeeData(employee, taskLibrary, departments) {
  const taskMap = Object.fromEntries(taskLibrary.map((task) => [task.id, task]));
  const phong_ban_id = employee?.phong_ban_id || mapLegacyGroupId(employee?.nhom_id) || departments[0]?.id || 'kd_1';
  const monthData = {};
  const contentData = {};
  const weeklyTargets = {};

  Object.entries(employee?.du_lieu || {}).forEach(([month, monthBlock]) => {
    monthData[month] = {};
    contentData[month] = { videos: {} };
    weeklyTargets[month] = [];
    for (let week = 1; week <= 5; week += 1) {
      const weekBlock = monthBlock?.tuan?.[String(week)] || monthBlock?.tuan?.[week] || {};
      let weeklyTarget = 0;
      Object.entries(weekBlock).forEach(([taskId, metrics]) => {
        const target = numberValue(metrics?.muc_tieu);
        const actual = numberValue(metrics?.thuc_te);
        if (!monthData[month][taskId]) {
          monthData[month][taskId] = { muc_tieu: 0, tuan: {} };
        }
        monthData[month][taskId].muc_tieu += target;
        if (actual || target) {
          monthData[month][taskId].tuan[week] = actual;
        }
        if (taskId === 'so_video' && actual) {
          contentData[month].videos.tong = numberValue(contentData[month].videos.tong) + actual;
        }
        if (taskMap[taskId]?.loai !== 'hoat_dong') {
          weeklyTarget += target;
        }
      });
      if (weeklyTarget) {
        weeklyTargets[month].push({ tuan: week, muc_tieu_nv: weeklyTarget });
      }
    }
  });

  const assignedTaskIds = collectEmployeeTaskIds(employee);
  const defaultTaskIds = taskLibrary
    .filter((task) => task.phong_ban_ids.includes(phong_ban_id))
    .map((task) => task.id);

  return {
    ...employee,
    phong_ban_id,
    nhom_id: phong_ban_id,
    nhiem_vu_ids: assignedTaskIds.length ? assignedTaskIds : defaultTaskIds,
    lead_theo_thang: monthData,
    noi_dung: contentData,
    kpi_tuan: weeklyTargets,
  };
}

function collectMonthsFromEmployees(employees) {
  const months = new Set();
  employees.forEach((employee) => {
    Object.keys(employee?.du_lieu || {}).forEach((month) => months.add(month));
  });
  return Array.from(months).sort();
}

function buildCompatMonthlyTargets(employees, taskLibrary) {
  const taskMap = Object.fromEntries(taskLibrary.map((task) => [task.id, task]));
  return collectMonthsFromEmployees(employees).reduce((accumulator, month) => {
    let lead_phat_sinh = 0;
    const muc_tieu_nv = {};
    employees.forEach((employee) => {
      let employeeLeadTarget = 0;
      Object.values(employee?.du_lieu?.[month]?.tuan || {}).forEach((weekBlock) => {
        Object.entries(weekBlock || {}).forEach(([taskId, metrics]) => {
          if (taskMap[taskId]?.loai === 'hoat_dong') return;
          employeeLeadTarget += numberValue(metrics?.muc_tieu);
        });
      });
      if (employeeLeadTarget) {
        muc_tieu_nv[employee.id] = { lead_phat_sinh: employeeLeadTarget, xe_ky_moi: 0, hd_xuat_thang: 0 };
        lead_phat_sinh += employeeLeadTarget;
      }
    });
    accumulator[month] = {
      xe_ky_moi: 0,
      hd_xuat_thang: 0,
      lead_phat_sinh,
      muc_tieu_nv,
    };
    return accumulator;
  }, {});
}

function buildCompatCongViec(rawCongViec, employees) {
  const next = {
    su_kien_lai_thu: {
      muc_tieu: 0,
      danh_sach: Array.isArray(rawCongViec?.su_kien_lai_thu?.danh_sach) ? rawCongViec.su_kien_lai_thu.danh_sach : [],
    },
    videos: {
      tuyen_noi_dung: [],
      muc_tieu: 0,
      da_hoan_thanh: 0,
    },
    livestream: {
      muc_tieu_gio: 0,
      da_live_gio: 0,
      lich: [],
    },
    zalo_oa: {
      muc_tieu: numberValue(rawCongViec?.zalo_oa?.muc_tieu),
      thuc_te: numberValue(rawCongViec?.zalo_oa?.thuc_te),
      theo_tuan: Array.isArray(rawCongViec?.zalo_oa?.theo_tuan) ? rawCongViec.zalo_oa.theo_tuan : [],
    },
  };

  employees.forEach((employee) => {
    Object.entries(employee?.du_lieu || {}).forEach(([, monthBlock]) => {
      Object.values(monthBlock?.tuan || {}).forEach((weekBlock) => {
        const gioLive = numberValue(weekBlock?.gio_live?.thuc_te);
        const gioLiveTarget = numberValue(weekBlock?.gio_live?.muc_tieu);
        const soVideo = numberValue(weekBlock?.so_video?.thuc_te);
        const soVideoTarget = numberValue(weekBlock?.so_video?.muc_tieu);
        next.livestream.da_live_gio += gioLive;
        next.livestream.muc_tieu_gio += gioLiveTarget;
        next.videos.da_hoan_thanh += soVideo;
        next.videos.muc_tieu += soVideoTarget;
      });
    });
  });

  return next;
}

function serializeConfigV3(config) {
  return {
    thang_hien_tai: config?.thang_hien_tai || getCurrentMonth(),
    showroom: config?.showroom || { ten: '', dia_chi: '', gdkd: '' },
    phong_ban: normalizeDepartments(config?.phong_ban, config?.nhom_kinh_doanh),
    nhiem_vu_lib: normalizeTaskLibrary(config?.nhiem_vu_lib, config?.lead_channels),
  };
}

function serializeNhanVienV3(payload) {
  const list = Array.isArray(payload?.nhan_vien) ? payload.nhan_vien : [];
  return {
    nhan_vien: list.map((employee) => {
      const du_lieu = {};
      const months = new Set([
        ...Object.keys(employee?.du_lieu || {}),
        ...Object.keys(employee?.lead_theo_thang || {}),
        ...Object.keys(employee?.noi_dung || {}),
      ]);

      months.forEach((month) => {
        du_lieu[month] = { tuan: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} } };
        Object.entries(employee?.lead_theo_thang?.[month] || {}).forEach(([taskId, metrics]) => {
          for (let week = 1; week <= 5; week += 1) {
            const actual = numberValue(metrics?.tuan?.[week]);
            const target = week === 1 ? numberValue(metrics?.muc_tieu) : 0;
            if (!actual && !target) continue;
            du_lieu[month].tuan[week][taskId] = { muc_tieu: target, thuc_te: actual };
          }
        });

        const videoTotal = Object.values(employee?.noi_dung?.[month]?.videos || {}).reduce((sum, value) => sum + numberValue(value), 0);
        if (videoTotal && !du_lieu[month].tuan[1].so_video) {
          du_lieu[month].tuan[1].so_video = { muc_tieu: 0, thuc_te: videoTotal };
        }
      });

      return {
        id: employee.id,
        ho_ten: employee.ho_ten || '',
        anh: employee.anh || '',
        chuc_vu: employee.chuc_vu || '',
        sdt: employee.sdt || '',
        ngay_vao: employee.ngay_vao || '',
        phong_ban_id: employee.phong_ban_id || employee.nhom_id || 'kd_1',
        loai_nhan_su: employee.loai_nhan_su || 'chinh_thuc',
        trang_thai: employee.trang_thai || 'dang_lam',
        nhiem_vu_ids: Array.isArray(employee.nhiem_vu_ids) ? employee.nhiem_vu_ids : collectEmployeeTaskIds(employee),
        du_lieu,
      };
    }),
  };
}

function serializeCongViecV3(payload) {
  return {
    su_kien_lai_thu: {
      danh_sach: Array.isArray(payload?.su_kien_lai_thu?.danh_sach) ? payload.su_kien_lai_thu.danh_sach : [],
    },
    zalo_oa: {
      muc_tieu: numberValue(payload?.zalo_oa?.muc_tieu),
      thuc_te: numberValue(payload?.zalo_oa?.thuc_te),
      theo_tuan: Array.isArray(payload?.zalo_oa?.theo_tuan) ? payload.zalo_oa.theo_tuan : [],
    },
  };
}

function serializeKhachHangV3(payload) {
  const list = Array.isArray(payload?.khach_hang) ? payload.khach_hang : [];
  return {
    khach_hang: list.map((customer) => ({
      id: customer.id,
      ten: customer.ten || '',
      sdt: customer.sdt || '',
      dia_chi: customer.dia_chi || '',
      nhan_vien_id: customer.nhan_vien_id || '',
      xe_id: customer.xe_id || '',
      ghi_chu_ctkm: customer.ghi_chu_ctkm || '',
      trang_thai: customer.trang_thai || 'du_ky',
      ngay_du_kien_ky: customer.ngay_du_kien_ky || null,
      ngay_ky: customer.ngay_ky || null,
      ngay_giao_du_kien: customer.ngay_giao_du_kien || null,
      ngay_giao_thuc_te: customer.ngay_giao_thuc_te || null,
      hinh_thuc_tt: customer.hinh_thuc_tt || '',
      ngan_hang: customer.ngan_hang || '',
      so_tien_vay: numberValue(customer.so_tien_vay),
      muc_dong_mong_muon: numberValue(customer.muc_dong_mong_muon),
      so_hd: customer.so_hd || '',
      kenh_lead: customer.kenh_lead || '',
      tien_do: Array.isArray(customer.tien_do) ? customer.tien_do : [],
      cskh: Array.isArray(customer.cskh) ? customer.cskh : [],
    })),
  };
}

export function serializeFilePayload(filename, payload) {
  switch (filename) {
    case 'config.json':
      return serializeConfigV3(payload);
    case 'nhan-vien.json':
      return serializeNhanVienV3(payload);
    case 'cong-viec.json':
      return serializeCongViecV3(payload);
    case 'khach-hang.json':
      return serializeKhachHangV3(payload);
    default:
      return payload;
  }
}

// === Normalize ===
export function normalizeData(rawData) {
  const currentMonth = rawData?.config?.thang_hien_tai || getCurrentMonth();
  const lichSu = Array.isArray(rawData?.lichSu?.lich_su) ? rawData.lichSu.lich_su : [];
  const departments = normalizeDepartments(rawData?.config?.phong_ban, rawData?.config?.nhom_kinh_doanh);
  const taskLibrary = normalizeTaskLibrary(rawData?.config?.nhiem_vu_lib, rawData?.config?.lead_channels);
  const compatGroups = buildCompatGroups(departments);
  const rawEmployees = Array.isArray(rawData?.nhanVien?.nhan_vien) ? rawData.nhanVien.nhan_vien : [];
  const normalizedEmployees = rawEmployees
    .map((employee) => buildCompatEmployeeData(employee, taskLibrary, departments))
    .map((employee) => normalizeEmployeeRecord(employee, departments));
  const compatTargets = buildCompatMonthlyTargets(rawEmployees, taskLibrary);
  return {
    config: {
      thang_hien_tai: currentMonth,
      showroom: rawData?.config?.showroom || { ten: '', dia_chi: '', gdkd: '' },
      cong_ty: rawData?.config?.showroom?.ten || rawData?.config?.cong_ty || '',
      gdkd: rawData?.config?.showroom?.gdkd || rawData?.config?.gdkd || '',
      muc_tieu_thang: compatTargets,
      lead_channels: buildCompatChannels(taskLibrary),
      nhom_kinh_doanh: compatGroups,
      phong_ban: departments,
      nhiem_vu_lib: taskLibrary,
    },
    kpi: {
      thang: currentMonth,
      xe_ky_moi: {
        muc_tieu: 0,
        thuc_te: 0,
      },
      hd_xuat_thang: {
        muc_tieu: 0,
        thuc_te: 0,
      },
      hd_ton_thang_cu: {
        tong: 0,
        da_giai_quyet: 0,
      },
      lead_phat_sinh: {
        muc_tieu: numberValue(compatTargets?.[currentMonth]?.lead_phat_sinh),
        thuc_te: 0,
      },
      lich_su: lichSu,
    },
    lichSu: {
      lich_su: lichSu,
    },
    congViec: {
      thang: currentMonth,
      ...buildCompatCongViec(rawData?.congViec, rawEmployees),
    },
    xe: {
      xe: Array.isArray(rawData?.xe?.xe) ? rawData.xe.xe : [],
    },
    nhanVien: {
      nhan_vien: normalizedEmployees,
    },
    khachHang: {
      khach_hang: Array.isArray(rawData?.khachHang?.khach_hang)
        ? rawData.khachHang.khach_hang
        : [],
    },
  };
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
  const co_muc_tieu = data.nhanVien.nhan_vien.some((employee) =>
    Object.values(employee?.du_lieu?.[month]?.tuan || {}).some((weekBlock) =>
      Object.values(weekBlock || {}).some((metrics) => numberValue(metrics?.muc_tieu) > 0)
    )
  );
  const muc_tieu_day_du = co_muc_tieu;
  return { co_xe, co_nv, co_muc_tieu, muc_tieu_day_du, all: co_xe && co_nv };
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

function getTaskMetaMap(allData) {
  const taskLibrary = Array.isArray(allData?.config?.nhiem_vu_lib) ? allData.config.nhiem_vu_lib : [];
  const leadChannels = getLeadChannels(allData);
  return Object.fromEntries(
    [...taskLibrary, ...leadChannels].filter(Boolean).map((task) => [task.id, task])
  );
}

function getTaskType(taskMap, taskId) {
  return taskMap[taskId]?.loai === 'hoat_dong' ? 'hoat_dong' : 'lead';
}

export function getEmployeeWeeklyTargetTotal(allData, employee, months, options = {}) {
  if (!employee || !months?.length) return 0;
  const { loai = 'all' } = options;
  const taskMap = getTaskMetaMap(allData);
  return months.reduce((monthSum, month) => {
    const monthBlock = employee?.du_lieu?.[month]?.tuan || {};
    return monthSum + Object.values(monthBlock).reduce((weekSum, weekBlock) => {
      return weekSum + Object.entries(weekBlock || {}).reduce((taskSum, [taskId, metrics]) => {
        const taskType = getTaskType(taskMap, taskId);
        if (loai !== 'all' && taskType !== loai) return taskSum;
        return taskSum + numberValue(metrics?.muc_tieu);
      }, 0);
    }, 0);
  }, 0);
}

export function getEmployeeTargetTotal(allData, employee, months, kpiField) {
  if (!employee || !months?.length) return 0;
  if (kpiField === 'lead_phat_sinh') {
    const weeklyLeadTarget = getEmployeeWeeklyTargetTotal(allData, employee, months, { loai: 'lead' });
    if (weeklyLeadTarget > 0) return weeklyLeadTarget;
  }
  return months.reduce((sum, month) => {
    const nvMt = allData?.config?.muc_tieu_thang?.[month]?.muc_tieu_nv?.[employee.id];
    return sum + numberValue(nvMt?.[kpiField]);
  }, 0);
}

export function getProgressMetrics(allData, employee, months) {
  if (!employee || !months?.length) return { actual: 0, target: 0, pct: null };
  const leadChannels = getLeadMetricChannels(allData);
  const lead = months.reduce((sum, month) => sum + getEmployeeLeadTotal(employee, month, leadChannels), 0);
  const weeklyLeadTarget = getEmployeeWeeklyTargetTotal(allData, employee, months, { loai: 'lead' });
  if (weeklyLeadTarget > 0) {
    return {
      actual: lead,
      target: weeklyLeadTarget,
      pct: calcPercent(lead, weeklyLeadTarget),
    };
  }
  return {
    actual: 0,
    target: 0,
    pct: null,
  };
}

export function getMucTieuTong(allData, kpiField, months) {
  if (!months?.length) return 0;
  if (kpiField === 'lead_phat_sinh') {
    const weeklyLeadTarget = (allData?.nhanVien?.nhan_vien || []).reduce((sum, employee) => {
      if (employee?.trang_thai === 'nghi_viec') return sum;
      return sum + getEmployeeWeeklyTargetTotal(allData, employee, months, { loai: 'lead' });
    }, 0);
    if (weeklyLeadTarget > 0) return weeklyLeadTarget;
  }
  return months.reduce((sum, month) => {
    const target = allData?.config?.muc_tieu_thang?.[month];
    return sum + numberValue(target?.[kpiField]);
  }, 0);
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
    const personalTarget = getEmployeeTargetTotal(allData, nv, months, kpiField);
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
    const progress = getProgressMetrics(allData, nv, months);
    const fallbackTarget = getEmployeeTargetTotal(allData, nv, months, 'xe_ky_moi');
    const pct_muc_tieu = progress.pct !== null
      ? progress.pct
      : (fallbackTarget > 0 ? calcPercent(xe_ky, fallbackTarget) : null);
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
  const progress = getProgressMetrics(allData, nv, months);
  const fallbackTarget = getEmployeeTargetTotal(allData, nv, months, 'xe_ky_moi');
  const pct_muc_tieu = progress.pct !== null
    ? progress.pct
    : (fallbackTarget > 0 ? calcPercent(xe_ky, fallbackTarget) : null);
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
    const target_xe_ky = members.reduce((sum, member) => sum + getEmployeeTargetTotal(allData, member, months, 'xe_ky_moi'), 0);
    const target_lead = members.reduce((sum, member) => sum + getEmployeeWeeklyTargetTotal(allData, member, months, { loai: 'lead' }), 0);
    const pct_xe_ky = target_lead > 0 ? calcPercent(lead, target_lead) : (target_xe_ky > 0 ? calcPercent(xe_ky, target_xe_ky) : null);
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
      target_lead,
      pct_xe_ky,
      qc_per_lead,
    };
  });
}

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
