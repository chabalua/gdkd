// assets/models/derive.js
// Derive functions: KPI segments, ranking, group summary, KH tồn, snapshot, performance tier.
// Đọc data đã normalize (qua normalize.js). Pure — không DOM, không IO.

import { numberValue, calcPercent } from '../ui.js';
import { DEFAULT_LEAD_CHANNELS } from './constants.js';
import {
  getActiveMonth,
  getLeadChannels,
  getLeadMetricChannels,
  getLeadTuanTotal,
  getEmployeeGroups,
  getEmployeesByGroup,
  formatXeFullName,
} from './helpers.js';

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
      // Xe đã giao trong kỳ (ngay_giao_thuc_te thuộc kỳ).
      value = allKh.filter((kh) => kh.nhan_vien_id === nv.id && kh.ngay_giao_thuc_te && monthSet.has(kh.ngay_giao_thuc_te.slice(0, 7))).length;
    } else if (kpiField === 'hoa_don_xuat') {
      // Hoá đơn xuất trong kỳ (ngay_xuat_hd thuộc kỳ).
      value = allKh.filter((kh) => kh.nhan_vien_id === nv.id && kh.ngay_xuat_hd && monthSet.has(kh.ngay_xuat_hd.slice(0, 7))).length;
    } else if (kpiField === 'xe_cho_giao') {
      // KH đang ở status cho_giao — không phụ thuộc kỳ, là snapshot hiện tại.
      value = allKh.filter((kh) => kh.nhan_vien_id === nv.id && kh.trang_thai === 'cho_giao').length;
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
