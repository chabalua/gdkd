import { escapeHtml, getPercentClass, calcPercent } from '../ui.js';
import {
  getKpiSegments, getKhTon, getNvLabel, getMucTieuTong,
  getPerformanceTier, PERFORMANCE_TIER_META, getMonthPace,
} from '../models.js';

export const KPI_CORE_FIELDS = [
  { field: 'xe_ky_moi', icon: '🚗', label: 'Xe Ký Mới', unit: 'xe', short: 'xe' },
  { field: 'hd_xuat_thang', icon: '📄', label: 'HĐ Xuất Tháng', unit: 'hợp đồng', short: 'HĐ' },
  { field: 'hd_ton', icon: '📦', label: 'HĐ Tồn', unit: 'hồ sơ', short: 'HS' },
  { field: 'lead_phat_sinh', icon: '👥', label: 'Lead Phát Sinh', unit: 'lead', short: 'lead' },
];

function renderNvChipStack(segments, total) {
  if (!segments.length || total === 0) {
    return '<div class="nv-chip-stack is-empty">Chưa có dữ liệu nhân viên trong kỳ này.</div>';
  }
  const top = segments.slice(0, 6);
  const rest = segments.slice(6);
  const restValue = rest.reduce((sum, segment) => sum + segment.value, 0);
  const chips = top.filter((segment) => segment.value > 0).map((segment) => {
    const tier = getPerformanceTier(segment.pct_personal);
    const meta = PERFORMANCE_TIER_META[tier];
    const widthPct = Math.max(2, Math.round((segment.value / total) * 100));
    const initials = segment.nv_ten.trim().split(/\s+/).slice(-1)[0].slice(0, 1).toUpperCase();
    return [
      `<span class="nv-chip is-tier-${tier}" style="flex:${widthPct}" title="${escapeHtml(segment.nv_ten)}: ${segment.value} · ${segment.pct_personal !== null ? segment.pct_personal + '%' : 'chưa có MT'}">`,
      `<span class="nv-chip-initial">${escapeHtml(initials)}</span>`,
      `<span class="nv-chip-value">${segment.value}</span>`,
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
  return segments.map((segment) => {
    const width = maxVal > 0 ? Math.round((segment.value / maxVal) * 100) : 0;
    const tier = getPerformanceTier(segment.pct_personal);
    const meta = PERFORMANCE_TIER_META[tier];
    const pctText = segment.pct_personal !== null ? `${segment.pct_personal}%` : '—';
    return [
      `<div class="rank-row is-tier-${tier}">`,
      `<span class="rank-medal" aria-hidden="true">${meta.emoji}</span>`,
      `<a href="nhan-vien-detail.html?id=${escapeHtml(segment.nv_id)}" class="nv-link rank-link">${escapeHtml(segment.nv_ten)}</a>`,
      '<div class="rank-bar-track">',
      `<div class="rank-bar-fill" style="width:${width}%;background:${meta.dot}"></div>`,
      '</div>',
      `<span class="rank-meta">${segment.value} · ${pctText}</span>`,
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
    ['Khách hàng', 'NV', 'Tồn (ngày)', 'Vướng mắc'].map((header) => `<th>${header}</th>`).join(''),
    '</tr></thead><tbody>',
    khTonList.slice(0, 10).map((customer) => [
      '<tr>',
      `<td>${escapeHtml(customer.ten)}</td>`,
      `<td>${escapeHtml(getNvLabel(data, customer.nhan_vien_id) || '—')}</td>`,
      `<td class="is-number${customer.days_ton > 30 ? ' text-danger' : ''}">${customer.days_ton}</td>`,
      `<td class="cell-truncate">${escapeHtml(customer.ghi_chu_ctkm || '—')}</td>`,
      '</tr>',
    ].join('')).join(''),
    '</tbody></table>',
    '</div>',
  ].join('');
}

export function renderTierLegend() {
  return [
    '<div class="tier-legend">',
    Object.entries(PERFORMANCE_TIER_META).map(([key, meta]) => [
      `<span class="tier-legend-item is-tier-${key}">`,
      `<span class="tier-dot" style="background:${meta.dot}"></span>`,
      `<span>${meta.emoji} ${escapeHtml(meta.label)}</span>`,
      '</span>',
    ].join('')).join(''),
    '</div>',
  ].join('');
}

export function renderKpiCard(fieldMeta, data, months) {
  const { field, icon, label, unit } = fieldMeta;
  const segments = getKpiSegments(data, field, months);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const mucTieu = getMucTieuTong(data, field, months);
  const pct = mucTieu > 0 ? calcPercent(total, mucTieu) : null;
  const pctClass = pct !== null ? getPercentClass(pct) : '';
  const topNv = segments.find((segment) => segment.value > 0);
  const worstNv = segments
    .filter((segment) => segment.pct_personal !== null && segment.pct_personal < 50)
    .sort((left, right) => left.pct_personal - right.pct_personal || left.nv_ten.localeCompare(right.nv_ten, 'vi'))[0];

  const pace = getMonthPace(months, total, mucTieu);
  let paceText = '';
  if (pace && pace.containsCurrent && mucTieu > 0 && field !== 'hd_ton') {
    if (total >= mucTieu) paceText = '🎉 đã vượt';
    else if (pace.dailyNeeded > 0) paceText = `cần ${pace.dailyNeeded.toFixed(2)}/ngày · còn ${pace.daysLeft}d`;
  } else if (pace && field !== 'hd_ton') {
    paceText = `tb ${pace.dailyDone.toFixed(2)}/ngày`;
  }

  const isHdTon = field === 'hd_ton';
  const topLabel = isHdTon ? 'Tồn nhiều nhất' : 'Top';
  const compactNote = [
    paceText,
    topNv ? `${topLabel} ${topNv.nv_ten}: ${topNv.value}` : '',
    !isHdTon && worstNv && worstNv !== topNv ? `Cần đẩy ${worstNv.nv_ten}: ${worstNv.pct_personal}%` : '',
  ].filter(Boolean).join(' · ') || 'Nhấn để xem chi tiết theo nhân viên';

  const expandContent = field === 'hd_ton'
    ? renderKhTonRows(getKhTon(data, months), data)
    : renderNvExpandRows(segments);

  return [
    `<article class="kpi-card kpi-card-v3 kpi-core-item" data-kpi-card="${escapeHtml(field)}">`,
    `<div class="kpi-card-header kpi-core-header" data-kpi-toggle="${escapeHtml(field)}" role="button" tabindex="0" aria-expanded="false">`,
    '<div class="kpi-core-main">',
    '<div class="kpi-row-head">',
    `<span class="kpi-icon" aria-hidden="true">${icon}</span>`,
    `<span class="kpi-label">${escapeHtml(label)}</span>`,
    '</div>',
    `<div class="kpi-core-note">${escapeHtml(compactNote)}</div>`,
    '</div>',
    '<div class="kpi-core-metrics">',
    pct !== null ? `<span class="badge ${pctClass} kpi-pct-badge">${pct}%</span>` : '<span class="kpi-pct-badge-spacer"></span>',
    '<div class="kpi-row-number">',
    `<span class="kpi-number-v3">${total}</span>`,
    '<span class="kpi-divider">/</span>',
    `<span class="kpi-target-v3">${mucTieu || '—'}</span>`,
    `<span class="kpi-unit-v3">${escapeHtml(unit)}</span>`,
    '</div>',
    '<span class="kpi-chevron" aria-hidden="true">▾</span>',
    '</div>',
    '</div>',
    `<div class="kpi-expanded is-hidden" data-kpi-expand="${escapeHtml(field)}">`,
    '<div class="kpi-core-expanded-head">',
    '<div class="kpi-core-meta-row">',
    pct !== null ? `<span class="badge ${pctClass}">Đạt ${pct}% mục tiêu</span>` : '<span class="badge">Chưa có mục tiêu</span>',
    paceText ? `<span class="kpi-core-meta-note">${paceText}</span>` : '',
    '</div>',
    total > 0 ? `<div class="kpi-row-stack">${renderNvChipStack(segments, total)}</div>` : '',
    topNv || (!isHdTon && worstNv && worstNv !== topNv) ? [
      '<div class="kpi-row-hints">',
      topNv ? `<span class="kpi-hint kpi-hint-top">${isHdTon ? '⚠️' : '🥇'} ${escapeHtml(topNv.nv_ten)} · ${topNv.value}</span>` : '',
      !isHdTon && worstNv && worstNv !== topNv ? `<span class="kpi-hint kpi-hint-warn">🆘 ${escapeHtml(worstNv.nv_ten)} · ${worstNv.pct_personal}%</span>` : '',
      '</div>',
    ].join('') : '',
    '</div>',
    expandContent,
    '</div>',
    '</article>',
  ].join('');
}