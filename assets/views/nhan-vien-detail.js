// assets/views/nhan-vien-detail.js
import { renderShell, renderEmptyState } from './shell.js';
import { escapeHtml, avatarHtml, renderRangePicker, getCurrentRange, getRangeLabel } from '../ui.js';
import { getLeadChannels, getNvStats, getWeekOfMonth, KH_STATUS_META, LOAI_NHAN_SU_META, getEmployeeGroupLabel, getActiveMonth, isSingleMonthRange, getXeLabel } from '../models.js';
import { renderWeekGrid } from '../components/week-grid.js';

// === Tab 4: KH c\u1ee7a t\u00f4i ===
function renderKhPanel(employee, allKh, allXe, channels) {
  const nvId = employee.id;
  const myKh = allKh.filter((kh) => kh.nhan_vien_id === nvId);
  const xeMap = Object.fromEntries((allXe || []).map((x) => [x.id, x]));
  const leadOnlyChannels = channels.filter((channel) => channel.loai !== 'hoat_dong');
  const channelMap = Object.fromEntries(leadOnlyChannels.map((channel) => [channel.id, channel.label]));
  const needCskh = (kh) => ['da_giao', 'xuat_hd'].includes(kh.trang_thai)
    && (!kh.cskh?.length || kh.cskh.some((c) => c.trang_thai_xu_ly !== 'da_xu_ly'));

  const statusFilters = [
    ['all', 'T\u1ea5t c\u1ea3'], ['du_ky', 'D\u1ef1 k\u00fd'], ['moi_ky', 'M\u1edbi k\u00fd'],
    ['dang_xu_ly', '\u0110ang x\u1eed l\u00fd'], ['cho_giao', 'Ch\u1edd giao'],
    ['da_giao', '\u0110\u00e3 giao'], ['xuat_hd', 'Xu\u1ea5t H\u0110'], ['can_cskh', 'C\u1ea7n CSKH'],
  ];
  const statusPills = statusFilters.map(([val, label]) =>
    `<button type="button" class="chip${val === 'all' ? ' is-active' : ''}" data-kh-filter="${escapeHtml(val)}">${escapeHtml(label)}</button>`
  ).join('');

  // Kenh pills (dynamic from channels config)
  const channelCounts = {};
  leadOnlyChannels.forEach((ch) => { channelCounts[ch.id] = myKh.filter((kh) => kh.kenh_lead === ch.id).length; });
  const unknownCount = myKh.filter((kh) => !kh.kenh_lead).length;
  const kenhPillsArr = leadOnlyChannels.filter((ch) => channelCounts[ch.id] > 0).map((ch) =>
    `<button type="button" class="chip" data-kenh-filter="${escapeHtml(ch.id)}">${escapeHtml(ch.label)} <span class="badge chip-count">${channelCounts[ch.id]}</span></button>`
  );
  if (unknownCount > 0) {
    kenhPillsArr.push(`<button type="button" class="chip" data-kenh-filter="">Chưa rõ kênh <span class="badge chip-count">${unknownCount}</span></button>`);
  }
  const kenhPills = kenhPillsArr.join('');

  const cards = myKh.length ? myKh.map((kh) => {
    const xe = xeMap[kh.xe_id];
    const xeLabel = xe ? getXeLabel({ xe: { xe: allXe } }, kh.xe_id, kh.mau_xe) : '\u2014';
    const [statusLabel, statusClass] = KH_STATUS_META[kh.trang_thai] || ['\u2014', ''];
    const isCskh = needCskh(kh);
    const lastStep = kh.tien_do?.length ? kh.tien_do[kh.tien_do.length - 1] : null;
    const kenhLabel = kh.kenh_lead
      ? `<span class="badge is-info chip-count">${escapeHtml(channelMap[kh.kenh_lead] || kh.kenh_lead)}</span>` : '';
    return [
      `<article class="customer-card" data-kh-card data-filter="${escapeHtml(kh.trang_thai || 'all')}" data-can-cskh="${isCskh ? 'true' : 'false'}" data-kenh-lead="${escapeHtml(kh.kenh_lead || '')}">`,
      '<div class="customer-row">',
      `<div class="content-flex-1"><h3 class="card-title">${escapeHtml(kh.ten)}</h3>`,
      `<p class="card-subtitle">${escapeHtml(xeLabel)} \u00b7 ${escapeHtml(kh.sdt || '\u2014')}</p>`,
      lastStep ? `<p class="card-subtitle text-subtle-sm">${escapeHtml(lastStep.noi_dung)}</p>` : '',
      '</div>',
      `<div class="stack-end"><span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span>`,
      kenhLabel,
      isCskh ? '<span class="badge is-warning">C\u1ea7n CSKH</span>' : '',
      '</div></div>',
      '<div class="button-row button-row-top">',
      `<button type="button" class="btn btn-soft btn-sm" data-action="open-customer-edit" data-id="${escapeHtml(kh.id)}">S\u1eeda</button>`,
      `<button type="button" class="btn btn-ghost btn-sm" data-action="view-kh-timeline" data-id="${escapeHtml(kh.id)}">Xem timeline</button>`,
      '</div></article>',
    ].join('');
  }).join('') : '<p class="table-empty-note">Ch\u01b0a c\u00f3 kh\u00e1ch h\u00e0ng n\u00e0o.</p>';

  return [
    '<section class="tab-panel is-hidden" data-tab-panel="khachhang">',
    `<div class="filter-bar filter-row-tight button-row-bottom">${statusPills}</div>`,
    kenhPills ? `<div class="filter-bar filter-row-tight button-row-bottom"><span class="filter-label-inline">K\u00eanh:</span>${kenhPills}</div>` : '',
    `<div id="nv-kh-list">${cards}</div>`,
    `<div class="button-row button-row-top"><button type="button" class="btn btn-primary" data-action="open-customer-create-for-nv" data-nv-id="${escapeHtml(employee.id)}">+ Thêm KH dự ký</button><button type="button" class="btn btn-soft" data-action="open-customer-create">+ Thêm KH đầy đủ</button></div>`,
    '</section>',
  ].join('');
}

// === Main render ===
export default function renderNhanVienDetailPage(data) {
  const params = new URLSearchParams(window.location.search);
  const nvId = params.get('id') || data.nhanVien.nhan_vien?.[0]?.id;
  const employee = data.nhanVien.nhan_vien.find((n) => n.id === nvId) || data.nhanVien.nhan_vien[0];
  if (!employee) {
    return renderShell('nhanvien-detail', renderEmptyState('Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u nh\u00e2n vi\u00ean', 'H\u00e3y th\u00eam nh\u00e2n vi\u00ean tr\u01b0\u1edbc.', 'Quay v\u1ec1 danh s\u00e1ch', 'open-employee-create'), data);
  }
  const range = getCurrentRange();
  const months = range?.months || [];
  const month = getActiveMonth(data);
  const canEdit = isSingleMonthRange();
  const rangeLabel = getRangeLabel(range);
  const channelMap = Object.fromEntries(getLeadChannels(data).map((channel) => [channel.id, channel]));
  const channels = (employee.nhiem_vu_ids || []).map((taskId) => channelMap[taskId]).filter(Boolean);
  const stats = getNvStats(data, employee.id, months.length ? months : [month]);
  const allKh = data.khachHang?.khach_hang || [];
  const allXe = data.xe?.xe || [];

  const pctLabel = stats.pct_muc_tieu !== null ? `${stats.pct_muc_tieu}%` : '\u2014';
  const pctClass = stats.pct_muc_tieu === null ? '' : stats.pct_muc_tieu >= 80 ? 'is-success' : stats.pct_muc_tieu >= 50 ? 'is-warning' : 'is-danger';
  const loaiMeta = LOAI_NHAN_SU_META[employee.loai_nhan_su || 'chinh_thuc'] || LOAI_NHAN_SU_META.chinh_thuc;
  const nhomLabel = getEmployeeGroupLabel(data, employee.nhom_id || employee.phong_ban_id);

  const header = [
    '<section class="hero-card">',
    '<div class="detail-hero">',
    avatarHtml(employee.ho_ten, true),
    '<div class="detail-hero-copy">',
    `<h2 class="hero-heading">${escapeHtml(employee.ho_ten)}</h2>`,
    `<p class="detail-meta">${escapeHtml(employee.chuc_vu || 'Nh\u00e2n vi\u00ean kinh doanh')} \u00b7 ${escapeHtml(employee.sdt || '\u2014')}</p>`,
    '<div class="highlight-band">',
    employee.nhom_id ? `<span class="highlight-chip">Nhóm: ${escapeHtml(nhomLabel)}</span>` : '',
    `<span class="highlight-chip">${escapeHtml(loaiMeta[0])}</span>`,
    `<span class="highlight-chip">${escapeHtml(rangeLabel)}</span>`,
    `<span class="highlight-chip">Xe k\u00fd: ${stats.xe_ky}</span>`,
    `<span class="highlight-chip">\u0110\u00e3 giao: ${stats.xe_giao}</span>`,
      `<span class="highlight-chip" data-nv-lead-chip>Lead: ${stats.lead}</span>`,
      `<span class="highlight-chip badge ${pctClass}" data-nv-progress-chip>M\u1ee5c ti\u00eau: ${pctLabel}</span>`,
    '</div></div>',
    '<div class="button-row detail-hero-actions">',
    renderRangePicker(range),
    `<button type="button" class="btn btn-primary" data-action="save-week-draft" data-id="${escapeHtml(employee.id)}"${canEdit ? '' : ' disabled'}>Lưu local</button>`,
    '<a class="btn btn-ghost" href="nhan-vien.html">Quay l\u1ea1i</a>',
    `<button type="button" class="btn btn-soft" data-action="open-employee-edit" data-id="${escapeHtml(employee.id)}">S\u1eeda h\u1ed3 s\u01a1</button>`,
    '</div></div></section>',
  ].join('');

  const readOnlyBanner = !canEdit ? [
    '<div class="setup-warning-card" style="background:var(--warning-light)">',
    '<span>\ud83d\udd12</span>',
    '<div>',
    `<strong>\u0110ang xem ${escapeHtml(rangeLabel)}</strong>`,
    '<p class="muted" style="margin:4px 0 0">Khi ch\u1ecdn qu\u00fd/n\u0103m, c\u00e1c \u00f4 nh\u1eadp b\u1ecb kho\u00e1. Ch\u1ecdn 1 th\u00e1ng c\u1ee5 th\u1ec3 trong picker \u0111\u1ec3 nh\u1eadp lead/KPI tu\u1ea7n.</p>',
    '</div>',
    '</div>',
  ].join('') : '';

  const content = [
    header,
    readOnlyBanner,
    '<div class="tab-group" role="tablist" aria-label="Chi ti\u1ebft nh\u00e2n vi\u00ean">',
    '<button type="button" class="tab-button is-active" data-tab-target="nhap-tuan">Nhập tuần</button>',
    '<button type="button" class="tab-button" data-tab-target="khachhang">KH c\u1ee7a t\u00f4i</button>',
    '</div>',
    `<section class="tab-panel" data-tab-panel="nhap-tuan">${renderWeekGrid({ nvId: employee.id, month, channels, data, canEdit })}</section>`,
    renderKhPanel(employee, allKh, allXe, channels),
  ].join('');
  return renderShell('nhanvien-detail', content, data);
}
