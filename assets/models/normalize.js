// assets/models/normalize.js
// Normalize raw JSON từ GitHub thành shape app dùng. Bao gồm compat layer v2 ↔ v3:
// - Đọc: phẳng `du_lieu[month].tuan[w][task]` thành `lead_theo_thang/noi_dung/kpi_tuan` để view cũ chạy.
// - Ghi: serialize ngược lại schema v3 trước khi push GitHub.
// Compat layer này sẽ được dọn dần khi rewrite các derive function đọc trực tiếp `du_lieu`.

import { numberValue, getCurrentMonth } from '../ui.js';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_LEAD_CHANNELS,
  DEFAULT_TASK_LIBRARY,
  STATIC_ACTIVITY_CHANNELS,
} from './constants.js';
import { normalizeLeadChannel, normalizeEmployeeGroups } from './helpers.js';

function mapLegacyGroupId(groupId) {
  if (groupId === 'nhom_1') return 'kd_1';
  if (groupId === 'nhom_2') return 'kd_2';
  return groupId || 'kd_1';
}

function normalizeEmployeeRecord(employee, groups) {
  const normalized = { ...employee };
  const validGroupIds = new Set(groups.map((group) => group.id));
  const fallbackGroupId = groups[0]?.id || 'kd_1';
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
  const hasExplicitTasks = Array.isArray(rawTasks) && rawTasks.length;
  const hasExplicitChannels = Array.isArray(rawChannels) && rawChannels.length;
  const source = hasExplicitTasks
    ? rawTasks
    : (hasExplicitChannels
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
  if (!hasExplicitTasks && !hasExplicitChannels) {
    DEFAULT_TASK_LIBRARY.forEach((task) => {
      if (!seen.has(task.id)) deduped.push({ ...task });
    });
  }
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
        if (taskMap[taskId]?.loai === 'lead') {
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
          if (taskMap[taskId]?.loai !== 'lead') return;
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

function buildCompatCongViec(rawCongViec, employees, taskLibrary) {
  const taskMetaMap = new Map([
    ...STATIC_ACTIVITY_CHANNELS.map((task) => [task.id, {
      id: task.id,
      ten: task.label,
      loai: task.loai,
      don_vi: task.don_vi,
    }]),
    ...(taskLibrary || []).map((task) => [task.id, task]),
  ]);
  const activityTaskIds = new Set(
    (taskLibrary || [])
      .filter((task) => task?.loai === 'hoat_dong')
      .map((task) => task.id)
  );
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
    hoat_dong: [],
  };

  const activitySummaryMap = new Map();
  function ensureActivitySummary(taskId) {
    if (!taskId) return null;
    if (!activitySummaryMap.has(taskId)) {
      const task = taskMetaMap.get(taskId);
      activitySummaryMap.set(taskId, {
        id: taskId,
        ten: task?.ten || task?.label || taskId,
        don_vi: task?.don_vi || 'so',
        muc_tieu: 0,
        thuc_te: 0,
        chi_tiet: taskId === 'so_video'
          ? (Array.isArray(rawCongViec?.videos?.tuyen_noi_dung) ? rawCongViec.videos.tuyen_noi_dung : [])
          : (taskId === 'gio_live'
            ? (Array.isArray(rawCongViec?.livestream?.lich) ? rawCongViec.livestream.lich : [])
            : []),
      });
    }
    return activitySummaryMap.get(taskId);
  }

  activityTaskIds.forEach((taskId) => ensureActivitySummary(taskId));

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

        Object.entries(weekBlock || {}).forEach(([taskId, metrics]) => {
          const task = taskMetaMap.get(taskId);
          if (task?.loai !== 'hoat_dong') return;
          const summary = ensureActivitySummary(taskId);
          if (!summary) return;
          summary.muc_tieu += numberValue(metrics?.muc_tieu);
          summary.thuc_te += numberValue(metrics?.thuc_te);
          activityTaskIds.add(taskId);
        });
      });
    });
  });

  next.hoat_dong = Array.from(activityTaskIds)
    .map((taskId) => ensureActivitySummary(taskId))
    .filter((task) => task && (task.muc_tieu || task.thuc_te || task.chi_tiet.length));

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

function cloneWeekTaskMetrics(metrics) {
  return {
    muc_tieu: numberValue(metrics?.muc_tieu),
    thuc_te: numberValue(metrics?.thuc_te),
  };
}

function cloneEmployeeMonthData(monthData) {
  const weeks = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
  Object.entries(monthData?.tuan || {}).forEach(([week, weekBlock]) => {
    if (!weeks[week]) weeks[week] = {};
    Object.entries(weekBlock || {}).forEach(([taskId, metrics]) => {
      weeks[week][taskId] = cloneWeekTaskMetrics(metrics);
    });
  });
  return { tuan: weeks };
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
        du_lieu[month] = cloneEmployeeMonthData(employee?.du_lieu?.[month]);
        // du_lieu là nguồn chuẩn mới. Chỉ backfill từ compat fields khi task/tuần
        // đó chưa tồn tại, tránh ghi đè số vừa nhập trong week-grid.
        Object.entries(employee?.lead_theo_thang?.[month] || {}).forEach(([taskId, metrics]) => {
          for (let week = 1; week <= 5; week += 1) {
            const actual = numberValue(metrics?.tuan?.[week]);
            const target = week === 1 ? numberValue(metrics?.muc_tieu) : 0;
            const existingMetrics = du_lieu[month].tuan[week][taskId];
            if (existingMetrics) continue;
            if (!actual && !target) continue;
            du_lieu[month].tuan[week][taskId] = {
              muc_tieu: target,
              thuc_te: actual,
            };
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
      muc_tieu: numberValue(payload?.su_kien_lai_thu?.muc_tieu),
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
      mau_xe: customer.mau_xe || '',
      ghi_chu_ctkm: customer.ghi_chu_ctkm || '',
      trang_thai: customer.trang_thai || 'du_ky',
      ngay_du_kien_ky: customer.ngay_du_kien_ky || null,
      ngay_ky: customer.ngay_ky || null,
      ngay_giao_du_kien: customer.ngay_giao_du_kien || null,
      ngay_giao_thuc_te: customer.ngay_giao_thuc_te || null,
      ngay_xuat_hd: customer.ngay_xuat_hd || null,
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
      ...buildCompatCongViec(rawData?.congViec, rawEmployees, taskLibrary),
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

// === Init helper: bảo đảm employee.lead_theo_thang/noi_dung/kpi_tuan có shape đúng cho 1 tháng ===
export function ensureEmployeeMonth(employee, month, leadChannels) {
  const channels = leadChannels || DEFAULT_LEAD_CHANNELS;
  if (!employee.du_lieu) employee.du_lieu = {};
  if (!employee.du_lieu[month]) employee.du_lieu[month] = { tuan: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} } };
  else if (!employee.du_lieu[month].tuan) employee.du_lieu[month].tuan = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
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
