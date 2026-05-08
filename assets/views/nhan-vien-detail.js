// assets/views/nhan-vien-detail.js
import { renderShell, renderEmptyState } from './_shell.js';
import { escapeHtml, calcPercent, renderProgressBar, getPercentClass, avatarHtml, formatCurrency } from '../ui.js';
import { getLeadChannels, getLeadTuanTotal, getNvStats, getWeekOfMonth, KH_STATUS_META, ACTIVITY_UNIT_META, LOAI_NHAN_SU_META, getEmployeeGroupLabel } from '../models.js';

// === Tab 1: Lead k\u00eanh (weekly table) ===
function renderLeadPanel(employee, month, allKh, channels) {
  const nvId = employee.id;
  const lead = employee.lead_theo_thang?.[month] || {};
  const [yr, mn] = month.split('-');
  const TUANS = [1, 2, 3, 4];

  function getVal(fieldObj, tuan) {
    return Number(fieldObj?.tuan?.[tuan] ?? 0);
  }
  function rowTotal(fieldObj) {
    if (!fieldObj?.tuan) return typeof fieldObj === 'number' ? fieldObj : 0;
    return Object.values(fieldObj.tuan).reduce((s, v) => s + (Number(v) || 0), 0);
  }
  function getStep(unit) {
    if (unit === 'gio') return '0.5';
    if (unit === 'tien') return '1000';
    return '1';
  }
  function formatValue(value, unit) {
    return unit === 'tien' ? formatCurrency(value) : value;
  }
  function channelLabel(ch) {
    if (ch.loai !== 'hoat_dong') return ch.label;
    return `${ch.label} (${ACTIVITY_UNIT_META[ch.don_vi] || 'Số'})`;
  }

  // Split channels by loai
  const leadChannels = channels.filter((ch) => ch.loai !== 'hoat_dong');
  const activityChannels = channels.filter((ch) => ch.loai === 'hoat_dong');

  // KH d\u1ef1 k\u00fd per week (derived)
  const khDuKy = {};
  TUANS.forEach((t) => {
    khDuKy[t] = allKh.filter((kh) =>
      kh.nhan_vien_id === nvId &&
      kh.ngay_du_kien_ky?.startsWith(month) &&
      getWeekOfMonth(kh.ngay_du_kien_ky) === t
    ).length;
  });
  const khDuKyTotal = TUANS.reduce((s, t) => s + (khDuKy[t] || 0), 0);

  // Channel row builder (shared for lead + activity)
  function buildChannelRow(ch) {
    const chData = lead[ch.id] || {};
    const mt = chData.muc_tieu || 0;
    const total = rowTotal(chData);
    const pct = mt ? calcPercent(total, mt) + '%' : '\u2014';
    const pctClass = mt ? getPercentClass(calcPercent(total, mt)) : '';
    const isLeadChannel = ch.loai !== 'hoat_dong';
    const unit = ch.don_vi || 'so';
    const inputs = TUANS.map((t) => {
      const v = getVal(chData, t);
      return `<td class="is-number"><input class="input is-compact" type="number" min="0" step="${getStep(unit)}" data-lead-tt-input data-field="${escapeHtml(ch.id)}" data-tuan="${t}" data-nv-id="${escapeHtml(nvId)}" data-target="${mt}" data-unit="${escapeHtml(unit)}" data-lead-channel="${isLeadChannel ? 'true' : 'false'}" value="${v}" aria-label="${escapeHtml(ch.label)} tu\u1ea7n ${t}"></td>`;
    }).join('');
    return `<tr><td class="channel-label">${escapeHtml(channelLabel(ch))}</td>${inputs}<td class="is-number" data-lead-total-field="${escapeHtml(ch.id)}" data-unit="${escapeHtml(unit)}">${formatValue(total, unit)}</td><td class="is-number">${mt ? formatValue(mt, unit) : '\u2014'}</td><td class="is-number ${pctClass}" data-pct-cell="${escapeHtml(ch.id)}">${pct}</td></tr>`;
  }
  function buildMobileChannelCard(ch) {
    const chData = lead[ch.id] || {};
    const mt = chData.muc_tieu || 0;
    const total = rowTotal(chData);
    const pctValue = mt ? calcPercent(total, mt) : null;
    const pctText = pctValue !== null ? `${pctValue}%` : '\u2014';
    const pctClass = pctValue !== null ? getPercentClass(pctValue) : '';
    const isLeadChannel = ch.loai !== 'hoat_dong';
    const unit = ch.don_vi || 'so';
    const weekItems = TUANS.map((t) => {
      const value = getVal(chData, t);
      return [
        '<div class="mobile-week-item">',
        `<span class="mobile-week-label">Tuần ${t}</span>`,
        `<input class="input is-compact mobile-week-input" type="number" min="0" step="${getStep(unit)}" data-lead-tt-input data-field="${escapeHtml(ch.id)}" data-tuan="${t}" data-nv-id="${escapeHtml(nvId)}" data-target="${mt}" data-unit="${escapeHtml(unit)}" data-lead-channel="${isLeadChannel ? 'true' : 'false'}" data-view="mobile" value="${value}" aria-label="${escapeHtml(ch.label)} tuần ${t}">`,
        '</div>',
      ].join('');
    }).join('');
    return [
      '<details class="mobile-lead-card">',
      '<summary class="mobile-lead-summary">',
      '<div class="mobile-lead-head">',
      `<h4 class="mobile-lead-title">${escapeHtml(channelLabel(ch))}</h4>`,
      '<div class="mobile-lead-meta">',
      `<span class="badge">Tổng: <span data-lead-total-field="${escapeHtml(ch.id)}" data-unit="${escapeHtml(unit)}">${formatValue(total, unit)}</span></span>`,
      `<span class="badge">MT: ${mt ? formatValue(mt, unit) : '\u2014'}</span>`,
      `<span class="badge ${pctClass}">Đạt: <span data-pct-cell="${escapeHtml(ch.id)}">${pctText}</span></span>`,
      '</div>',
      '</div><span class="mobile-lead-chevron" aria-hidden="true">▾</span>',
      '</summary>',
      `<div class="mobile-week-grid">${weekItems}</div>`,
      '</details>',
    ].join('');
  }
  const channelRows = leadChannels.map(buildChannelRow).join('');
  const activityRows = activityChannels.map(buildChannelRow).join('');
  const mobileLeadCards = leadChannels.map(buildMobileChannelCard).join('');
  const mobileActivityCards = activityChannels.map(buildMobileChannelCard).join('');

  // T\u1ed4NG LEAD per week (lead channels only)
  const weekTotalCells = TUANS.map((t) => {
    const wt = leadChannels.reduce((s, ch) => s + getVal(lead[ch.id], t), 0);
    return `<td class="is-number" data-week-lead-total="${t}">${wt}</td>`;
  }).join('');
  const grandLeadTotal = leadChannels.reduce((s, ch) => s + rowTotal(lead[ch.id] || {}), 0);
  const totalLeadRow = `<tr class="lead-total-row"><td>T\u1ed4NG LEAD</td>${weekTotalCells}<td class="is-number" data-all-lead-total>${grandLeadTotal}</td><td></td><td></td></tr>`;
  const sep = '<tr class="table-separator-row"><td colspan="8"></td></tr>';
  const actSep = activityRows ? '<tr class="table-section-row"><td colspan="8"><small class="table-section-label">Ho\u1ea1t \u0111\u1ed9ng</small></td></tr>' : '';

  // KH d\u1ef1 k\u00fd derived
  const khCells = TUANS.map((t) => `<td class="is-number">${khDuKy[t] || 0}</td>`).join('');
  const khRow = `<tr class="derived-row"><td><em>KH d\u1ef1 k\u00fd <small>(t\u1eeb h\u1ed3 s\u01a1)</small></em></td>${khCells}<td class="is-number">${khDuKyTotal}</td><td>\u2014</td><td>\u2014</td></tr>`;

  // T\u1ef7 l\u1ec7 CV derived
  const cvCells = TUANS.map((t) => {
    const wLead = leadChannels.reduce((s, ch) => s + getVal(lead[ch.id], t), 0);
    const cv = wLead ? Math.round((khDuKy[t] || 0) / wLead * 100) : 0;
    return `<td class="is-number">${cv ? cv + '%' : '\u2014'}</td>`;
  }).join('');
  const cvAll = grandLeadTotal ? Math.round(khDuKyTotal / grandLeadTotal * 100) : 0;
  const cvRow = `<tr class="derived-row"><td><em>T\u1ef7 l\u1ec7 CV (KH/Lead)</em></td>${cvCells}<td class="is-number">${cvAll ? cvAll + '%' : '\u2014'}</td><td>\u2014</td><td>\u2014</td></tr>`;
  const mobileDerivedCards = [
    '<article class="mobile-summary-card">',
    '<h4 class="mobile-summary-title">Tổng lead</h4>',
    `<div class="mobile-week-grid">${TUANS.map((t) => `<div class="mobile-week-item"><span class="mobile-week-label">Tuần ${t}</span><span class="mobile-week-value">${leadChannels.reduce((s, ch) => s + getVal(lead[ch.id], t), 0)}</span></div>`).join('')}</div>`,
    `<div class="mobile-lead-meta button-row-top"><span class="badge">Cả tháng: ${grandLeadTotal}</span></div>`,
    '</article>',
    '<article class="mobile-summary-card">',
    '<h4 class="mobile-summary-title">KH dự ký từ hồ sơ</h4>',
    `<div class="mobile-week-grid">${TUANS.map((t) => `<div class="mobile-week-item"><span class="mobile-week-label">Tuần ${t}</span><span class="mobile-week-value">${khDuKy[t] || 0}</span></div>`).join('')}</div>`,
    `<div class="mobile-lead-meta button-row-top"><span class="badge">Cả tháng: ${khDuKyTotal}</span></div>`,
    '</article>',
    '<article class="mobile-summary-card is-activity">',
    '<h4 class="mobile-summary-title">Tỷ lệ chuyển đổi CV</h4>',
    `<div class="mobile-week-grid">${TUANS.map((t) => { const wLead = leadChannels.reduce((s, ch) => s + getVal(lead[ch.id], t), 0); const cv = wLead ? Math.round((khDuKy[t] || 0) / wLead * 100) : 0; return `<div class="mobile-week-item"><span class="mobile-week-label">Tuần ${t}</span><span class="mobile-week-value">${cv ? `${cv}%` : '\u2014'}</span></div>`; }).join('')}</div>`,
    `<div class="mobile-lead-meta button-row-top"><span class="badge ${cvAll ? getPercentClass(cvAll) : ''}">Cả tháng: ${cvAll ? `${cvAll}%` : '\u2014'}</span></div>`,
    '</article>',
  ].join('');

  return [
    '<section class="tab-panel" data-tab-panel="lead">',
    '<article class="table-card">',
    `<div class="table-header"><div><h3 class="table-title">Lead theo k\u00eanh \u2014 th\u00e1ng ${parseInt(mn, 10)}/${yr}</h3><p class="table-subtitle">Nh\u1eadp th\u1ef1c t\u1ebf theo tu\u1ea7n \u2022 L\u01b0u t\u1ef1 \u0111\u1ed9ng 600ms</p></div>`,
    `<div class="button-row">`,
    `<button type="button" class="btn btn-soft" data-action="open-manage-modal" data-id="${escapeHtml(nvId)}">\u2699 Qu\u1ea3n l\u00fd</button>`,
    `</div></div>`,
    '<div class="table-responsive lead-table-scroll desktop-lead-table"><table class="data-table data-table-lead">',
    '<thead><tr><th>K\u00eanh / n\u1ed9i dung</th><th class="is-number">T1</th><th class="is-number">T2</th><th class="is-number">T3</th><th class="is-number">T4</th><th class="is-number">T\u1ed5ng TT</th><th class="is-number">MT</th><th class="is-number">%\u0111\u1ea1t</th></tr></thead>',
    `<tbody>${channelRows}${totalLeadRow}${activityRows ? `${sep}${actSep}${activityRows}` : ''}${sep}${khRow}${cvRow}</tbody>`,
    '</table></div>',
    '<div class="mobile-lead-stack">',
    `<div class="mobile-lead-group">${mobileLeadCards}</div>`,
    mobileActivityCards ? `<div class="mobile-lead-group"><article class="mobile-summary-card is-activity"><h4 class="mobile-summary-title">Hoạt động</h4></article>${mobileActivityCards}</div>` : '',
    mobileDerivedCards,
    '</div></article></section>',
  ].join('');
}

// === Tab 2: N\u1ed9i dung (videos only) ===
function renderContentPanel(employee, month, congViecTuyen) {
  const cnt = employee.noi_dung?.[month] || {};
  const nvId = employee.id;
  const videoRows = (congViecTuyen || []).map((tuyen) => {
    const count = cnt.videos?.[tuyen.id] || 0;
    return `<tr><td>${escapeHtml(tuyen.ten)}</td><td class="is-number"><input class="input is-compact table-input-sm" type="number" min="0" data-content-input data-nv-id="${escapeHtml(nvId)}" data-type="video_${escapeHtml(tuyen.id)}" value="${count}"></td></tr>`;
  }).join('');
  if (!congViecTuyen?.length) {
    return '<section class="tab-panel is-hidden" data-tab-panel="content"><article class="card"><p class="table-empty-note">Ch\u01b0a c\u00f3 tuy\u1ebfn n\u1ed9i dung. Th\u00eam trong trang C\u00f4ng vi\u1ec7c.</p></article></section>';
  }
  return [
    '<section class="tab-panel is-hidden" data-tab-panel="content">',
    '<article class="table-card">',
    '<div class="table-header"><h3 class="table-title">Videos theo tuy\u1ebfn n\u1ed9i dung</h3></div>',
    '<div class="table-responsive"><table class="data-table"><thead><tr><th>Tuy\u1ebfn</th><th class="is-number">S\u1ed1 video</th></tr></thead>',
    `<tbody>${videoRows}</tbody></table></div>`,
    '</article></section>',
  ].join('');
}

// === Tab 3: KPI tu\u1ea7n ===
function renderWeeklyPanel(employee, month, allKh) {
  const stored = employee.kpi_tuan?.[month] || [];
  const nvId = employee.id;
  const rows = [1, 2, 3, 4].map((tuan) => {
    const entry = stored.find((e) => e.tuan === tuan) || { tuan, muc_tieu_nv: 0 };
    const du_ky = allKh.filter((kh) => kh.nhan_vien_id === nvId && kh.trang_thai === 'du_ky' && (kh.ngay_du_kien_ky || '').startsWith(month) && getWeekOfMonth(kh.ngay_du_kien_ky) === tuan).length;
    const ket_qua = allKh.filter((kh) => kh.nhan_vien_id === nvId && (kh.ngay_ky || '').startsWith(month) && getWeekOfMonth(kh.ngay_ky) === tuan).length;
    return `<tr><td>Tu\u1ea7n ${tuan}</td><td class="is-number"><input class="input is-compact table-input-sm" type="number" min="0" data-week-input data-nv-id="${escapeHtml(nvId)}" data-tuan="${tuan}" value="${entry.muc_tieu_nv || 0}"></td><td class="is-number">${du_ky}</td><td class="is-number">${ket_qua}</td></tr>`;
  }).join('');
  return [
    '<section class="tab-panel is-hidden" data-tab-panel="weekly">',
    '<article class="table-card">',
    '<div class="table-header"><div><h3 class="table-title">KPI theo tu\u1ea7n</h3><p class="table-subtitle">M\u1ee5c ti\u00eau NV t\u1ef1 nh\u1eadp (l\u01b0u t\u1ef1 \u0111\u1ed9ng). D\u1ef1 k\u00fd v\u00e0 K\u1ebft qu\u1ea3 l\u1ea5y t\u1eeb h\u1ed3 s\u01a1 KH.</p></div></div>',
    '<div class="table-responsive"><table class="data-table"><thead><tr><th>Tu\u1ea7n</th><th class="is-number">M\u1ee5c ti\u00eau NV</th><th class="is-number">D\u1ef1 k\u00fd</th><th class="is-number">K\u1ebft qu\u1ea3</th></tr></thead>',
    `<tbody>${rows}</tbody></table></div>`,
    '</article></section>',
  ].join('');
}

// === Tab 4: KH c\u1ee7a t\u00f4i ===
function renderKhPanel(employee, allKh, allXe, channels) {
  const nvId = employee.id;
  const myKh = allKh.filter((kh) => kh.nhan_vien_id === nvId);
  const xeMap = Object.fromEntries((allXe || []).map((x) => [x.id, x]));
  const leadOnlyChannels = channels.filter((channel) => channel.loai !== 'hoat_dong');
  const channelMap = Object.fromEntries(leadOnlyChannels.map((channel) => [channel.id, channel.label]));
  const needCskh = (kh) => kh.trang_thai === 'da_giao' && (!kh.cskh?.length || kh.cskh.some((c) => c.trang_thai_xu_ly !== 'da_xu_ly'));

  const statusFilters = [
    ['all', 'T\u1ea5t c\u1ea3'], ['du_ky', 'D\u1ef1 k\u00fd'], ['moi_ky', 'M\u1edbi k\u00fd'],
    ['dang_xu_ly', '\u0110ang x\u1eed l\u00fd'], ['cho_giao', 'Ch\u1edd giao'],
    ['da_giao', '\u0110\u00e3 giao'], ['can_cskh', 'C\u1ea7n CSKH'],
  ];
  const statusPills = statusFilters.map(([val, label]) =>
    `<button type="button" class="chip${val === 'all' ? ' is-active' : ''}" data-kh-filter="${escapeHtml(val)}">${escapeHtml(label)}</button>`
  ).join('');

  // Kenh pills (dynamic from channels config)
  const channelCounts = {};
  leadOnlyChannels.forEach((ch) => { channelCounts[ch.id] = myKh.filter((kh) => kh.kenh_lead === ch.id).length; });
  const kenhPills = leadOnlyChannels.filter((ch) => channelCounts[ch.id] > 0).map((ch) =>
    `<button type="button" class="chip" data-kenh-filter="${escapeHtml(ch.id)}">${escapeHtml(ch.label)} <span class="badge chip-count">${channelCounts[ch.id]}</span></button>`
  ).join('');

  const cards = myKh.length ? myKh.map((kh) => {
    const xe = xeMap[kh.xe_id];
    const xeLabel = xe ? `${xe.hang || ''} ${xe.dong || ''}`.trim() : '\u2014';
    const [statusLabel, statusClass] = KH_STATUS_META[kh.trang_thai] || ['\u2014', ''];
    const isCskh = needCskh(kh);
    const filterVal = isCskh ? 'can_cskh' : (kh.trang_thai || 'all');
    const lastStep = kh.tien_do?.length ? kh.tien_do[kh.tien_do.length - 1] : null;
    const kenhLabel = kh.kenh_lead
      ? `<span class="badge is-info chip-count">${escapeHtml(channelMap[kh.kenh_lead] || kh.kenh_lead)}</span>` : '';
    return [
      `<article class="customer-card" data-kh-card data-filter="${escapeHtml(filterVal)}" data-kenh-lead="${escapeHtml(kh.kenh_lead || '')}">`,
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
    `<div class="button-row button-row-top"><button type="button" class="btn btn-primary" data-action="open-customer-create-for-nv" data-nv-id="${escapeHtml(employee.id)}">+ Th\u00eam KH / D\u1ef1 k\u00fd</button></div>`,
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
  const month = data.config.thang_hien_tai;
  const channels = getLeadChannels(data);
  const stats = getNvStats(data, employee.id, [month]);
  const allKh = data.khachHang?.khach_hang || [];
  const congViecTuyen = data.congViec?.videos?.tuyen_noi_dung || [];
  const allXe = data.xe?.xe || [];

  const pctLabel = stats.pct_muc_tieu !== null ? `${stats.pct_muc_tieu}%` : '\u2014';
  const pctClass = stats.pct_muc_tieu === null ? '' : stats.pct_muc_tieu >= 80 ? 'is-success' : stats.pct_muc_tieu >= 50 ? 'is-warning' : 'is-danger';
  const loaiMeta = LOAI_NHAN_SU_META[employee.loai_nhan_su || 'chinh_thuc'] || LOAI_NHAN_SU_META.chinh_thuc;
  const nhomLabel = getEmployeeGroupLabel(data, employee.nhom_id);

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
    `<span class="highlight-chip">Xe k\u00fd: ${stats.xe_ky}</span>`,
    `<span class="highlight-chip">\u0110\u00e3 giao: ${stats.xe_giao}</span>`,
    `<span class="highlight-chip">Lead: ${stats.lead}</span>`,
    `<span class="highlight-chip badge ${pctClass}">M\u1ee5c ti\u00eau: ${pctLabel}</span>`,
    '</div></div>',
    '<div class="button-row detail-hero-actions">',
    '<a class="btn btn-ghost" href="nhan-vien.html">Quay l\u1ea1i</a>',
    `<button type="button" class="btn btn-soft" data-action="open-employee-edit" data-id="${escapeHtml(employee.id)}">S\u1eeda h\u1ed3 s\u01a1</button>`,
    '</div></div></section>',
  ].join('');

  const content = [
    header,
    '<div class="tab-group" role="tablist" aria-label="Chi ti\u1ebft nh\u00e2n vi\u00ean">',
    '<button type="button" class="tab-button is-active" data-tab-target="lead">Lead k\u00eanh</button>',
    '<button type="button" class="tab-button" data-tab-target="content">N\u1ed9i dung</button>',
    '<button type="button" class="tab-button" data-tab-target="weekly">KPI tu\u1ea7n</button>',
    '<button type="button" class="tab-button" data-tab-target="khachhang">KH c\u1ee7a t\u00f4i</button>',
    '</div>',
    renderLeadPanel(employee, month, allKh, channels),
    renderContentPanel(employee, month, congViecTuyen),
    renderWeeklyPanel(employee, month, allKh),
    renderKhPanel(employee, allKh, allXe, channels),
  ].join('');
  return renderShell('nhanvien-detail', content, data);
}
