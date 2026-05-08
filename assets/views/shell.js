// assets/views/shell.js
// Sidebar + topbar + bottom-nav + common card builders.
// Mọi view đều gọi renderShell() để bọc nội dung trang.

import { escapeHtml, getCurrentMonth, calcPercent, getPercentClass, renderProgressBar, avatarHtml } from '../ui.js';
import { NAV_ITEMS, PAGE_META, countNotifications } from '../models.js';

export function createSidebar(activePage, config) {
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
    `<div class="brand-subtitle">Tháng ${escapeHtml(config.thang_hien_tai || getCurrentMonth())}</div>`,
    '</div>',
    '</div>',
    '<button type="button" class="btn btn-ghost sidebar-logout" data-action="logout">Đăng xuất</button>',
    '</div>',
    '</aside>',
  ].join('');
}

export function createTopBar(activePage, data) {
  const meta = PAGE_META[activePage] || PAGE_META.dashboard;
  const notificationCount = countNotifications(data);
  return [
    '<header class="topbar">',
    '<div class="page-meta">',
    `<span class="page-kicker">${escapeHtml(meta.kicker)}</span>`,
    `<h1 class="page-title">${escapeHtml(meta.title)} · ${escapeHtml(data.config.thang_hien_tai || getCurrentMonth())}</h1>`,
    '</div>',
    '<div class="topbar-actions">',
    '<button type="button" class="icon-button" data-action="open-settings" aria-label="Cấu hình GitHub">⚙️</button>',
    '<button type="button" class="icon-button" data-action="show-notifications" aria-label="Thông báo">',
    '<span aria-hidden="true">🔔</span>',
    notificationCount ? `<span class="icon-badge">${notificationCount}</span>` : '',
    '</button>',
    '<button type="button" class="btn btn-ghost" data-action="logout">Đăng xuất</button>',
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