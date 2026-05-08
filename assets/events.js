// assets/events.js
// Event delegation cho mọi data-action trên các trang đã render.
// Tách khỏi app.js để mỗi file < 350 dòng. Không có state riêng — đọc state
// qua import từ app.js (ESM live binding).

import { clearToken } from './api.js';
import { showToast, confirmAction, showModal, getModalRoot, closeModal, saveRange, parseRangeValue, calcPercent, getPercentClass } from './ui.js';
import { TODO_MESSAGE, countKhByXeId } from './models.js';

import { openRepoSettingsModal } from './modals/repo-settings.js';
import { openSetupMucTieuModal } from './modals/setup-muc-tieu.js';
import { openXeModal } from './modals/xe.js';
import { openEmployeeModal, openLeadModal, openManageChannelsModal, openManageModal } from './modals/employee.js';
import { openCustomerModal } from './modals/customer.js';
import { openCskhModal } from './modals/cskh.js';
import { renderNotificationsPanel } from './modals/notifications.js';

import { filterXeRows } from './views/xe.js';

import { appState, persistFile, rerenderApp } from './app.js';

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

  document.querySelectorAll('[data-customer-row]').forEach((row) => {
    const haystack = row.getAttribute('data-search') || '';
    const rowStatus = row.getAttribute('data-status') || '';
    const rowNv = row.getAttribute('data-nv') || '';
    const rowPayment = row.getAttribute('data-payment') || '';
    const visible =
      (!query || haystack.includes(query)) &&
      (statusValue === 'all' || rowStatus === statusValue) &&
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
  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener('click', () => {
      confirmAction('Bạn muốn đăng xuất khỏi ứng dụng?', () => {
        clearToken();
        window.location.href = 'login.html';
      });
    });
  });

  document.querySelectorAll('[data-action="open-settings"]').forEach((button) => {
    button.addEventListener('click', openRepoSettingsModal);
  });

  document.querySelectorAll('[data-action="show-notifications"]').forEach((button) => {
    button.addEventListener('click', () => renderNotificationsPanel(data));
  });

  // open-kpi-form và reset-kpi đã xoá (bước 6 — KPI là derive, không gõ tay)

  document.querySelectorAll('[data-action="open-setup-muc-tieu"]').forEach((button) => {
    button.addEventListener('click', openSetupMucTieuModal);
  });

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
    button.addEventListener('click', () => openManageModal(
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
      const filterVal = pill.getAttribute('data-kh-filter');
      document.querySelectorAll('[data-kh-card]').forEach((card) => {
        const cardFilter = card.getAttribute('data-filter') || '';
        card.style.display = (filterVal === 'all' || cardFilter === filterVal) ? '' : 'none';
      });
    });
  });

  // === Lead thực tế inline autosave (Tab 1 NV detail — nhập theo tuần) ===
  let leadDebounceTimer = null;
  const getActiveLeadInputs = (selector) => {
    const allInputs = Array.from(document.querySelectorAll(selector));
    const visibleInputs = allInputs.filter((element) => element.offsetParent !== null);
    return visibleInputs.length ? visibleInputs : allInputs;
  };
  document.querySelectorAll('[data-lead-tt-input]').forEach((input) => {
    const syncLeadInput = () => {
      const field = input.getAttribute('data-field');
      const tuan = input.getAttribute('data-tuan');
      const targetVal = Number(input.getAttribute('data-target') || 0);
      const unit = input.getAttribute('data-unit') || 'so';
      const isLeadChannel = input.getAttribute('data-lead-channel') === 'true';
      // Update row total cell
      const rowTotalCells = document.querySelectorAll(`[data-lead-total-field="${field}"]`);
      if (rowTotalCells.length) {
        const rowInputs = getActiveLeadInputs(`[data-lead-tt-input][data-field="${field}"]`);
        const rowSum = Array.from(rowInputs).reduce((s, inp) => s + Math.max(0, Number(inp.value || 0)), 0);
        rowTotalCells.forEach((cell) => {
          cell.textContent = unit === 'tien' ? `${rowSum.toLocaleString('vi-VN')} đ` : rowSum;
        });
        // Update % cell
        const pctCells = document.querySelectorAll(`[data-pct-cell="${field}"]`);
        pctCells.forEach((cell) => {
          const pctText = targetVal ? calcPercent(rowSum, targetVal) + '%' : '—';
          cell.textContent = pctText;
          const badge = cell.closest('.badge');
          if (badge) {
            badge.classList.remove('is-success', 'is-warning', 'is-danger');
            if (targetVal) badge.classList.add(getPercentClass(calcPercent(rowSum, targetVal)));
          }
        });
      }
      // Update per-week lead total (only for lead channels)
      if (isLeadChannel) {
        const weekInputs = getActiveLeadInputs(`[data-lead-tt-input][data-lead-channel="true"][data-tuan="${tuan}"]`);
        const weekSum = Array.from(weekInputs).reduce((s, inp) => s + Math.max(0, Number(inp.value || 0)), 0);
        const weekCell = document.querySelector(`[data-week-lead-total="${tuan}"]`);
        if (weekCell) weekCell.innerHTML = `<strong>${weekSum}</strong>`;
        // Grand total
        const allLeadInputs = getActiveLeadInputs('[data-lead-tt-input][data-lead-channel="true"]');
        const grandTotal = Array.from(allLeadInputs).reduce((s, inp) => s + Math.max(0, Number(inp.value || 0)), 0);
        const grandCell = document.querySelector('[data-all-lead-total]');
        if (grandCell) grandCell.innerHTML = `<strong>${grandTotal}</strong>`;
      }
      // Debounce save
      clearTimeout(leadDebounceTimer);
      leadDebounceTimer = setTimeout(async () => {
        const nvId = input.getAttribute('data-nv-id');
        const month = appState.data.config.thang_hien_tai;
        const nvIdx = appState.data.nhanVien.nhan_vien.findIndex((n) => n.id === nvId);
        if (nvIdx < 0) return;
        const emp = appState.data.nhanVien.nhan_vien[nvIdx];
        if (!emp.lead_theo_thang) emp.lead_theo_thang = {};
        if (!emp.lead_theo_thang[month]) emp.lead_theo_thang[month] = {};
        const leadBlock = emp.lead_theo_thang[month];
        // Collect all values from DOM for the same field
        getActiveLeadInputs(`[data-lead-tt-input][data-field="${field}"]`).forEach((inp) => {
          const t = inp.getAttribute('data-tuan');
          const v = Math.max(0, Number(inp.value || 0));
          if (!leadBlock[field]) leadBlock[field] = { tuan: {} };
          if (!leadBlock[field].tuan) leadBlock[field].tuan = {};
          leadBlock[field].tuan[t] = v;
        });
        await persistFile('nhan-vien.json', appState.data.nhanVien, null); // silent save
      }, 600);
    };
    input.addEventListener('input', syncLeadInput);
    input.addEventListener('change', syncLeadInput);
  });

  // === Content (video) inline autosave (Tab 2 NV detail) ===
  let contentDebounceTimer = null;
  document.querySelectorAll('[data-content-input]').forEach((input) => {
    input.addEventListener('input', () => {
      clearTimeout(contentDebounceTimer);
      contentDebounceTimer = setTimeout(async () => {
        const nvId = input.getAttribute('data-nv-id');
        const month = appState.data.config.thang_hien_tai;
        const nvIdx = appState.data.nhanVien.nhan_vien.findIndex((n) => n.id === nvId);
        if (nvIdx < 0) return;
        const emp = appState.data.nhanVien.nhan_vien[nvIdx];
        if (!emp.noi_dung) emp.noi_dung = {};
        if (!emp.noi_dung[month]) emp.noi_dung[month] = {};
        const cnt = emp.noi_dung[month];
        document.querySelectorAll('[data-content-input]').forEach((inp) => {
          const t = inp.getAttribute('data-type');
          const val = Math.max(0, Number(inp.value || 0));
          if (t && t.startsWith('video_')) {
            if (!cnt.videos) cnt.videos = {};
            cnt.videos[t.replace('video_', '')] = val;
          }
        });
        await persistFile('nhan-vien.json', appState.data.nhanVien, null); // silent
      }, 600);
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
        card.style.display = (kenhVal === 'all' || cardKenh === kenhVal) ? '' : 'none';
      });
      // Reset status pills
      const parent2 = pill.closest('[data-tab-panel]') || document;
      parent2.querySelectorAll('[data-kh-filter]').forEach((p) => p.classList.remove('is-active'));
    });
  });

  // === Weekly target inline autosave (Tab 3 NV detail) ===
  let weekDebounceTimer = null;
  document.querySelectorAll('[data-week-input]').forEach((input) => {
    input.addEventListener('input', () => {
      clearTimeout(weekDebounceTimer);
      weekDebounceTimer = setTimeout(async () => {
        const nvId = input.getAttribute('data-nv-id');
        const tuan = Number(input.getAttribute('data-tuan'));
        const value = Math.max(0, Number(input.value || 0));
        const month = appState.data.config.thang_hien_tai;
        const nvIdx = appState.data.nhanVien.nhan_vien.findIndex((n) => n.id === nvId);
        if (nvIdx < 0) return;
        const emp = appState.data.nhanVien.nhan_vien[nvIdx];
        if (!emp.kpi_tuan) emp.kpi_tuan = {};
        if (!emp.kpi_tuan[month]) emp.kpi_tuan[month] = [];
        const weekIdx = emp.kpi_tuan[month].findIndex((e) => e.tuan === tuan);
        if (weekIdx >= 0) {
          emp.kpi_tuan[month][weekIdx].muc_tieu_nv = value;
        } else {
          emp.kpi_tuan[month].push({ tuan, muc_tieu_nv: value });
        }
        await persistFile('nhan-vien.json', appState.data.nhanVien, `Đã lưu mục tiêu tuần ${tuan}.`);
      }, 600);
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
