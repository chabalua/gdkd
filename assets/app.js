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
  readAllData, savePendingWrite, getPendingWriteCount,
  pushPendingWrites, getRepoConfig, getToken,
} from './api.js';
import { showToast, escapeHtml, getCurrentRange, saveRange, getCurrentMonth } from './ui.js';
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

// === Local-first persistence — manual GitHub push ===
// Mọi CRUD chỉ lưu localStorage. KHÔNG tự push GitHub. User bấm chip topbar
// để push 1 lần khi muốn. Tránh spam GitHub Actions, giảm noise commit history.

let pushInFlight = false;
const syncStatusSubscribers = new Set();
const LOCAL_SYNC_CHANNEL_NAME = 'gdkd-local-sync';
const localSyncChannel = typeof window.BroadcastChannel === 'function'
  ? new window.BroadcastChannel(LOCAL_SYNC_CHANNEL_NAME)
  : null;

export function subscribeSyncStatus(callback) {
  syncStatusSubscribers.add(callback);
  callback(getSyncStatus());
  return () => syncStatusSubscribers.delete(callback);
}

export function getSyncStatus() {
  const pending = getPendingWriteCount();
  if (pushInFlight) return { state: 'syncing', pending };
  if (pending) return { state: 'pending', pending };
  return { state: 'clean', pending: 0 };
}

function emitSyncStatus() {
  const status = getSyncStatus();
  syncStatusSubscribers.forEach((callback) => {
    try { callback(status); } catch (error) { console.warn(error); }
  });
}

function broadcastLocalSync(payload) {
  if (!localSyncChannel) return;
  try {
    localSyncChannel.postMessage({
      type: 'local-persist',
      ...payload,
      at: Date.now(),
    });
  } catch (error) {
    console.warn('broadcastLocalSync failed', error);
  }
}

// flushSyncNow: bấm chip khi đang có pending → push tất cả lên GitHub.
// Bấm chip khi clean (không pending) → fallback sang manual refresh
// (kéo data thiết bị khác về). Handler ở events.js phân nhánh.
export async function flushSyncNow() {
  if (pushInFlight) return getSyncStatus();
  if (!getPendingWriteCount()) return getSyncStatus();
  const repoConfig = getRepoConfig();
  if (!repoConfig.owner || !repoConfig.repo || !getToken()) {
    return getSyncStatus();
  }
  pushInFlight = true;
  emitSyncStatus();
  try {
    const result = await pushPendingWrites();
    if (appState.data) lastDataSignature = computeDataSignature(appState.data);
    if (result.failures.length) {
      console.warn('manual sync failures', result.failures);
    }
  } catch (error) {
    console.warn('manual sync error', error);
  } finally {
    pushInFlight = false;
    emitSyncStatus();
  }
  return getSyncStatus();
}

// persistFile: chỉ ghi localStorage. Không touch network. Trả ngay → UI mượt.
export async function persistFile(filename, payload, successMessage /* unused */, toast /* unused */) {
  try {
    const serializedPayload = serializeFilePayload(filename, payload);
    savePendingWrite(filename, serializedPayload, '');
    broadcastLocalSync({ filename });
  } catch (error) {
    console.warn(`persistFile serialize failed for ${filename}`, error);
    showToast(`Không chuẩn bị được dữ liệu lưu cho ${filename}.`, 'error');
    throw error;
  }
  emitSyncStatus();
  if (appState.data) lastDataSignature = computeDataSignature(appState.data);
  return { storage: 'draft' };
}

export function rerenderApp() {
  const root = document.querySelector('[data-app-root]');
  if (!root || !appState.data) return;
  const renderer = getProtectedRenderer(document.body.dataset.page);
  root.innerHTML = renderer(appState.data);
  bindCommonEvents(appState.data);
}

// === Auto-refresh khi quay lại tab ===
// App 1 user, dùng cả PC + điện thoại. Khi mở thiết bị B sau khi vừa push
// trên A, B phải thấy data mới mà không cần F5. Skip khi: đang mở modal,
// có pending writes (giữ local), tab không visible, đang focus input.
let refreshInFlight = false;
let lastDataSignature = '';

function computeDataSignature(rawData) {
  return [
    JSON.stringify(rawData?.config || {}).length,
    JSON.stringify(rawData?.xe || {}).length,
    JSON.stringify(rawData?.nhanVien || {}).length,
    JSON.stringify(rawData?.khachHang || {}).length,
    JSON.stringify(rawData?.congViec || {}).length,
    JSON.stringify(rawData?.lichSu || {}).length,
  ].join('|');
}

function isUserEditingInline() {
  // Không refresh khi user đang focus 1 input/textarea/select inline (tab Nhập tuần),
  // tránh đè giá trị đang gõ. Refresh thủ công vẫn cho qua.
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (active.isContentEditable) return true;
  return false;
}

async function refreshFromGithub(reason) {
  if (refreshInFlight) return;
  if (document.visibilityState !== 'visible') return;
  if (document.body.classList.contains('modal-open')) return;
  if (getPendingWriteCount() > 0) return;
  if (reason !== 'manual' && isUserEditingInline()) return;
  const repoConfig = getRepoConfig();
  if (!repoConfig.owner || !repoConfig.repo || !getToken()) return;

  refreshInFlight = true;
  try {
    const raw = await readAllData();
    const signature = computeDataSignature(raw);
    if (signature === lastDataSignature) return;
    if (document.body.classList.contains('modal-open')) return;
    appState.data = normalizeData(raw);
    lastDataSignature = signature;
    ensureValidStoredRange(appState.data);
    rerenderApp();
    if (reason === 'manual') {
      showToast('Đã làm mới dữ liệu từ GitHub.', 'success');
    } else {
      showToast('Đã đồng bộ dữ liệu mới từ GitHub.', 'success');
    }
  } catch (error) {
    console.warn('refreshFromGithub failed', error);
    if (reason === 'manual') {
      showToast('Không làm mới được dữ liệu. Kiểm tra mạng hoặc token.', 'error');
    }
  } finally {
    refreshInFlight = false;
  }
}

async function refreshFromLocalStorage(reason) {
  if (refreshInFlight) return;
  if (document.body.classList.contains('modal-open')) return;
  if (isUserEditingInline()) return;

  refreshInFlight = true;
  try {
    const raw = await readAllData();
    const signature = computeDataSignature(raw);
    if (signature === lastDataSignature) return;
    if (document.body.classList.contains('modal-open')) return;
    appState.data = normalizeData(raw);
    lastDataSignature = signature;
    ensureValidStoredRange(appState.data);
    rerenderApp();
    if (reason === 'storage') {
      emitSyncStatus();
    }
  } catch (error) {
    console.warn('refreshFromLocalStorage failed', error);
  } finally {
    refreshInFlight = false;
  }
}

export function triggerManualRefresh() {
  return refreshFromGithub('manual');
}

// Local-first manual sync: KHÔNG auto-push, KHÔNG polling. Chỉ refresh từ
// GitHub khi user quay lại tab (focus/visibility) NẾU không có pending —
// để tránh đè local writes chưa push.
function ensureAutoRefreshHooks() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (getPendingWriteCount()) return;
    refreshFromGithub('visibility');
  });
  window.addEventListener('focus', () => {
    if (getPendingWriteCount()) return;
    refreshFromGithub('focus');
  });
  window.addEventListener('storage', (event) => {
    if (!event.key) return;
    if (event.key !== 'gdkd_pending_writes') return;
    refreshFromLocalStorage('storage');
  });
  if (localSyncChannel) {
    localSyncChannel.addEventListener('message', (event) => {
      if (event?.data?.type !== 'local-persist') return;
      refreshFromLocalStorage('broadcast');
    });
  }
}

// Không cảnh báo chỉ vì còn pending writes: dữ liệu local đã được lưu tạm.
// Việc đẩy GitHub là thao tác chủ động qua chip/nút Đồng bộ.
function ensureUnloadGuard() {
  // Intentionally no-op.
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

// Đồng bộ config.thang_hien_tai với tháng hệ thống.
// Lý do: nếu user không mở app sang tháng mới, hoặc quên chỉnh tay,
// dashboard sẽ default range về tháng cũ → KPI hiển thị 0 gây hiểu nhầm.
// Chỉ tiến tới, không lùi (tránh ghi đè khi user cố tình xem tháng cũ).
async function ensureCurrentMonth() {
  const config = appState.data?.config;
  if (!config) return;
  const systemMonth = getCurrentMonth();
  const storedMonth = config.thang_hien_tai;
  if (storedMonth && storedMonth >= systemMonth) return;
  config.thang_hien_tai = systemMonth;
  try {
    await persistFile('config.json', config, null, false);
  } catch (error) {
    console.warn('ensureCurrentMonth persist failed', error);
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
    lastDataSignature = computeDataSignature(raw);
    await ensureCurrentMonth();
    ensureValidStoredRange(appState.data);
    await ensureMonthlySnapshot();
    rerenderApp();
    checkReminders(appState.data);
    ensureReminderLoop();
    ensureAutoRefreshHooks();
    ensureUnloadGuard();
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
