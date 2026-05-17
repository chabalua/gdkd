// assets/views/nhan-vien.js
import { renderShell, renderEmptyState } from './shell.js';
import { escapeHtml, getPercentClass, renderProgressBar, avatarHtml, renderRangePicker, getCurrentRange, getRangeLabel } from '../ui.js';
import {
  getNvStats, NV_STATUS_META, LOAI_NHAN_SU_META,
  getEmployeeGroups, getEmployeeGroupLabel,
  getPerformanceTier, PERFORMANCE_TIER_META, getActiveMonth,
} from '../models.js';

function buildEmployeeWithStats(employee, data, months, allKh) {
  const stats = getNvStats(data, employee.id, months);
  const monthSet = new Set(months);
  const phongBanId = employee.phong_ban_id || employee.nhom_id || '';
  return {
    ...employee,
    trang_thai: employee.trang_thai || 'dang_lam',
    loai_nhan_su: employee.loai_nhan_su || 'chinh_thuc',
    phong_ban_id: phongBanId,
    nhom_id: phongBanId,
    nhom_ten: getEmployeeGroupLabel(data, phongBanId),
    ...stats,
    kpiPct: stats.pct_muc_tieu,
    duKyThang: allKh.filter((kh) =>
      kh.nhan_vien_id === employee.id &&
      kh.trang_thai === 'du_ky' &&
      kh.ngay_du_kien_ky &&
      monthSet.has(kh.ngay_du_kien_ky.slice(0, 7))
    ).length,
  };
}

function renderEmployeeCard(employee, opts = {}) {
  const { isTop = false } = opts;
  const statusMeta = NV_STATUS_META[employee.trang_thai] || NV_STATUS_META.dang_lam;
  const loaiMeta = LOAI_NHAN_SU_META[employee.loai_nhan_su] || LOAI_NHAN_SU_META.chinh_thuc;
  const isResigned = employee.trang_thai === 'nghi_viec';
  const tier = getPerformanceTier(employee.kpiPct);
  const tierMeta = PERFORMANCE_TIER_META[tier];
  const haystack = `${employee.ho_ten} ${employee.sdt || ''} ${employee.chuc_vu || ''} ${employee.nhom_ten || ''} ${loaiMeta[0]}`.toLowerCase();
  return [
    `<article class="employee-card employee-card-v3 is-tier-${tier}${isTop && !isResigned ? ' is-top' : ''}${isResigned ? ' is-dimmed' : ''}" data-employee-card data-search="${escapeHtml(haystack)}">`,
    '<div class="employee-card-head">',
    avatarHtml(employee.ho_ten, isTop && !isResigned),
    '<div class="employee-card-id">',
    `<h3 class="employee-card-name">${escapeHtml(employee.ho_ten)}</h3>`,
    `<p class="employee-card-sub">${escapeHtml(loaiMeta[0])} · ${escapeHtml(employee.sdt || 'Chưa có SĐT')}</p>`,
    '</div>',
    isResigned
      ? `<span class="badge ${statusMeta[1]}">${escapeHtml(statusMeta[0])}</span>`
      : (employee.kpiPct === null
        ? '<span class="badge employee-card-badge" title="Chưa có mục tiêu">Chưa có MT</span>'
        : `<span class="badge ${getPercentClass(employee.kpiPct)} employee-card-badge">${tierMeta.emoji} ${employee.kpiPct}%</span>`),
    '</div>',

    '<div class="employee-card-stats">',
    `<div class="employee-stat"><span class="employee-stat-num">${employee.lead}</span><span class="employee-stat-label">Lead</span></div>`,
    `<div class="employee-stat"><span class="employee-stat-num">${employee.duKyThang}</span><span class="employee-stat-label">Dự ký</span></div>`,
    `<div class="employee-stat"><span class="employee-stat-num">${employee.xe_ky}</span><span class="employee-stat-label">Xe ký</span></div>`,
    `<div class="employee-stat"><span class="employee-stat-num">${employee.xe_giao}</span><span class="employee-stat-label">Đã giao</span></div>`,
    '</div>',

    isResigned || employee.kpiPct === null ? '' : `<div class="employee-card-bar">${renderProgressBar(employee.kpiPct)}</div>`,

    '<div class="employee-card-actions">',
    `<a class="btn btn-soft" href="nhan-vien-detail.html?id=${encodeURIComponent(employee.id)}">Xem hồ sơ</a>`,
    `<button type="button" class="btn btn-soft" data-action="open-employee-edit" data-id="${escapeHtml(employee.id)}">Chỉnh sửa</button>`,
    `<button type="button" class="btn btn-danger" data-action="delete-employee" data-id="${escapeHtml(employee.id)}">Xoá</button>`,
    '</div>',
    '</article>',
  ].join('');
}

export default function renderNhanVienPage(data) {
  const range = getCurrentRange();
  const months = range?.months?.length ? range.months : [getActiveMonth(data)];
  const rangeLabel = getRangeLabel(range);
  const allKh = data.khachHang?.khach_hang || [];
  const groups = getEmployeeGroups(data);

  const enriched = data.nhanVien.nhan_vien.map((emp) => buildEmployeeWithStats(emp, data, months, allKh));

  // Bucket theo phong_ban_id, fallback "khac"
  const buckets = new Map();
  groups.forEach((g) => buckets.set(g.id, { id: g.id, ten: g.ten, members: [] }));
  buckets.set('_khac', { id: '_khac', ten: 'Chưa gán phòng ban', members: [] });
  enriched.forEach((emp) => {
    const key = buckets.has(emp.phong_ban_id) ? emp.phong_ban_id : '_khac';
    buckets.get(key).members.push(emp);
  });

  // Sort trong nhóm: NV nghỉ xuống cuối, còn lại theo % KPI desc
  buckets.forEach((bucket) => {
    bucket.members.sort((l, r) => {
      const la = l.trang_thai === 'dang_lam' ? 0 : 1;
      const ra = r.trang_thai === 'dang_lam' ? 0 : 1;
      if (la !== ra) return la - ra;
      return (r.kpiPct ?? -1) - (l.kpiPct ?? -1);
    });
  });

  const groupSections = Array.from(buckets.values())
    .filter((bucket) => bucket.members.length > 0)
    .map((bucket) => {
      const activeCount = bucket.members.filter((m) => m.trang_thai === 'dang_lam').length;
      const totalLead = bucket.members.reduce((s, m) => s + (m.lead || 0), 0);
      const totalXeKy = bucket.members.reduce((s, m) => s + (m.xe_ky || 0), 0);
      return [
        '<section class="employee-group-section">',
        '<div class="employee-group-head">',
        `<h3 class="employee-group-title">${escapeHtml(bucket.ten)}</h3>`,
        '<div class="employee-group-meta">',
        `<span class="badge">${activeCount} đang làm</span>`,
        `<span class="badge is-info">${totalXeKy} xe · ${totalLead} lead</span>`,
        '</div>',
        '</div>',
        `<div class="employee-grid-v3">${bucket.members.map((emp, idx) => renderEmployeeCard(emp, { isTop: idx === 0 && bucket.id !== '_khac' })).join('')}</div>`,
        '</section>',
      ].join('');
    }).join('');

  const content = [
    '<section class="section-header">',
    `<div><h3 class="section-title">Đội ngũ nhân sự</h3><p class="section-subtitle">Quản lý theo phòng ban · ${escapeHtml(rangeLabel)}</p></div>`,
    '<div class="section-actions">',
    renderRangePicker(range),
    '<button type="button" class="btn btn-soft" data-action="open-group-manager">+ Thêm nhóm</button>',
    '<button type="button" class="btn btn-primary" data-action="open-employee-create">+ Thêm nhân viên</button>',
    '</div>',
    '</section>',
    '<div class="employee-search-wrap">',
    '<input class="input" data-employee-search placeholder="Tìm theo họ tên, SĐT, chức vụ, phòng ban..." aria-label="Tìm nhân viên" />',
    '</div>',
    enriched.length
      ? groupSections
      : renderEmptyState('Chưa có nhân viên', 'Hãy tạo hồ sơ nhân viên đầu tiên.', 'Thêm nhân viên', 'open-employee-create'),
  ].join('');

  return renderShell('nhanvien', content, data);
}
