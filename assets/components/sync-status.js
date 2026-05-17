// assets/components/sync-status.js
// Sync chip component — dùng chung giữa shell.js (render lần đầu) và
// events.js (cập nhật realtime). Tránh trùng lặp code format/label.

import { escapeHtml } from '../ui.js';
import { getPendingWriteCount, getLastSyncAt, getRepoConfig, getToken } from '../api.js';

/**
 * Format thời gian sync gần nhất thành chuỗi ngắn.
 * "13:24" nếu trong hôm nay, "14/05 13:24" nếu khác ngày.
 */
export function formatRelativeSync(isoString) {
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

/**
 * Trả về dữ liệu hiển thị cho sync chip dựa trên trạng thái hiện tại.
 * @returns {{ dot: string, label: string, title: string, action: string, state: string }}
 */
export function getSyncChipState() {
  const pendingCount = getPendingWriteCount();
  const repoConfig = getRepoConfig();
  const hasGithubConfig = Boolean(repoConfig.owner && repoConfig.repo && getToken());
  const lastSyncLabel = formatRelativeSync(getLastSyncAt());

  if (!hasGithubConfig) {
    return {
      label: 'Cấu hình đồng bộ', state: 'no-config',
      title: 'Bấm để cấu hình GitHub và bắt đầu đồng bộ dữ liệu.',
      action: 'open-settings',
    };
  }
  if (pendingCount > 0) {
    return {
      label: `${pendingCount} thay đổi chưa đồng bộ`, state: 'pending',
      title: `Còn ${pendingCount} thay đổi chỉ lưu trên máy này. Bấm để đẩy lên GitHub.`,
      action: 'flush-sync-now',
    };
  }
  return {
    label: lastSyncLabel ? `Đã đồng bộ ${lastSyncLabel}` : 'Đã đồng bộ', state: 'clean',
    title: lastSyncLabel
      ? `Lần đồng bộ gần nhất: ${lastSyncLabel}. Bấm để kéo dữ liệu mới từ GitHub.`
      : 'Chưa có lần đồng bộ nào. Bấm để kéo dữ liệu mới từ GitHub.',
    action: 'flush-sync-now',
  };
}

/**
 * Render sync chip HTML cho topbar (lần đầu).
 * Dot là CSS-rendered (.sync-dot) — không dùng emoji.
 */
export function renderSyncChip() {
  const chip = getSyncChipState();
  return [
    `<button type="button" class="sync-chip is-${chip.state}"`,
    ` data-sync-chip data-action="${escapeHtml(chip.action)}"`,
    ` title="${escapeHtml(chip.title)}">`,
    '<span class="sync-dot" data-sync-dot aria-hidden="true"></span>',
    `<span data-sync-label>${escapeHtml(chip.label)}</span>`,
    '</button>',
  ].join('');
}

/**
 * Cập nhật sync chip live (gọi từ subscriber).
 * @param {{ state: string, pending: number }} status
 */
export function updateSyncChipDOM(status) {
  const chip = document.querySelector('[data-sync-chip]');
  if (!chip) return;
  const label = chip.querySelector('[data-sync-label]');

  chip.classList.remove('is-syncing', 'is-pending', 'is-clean', 'is-no-config');
  if (status.state === 'syncing') {
    chip.classList.add('is-syncing');
    if (label) label.textContent = 'Đang đồng bộ…';
    chip.setAttribute('title', 'Đang đẩy các thay đổi lên GitHub, vui lòng đợi.');
    chip.setAttribute('data-action', '');
  } else if (status.state === 'pending') {
    chip.classList.add('is-pending');
    if (label) label.textContent = `${status.pending} thay đổi chưa đồng bộ`;
    chip.setAttribute('title', `Còn ${status.pending} thay đổi chỉ lưu trên máy này. Bấm để đẩy lên GitHub.`);
    chip.setAttribute('data-action', 'flush-sync-now');
  } else {
    chip.classList.add('is-clean');
    const lastSyncLabel = formatRelativeSync(getLastSyncAt());
    if (label) label.textContent = lastSyncLabel ? `Đã đồng bộ ${lastSyncLabel}` : 'Đã đồng bộ';
    chip.setAttribute(
      'title',
      lastSyncLabel
        ? `Lần đồng bộ gần nhất: ${lastSyncLabel}. Bấm để kéo dữ liệu mới từ GitHub.`
        : 'Chưa có lần đồng bộ nào. Bấm để kéo dữ liệu mới từ GitHub.',
    );
    chip.setAttribute('data-action', 'flush-sync-now');
  }
}
