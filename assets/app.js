// assets/app.js
// Entry module: bootstrap, shared mutable state (appState), persistFile + rerenderApp,
// router theo data-page. Event delegation tách sang events.js để giữ file < 350 dòng.
//
// Cấu trúc:
//   api.js     ← GitHub Contents API + auth
//   ui.js      ← format, modal, toast, field builders
//   models.js  ← constants + normalize + derive
//   events.js  ← bindCommonEvents + 3 filter helpers
//   modals/*   ← form modals (KPI, employee, customer, CSKH, settings, xe, notifications)
//   views/*    ← render functions cho từng trang
//   notify.js  ← reminder logic
//   app.js     ← file này

import {
  readAllData, writeData, savePendingWrite, clearPendingWrite, getPendingWriteCount,
  pushPendingWrites, getRepoConfig, getToken,
} from './api.js';
import { showToast, escapeHtml, getCurrentRange, saveRange } from './ui.js';
import { normalizeData, serializeFilePayload, getPreviousMonthKey, buildMonthlySnapshot } from './models.js';
import { checkReminders } from './notify.js';
import { bindCommonEvents } from './events.js';

import renderDashboard from './views/dashboard.js';
import renderKpiPage from './views/kpi.js';
import renderCongViecPage from './views/cong-viec.js';
import renderXePage from './views/xe.js';
import renderNhanVienPage from './views/nhan-vien.js';
import renderNhanVienDetailPage from './views/nhan-vien-detail.js';
import renderKhachHangPage from './views/khach-hang.js';
import renderCskhPage from './views/cskh.js';
import renderSettingsPage from './views/settings.js';

// === iOS standalone PWA: giữ navigation trong fullscreen ===
// Khi add-to-home-screen, click <a href> sang trang khác sẽ mở Safari và mất
// fullscreen. Chặn click cho link cùng origin và điều hướng bằng location.href.
if (window.navigator.standalone) {
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;
    const url = new URL(anchor.getAttribute('href'), window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    window.location.href = url.href;
  });
}

// === Shared mutable state ===
// modals/* và events.js tham chiếu qua import (ESM live binding).
export const appState = { data: null };
let reminderTimer = null;

function isExpectedDeferredSyncError(error) {
  const message = String(error?.message || '');
  return message.includes('Chưa cấu hình GitHub');
}

// === Persist file: writeData() throws khi GitHub fail; lưu draft cục bộ có chủ đích
// để user tiếp tục làm việc rồi đồng bộ GitHub sau. ===
export async function persistFile(filename, payload, successMessage, toast = true) {
  const showMsg = Boolean(successMessage);
  try {
    const serializedPayload = serializeFilePayload(filename, payload);
    await writeData(filename, serializedPayload);
    clearPendingWrite(filename);
    if (showMsg) showToast(successMessage, 'success');
    return { storage: 'github' };
  } catch (error) {
    if (!isExpectedDeferredSyncError(error)) {
      console.error('writeData failed', error);
    }
    const serializedPayload = serializeFilePayload(filename, payload);
    savePendingWrite(filename, serializedPayload, error.message);
    if (toast) {
      if (showMsg) {
        showToast(`${successMessage} Đã lưu nháp trên máy, sẽ đồng bộ GitHub sau.`, 'warning');
      } else if (!sessionStorage.getItem('gdkd_deferred_sync_notice')) {
        showToast('Đã lưu nháp trên máy. Khi xong việc, bấm Đồng bộ GitHub ở góc trên để đẩy dữ liệu.', 'warning');
        sessionStorage.setItem('gdkd_deferred_sync_notice', '1');
      }
    }
    return { storage: 'draft', error };
  }
}

export function rerenderApp() {
  const root = document.querySelector('[data-app-root]');
  if (!root || !appState.data) return;
  const renderer = getProtectedRenderer(document.body.dataset.page);
  root.innerHTML = renderer(appState.data);
  bindCommonEvents(appState.data);
}

function isMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ''));
}

function collectAvailableMonths(data) {
  const months = new Set();
  const pushMonth = (value) => {
    if (isMonthKey(value)) months.add(value);
  };

  pushMonth(data?.config?.thang_hien_tai);
  Object.keys(data?.config?.muc_tieu_thang || {}).forEach(pushMonth);

  (data?.nhanVien?.nhan_vien || []).forEach((employee) => {
    Object.keys(employee?.lead_theo_thang || {}).forEach(pushMonth);
    Object.keys(employee?.noi_dung || {}).forEach(pushMonth);
    Object.keys(employee?.kpi_tuan || {}).forEach(pushMonth);
  });

  (data?.khachHang?.khach_hang || []).forEach((customer) => {
    [customer.ngay_du_kien_ky, customer.ngay_ky, customer.ngay_giao_du_kien, customer.ngay_giao_thuc_te]
      .filter(Boolean)
      .forEach((dateValue) => pushMonth(String(dateValue).slice(0, 7)));
  });

  (data?.lichSu?.lich_su || []).forEach((snapshot) => pushMonth(snapshot?.thang));

  return months;
}

function ensureValidStoredRange(data) {
  const availableMonths = collectAvailableMonths(data);
  const currentRange = getCurrentRange();
  const currentMonths = Array.isArray(currentRange?.months) ? currentRange.months : [];
  const filteredMonths = currentMonths.filter((month, index) => {
    if (!isMonthKey(month)) return false;
    if (currentMonths.indexOf(month) !== index) return false;
    return !availableMonths.size || availableMonths.has(month);
  });

  const fallbackMonth = data?.config?.thang_hien_tai
    || Array.from(availableMonths).sort().at(-1)
    || null;

  const nextMonths = filteredMonths.length ? filteredMonths : (fallbackMonth ? [fallbackMonth] : []);
  const hasChanged = nextMonths.length !== currentMonths.length
    || nextMonths.some((month, index) => month !== currentMonths[index]);

  if (hasChanged && nextMonths.length) {
    saveRange({ months: nextMonths });
  }
}

async function ensureMonthlySnapshot() {
  const currentMonth = appState.data?.config?.thang_hien_tai;
  const previousMonth = getPreviousMonthKey(currentMonth);
  if (!previousMonth) return;

  const existing = appState.data.lichSu?.lich_su || [];
  if (existing.some((item) => item.thang === previousMonth)) return;

  const snapshot = buildMonthlySnapshot(appState.data, previousMonth);
  const hasMeaningfulData = snapshot.xe_ky_moi || snapshot.hd_xuat || snapshot.lead_phat_sinh || snapshot.ranking.length;
  if (!hasMeaningfulData) return;

  const nextHistory = [snapshot, ...existing].sort((a, b) => b.thang.localeCompare(a.thang));
  appState.data.lichSu = { lich_su: nextHistory };
  appState.data.kpi.lich_su = nextHistory;
  await persistFile('lich-su.json', appState.data.lichSu, null, false);
}

function ensureReminderLoop() {
  if (reminderTimer) {
    window.clearInterval(reminderTimer);
  }
  reminderTimer = window.setInterval(() => {
    if (appState.data) checkReminders(appState.data);
  }, 30 * 60 * 1000);
}

async function syncPendingWritesOnStartup() {
  const pendingCount = getPendingWriteCount();
  if (!pendingCount) return;
  const repoConfig = getRepoConfig();
  if (!repoConfig.owner || !repoConfig.repo || !getToken()) return;

  const result = await pushPendingWrites();
  if (result.synced.length && !result.failures.length) {
    showToast(`Đã tự đồng bộ ${result.synced.length} thay đổi lên GitHub.`, 'success');
    return;
  }

  if (result.synced.length && result.failures.length) {
    showToast(`Đã tự đồng bộ ${result.synced.length} thay đổi, còn ${result.failures.length} thay đổi cần kiểm tra.`, 'warning');
    return;
  }

  if (result.failures.length) {
    showToast(`Chưa tự đồng bộ được. Mở GitHub để kiểm tra cấu hình.`, 'warning');
  }
}

function getProtectedRenderer(page) {
  switch (page) {
    case 'dashboard': return renderDashboard;
    case 'kpi': return renderKpiPage;
    case 'congviec': return renderCongViecPage;
    case 'xe': return renderXePage;
    case 'nhanvien': return renderNhanVienPage;
    case 'nhanvien-detail': return renderNhanVienDetailPage;
    case 'khachhang': return renderKhachHangPage;
    case 'cskh': return renderCskhPage;
    case 'settings': return renderSettingsPage;
    default: return renderDashboard;
  }
}

// === Page bootstrap ===
async function initProtectedPage() {
  const root = document.querySelector('[data-app-root]');
  if (!root) return;
  root.innerHTML = '<section class="empty-card">Đang tải dữ liệu...</section>';
  try {
    const raw = await readAllData();
    appState.data = normalizeData(raw);
    ensureValidStoredRange(appState.data);
    await syncPendingWritesOnStartup();
    await ensureMonthlySnapshot();
    rerenderApp();
    checkReminders(appState.data);
    ensureReminderLoop();
  } catch (error) {
    console.error(error);
    root.innerHTML = `<section class="empty-card">Không tải được dữ liệu. ${escapeHtml(error.message)}</section>`;
    showToast('Không tải được dữ liệu nguồn.', 'error');
  }
}

function initLoginPage() {
  const status = document.querySelector('[data-login-status]');
  if (status) {
    status.textContent = 'App không còn yêu cầu đăng nhập khi mở. Đang chuyển sang dashboard...';
  }
  window.setTimeout(() => {
    window.location.href = 'index.html';
  }, 300);
}

async function guardProtectedPage() {
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page === 'login') {
    initLoginPage();
    return;
  }
  const allowed = await guardProtectedPage();
  if (!allowed) return;
  initProtectedPage();
});
