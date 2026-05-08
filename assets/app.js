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
  getToken, setToken, clearToken, verifyToken,
  readAllData, writeData, writeOverride,
} from './api.js';
import { showToast, escapeHtml } from './ui.js';
import { normalizeData, getPreviousMonthKey, buildMonthlySnapshot } from './models.js';
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

// === Persist file: writeData() throws khi GitHub fail; ở đây ta bắt và
// fallback localStorage nhưng cảnh báo TOAST WARNING rõ ràng — không silent. ===
export async function persistFile(filename, payload, successMessage, toast = true) {
  const showMsg = Boolean(successMessage);
  try {
    await writeData(filename, payload);
    if (showMsg) showToast(successMessage, 'success');
    return { storage: 'github' };
  } catch (error) {
    console.error('writeData failed', error);
    writeOverride(filename, payload);
    if (showMsg) {
      showToast(`${successMessage} ⚠ Chưa lưu lên GitHub: ${error.message}. Dữ liệu giữ tạm trong trình duyệt.`, 'warning');
    }
    return { storage: 'local', error };
  }
}

export function rerenderApp() {
  const root = document.querySelector('[data-app-root]');
  if (!root || !appState.data) return;
  const renderer = getProtectedRenderer(document.body.dataset.page);
  root.innerHTML = renderer(appState.data);
  bindCommonEvents(appState.data);
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
  const form = document.querySelector('[data-login-form]');
  if (!form) return;
  const status = document.querySelector('[data-login-status]');
  const tokenInput = form.querySelector('input[name="token"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = tokenInput.value.trim();
    if (!token) {
      showToast('Vui lòng nhập GitHub Personal Access Token.', 'warning');
      return;
    }
    status.textContent = 'Đang kiểm tra token...';
    const valid = await verifyToken(token);
    if (!valid) {
      status.textContent = 'Token chưa hợp lệ hoặc thiết bị đang mất kết nối mạng.';
      showToast('Không xác thực được token GitHub.', 'error');
      return;
    }
    setToken(token);
    status.textContent = 'Đăng nhập thành công. Đang chuyển hướng...';
    showToast('Đăng nhập thành công.', 'success');
    window.setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  });
}

async function guardProtectedPage() {
  if (document.body.dataset.requireAuth !== 'true') return true;
  // Bỏ qua auth khi chạy localhost (dev mode)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true;
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
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
