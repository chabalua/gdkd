// assets/modals/employee.js
import {
  showModal, closeModal, getModalRoot,
  escapeHtml, trimmedValue, numberValue, makeId, getCurrentMonth,
  createField, createSelectField,
} from '../ui.js';
import { ensureEmployeeMonth, NV_STATUS_META, LOAI_NHAN_SU_META, DEFAULT_LEAD_CHANNELS, getLeadChannels, ACTIVITY_UNIT_META, getEmployeeGroups, getActiveMonth } from '../models.js';
import { appState, persistFile, rerenderApp } from '../app.js';

function createEmployeeDraft(existing) {
  const month = getActiveMonth(appState.data);
  const channels = getLeadChannels(appState.data);
  const employee = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: makeId('nv'),
    ho_ten: '',
    anh: '',
    chuc_vu: 'Nhân viên kinh doanh',
    sdt: '',
    nhom_id: getEmployeeGroups(appState.data)[0]?.id || 'nhom_1',
    loai_nhan_su: 'chinh_thuc',
    ngay_vao: '',
    trang_thai: 'dang_lam',
    lead_theo_thang: {},
    noi_dung: {},
    kpi_tuan: {},
    du_ky_tuan_nay: [],
  };
  if (!employee.trang_thai) employee.trang_thai = 'dang_lam';
  if (!employee.loai_nhan_su) employee.loai_nhan_su = 'chinh_thuc';
  if (!employee.nhom_id) employee.nhom_id = getEmployeeGroups(appState.data)[0]?.id || 'nhom_1';
  ensureEmployeeMonth(employee, month, channels);
  return employee;
}

export function openEmployeeModal(employeeId) {
  const existing = appState.data.nhanVien.nhan_vien.find((item) => item.id === employeeId);
  const draft = createEmployeeDraft(existing);
  const month = getActiveMonth(appState.data);
  const channels = getLeadChannels(appState.data);
  const groups = getEmployeeGroups(appState.data);

  showModal([
    `<h3 class="modal-title">${existing ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}</h3>`,
    '<form data-employee-form class="stack-list form-grid-two">',
    `<input type="hidden" name="employee_id" value="${escapeHtml(draft.id)}">`,
    createField('Họ tên', 'ho_ten', 'text', draft.ho_ten, 'required'),
    createField('Chức vụ', 'chuc_vu', 'text', draft.chuc_vu || 'Nhân viên kinh doanh'),
    createField('Số điện thoại', 'sdt', 'tel', draft.sdt, 'placeholder="09..."'),
    createSelectField('Nhóm kinh doanh', 'nhom_id', groups.map((group) => ({ value: group.id, label: group.ten })), draft.nhom_id || groups[0]?.id || 'nhom_1'),
    createSelectField('Loại nhân sự', 'loai_nhan_su', Object.entries(LOAI_NHAN_SU_META).map(([value, meta]) => ({ value, label: meta[0] })), draft.loai_nhan_su || 'chinh_thuc'),
    createField('Ngày vào làm', 'ngay_vao', 'date', draft.ngay_vao || ''),
    createSelectField('Trạng thái', 'trang_thai', Object.entries(NV_STATUS_META).map(([value, meta]) => ({ value, label: meta[0] })), draft.trang_thai || 'dang_lam'),
    '<div class="field" style="grid-column:1/-1">',
    '<div class="field-label">Dữ liệu tháng</div>',
    '<div class="field-help" style="color:var(--text-muted);font-size:.9rem">Lead, KPI tuần, nội dung và khách hàng được nhập trong trang Chi tiết nhân viên để dashboard tự derive từ cùng một nguồn dữ liệu.</div>',
    '</div>',
    '<div class="button-row">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    `<button type="submit" class="btn btn-primary">${existing ? 'Lưu thay đổi' : 'Tạo nhân viên'}</button>`,
    '</div>',
    '</form>',
  ].join(''), { cardClass: 'is-wide' });

  const root = getModalRoot();
  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });
  root.querySelector('[data-employee-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const employee = createEmployeeDraft(existing);
    employee.id = trimmedValue(formData, 'employee_id');
    employee.ho_ten = trimmedValue(formData, 'ho_ten');
    employee.chuc_vu = trimmedValue(formData, 'chuc_vu') || 'Nhân viên kinh doanh';
    employee.sdt = trimmedValue(formData, 'sdt');
    employee.nhom_id = trimmedValue(formData, 'nhom_id') || groups[0]?.id || 'nhom_1';
    employee.loai_nhan_su = trimmedValue(formData, 'loai_nhan_su') || 'chinh_thuc';
    employee.ngay_vao = trimmedValue(formData, 'ngay_vao');
    employee.trang_thai = trimmedValue(formData, 'trang_thai') || 'dang_lam';
    ensureEmployeeMonth(employee, month, channels);

    if (existing) {
      const index = appState.data.nhanVien.nhan_vien.findIndex((item) => item.id === existing.id);
      appState.data.nhanVien.nhan_vien[index] = employee;
    } else {
      appState.data.nhanVien.nhan_vien.push(employee);
    }
    closeModal();
    await persistFile('nhan-vien.json', appState.data.nhanVien, existing ? 'Đã cập nhật nhân viên.' : 'Đã thêm nhân viên.');
    rerenderApp();
  });
}

// === Modal Quản lý tích hợp: Mục tiêu + Kênh lead ===
export function openManageModal(nvId) {
  const nv = appState.data.nhanVien.nhan_vien.find((n) => n.id === nvId);
  if (!nv) return;
  const month = getActiveMonth(appState.data);
  let channels = getLeadChannels(appState.data).map((channel) => ({ ...channel }));
  ensureEmployeeMonth(nv, month, channels);
  const lead = nv.lead_theo_thang[month];
  const [yr, mn] = month.split('-');
  let nextNewId = 1;

  const LOAI_OPTIONS = [
    { value: 'lead', label: 'Kênh lead' },
    { value: 'hoat_dong', label: 'Chỉ tiêu hoạt động' },
  ];

  const DON_VI_OPTIONS = Object.entries(ACTIVITY_UNIT_META).map(([value, label]) => ({ value, label }));

  function renderChannelRows(list) {
    return list.map((ch, i) => [
      `<div class="channel-edit-row" data-channel-index="${i}">`,
      `<input class="input" type="text" value="${escapeHtml(ch.label)}" data-channel-label data-idx="${i}" placeholder="Tên nội dung">`,
      `<select class="select" data-channel-loai data-idx="${i}">`,
      LOAI_OPTIONS.map((opt) => `<option value="${opt.value}"${(ch.loai || 'lead') === opt.value ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`).join(''),
      '</select>',
      `<select class="select" data-channel-unit data-idx="${i}" ${(ch.loai || 'lead') === 'hoat_dong' ? '' : 'disabled'}>`,
      DON_VI_OPTIONS.map((opt) => `<option value="${opt.value}"${(ch.don_vi || 'so') === opt.value ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`).join(''),
      '</select>',
      `<input class="input" type="number" min="0" ${ch.don_vi === 'gio' ? 'step="0.5"' : ch.don_vi === 'tien' ? 'step="1000"' : ''} name="ch_${escapeHtml(ch.id)}" value="${escapeHtml(lead[ch.id]?.muc_tieu || 0)}" placeholder="Mục tiêu">`,
      `<button type="button" class="btn btn-ghost btn-sm" data-delete-channel="${i}" title="Xoá nội dung này">✕</button>`,
      '</div>',
    ].join('')).join('');
  }

  function slugify(label) {
    return label.normalize('NFD').replace(/[\u0300-\u036f\u1ea0-\u1ef9]/g, '').replace(/[đĐ]/g, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || `ch_${Date.now()}`;
  }

  showModal([
    `<h3 class="modal-title">⚙ Quản lý — Tháng ${parseInt(mn, 10)}/${yr}</h3>`,
    `<p class="modal-copy">Nhân viên: <strong>${escapeHtml(nv.ho_ten)}</strong></p>`,
    '<form data-manage-form class="stack-list form-grid-two">',
    `<input type="hidden" name="nv_id" value="${escapeHtml(nvId)}">`,
    '<div class="field" style="grid-column:1/-1">',
    '<div class="field-label">Danh sách nội dung lead / hoạt động</div>',
    '<div class="modal-copy" style="margin:0">Mỗi dòng gồm tên nội dung, loại, đơn vị và mục tiêu. Nếu là chỉ tiêu hoạt động, chọn đơn vị giờ, lượt hoặc tiền để toàn bộ app và dashboard hiểu đúng dữ liệu.</div>',
    '</div>',
    '<div class="channel-manage-head" style="grid-column:1/-1">',
    '<span>Tên nội dung</span><span>Loại</span><span>Đơn vị</span><span>Mục tiêu</span><span></span>',
    '</div>',
    '<div data-channels-list class="channel-manage-list" style="grid-column:1/-1">',
    renderChannelRows(channels),
    '</div>',
    '<div class="channel-add-row" style="grid-column:1/-1">',
    '<input class="input" type="text" id="new-channel-name" placeholder="Tên nội dung mới...">',
    '<select class="select" id="new-channel-loai">',
    LOAI_OPTIONS.map((opt) => `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`).join(''),
    '</select>',
    '<select class="select" id="new-channel-unit">',
    DON_VI_OPTIONS.map((opt) => `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`).join(''),
    '</select>',
    '<button type="button" class="btn btn-soft" data-add-channel>+ Thêm</button>',
    '</div>',
    '<div class="button-row" style="grid-column:1/-1">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    '<button type="submit" class="btn btn-primary">Lưu tất cả</button>',
    '</div></form>',
  ].join(''), { cardClass: 'is-wide' });

  const root = getModalRoot();
  const listEl = root.querySelector('[data-channels-list]');
  const newNameInput = root.querySelector('#new-channel-name');
  const newLoaiSelect = root.querySelector('#new-channel-loai');
  const newUnitSelect = root.querySelector('#new-channel-unit');

  function syncUnitState(row) {
    const loaiSelect = row.querySelector('[data-channel-loai]');
    const unitSelect = row.querySelector('[data-channel-unit]');
    if (!loaiSelect || !unitSelect) return;
    const isActivity = loaiSelect.value === 'hoat_dong';
    unitSelect.disabled = !isActivity;
    if (!isActivity) {
      unitSelect.value = 'so';
    }
  }

  function refreshList() {
    listEl.innerHTML = renderChannelRows(channels);
    listEl.querySelectorAll('.channel-edit-row').forEach((row) => {
      syncUnitState(row);
      row.querySelector('[data-channel-loai]')?.addEventListener('change', () => syncUnitState(row));
    });
    listEl.querySelectorAll('[data-delete-channel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-delete-channel'));
        channels.splice(idx, 1);
        refreshList();
      });
    });
  }
  refreshList();

  root.querySelector('[data-add-channel]').addEventListener('click', () => {
    const label = newNameInput.value.trim();
    if (!label) return;
    const existingIds = channels.map((c) => c.id);
    let id = slugify(label);
    while (existingIds.includes(id)) id = `${id}_${nextNewId++}`;
    const loai = newLoaiSelect.value === 'hoat_dong' ? 'hoat_dong' : 'lead';
    channels.push({ id, label, loai, don_vi: loai === 'hoat_dong' ? (newUnitSelect.value || 'so') : 'so' });
    newNameInput.value = '';
    refreshList();
  });

  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });

  root.querySelector('[data-manage-form]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);

    // 1. Collect edited channel labels + loai from DOM
    const labelInputs = listEl.querySelectorAll('[data-channel-label]');
    const loaiSelects = listEl.querySelectorAll('[data-channel-loai]');
    labelInputs.forEach((inp) => {
      const idx = Number(inp.getAttribute('data-idx'));
      if (channels[idx]) channels[idx].label = inp.value.trim() || channels[idx].label;
    });
    loaiSelects.forEach((sel) => {
      const idx = Number(sel.getAttribute('data-idx'));
      if (channels[idx]) channels[idx].loai = sel.value;
    });
    listEl.querySelectorAll('[data-channel-unit]').forEach((sel) => {
      const idx = Number(sel.getAttribute('data-idx'));
      if (channels[idx]) channels[idx].don_vi = channels[idx].loai === 'hoat_dong' ? (sel.value || 'so') : 'so';
    });
    appState.data.config.lead_channels = channels;

    // 2. Update mục tiêu in nv data
    const nvIdx = appState.data.nhanVien.nhan_vien.findIndex((n) => n.id === nvId);
    if (nvIdx >= 0) {
      const emp = appState.data.nhanVien.nhan_vien[nvIdx];
      ensureEmployeeMonth(emp, month, channels);
      channels.forEach((ch) => {
        if (!emp.lead_theo_thang[month][ch.id]) emp.lead_theo_thang[month][ch.id] = { muc_tieu: 0, tuan: {} };
        emp.lead_theo_thang[month][ch.id].muc_tieu = numberValue(fd.get(`ch_${ch.id}`));
      });
    }

    closeModal();
    // Save both config (channels) and nv data
    await persistFile('config.json', appState.data.config, null);
    await persistFile('nhan-vien.json', appState.data.nhanVien, 'Đã lưu mục tiêu và danh sách kênh.');
    rerenderApp();
  });
}

// openLeadModal — alias for backward compat
export function openLeadModal(nvId) { openManageModal(nvId); }
// openManageChannelsModal — alias for backward compat
export function openManageChannelsModal() { openManageModal(new URLSearchParams(window.location.search).get('id') || ''); }
// openContentModal — kept for backward compat
export function openContentModal() {}
