// assets/events.js
// Event delegation cho mọi data-action trên các trang đã render.
// Tách khỏi app.js để mỗi file < 350 dòng. Không có state riêng — đọc state
// qua import từ app.js (ESM live binding).

import { clearToken, getLastSyncAt, getPendingWriteCount } from './api.js';
import { showToast, confirmAction, showModal, getModalRoot, closeModal, saveRange, parseRangeValue, calcPercent, getPercentClass } from './ui.js';
import { TODO_MESSAGE, countKhByXeId } from './models.js';
import { updateSyncChipDOM } from './components/sync-status.js';

import { openRepoSettingsModal } from './modals/repo-settings.js';
import { openTaskLibraryManagerModal } from './modals/admin.js';
import { openXeModal } from './modals/xe.js';
import { openEmployeeModal, openGroupManagerModal, openEmployeeTaskModal, openLeadModal, openManageChannelsModal, openManageModal } from './modals/employee.js';
import { openCustomerModal } from './modals/customer.js';
import { openCskhModal } from './modals/cskh.js';
import { renderNotificationsPanel } from './modals/notifications.js';

import { filterXeRows } from './views/xe.js';

import { appState, persistFile, rerenderApp, triggerManualRefresh, flushSyncNow, subscribeSyncStatus } from './app.js';

// === Sync chip binding (module-level — bind 1 lần, dùng sync-status component) ===
let syncChipBound = false;

function ensureSyncChipBinding() {
  if (syncChipBound) return;
  syncChipBound = true;
  subscribeSyncStatus((status) => {
    updateSyncChipDOM(status);
  });
}

// === In-page filters ===
function filterEmployeeCards() {
  const input = document.querySelector('[data-employee-search]');
  if (!input) return;
  const query = input.value.trim().toLowerCase();
  document.querySelectorAll('[data-employee-card]').forEach((card) => {
    const haystack = card.getAttribute('data-search') || '';
    card.style.display = !query || haystack.includes(query) ? '' : 'none';
  });
}

function filterCustomerRows() {
  const search = document.querySelector('[data-customer-search]');
  const status = document.querySelector('[data-customer-status]');
  const nv = document.querySelector('[data-customer-nv]');
  const payment = document.querySelector('[data-customer-payment]');
  const query = (search?.value || '').trim().toLowerCase();
  const statusValue = status?.value || 'all';
  const nvValue = nv?.value || 'all';
  const paymentValue = payment?.value || 'all';

  // Trạng thái dropdown có 2 loại option:
  //   - Pipeline KH: 'du_ky', 'moi_ky', 'dang_xu_ly', ... → match data-status
  //   - Hoá đơn:     'hd:da_xuat', 'hd:chua_xuat', ...    → match data-hdo
  // Khi user chọn 1 trong nhóm hoá đơn, KHÔNG filter theo pipeline status nữa.
  const isHdFilter = statusValue.startsWith('hd:');
  const hdoFilter = isHdFilter ? statusValue.slice(3) : '';

  document.querySelectorAll('[data-customer-row]').forEach((row) => {
    const haystack = row.getAttribute('data-search') || '';
    const rowStatus = row.getAttribute('data-status') || '';
    const rowNv = row.getAttribute('data-nv') || '';
    const rowPayment = row.getAttribute('data-payment') || '';
    const rowHdo = row.getAttribute('data-hdo') || '';

    let matchStatus = true;
    if (statusValue !== 'all') {
      if (isHdFilter) {
        // 'da_xuat' gom cả 2 sub-state da_xuat_cho_giao + da_xuat_da_giao.
        matchStatus = hdoFilter === 'da_xuat'
          ? rowHdo.startsWith('da_xuat')
          : rowHdo === hdoFilter;
      } else {
        matchStatus = rowStatus === statusValue;
      }
    }

    const visible =
      (!query || haystack.includes(query)) &&
      matchStatus &&
      (nvValue === 'all' || rowNv === nvValue) &&
      (paymentValue === 'all' || rowPayment === paymentValue);
    row.style.display = visible ? '' : 'none';
  });
}

function filterCskhCards() {
  const input = document.querySelector('[data-cskh-search]');
  if (!input) return;
  const query = input.value.trim().toLowerCase();
  document.querySelectorAll('[data-cskh-card]').forEach((card) => {
    const haystack = card.getAttribute('data-search') || '';
    card.style.display = !query || haystack.includes(query) ? '' : 'none';
  });
}

// === Common event delegation (data-action="...") ===
export function bindCommonEvents(data) {
  const getVisibleElements = (selector) => {
    const allElements = Array.from(document.querySelectorAll(selector));
    const visibleElements = allElements.filter((element) => element.offsetParent !== null);
    return visibleElements.length ? visibleElements : allElements;
  };

  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener('click', () => {
      confirmAction('Đăng xuất khỏi GitHub trên thiết bị này? (Token sẽ bị xoá, dữ liệu local vẫn được giữ nguyên.)', () => {
        clearToken();
        showToast('Đã đăng xuất. App vẫn dùng dữ liệu local hiện có.', 'success');
      });
    });
  });

  document.querySelectorAll('[data-action="open-settings"]').forEach((button) => {
    button.addEventListener('click', openRepoSettingsModal);
  });

  document.querySelectorAll('[data-action="sync-pending-writes"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const status = await flushSyncNow();
      if (status.pending === 0) {
        showToast('Đã đồng bộ lên GitHub.', 'success');
      } else {
        showToast(`Còn ${status.pending} thay đổi chưa đồng bộ — sẽ thử lại.`, 'warning');
      }
      rerenderApp();
    });
  });

  document.querySelectorAll('[data-action="refresh-from-github"]').forEach((button) => {
    button.addEventListener('click', () => triggerManualRefresh());
  });

  // Nút "Tải từ GitHub" ở trang Thiết lập.
  // Nếu đang có pending writes, hỏi xác nhận vì refresh sẽ rerender từ remote
  // và có thể che mất các thay đổi local chưa push (chúng vẫn nằm trong
  // gdkd_pending_writes — overlay sẽ giữ nguyên, nhưng user nên biết).
  document.querySelectorAll('[data-action="pull-from-github"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const pendingCount = getPendingWriteCount();
      const runPull = async () => {
        await triggerManualRefresh();
        rerenderApp();
      };
      if (pendingCount > 0) {
        confirmAction(
          `Đang có ${pendingCount} thay đổi chưa đẩy lên GitHub. Bạn vẫn muốn tải dữ liệu mới về máy? (Các thay đổi local vẫn được giữ trong nháp.)`,
          runPull,
        );
      } else {
        runPull();
      }
    });
  });

  document.querySelectorAll('[data-action="flush-sync-now"]').forEach((button) => {
    button.addEventListener('click', async () => {
      // Có pending → push lên GitHub. Hết pending → kéo data thiết bị khác về.
      const hadPending = await flushSyncNow();
      if (hadPending.pending > 0) {
        showToast(`Còn ${hadPending.pending} thay đổi chưa đẩy được — kiểm tra mạng/token.`, 'warning');
      } else {
        await triggerManualRefresh();
      }
    });
  });

  // Sync chip live-update — query lại chip mỗi lần status đổi để xử lý
  // rerender. Subscriber là module-level (chỉ bind 1 lần).
  ensureSyncChipBinding();

  document.querySelectorAll('[data-action="show-notifications"]').forEach((button) => {
    button.addEventListener('click', () => renderNotificationsPanel(data));
  });

  // open-kpi-form và reset-kpi đã xoá (bước 6 — KPI là derive, không gõ tay)

  // === Xe catalog ===
  document.querySelectorAll('[data-action="open-xe-create"]').forEach((button) => {
    button.addEventListener('click', () => openXeModal());
  });
  document.querySelectorAll('[data-action="open-xe-edit"]').forEach((button) => {
    button.addEventListener('click', () => openXeModal(button.getAttribute('data-id')));
  });
  document.querySelectorAll('[data-action="delete-xe"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      const xeId = button.getAttribute('data-id');
      const xe = appState.data.xe.xe.find((item) => item.id === xeId);
      if (!xe) return;
      const refCount = countKhByXeId(appState.data, xeId);
      if (refCount > 0) {
        showToast(`Không thể xoá: có ${refCount} KH đang dùng xe này.`, 'error');
        return;
      }
      const label = [xe.ma_xe, xe.hang, xe.dong].filter(Boolean).join(' · ') || 'dòng xe này';
      confirmAction(`Xoá ${label}?`, async () => {
        appState.data.xe.xe = appState.data.xe.xe.filter((item) => item.id !== xeId);
        await persistFile('xe.json', appState.data.xe, 'Đã xoá dòng xe.');
        rerenderApp();
      });
    });
  });

  // === Nhân viên ===
  document.querySelectorAll('[data-action="open-employee-create"]').forEach((button) => {
    button.addEventListener('click', () => openEmployeeModal());
  });
  document.querySelectorAll('[data-action="open-group-manager"]').forEach((button) => {
    button.addEventListener('click', () => openGroupManagerModal());
  });
  document.querySelectorAll('[data-action="open-task-library-manager"]').forEach((button) => {
    button.addEventListener('click', () => openTaskLibraryManagerModal());
  });
  document.querySelectorAll('[data-action="open-lead-modal"]').forEach((button) => {
    button.addEventListener('click', () => openLeadModal(
      button.getAttribute('data-id') || new URLSearchParams(window.location.search).get('id'),
    ));
  });
  document.querySelectorAll('[data-action="open-employee-edit"]').forEach((button) => {
    button.addEventListener('click', () => openEmployeeModal(
      button.getAttribute('data-id') || new URLSearchParams(window.location.search).get('id'),
    ));
  });
  document.querySelectorAll('[data-action="delete-employee"]').forEach((button) => {
    button.addEventListener('click', () => {
      const employeeId = button.getAttribute('data-id');
      const employee = appState.data.nhanVien.nhan_vien.find((item) => item.id === employeeId);
      if (!employee) return;
      confirmAction(`Xoá nhân viên ${employee.ho_ten}?`, async () => {
        appState.data.nhanVien.nhan_vien = appState.data.nhanVien.nhan_vien.filter((item) => item.id !== employeeId);
        await persistFile('nhan-vien.json', appState.data.nhanVien, 'Đã xoá nhân viên.');
        if (document.body.dataset.page === 'nhanvien-detail') {
          window.location.href = 'nhan-vien.html';
          return;
        }
        rerenderApp();
      });
    });
  });

  document.querySelectorAll('[data-action="open-manage-channels"]').forEach((button) => {
    button.addEventListener('click', openManageChannelsModal);
  });
  document.querySelectorAll('[data-action="open-manage-modal"]').forEach((button) => {
    button.addEventListener('click', () => openEmployeeTaskModal(
      button.getAttribute('data-id') || new URLSearchParams(window.location.search).get('id'),
    ));
  });

  // === Khách hàng (schema v2) ===
  document.querySelectorAll('[data-action="open-customer-create"]').forEach((button) => {
    button.addEventListener('click', () => openCustomerModal());
  });
  document.querySelectorAll('[data-action="open-customer-create-for-nv"]').forEach((button) => {
    button.addEventListener('click', () => {
      const nvId = button.getAttribute('data-nv-id');
      openCustomerModal(null, { prefillNvId: nvId, prefillStatus: 'du_ky' });
    });
  });
  document.querySelectorAll('[data-action="open-customer-edit"]').forEach((button) => {
    button.addEventListener('click', () => openCustomerModal(button.getAttribute('data-id')));
  });
  document.querySelectorAll('[data-action="delete-customer"]').forEach((button) => {
    button.addEventListener('click', () => {
      const customerId = button.getAttribute('data-id');
      const customer = appState.data.khachHang.khach_hang.find((item) => item.id === customerId);
      if (!customer) return;
      confirmAction(`Xoá hồ sơ ${customer.ten}?`, async () => {
        appState.data.khachHang.khach_hang = appState.data.khachHang.khach_hang.filter((item) => item.id !== customerId);
        await persistFile('khach-hang.json', appState.data.khachHang, 'Đã xoá khách hàng.');
        rerenderApp();
      });
    });
  });
  // Legacy actions (backward compat — sẽ xóa khi không còn sử dụng)
  document.querySelectorAll('[data-action="open-customer-create-old"],[data-action="open-customer-create-new"]').forEach((button) => {
    button.addEventListener('click', () => openCustomerModal());
  });
  document.querySelectorAll('[data-action="open-customer-edit-old"],[data-action="open-customer-edit-new"]').forEach((button) => {
    button.addEventListener('click', () => openCustomerModal(button.getAttribute('data-id')));
  });
  document.querySelectorAll('[data-action="delete-customer-old"],[data-action="delete-customer-new"]').forEach((button) => {
    button.addEventListener('click', () => {
      const customerId = button.getAttribute('data-id');
      const customer = appState.data.khachHang.khach_hang.find((item) => item.id === customerId);
      if (!customer) return;
      confirmAction(`Xoá khách hàng ${customer.ten}?`, async () => {
        appState.data.khachHang.khach_hang = appState.data.khachHang.khach_hang.filter((item) => item.id !== customerId);
        await persistFile('khach-hang.json', appState.data.khachHang, 'Đã xoá khách hàng.');
        rerenderApp();
      });
    });
  });

  // === CSKH (form thêm phản hồi trực tiếp trên KH record) ===
  document.querySelectorAll('[data-action="open-cskh-create"]').forEach((button) => {
    button.addEventListener('click', () => openCskhModal());
  });
  document.querySelectorAll('[data-action="open-cskh-edit"]').forEach((button) => {
    button.addEventListener('click', () => openCskhModal(button.getAttribute('data-id')));
  });
  document.querySelectorAll('[data-action="delete-cskh"]').forEach((button) => {
    button.addEventListener('click', () => {
      showToast('Xóa bản ghi CSKH — thực hiện qua form Sửa KH.', 'info');
    });
  });

  document.querySelectorAll('[data-action="todo-work"]').forEach((button) => {
    button.addEventListener('click', () => {
      showToast(TODO_MESSAGE, 'info');
    });
  });

  // === Xem timeline KH (inline expand trong tab NV detail) ===
  document.querySelectorAll('[data-action="view-kh-timeline"]').forEach((button) => {
    button.addEventListener('click', () => {
      const khId = button.getAttribute('data-id');
      const kh = appState.data.khachHang.khach_hang.find((k) => k.id === khId);
      if (!kh) return;
      const steps = (kh.tien_do || []).map((s) =>
        `<div class="timeline-note"><strong>${s.ngay || '?'}</strong> — Bước ${s.buoc}: ${s.noi_dung || ''}</div>`
      ).join('') || '<div class="timeline-note">Chưa có cập nhật.</div>';
      showModal(`<h3 class="modal-title">Timeline — ${kh.ten}</h3><div class="stack-list">${steps}</div><div class="button-row"><button class="btn btn-ghost" data-modal-cancel>Đóng</button></div>`);
      getModalRoot().querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });
    });
  });

  // === KH filter pills trong tab NV detail ===
  document.querySelectorAll('[data-kh-filter]').forEach((pill) => {
    pill.addEventListener('click', () => {
      const parent = pill.closest('[data-tab-panel]') || document;
      parent.querySelectorAll('[data-kh-filter]').forEach((p) => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      // Reset pill kênh để 2 filter không xung đột
      parent.querySelectorAll('[data-kenh-filter]').forEach((p) => p.classList.remove('is-active'));
      const filterVal = pill.getAttribute('data-kh-filter');
      document.querySelectorAll('[data-kh-card]').forEach((card) => {
        const cardFilter = card.getAttribute('data-filter') || '';
        const canCskh = card.getAttribute('data-can-cskh') === 'true';
        const isVisible = filterVal === 'all'
          || cardFilter === filterVal
          || (filterVal === 'can_cskh' && canCskh);
        card.style.display = isVisible ? '' : 'none';
      });
    });
  });

  // === Week grid inline autosave (NV detail v3) ===
  // - input event → debounce 600ms (gõ liên tục thì autosave 1 lần).
  // - change/blur event → flush ngay (user rời ô input).
  // - beforeunload / click link điều hướng → flush ngay trước khi rời trang.
  let weekGridDebounceTimer = null;
  let pendingFlush = null;

  const commitWeekTaskWrite = (input) => {
    const taskId = input.getAttribute('data-task-id');
    const nvId = input.getAttribute('data-nv-id');
    const month = input.getAttribute('data-month') || appState.data.config.thang_hien_tai;
    const rowActualInputs = getVisibleElements(`[data-week-task-input][data-task-id="${taskId}"]`);
    const rowTargetInputs = getVisibleElements(`[data-week-task-target][data-task-id="${taskId}"]`);
    const nvIdx = appState.data.nhanVien.nhan_vien.findIndex((item) => item.id === nvId);
    if (nvIdx < 0) return null;
    const employee = appState.data.nhanVien.nhan_vien[nvIdx];
    if (!employee.du_lieu) employee.du_lieu = {};
    if (!employee.du_lieu[month]) employee.du_lieu[month] = { tuan: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} } };
    if (!employee.du_lieu[month].tuan) employee.du_lieu[month].tuan = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
    const allTaskWeeks = new Set([
      ...rowActualInputs.map((element) => element.getAttribute('data-tuan')),
      ...rowTargetInputs.map((element) => element.getAttribute('data-tuan')),
    ]);
    allTaskWeeks.forEach((inputWeek) => {
      const actualInput = rowActualInputs.find((element) => element.getAttribute('data-tuan') === inputWeek);
      const targetInput = rowTargetInputs.find((element) => element.getAttribute('data-tuan') === inputWeek);
      const actual = Math.max(0, Number(actualInput?.value || 0));
      const target = Math.max(0, Number(targetInput?.value || 0));
      if (!employee.du_lieu[month].tuan[inputWeek]) employee.du_lieu[month].tuan[inputWeek] = {};
      employee.du_lieu[month].tuan[inputWeek][taskId] = { muc_tieu: target, thuc_te: actual };
    });
    // persistFile giờ là local-first: lưu localStorage sync ngay, background
    // sync GitHub sau debounce 30s.
    return persistFile('nhan-vien.json', appState.data.nhanVien, null);
  };

  const flushPendingWeekWrite = () => {
    if (!pendingFlush) return null;
    clearTimeout(weekGridDebounceTimer);
    const job = pendingFlush;
    pendingFlush = null;
    return commitWeekTaskWrite(job);
  };

  document.querySelectorAll('[data-action="save-week-draft"]').forEach((button) => {
    button.addEventListener('click', async () => {
      await flushPendingWeekWrite();
      await persistFile('nhan-vien.json', appState.data.nhanVien, null);
      showToast('Đã lưu.', 'success');
    });
  });

  // Khi user click link điều hướng (sidebar/topbar/back) hoặc đóng tab,
  // flush dữ liệu đang chờ trước. beforeunload chạy sync với pending writes
  // được lưu vào localStorage qua persistFile → savePendingWrite fallback.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    if (link.target && link.target !== '_self') return;
    flushPendingWeekWrite();
  }, true);
  window.addEventListener('beforeunload', () => {
    flushPendingWeekWrite();
  });
  window.addEventListener('pagehide', () => {
    flushPendingWeekWrite();
  });

  const syncWeekTaskInput = (input, options = {}) => {
      const taskId = input.getAttribute('data-task-id');
      const week = input.getAttribute('data-tuan');
      const rowActualInputs = getVisibleElements(`[data-week-task-input][data-task-id="${taskId}"]`);
      const rowTargetInputs = getVisibleElements(`[data-week-task-target][data-task-id="${taskId}"]`);
      const rowSum = rowActualInputs.reduce((sum, element) => sum + Math.max(0, Number(element.value || 0)), 0);
      const rowTarget = rowTargetInputs.reduce((sum, element) => sum + Math.max(0, Number(element.value || 0)), 0);
      const rowTotalCells = getVisibleElements(`[data-task-total="${taskId}"]`);
      const rowTargetCells = getVisibleElements(`[data-task-target="${taskId}"]`);
      const rowPctCells = getVisibleElements(`[data-task-pct="${taskId}"]`);
      rowTotalCells.forEach((cell) => { cell.textContent = rowSum; });
      rowTargetCells.forEach((cell) => {
        const current = cell.textContent?.trim() || '';
        if (current.startsWith('Mục tiêu')) {
          cell.textContent = `Mục tiêu ${rowTarget || '—'}`;
        } else if (current.startsWith('MT')) {
          // Backward compat — DOM cũ vẫn có thể có "MT N"
          cell.textContent = `Mục tiêu ${rowTarget || '—'}`;
        } else {
          cell.textContent = rowTarget || '—';
        }
      });
      rowPctCells.forEach((cell) => {
        const pct = rowTarget > 0 ? calcPercent(rowSum, rowTarget) : null;
        cell.textContent = pct !== null ? `${pct}%` : '—';
        cell.classList.remove('is-success', 'is-warning', 'is-danger');
        if (pct !== null) cell.classList.add(getPercentClass(pct));
      });

      const weekInputs = getVisibleElements(`[data-week-task-input][data-tuan="${week}"][data-task-loai="lead"]`);
      const weekLeadTotal = weekInputs.reduce((sum, element) => sum + Math.max(0, Number(element.value || 0)), 0);
      const weekLeadCell = getVisibleElements(`[data-week-lead-total="${week}"]`)[0];
      if (weekLeadCell && weekLeadCell.textContent !== '—') {
        weekLeadCell.innerHTML = `<strong>${weekLeadTotal}</strong>`;
      }

      const allLeadInputs = getVisibleElements('[data-week-task-input][data-task-loai="lead"]');
      const allLeadTotal = allLeadInputs.reduce((sum, element) => sum + Math.max(0, Number(element.value || 0)), 0);
      const allLeadTargetInputs = getVisibleElements('[data-week-task-target][data-task-loai="lead"]');
        const allLeadTarget = allLeadTargetInputs.reduce((sum, element) => sum + Math.max(0, Number(element.value || 0)), 0);
      const grandCells = getVisibleElements('[data-all-lead-total]');
      grandCells.forEach((cell) => {
        if (cell.tagName === 'STRONG') cell.textContent = `${allLeadTotal}`;
        else cell.innerHTML = `<strong>${allLeadTotal}</strong>`;
      });
        const leadChip = document.querySelector('[data-nv-lead-chip]');
        if (leadChip) leadChip.textContent = `Lead: ${allLeadTotal}`;
        const progressChip = document.querySelector('[data-nv-progress-chip]');
        if (progressChip) {
          const progressPct = allLeadTarget > 0 ? calcPercent(allLeadTotal, allLeadTarget) : null;
          progressChip.textContent = `M\u1ee5c ti\u00eau: ${progressPct !== null ? `${progressPct}%` : '—'}`;
          progressChip.classList.remove('is-success', 'is-warning', 'is-danger');
          if (progressPct !== null) progressChip.classList.add(getPercentClass(progressPct));
        }

      const duKyCell = document.querySelector(`[data-week-du-ky="${week}"]`);
      const weekCvCell = document.querySelector(`[data-week-cv="${week}"]`);
      const duKyValue = duKyCell && duKyCell.textContent !== '—' ? Number(duKyCell.textContent || 0) : 0;
      if (weekCvCell && weekCvCell.textContent !== '—') {
        weekCvCell.textContent = weekLeadTotal > 0 ? `${Math.round((duKyValue / weekLeadTotal) * 100)}%` : '—';
      }

      const allDuKy = Array.from(document.querySelectorAll('[data-week-du-ky]')).reduce((sum, element) => {
        if (element.textContent === '—') return sum;
        return sum + Number(element.textContent || 0);
      }, 0);
      const allCvCells = getVisibleElements('[data-all-cv]');
      allCvCells.forEach((cell) => {
        cell.textContent = allLeadTotal > 0 ? `${Math.round((allDuKy / allLeadTotal) * 100)}%` : '—';
      });

      pendingFlush = input;
      clearTimeout(weekGridDebounceTimer);
      if (options.immediate) {
        flushPendingWeekWrite();
      } else {
        weekGridDebounceTimer = setTimeout(() => {
          flushPendingWeekWrite();
        }, 600);
      }
    };
  document.querySelectorAll('[data-week-task-input],[data-week-task-target]').forEach((input) => {
    input.addEventListener('input', () => syncWeekTaskInput(input));
    input.addEventListener('change', () => syncWeekTaskInput(input, { immediate: true }));
    input.addEventListener('blur', () => syncWeekTaskInput(input, { immediate: true }));
  });

  // === Batch entry tuần (trang tuan-tong-hop.html) ===
  // Khác week-grid 1 NV: ở đây mỗi cell thuộc 1 (NV, task, tuần). Không cần
  // sum row/col real-time — chỉ ghi cell đó. Lưu chậm: debounce 600ms theo cell.
  const batchDebounceByKey = new Map();
  const commitBatchCell = (cellKey) => {
    const job = batchDebounceByKey.get(cellKey);
    if (!job) return null;
    batchDebounceByKey.delete(cellKey);
    clearTimeout(job.timer);
    const { nvId, taskId, week, month } = job;
    const nvIdx = appState.data.nhanVien.nhan_vien.findIndex((item) => item.id === nvId);
    if (nvIdx < 0) return null;
    const employee = appState.data.nhanVien.nhan_vien[nvIdx];
    if (!employee.du_lieu) employee.du_lieu = {};
    if (!employee.du_lieu[month]) employee.du_lieu[month] = { tuan: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} } };
    if (!employee.du_lieu[month].tuan) employee.du_lieu[month].tuan = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
    if (!employee.du_lieu[month].tuan[week]) employee.du_lieu[month].tuan[week] = {};
    // Đọc lại từ DOM tại thời điểm flush (tránh stale value khi user gõ nhanh).
    const targetEl = document.querySelector(`[data-batch-cell-target][data-nv-id="${nvId}"][data-task-id="${taskId}"][data-tuan="${week}"][data-month="${month}"]`);
    const actualEl = document.querySelector(`[data-batch-cell-input][data-nv-id="${nvId}"][data-task-id="${taskId}"][data-tuan="${week}"][data-month="${month}"]`);
    const muc_tieu = Math.max(0, Number(targetEl?.value || 0));
    const thuc_te = Math.max(0, Number(actualEl?.value || 0));
    employee.du_lieu[month].tuan[week][taskId] = { muc_tieu, thuc_te };
    return persistFile('nhan-vien.json', appState.data.nhanVien, null);
  };

  const scheduleBatchCell = (input, options = {}) => {
    const nvId = input.getAttribute('data-nv-id');
    const taskId = input.getAttribute('data-task-id');
    const week = input.getAttribute('data-tuan');
    const month = input.getAttribute('data-month');
    if (!nvId || !taskId || !week || !month) return;
    const cellKey = `${nvId}|${taskId}|${week}|${month}`;
    const existing = batchDebounceByKey.get(cellKey);
    if (existing) clearTimeout(existing.timer);
    if (options.immediate) {
      batchDebounceByKey.set(cellKey, { nvId, taskId, week, month, timer: null });
      commitBatchCell(cellKey);
      return;
    }
    const timer = setTimeout(() => commitBatchCell(cellKey), 600);
    batchDebounceByKey.set(cellKey, { nvId, taskId, week, month, timer });
  };

  document.querySelectorAll('[data-batch-cell-input],[data-batch-cell-target]').forEach((input) => {
    input.addEventListener('input', () => scheduleBatchCell(input));
    input.addEventListener('change', () => scheduleBatchCell(input, { immediate: true }));
    input.addEventListener('blur', () => scheduleBatchCell(input, { immediate: true }));
  });

  // Flush mọi batch cell pending trước khi navigate/đóng tab.
  const flushAllBatchCells = () => {
    Array.from(batchDebounceByKey.keys()).forEach((cellKey) => commitBatchCell(cellKey));
  };
  window.addEventListener('beforeunload', flushAllBatchCells);
  window.addEventListener('pagehide', flushAllBatchCells);

  // === Đổi phòng ban / tuần trong trang batch entry — reload URL với query mới ===
  document.querySelectorAll('[data-batch-dept-select]').forEach((select) => {
    select.addEventListener('change', () => {
      flushAllBatchCells();
      const url = new URL(window.location.href);
      url.searchParams.set('dept', select.value);
      window.location.href = url.pathname + url.search;
    });
  });

  // === Kenh lead filter pills in NV detail KH tab ===
  document.querySelectorAll('[data-kenh-filter]').forEach((pill) => {
    pill.addEventListener('click', () => {
      const parent = pill.closest('[data-tab-panel]') || document;
      parent.querySelectorAll('[data-kenh-filter]').forEach((p) => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      const kenhVal = pill.getAttribute('data-kenh-filter');
      document.querySelectorAll('[data-kh-card]').forEach((card) => {
        const cardKenh = card.getAttribute('data-kenh-lead') || '';
        card.style.display = cardKenh === kenhVal ? '' : 'none';
      });
      // Reset status pills (2 filter cùng lúc gây nhầm lẫn)
      parent.querySelectorAll('[data-kh-filter]').forEach((p) => p.classList.remove('is-active'));
    });
  });

  // === Tabs ===
  document.querySelectorAll('[data-tab-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-tab-target');
      const group = button.closest('[role="tablist"]');
      if (!group) return;
      group.querySelectorAll('[data-tab-target]').forEach((node) => {
        node.classList.toggle('is-active', node === button);
      });
      document.querySelectorAll('[data-tab-panel]').forEach((panel) => {
        panel.classList.toggle('is-hidden', panel.getAttribute('data-tab-panel') !== target);
      });
    });
  });

  // === Search inputs ===
  document.querySelectorAll('[data-employee-search]').forEach((input) => {
    input.addEventListener('input', filterEmployeeCards);
  });
  document.querySelectorAll('[data-customer-search],[data-customer-status],[data-customer-nv],[data-customer-payment]').forEach((input) => {
    input.addEventListener('input', filterCustomerRows);
    input.addEventListener('change', filterCustomerRows);
  });
  document.querySelectorAll('[data-cskh-search]').forEach((input) => {
    input.addEventListener('input', filterCskhCards);
  });

  // === Xe catalog filters ===
  document.querySelectorAll('[data-xe-search],[data-xe-status]').forEach((input) => {
    input.addEventListener('input', filterXeRows);
    input.addEventListener('change', filterXeRows);
  });

  // Brand chips: toggle is-active rồi filter
  const brandChips = document.querySelectorAll('[data-xe-brand-chip]');
  if (brandChips.length) {
    const defaultChip = document.querySelector('[data-xe-brand-chip][data-value="all"]');
    if (defaultChip) defaultChip.classList.add('is-active');
    brandChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        brandChips.forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        filterXeRows();
      });
    });
  }

  // === Range picker — lưu sessionStorage rồi rerender ===
  document.querySelectorAll('[data-range-picker]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const newRange = parseRangeValue(sel.value);
      if (newRange) {
        saveRange(newRange);
        rerenderApp();
      }
    });
  });

  // === KPI card toggle expand/collapse ===
  document.querySelectorAll('[data-kpi-toggle]').forEach((header) => {
    const toggleKpiCard = () => {
      const field = header.getAttribute('data-kpi-toggle');
      const card = header.closest('[data-kpi-card]');
      const expand = card?.querySelector(`[data-kpi-expand="${CSS.escape(field)}"]`);
      if (!card || !expand) return;

      const shouldExpand = !card.classList.contains('is-expanded');
      document.querySelectorAll('[data-kpi-card].is-expanded').forEach((openCard) => {
        if (openCard === card) return;
        openCard.classList.remove('is-expanded');
        openCard.querySelector('[data-kpi-expand]')?.classList.add('is-hidden');
        openCard.querySelector('[data-kpi-toggle]')?.setAttribute('aria-expanded', 'false');
      });

      card.classList.toggle('is-expanded', shouldExpand);
      expand.classList.toggle('is-hidden', !shouldExpand);
      header.setAttribute('aria-expanded', shouldExpand ? 'true' : 'false');

      if (shouldExpand) {
        window.setTimeout(() => {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    };

    header.addEventListener('click', toggleKpiCard);
    header.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleKpiCard();
    });
  });
}
