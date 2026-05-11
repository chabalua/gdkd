// assets/views/kpi.js
// KPI page — hoàn toàn derive từ khach-hang.json + nhan-vien.json.
// Không còn form gõ tay "thực tế".

import { renderShell } from './shell.js';
import {
  escapeHtml, getPercentClass, calcPercent,
  renderRangePicker, getCurrentRange, getRangeLabel,
} from '../ui.js';
import { KPI_CORE_FIELDS as KPI_FIELDS, renderTierLegend, renderKpiCard } from '../components/kpi-core.js';
import {
  isSetupComplete, getKpiSegments, getKhTon, getNvLabel,
  getRanking, getXeSucBan, getGroupSummaries,
  getPerformanceTier, PERFORMANCE_TIER_META, getMonthPace, getActiveMonth,
} from '../models.js';

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
  const month = getActiveMonth(data);

  const setupWarning = !setup.all ? [
    '<div class="setup-warning-card">',
    '<span>⚠️</span>',
    '<div><strong>Cần hoàn thiện setup trước khi nhập KH</strong>',
    '<ul class="muted-link-list">',
    !setup.co_xe ? '<li>Chưa có xe trong catalog — <a href="xe.html">Thêm xe</a></li>' : '',
    !setup.co_nv ? '<li>Chưa có nhân viên đang làm — <a href="nhan-vien.html">Thêm NV</a></li>' : '',
    '</ul></div></div>',
  ].join('') : '';

  const weeklyHint = !setup.co_muc_tieu ? [
    '<div class="setup-warning-card" style="background:var(--warning-light)">',
    '<span>🗓️</span>',
    '<div><strong>Chưa có mục tiêu nhiệm vụ theo tuần</strong>',
    '<p class="muted" style="margin:4px 0 0">Theo v3, mục tiêu được nhập ở chi tiết nhân viên theo tuần và theo nhiệm vụ. Khi chưa có dữ liệu tuần, KPI vẫn hiển thị số thực tế nhưng không tính được % mục tiêu.</p></div></div>',
  ].join('') : '';

  const headerSection = [
    '<section class="section-header page-card-spacer">',
    '<div>',
    '<h3 class="section-title">KPI Tháng</h3>',
    `<p class="section-subtitle">${escapeHtml(rangeLabel)}</p>`,
    '</div>',
    '<div class="section-actions">',
    renderRangePicker(range),
    `<span class="badge">Tháng nhập liệu: ${parseInt(month.split('-')[1], 10)}/${month.split('-')[0]}</span>`,
    '</div>',
    '</section>',
  ].join('');

  const tierLegend = renderTierLegend();

  const kpiCards = [
    '<div class="kpi-section page-card-spacer">',
    `<div class="kpi-section-head"><h3 class="section-title">📊 KPI cốt lõi</h3>${tierLegend}</div>`,
    '<div class="kpi-grid kpi-core-list">',
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

  const content = [setupWarning, weeklyHint, headerSection, renderKpiExecutiveSummary(data, months), kpiCards, rankingSection, sucBanSection].join('');
  return renderShell('kpi', content, data);
}