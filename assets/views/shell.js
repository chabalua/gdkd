// assets/views/shell.js
// Sidebar + topbar + bottom-nav + common card builders.
// Mọi view đều gọi renderShell() để bọc nội dung trang.

import { escapeHtml, getCurrentMonth, calcPercent, getPercentClass, renderProgressBar, avatarHtml, getCurrentRange, getRangeLabel } from '../ui.js';
import { NAV_ITEMS, PAGE_META, countNotifications } from '../models.js';
import { getPendingWriteCount, getRepoConfig, getToken, getLastSyncAt } from '../api.js';

// "13:24" nếu trong hôm nay, "14/05 13:24" nếu khác ngày, "—" nếu chưa từng sync.
function formatRelativeSync(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `${hh}:${mm}`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo} ${hh}:${mm}`;
}

export function createSidebar(activePage, config) {
  const rangeLabel = getRangeLabel(getCurrentRange());
  return [
    '<aside class="sidebar" aria-label="Điều hướng chính">',
    '<div class="brand">',
    '<span class="brand-mark">GĐ</span>',
    '<div>',
    '<div class="brand-title">GĐKD App</div>',
    `<div class="brand-subtitle">${escapeHtml(config.cong_ty || 'Chưa cấu hình showroom')}</div>`,
    '</div>',
    '</div>',
    '<nav class="sidebar-nav">',
    NAV_ITEMS.map((item) => [
      `<a class="nav-link${item.id === activePage ? ' is-active' : ''}" href="${item.href}">`,
      `<span class="nav-icon" aria-hidden="true">${item.icon}</span>`,
      `<span>${item.label}</span>`,
      '</a>',
    ].join('')).join(''),
    '</nav>',
    '<div class="sidebar-footer">',
    '<div class="profile-card">',
    avatarHtml(config.gdkd || 'GĐ', true),
    '<div>',
    `<div class="brand-title">${escapeHtml(config.gdkd || 'Giám Đốc Kinh Doanh')}</div>`,
    `<div class="brand-subtitle">${escapeHtml(rangeLabel)}</div>`,
    '</div>',
    '</div>',
    '<button type="button" class="btn btn-ghost sidebar-logout" data-action="logout">Xoá token</button>',
    '</div>',
    '</aside>',
  ].join('');
}

export function createTopBar(activePage, data) {
  const meta = PAGE_META[activePage] || PAGE_META.dashboard;
  const notificationCount = countNotifications(data);
  const rangeLabel = getRangeLabel(getCurrentRange());
  const pendingCount = getPendingWriteCount();
  const repoConfig = getRepoConfig();
  const hasGithubConfig = Boolean(repoConfig.owner && repoConfig.repo && getToken());
  const lastSyncLabel = formatRelativeSync(getLastSyncAt());
  const initialChip = !hasGithubConfig
    ? { dot: '○', label: 'Cấu hình GitHub', title: 'Bấm để cấu hình owner/repo/token GitHub.', action: 'open-settings' }
    : pendingCount
      ? {
        dot: '●',
        label: `Có ${pendingCount} thay đổi chưa đẩy · Đồng bộ ngay`,
        title: `Còn ${pendingCount} file thay đổi chưa lên GitHub. Bấm để đẩy tất cả.`,
        action: 'flush-sync-now',
      }
      : {
        dot: '●',
        label: lastSyncLabel ? `Đã đồng bộ ${lastSyncLabel} · Tải mới` : 'Đã đồng bộ · Tải mới',
        title: lastSyncLabel
          ? `Lần đồng bộ gần nhất: ${lastSyncLabel}. Bấm để kéo dữ liệu mới từ GitHub.`
          : 'Chưa có lần đồng bộ nào trên thiết bị này. Bấm để kéo dữ liệu mới từ GitHub.',
        action: 'flush-sync-now',
      };
  return [
    '<header class="topbar">',
    '<div class="page-meta">',
    `<span class="page-kicker">${escapeHtml(meta.kicker)}</span>`,
    `<h1 class="page-title">${escapeHtml(meta.title)} · ${escapeHtml(rangeLabel)}</h1>`,
    '</div>',
    '<div class="topbar-actions">',
    `<button type="button" class="btn btn-soft sync-chip${pendingCount ? ' is-pending' : ''}" data-sync-chip data-action="${initialChip.action}" title="${escapeHtml(initialChip.title)}"><span class="sync-dot" data-sync-dot>${initialChip.dot}</span> <span data-sync-label>${escapeHtml(initialChip.label)}</span></button>`,
    `<a class="icon-button${activePage === 'settings' ? ' is-active' : ''}" href="settings.html" aria-label="Mở trang thiết lập">⚙️</a>`,
    '<button type="button" class="icon-button" data-action="show-notifications" aria-label="Thông báo">',
    '<span aria-hidden="true">🔔</span>',
    notificationCount ? `<span class="icon-badge">${notificationCount}</span>` : '',
    '</button>',
    '<button type="button" class="btn btn-ghost" data-action="logout">Xoá token</button>',
    '</div>',
    '</header>',
  ].join('');
}

export function createBottomNav(activePage) {
  return [
    '<nav class="bottom-nav" aria-label="Điều hướng nhanh">',
    NAV_ITEMS.map((item) => [
      `<a class="nav-link${item.id === activePage ? ' is-active' : ''}" href="${item.href}">`,
      `<span class="nav-icon" aria-hidden="true">${item.icon}</span>`,
      `<span>${item.label}</span>`,
      '</a>',
    ].join('')).join(''),
    '</nav>',
  ].join('');
}

export function renderShell(activePage, content, data) {
  return [
    '<div class="shell-layout">',
    createSidebar(activePage, data.config),
    '<div class="content-shell">',
    createTopBar(activePage, data),
    `<main class="page-wrap">${content}</main>`,
    '</div>',
    createBottomNav(activePage),
    '</div>',
  ].join('');
}

export function renderEmptyState(title, description, actionLabel, action) {
  return [
    '<section class="empty-card">',
    `<h3 class="section-title">${escapeHtml(title)}</h3>`,
    `<p class="section-subtitle">${escapeHtml(description)}</p>`,
    actionLabel && action ? `<div class="button-row button-row-top"><button type="button" class="btn btn-primary" data-action="${escapeHtml(action)}">${escapeHtml(actionLabel)}</button></div>` : '',
    '</section>',
  ].join('');
}

export function renderTableEmptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}"><div class="table-empty-note">${escapeHtml(message)}</div></td></tr>`;
}

export function createMetricCard(icon, label, actual, target, meta) {
  const percent = calcPercent(actual, target);
  return [
    '<article class="card">',
    '<div class="card-header">',
    `<span class="metric-icon" aria-hidden="true">${icon}</span>`,
    `<span class="badge ${getPercentClass(percent)}">${percent}%</span>`,
    '</div>',
    `<p class="card-subtitle">${escapeHtml(label)}</p>`,
    `<div class="metric-value">${escapeHtml(actual)}</div>`,
    '<div class="metric-meta">',
    `<span class="muted">${escapeHtml(meta)}</span>`,
    `<span class="muted">Mục tiêu ${escapeHtml(target)}</span>`,
    '</div>',
    renderProgressBar(percent),
    '</article>',
  ].join('');
}