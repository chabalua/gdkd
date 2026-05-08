// assets/views/kpi.js
// KPI page — hoàn toàn derive từ khach-hang.json + nhan-vien.json.
// Không còn form gõ tay "thực tế". kpi.json không dùng nữa.

import { renderShell } from './_shell.js';
import {
  escapeHtml, getPercentClass, calcPercent,
  renderRangePicker, getCurrentRange, getRangeLabel,
} from '../ui.js';
import {
  isSetupComplete, getKpiSegments, getKhTon, getNvLabel,
  getRanking, getXeSucBan, getGroupSummaries,
  getPerformanceTier, PERFORMANCE_TIER_META, getMonthPace,
} from '../models.js';

const KPI_FIELDS = [
  { field: 'xe_ky_moi',      icon: '🚗', label: 'Xe Ký Mới',      unit: 'xe' },
  { field: 'hd_xuat_thang',  icon: '📄', label: 'HĐ Xuất Tháng',  unit: 'hợp đồng' },
  { field: 'hd_ton',         icon: '📦', label: 'HĐ Tồn',          unit: 'hồ sơ' },
  { field: 'lead_phat_sinh', icon: '👥', label: 'Lead Phát Sinh',  unit: 'lead' },
];

function getMucTieuTong(data, kpiField, months) {
  return months.reduce((sum, m) => {
    const mt = data.config.muc_tieu_thang?.[m];
    if (!mt) return sum;
    return sum + Number(mt[kpiField] || 0);
  }, 0);
}

function renderNvChipStack(segments, total) {
  if (!segments.length || total === 0) {
    return '<div class="nv-chip-stack is-empty">Chưa có dữ liệu nhân viên trong kỳ này.</div>';
  }
  const top = segments.slice(0, 6);
  const rest = segments.slice(6);
  const restValue = rest.reduce((sum, s) => sum + s.value, 0);
  const chips = top.filter((s) => s.value > 0).map((s) => {
    const tier = getPerformanceTier(s.pct_personal);
    const meta = PERFORMANCE_TIER_META[tier];
    const widthPct = Math.max(2, Math.round((s.value / total) * 100));
    const initials = s.nv_ten.trim().split(/\s+/).slice(-1)[0].slice(0, 1).toUpperCase();
    return [
      `<span class="nv-chip is-tier-${tier}" style="flex:${widthPct}" title="${escapeHtml(s.nv_ten)}: ${s.value} · ${s.pct_personal !== null ? s.pct_personal + '%' : 'chưa có MT'}">`,
      `<span class="nv-chip-initial">${escapeHtml(initials)}</span>`,
      `<span class="nv-chip-value">${s.value}</span>`,
      `<span class="nv-chip-emoji" aria-hidden="true">${meta.emoji}</span>`,
      '</span>',
    ].join('');
  });
  if (restValue > 0) {
    chips.push(`<span class="nv-chip is-tier-rest" style="flex:${Math.max(2, Math.round((restValue / total) * 100))}" title="${rest.length} NV khác: ${restValue}">+${rest.length}</span>`);
  }
  return `<div class="nv-chip-stack">${chips.join('')}</div>`;
}

function renderNvExpandRows(segments) {
  if (!segments.length) return '<p class="list-empty-note">Chưa có dữ liệu nhân viên</p>';
  const maxVal = segments[0]?.value || 1;
  return segments.map((s) => {
    const w = maxVal > 0 ? Math.round((s.value / maxVal) * 100) : 0;
    const tier = getPerformanceTier(s.pct_personal);
    const meta = PERFORMANCE_TIER_META[tier];
    const pctText = s.pct_personal !== null ? `${s.pct_personal}%` : '—';
    return [
      `<div class="rank-row is-tier-${tier}">`,
      `<span class="rank-medal" aria-hidden="true">${meta.emoji}</span>`,
      `<a href="nhan-vien-detail.html?id=${escapeHtml(s.nv_id)}" class="nv-link rank-link">${escapeHtml(s.nv_ten)}</a>`,
      '<div class="rank-bar-track">',
      `<div class="rank-bar-fill" style="width:${w}%;background:${meta.dot}"></div>`,
      '</div>',
      `<span class="rank-meta">${s.value} · ${pctText}</span>`,
      '</div>',
    ].join('');
  }).join('');
}

function renderKhTonRows(khTonList, data) {
  if (!khTonList.length) return '<p class="list-empty-note">Không có HĐ tồn</p>';
  return [
    '<div class="simple-table-wrap">',
    '<table class="simple-table compact">',
    '<thead><tr>',
    ['Khách hàng', 'NV', 'Tồn (ngày)', 'Vướng mắc'].map((h) => `<th>${h}</th>`).join(''),
    '</tr></thead><tbody>',
    khTonList.slice(0, 10).map((kh) => [
      '<tr>',
      `<td>${escapeHtml(kh.ten)}</td>`,
      `<td>${escapeHtml(getNvLabel(data, kh.nhan_vien_id) || '—')}</td>`,
      `<td class="is-number${kh.days_ton > 30 ? ' text-danger' : ''}">${kh.days_ton}</td>`,
      `<td class="cell-truncate">${escapeHtml(kh.ghi_chu_ctkm || '—')}</td>`,
      '</tr>',
    ].join('')).join(''),
    '</tbody></table>',
    '</div>',
  ].join('');
}

function renderKpiCard(fieldMeta, data, months) {
  const { field, icon, label, unit } = fieldMeta;
  const segments = getKpiSegments(data, field, months);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const mucTieu = getMucTieuTong(data, field, months);
  const pct = mucTieu > 0 ? calcPercent(total, mucTieu) : null;
  const pctClass = pct !== null ? getPercentClass(pct) : '';
  const topNv = segments.find((s) => s.value > 0);
  const worstNv = segments.filter((s) => s.pct_personal !== null && s.pct_personal < 50).slice(-1)[0];

  const pace = getMonthPace(months, total, mucTieu);
  let paceText = '';
  if (pace && pace.isCurrentMonth && mucTieu > 0 && field !== 'hd_ton') {
    if (total >= mucTieu) paceText = '🎉 đã vượt';
    else if (pace.dailyNeeded > 0) paceText = `cần ${pace.dailyNeeded.toFixed(2)}/ngày · còn ${pace.daysLeft}d`;
  } else if (pace && field !== 'hd_ton') {
    paceText = `tb ${pace.dailyDone.toFixed(2)}/ngày`;
  }

  const expandContent = field === 'hd_ton'
    ? renderKhTonRows(getKhTon(data, months), data)
    : renderNvExpandRows(segments);

  return [
    `<article class="kpi-card kpi-card-v3" data-kpi-card="${escapeHtml(field)}">`,
    `<div class="kpi-card-header" data-kpi-toggle="${escapeHtml(field)}">`,
    '<div class="kpi-row-head">',
    `<span class="kpi-icon" aria-hidden="true">${icon}</span>`,
    `<span class="kpi-label">${escapeHtml(label)}</span>`,
    pct !== null ? `<span class="badge ${pctClass} kpi-pct-badge">${pct}%</span>` : '<span class="kpi-pct-badge-spacer"></span>',
    '<span class="kpi-chevron" aria-hidden="true">▾</span>',
    '</div>',
    '<div class="kpi-row-number">',
    `<span class="kpi-number-v3">${total}</span>`,
    '<span class="kpi-divider">/</span>',
    `<span class="kpi-target-v3">${mucTieu || '—'}</span>`,
    `<span class="kpi-unit-v3">${escapeHtml(unit)}</span>`,
    '</div>',
    paceText ? `<div class="kpi-row-pace">${paceText}</div>` : '',
    total > 0 ? `<div class="kpi-row-stack">${renderNvChipStack(segments, total)}</div>` : '',
    topNv || (worstNv && worstNv !== topNv) ? [
      '<div class="kpi-row-hints">',
      topNv ? `<span class="kpi-hint kpi-hint-top">🥇 ${escapeHtml(topNv.nv_ten)} · ${topNv.value}</span>` : '',
      worstNv && worstNv !== topNv ? `<span class="kpi-hint kpi-hint-warn">🆘 ${escapeHtml(worstNv.nv_ten)} · ${worstNv.pct_personal}%</span>` : '',
      '</div>',
    ].join('') : '',
    '</div>',
    `<div class="kpi-expanded is-hidden" data-kpi-expand="${escapeHtml(field)}">`,
    expandContent,
    '</div>',
    '</article>',
  ].join('');
}

function renderKpiExecutiveSummary(data, months) {
  const groups = getGroupSummaries(data, months).filter((group) => group.member_count > 0);
  const ranking = getRanking(data, months);
  const bestEmployee = ranking[0];
  const weakestEmployee = ranking.slice().filter((item) => item.pct_muc_tieu !== null).sort((a, b) => a.pct_muc_tieu - b.pct_muc_tieu)[0];
  const bestGroup = groups.slice().sort((a, b) => (b.xe_ky - a.xe_ky) || (b.lead - a.lead))[0];
  const weakestEmployeeMeta = weakestEmployee && weakestEmployee.pct_muc_tieu !== null
    ? `${weakestEmployee.pct_muc_tieu}% mục tiêu`
    : 'Chưa có mục tiêu';

  return [
    '<section class="executive-grid page-card-spacer">',
    `<article class="executive-card"><span class="executive-label">Nhóm hiệu quả nhất</span><strong class="executive-value executive-value-sm">${escapeHtml(bestGroup?.nhom_ten || '—')}</strong><span class="executive-meta">${bestGroup ? `${bestGroup.xe_ky} xe ký · ${bestGroup.lead} lead` : 'Chưa có dữ liệu'}</span></article>`,
    `<article class="executive-card"><span class="executive-label">Nhân viên dẫn đầu</span><strong class="executive-value executive-value-sm">${escapeHtml(bestEmployee?.nv_ten || '—')}</strong><span class="executive-meta">${bestEmployee ? `${bestEmployee.xe_ky} xe ký · ${bestEmployee.lead} lead` : 'Chưa có dữ liệu'}</span></article>`,
    `<article class="executive-card"><span class="executive-label">Cần theo dõi</span><strong class="executive-value executive-value-sm">${escapeHtml(weakestEmployee?.nv_ten || '—')}</strong><span class="executive-meta">${weakestEmployeeMeta}</span></article>`,
    `<article class="executive-card"><span class="executive-label">Quy mô vận hành</span><strong class="executive-value">${groups.reduce((sum, group) => sum + group.member_count, 0)}</strong><span class="executive-meta">${groups.length} nhóm kinh doanh</span></article>`,
    '</section>',
  ].join('');
}

function renderRankingTable(ranking) {
  if (!ranking.length) return '<p class="list-empty-note">Chưa có dữ liệu xếp hạng.</p>';
  const rows = ranking.map((row, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
    const tier = getPerformanceTier(row.pct_muc_tieu);
    const meta = PERFORMANCE_TIER_META[tier];
    const pctText = row.pct_muc_tieu !== null ? `${row.pct_muc_tieu}%` : '—';
    const pctClass = row.pct_muc_tieu !== null ? getPercentClass(row.pct_muc_tieu) : '';
    return [
      `<tr class="is-tier-${tier}">`,
      `<td><span class="rank-medal-inline">${medal}</span> <span class="tier-dot" style="background:${meta.dot}"></span> `,
      `<a href="nhan-vien-detail.html?id=${escapeHtml(row.nv_id)}" class="nv-link">${escapeHtml(row.nv_ten)}</a></td>`,
      `<td class="is-number">${row.xe_ky}</td>`,
      `<td class="is-number">${row.xe_giao}</td>`,
      `<td class="is-number">${row.lead}</td>`,
      `<td class="is-number"><span class="badge ${pctClass}">${meta.emoji} ${pctText}</span></td>`,
      '</tr>',
    ].join('');
  }).join('');
  return [
    '<div class="mobile-kpi-list">',
    ranking.map((row, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      const tier = getPerformanceTier(row.pct_muc_tieu);
      const meta = PERFORMANCE_TIER_META[tier];
      const pctText = row.pct_muc_tieu !== null ? `${row.pct_muc_tieu}%` : '—';
      const pctClass = row.pct_muc_tieu !== null ? getPercentClass(row.pct_muc_tieu) : '';
      return [
        `<article class="kpi-mobile-card is-tier-${tier}">`,
        '<div class="customer-mobile-head">',
        `<div class="content-flex-1"><h4 class="card-title">${medal} <span class="tier-dot" style="background:${meta.dot}"></span> <a href="nhan-vien-detail.html?id=${escapeHtml(row.nv_id)}" class="nv-link">${escapeHtml(row.nv_ten)}</a></h4></div>`,
        `<span class="badge ${pctClass}">${meta.emoji} ${pctText}</span>`,
        '</div>',
        '<div class="meta-pair-grid">',
        `<div class="meta-pair"><span class="meta-key">Xe ký</span><span class="meta-value">${row.xe_ky}</span></div>`,
        `<div class="meta-pair"><span class="meta-key">Xe giao</span><span class="meta-value">${row.xe_giao}</span></div>`,
        `<div class="meta-pair"><span class="meta-key">Lead</span><span class="meta-value">${row.lead}</span></div>`,
        '</div>',
        '</article>',
      ].join('');
    }).join(''),
    '</div>',
    '<div class="table-responsive desktop-kpi-table">',
    '<table class="data-table">',
    '<thead><tr>',
    '<th>Nhân viên</th><th class="is-number">Xe ký</th>',
    '<th class="is-number">Xe giao</th><th class="is-number">Lead</th>',
    '<th class="is-number">% Mục tiêu</th>',
    '</tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table></div>',
  ].join('');
}

function renderSucBanTable(sucBan) {
  if (!sucBan.length) return '<p class="list-empty-note">Chưa có dữ liệu trong kỳ này.</p>';
  const rows = sucBan.map((row) => [
    '<tr>',
    `<td>${escapeHtml(row.xe_ten)}</td>`,
    `<td class="is-number">${row.so_ky}</td>`,
    `<td class="is-number">${row.so_giao}</td>`,
    `<td>${escapeHtml(row.top_nv_ten)}</td>`,
    '</tr>',
  ].join('')).join('');
  return [
    '<div class="mobile-kpi-list">',
    sucBan.map((row) => [
      '<article class="kpi-mobile-card">',
      `<h4 class="card-title">${escapeHtml(row.xe_ten)}</h4>`,
      '<div class="meta-pair-grid button-row-top">',
      `<div class="meta-pair"><span class="meta-key">Số ký</span><span class="meta-value">${row.so_ky}</span></div>`,
      `<div class="meta-pair"><span class="meta-key">Số giao</span><span class="meta-value">${row.so_giao}</span></div>`,
      `<div class="meta-pair"><span class="meta-key">NV bán nhiều nhất</span><span class="meta-value">${escapeHtml(row.top_nv_ten)}</span></div>`,
      '</div>',
      '</article>',
    ].join('')).join(''),
    '</div>',
    '<div class="table-responsive desktop-kpi-table">',
    '<table class="data-table">',
    '<thead><tr>',
    '<th>Dòng xe</th><th class="is-number">Số ký</th>',
    '<th class="is-number">Số giao</th><th>NV bán nhiều nhất</th>',
    '</tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table></div>',
  ].join('');
}

export default function renderKpiPage(data) {
  const setup = isSetupComplete(data);
  const range = getCurrentRange();
  const months = range.months || [];
  const rangeLabel = getRangeLabel(range);
  const month = data.config.thang_hien_tai;
  const mt = data.config.muc_tieu_thang?.[month];

  const setupWarning = !setup.all ? [
    '<div class="setup-warning-card">',
    '<span>⚠️</span>',
    '<div><strong>Cần hoàn thiện setup trước khi nhập KH</strong>',
    '<ul class="muted-link-list">',
    !setup.co_xe ? '<li>Chưa có xe trong catalog — <a href="xe.html">Thêm xe</a></li>' : '',
    !setup.co_nv ? '<li>Chưa có nhân viên đang làm — <a href="nhan-vien.html">Thêm NV</a></li>' : '',
    !setup.co_muc_tieu ? '<li>Chưa có mục tiêu tháng — Nhấn <em>Setup mục tiêu tháng</em> bên dưới</li>' : '',
    '</ul></div></div>',
  ].join('') : '';

  const headerSection = [
    '<section class="section-header page-card-spacer">',
    '<div>',
    '<h3 class="section-title">KPI Tháng</h3>',
    `<p class="section-subtitle">${escapeHtml(rangeLabel)}</p>`,
    '</div>',
    '<div class="section-actions">',
    renderRangePicker(range),
    '<button type="button" class="btn btn-primary" data-action="open-setup-muc-tieu">',
    mt ? '✏️ Sửa mục tiêu' : '⚙️ Setup mục tiêu tháng',
    '</button>',
    '</div>',
    '</section>',
  ].join('');

  const tierLegend = [
    '<div class="tier-legend">',
    Object.entries(PERFORMANCE_TIER_META).map(([key, meta]) => [
      `<span class="tier-legend-item is-tier-${key}">`,
      `<span class="tier-dot" style="background:${meta.dot}"></span>`,
      `<span>${meta.emoji} ${escapeHtml(meta.label)}</span>`,
      '</span>',
    ].join('')).join(''),
    '</div>',
  ].join('');

  const kpiCards = [
    '<div class="kpi-section page-card-spacer">',
    `<div class="kpi-section-head"><h3 class="section-title">📊 KPI cốt lõi</h3>${tierLegend}</div>`,
    '<div class="kpi-grid">',
    KPI_FIELDS.map((f) => renderKpiCard(f, data, months)).join(''),
    '</div>',
    '</div>',
  ].join('');

  const ranking = getRanking(data, months);
  const rankingSection = [
    '<article class="table-card page-card-spacer">',
    '<div class="table-header"><div>',
    '<h3 class="table-title">Xếp hạng nhân viên</h3>',
    `<p class="table-subtitle">${escapeHtml(rangeLabel)}</p>`,
    '</div></div>',
    renderRankingTable(ranking),
    '</article>',
  ].join('');

  const sucBan = getXeSucBan(data, months);
  const sucBanSection = [
    '<article class="table-card">',
    '<div class="table-header"><div>',
    '<h3 class="table-title">Sức bán theo dòng xe</h3>',
    `<p class="table-subtitle">${escapeHtml(rangeLabel)}</p>`,
    '</div></div>',
    renderSucBanTable(sucBan),
    '</article>',
  ].join('');

  const content = [setupWarning, headerSection, renderKpiExecutiveSummary(data, months), kpiCards, rankingSection, sucBanSection].join('');
  return renderShell('kpi', content, data);
}