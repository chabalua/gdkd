// assets/modals/employee.js
import {
  showModal, closeModal, getModalRoot,
  escapeHtml, trimmedValue, numberValue, makeId, getCurrentMonth, showToast,
  createField, createSelectField, renderIcon,
} from '../ui.js';
import { ensureEmployeeMonth, NV_STATUS_META, LOAI_NHAN_SU_META, DEFAULT_LEAD_CHANNELS, getLeadChannels, ACTIVITY_UNIT_META, getEmployeeGroups, getActiveMonth, getEmployeeTaskMonthTarget, setEmployeeTaskMonthTarget } from '../models.js';
import { appState, persistFile, rerenderApp } from '../app.js';

function getDepartmentDrafts() {
  if (Array.isArray(appState.data?.config?.phong_ban) && appState.data.config.phong_ban.length) {
    return appState.data.config.phong_ban.map((department, index) => ({
      id: department?.id || `phong_ban_${index + 1}`,
      ten: department?.ten || `Phòng ban ${index + 1}`,
      loai: department?.loai || 'ban_hang',
    }));
  }
  return getEmployeeGroups(appState.data).map((group, index) => ({
    id: group?.id || `phong_ban_${index + 1}`,
    ten: group?.ten || `Phòng ban ${index + 1}`,
    loai: 'ban_hang',
  }));
}

function makeDepartmentId(label) {
  const base = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base ? `pb_${base}` : `pb_${Date.now()}`;
}

function syncTaskLibraryForDepartments(previousDepartments, nextDepartments) {
  const previousMap = new Map(previousDepartments.map((department) => [department.id, department]));
  const nextMap = new Map(nextDepartments.map((department) => [department.id, department]));
  const removedIds = previousDepartments
    .filter((department) => !nextMap.has(department.id))
    .map((department) => department.id);
  const previousSalesIds = previousDepartments
    .filter((department) => (department.loai || 'ban_hang') !== 'ho_tro')
    .map((department) => department.id);
  const addedSalesIds = nextDepartments
    .filter((department) => !previousMap.has(department.id) && (department.loai || 'ban_hang') !== 'ho_tro')
    .map((department) => department.id);

  return (appState.data.config.nhiem_vu_lib || []).map((task) => {
    const currentIds = Array.isArray(task?.phong_ban_ids) ? task.phong_ban_ids.filter(Boolean) : [];
    const nextIds = new Set(currentIds);
    removedIds.forEach((departmentId) => nextIds.delete(departmentId));
    const isSalesTask = previousSalesIds.some((departmentId) => nextIds.has(departmentId));
    if (isSalesTask) {
      addedSalesIds.forEach((departmentId) => nextIds.add(departmentId));
    }
    return {
      ...task,
      phong_ban_ids: Array.from(nextIds),
    };
  });
}

function getTaskIdsForDepartment(departmentId) {
  return (appState.data?.config?.nhiem_vu_lib || [])
    .filter((task) => Array.isArray(task?.phong_ban_ids) && task.phong_ban_ids.includes(departmentId))
    .map((task) => task.id);
}

function createEmployeeDraft(existing) {
  const month = getActiveMonth(appState.data);
  const channels = getLeadChannels(appState.data);
  const defaultDepartmentId = getEmployeeGroups(appState.data)[0]?.id || 'kd_1';
  const employee = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: makeId('nv'),
    ho_ten: '',
    anh: '',
    chuc_vu: 'Nhân viên kinh doanh',
    sdt: '',
    nhom_id: defaultDepartmentId,
    phong_ban_id: defaultDepartmentId,
    loai_nhan_su: 'chinh_thuc',
    ngay_vao: '',
    trang_thai: 'dang_lam',
    nhiem_vu_ids: [],
    lead_theo_thang: {},
    noi_dung: {},
    kpi_tuan: {},
    du_lieu: {},
    du_ky_tuan_nay: [],
  };
  if (!employee.trang_thai) employee.trang_thai = 'dang_lam';
  if (!employee.loai_nhan_su) employee.loai_nhan_su = 'chinh_thuc';
  if (!employee.nhom_id) employee.nhom_id = employee.phong_ban_id || defaultDepartmentId;
  if (!employee.phong_ban_id) employee.phong_ban_id = employee.nhom_id || defaultDepartmentId;
  ensureEmployeeMonth(employee, month, channels);
  return employee;
}

export function openEmployeeModal(employeeId) {
  const existing = appState.data.nhanVien.nhan_vien.find((item) => item.id === employeeId);
  const draft = createEmployeeDraft(existing);
  const month = getActiveMonth(appState.data);
  const channels = getLeadChannels(appState.data);
  const groups = getDepartmentDrafts();

  showModal([
    `<h3 class="modal-title">${existing ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}</h3>`,
    '<form data-employee-form class="stack-list form-grid-two">',
    `<input type="hidden" name="employee_id" value="${escapeHtml(draft.id)}">`,
    createField('Họ tên', 'ho_ten', 'text', draft.ho_ten, 'required'),
    createField('Chức vụ', 'chuc_vu', 'text', draft.chuc_vu || 'Nhân viên kinh doanh'),
    createField('Số điện thoại', 'sdt', 'tel', draft.sdt, 'placeholder="09..."'),
    createSelectField('Nhóm / phòng ban', 'nhom_id', groups.map((group) => ({ value: group.id, label: group.ten })), draft.phong_ban_id || draft.nhom_id || groups[0]?.id || 'kd_1'),
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
  const formEl = root.querySelector('[data-employee-form]');

  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });
  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const employee = createEmployeeDraft(existing);
    employee.id = trimmedValue(formData, 'employee_id');
    employee.ho_ten = trimmedValue(formData, 'ho_ten');
    employee.chuc_vu = trimmedValue(formData, 'chuc_vu') || 'Nhân viên kinh doanh';
    employee.sdt = trimmedValue(formData, 'sdt');
    employee.nhom_id = trimmedValue(formData, 'nhom_id') || groups[0]?.id || 'kd_1';
    employee.phong_ban_id = employee.nhom_id;
    employee.loai_nhan_su = trimmedValue(formData, 'loai_nhan_su') || 'chinh_thuc';
    employee.ngay_vao = trimmedValue(formData, 'ngay_vao');
    employee.trang_thai = trimmedValue(formData, 'trang_thai') || 'dang_lam';
    const previousDepartmentId = existing?.phong_ban_id || existing?.nhom_id || '';
    const defaultTaskIds = getTaskIdsForDepartment(employee.phong_ban_id);
    if (!existing || previousDepartmentId !== employee.phong_ban_id || !Array.isArray(employee.nhiem_vu_ids) || !employee.nhiem_vu_ids.length) {
      employee.nhiem_vu_ids = defaultTaskIds;
    }
    ensureEmployeeMonth(employee, month, channels);

    if (existing) {
      const index = appState.data.nhanVien.nhan_vien.findIndex((item) => item.id === existing.id);
      if (index < 0) {
        showToast('Không tìm thấy nhân viên để cập nhật. Hãy tải lại trang.', 'error');
        return;
      }
      appState.data.nhanVien.nhan_vien[index] = employee;
    } else {
      appState.data.nhanVien.nhan_vien.push(employee);
    }
    closeModal();
    await persistFile('nhan-vien.json', appState.data.nhanVien, existing ? 'Đã cập nhật nhân viên.' : 'Đã thêm nhân viên.');
    rerenderApp();
  });
}

export function openGroupManagerModal() {
  const originalDepartments = getDepartmentDrafts();
  const groups = originalDepartments.map((department) => ({ ...department }));

  showModal([
    '<h3 class="modal-title">Quản lý nhóm / phòng ban</h3>',
    '<form data-group-manager-form class="stack-list">',
    '<div class="field">',
    '<div class="field-help" style="color:var(--text-muted);font-size:.9rem">Danh sách nhóm đang có. Có thể thêm mới, đổi tên và xoá nếu chưa có nhân viên sử dụng.</div>',
    '<div data-group-list class="stack-list" style="margin-top:.75rem"></div>',
    '<div class="button-row" style="margin-top:.75rem">',
    '<input class="input" type="text" id="new-group-name" placeholder="Ví dụ: Kinh doanh 3">',
    '<button type="button" class="btn btn-primary" data-add-group>Thêm vào danh sách</button>',
    '</div>',
    '</div>',
    '<div class="button-row">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    '<button type="submit" class="btn btn-primary">Lưu danh sách nhóm</button>',
    '</div>',
    '</form>',
  ].join(''), { cardClass: 'is-wide' });

  const root = getModalRoot();
  const formEl = root.querySelector('[data-group-manager-form]');
  const groupList = root.querySelector('[data-group-list]');
  const newGroupInput = root.querySelector('#new-group-name');

  function getAssignedCount(groupId) {
    return (appState.data.nhanVien?.nhan_vien || []).filter((employee) => (employee.phong_ban_id || employee.nhom_id) === groupId).length;
  }

  function renderGroupList() {
    groupList.innerHTML = groups.map((group, index) => {
      const assignedCount = getAssignedCount(group.id);
      const usageLabel = assignedCount ? `${assignedCount} NV đang dùng` : 'Chưa có NV';
      const canDelete = groups.length > 1 && assignedCount === 0;
      const deleteLabel = assignedCount > 0 ? 'Đang dùng' : 'Xoá';
      const deleteTitle = groups.length <= 1
        ? 'Cần giữ lại ít nhất 1 nhóm / phòng ban.'
        : (assignedCount > 0 ? 'Nhóm này đang có nhân viên sử dụng.' : 'Xoá nhóm này');
      return [
        '<div class="button-row" style="align-items:center;margin-top:.5rem">',
        `<input class="input" type="text" value="${escapeHtml(group.ten)}" data-group-name data-idx="${index}" aria-label="Tên nhóm ${index + 1}">`,
        `<span class="badge">${escapeHtml(usageLabel)}</span>`,
        `<button type="button" class="btn btn-ghost" data-delete-group="${index}" data-can-delete="${canDelete ? 'true' : 'false'}" title="${escapeHtml(deleteTitle)}">${deleteLabel}</button>`,
        '</div>',
      ].join('');
    }).join('');

    groupList.querySelectorAll('[data-group-name]').forEach((input) => {
      input.addEventListener('input', () => {
        const index = Number(input.getAttribute('data-idx'));
        if (!groups[index]) return;
        groups[index].ten = input.value;
      });
    });

    groupList.querySelectorAll('[data-delete-group]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-delete-group'));
        const group = groups[index];
        if (!group) return;
        if (button.getAttribute('data-can-delete') !== 'true') {
          if (groups.length <= 1) {
            showToast('Cần giữ lại ít nhất 1 nhóm / phòng ban.', 'warning');
            return;
          }
          showToast('Nhóm này đang có nhân viên sử dụng nên chưa thể xoá.', 'warning');
          return;
        }
        if (groups.length <= 1) {
          showToast('Cần giữ lại ít nhất 1 nhóm / phòng ban.', 'warning');
          return;
        }
        if (getAssignedCount(group.id) > 0) {
          showToast('Nhóm này đang có nhân viên sử dụng nên chưa thể xoá.', 'warning');
          return;
        }
        groups.splice(index, 1);
        renderGroupList();
      });
    });
  }

  renderGroupList();

  root.querySelector('[data-add-group]').addEventListener('click', () => {
    const label = newGroupInput.value.trim();
    if (!label) {
      showToast('Nhập tên nhóm trước khi thêm.', 'warning');
      return;
    }
    if (groups.some((group) => group.ten.trim().toLowerCase() === label.toLowerCase())) {
      showToast('Tên nhóm này đã tồn tại.', 'warning');
      return;
    }
    const existingIds = new Set(groups.map((group) => group.id));
    const baseId = makeDepartmentId(label);
    let nextId = baseId;
    let suffix = 2;
    while (existingIds.has(nextId)) {
      nextId = `${baseId}_${suffix}`;
      suffix += 1;
    }
    groups.push({ id: nextId, ten: label, loai: 'ban_hang' });
    newGroupInput.value = '';
    renderGroupList();
  });

  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });
  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nextDepartments = groups.map((group, index) => ({
      id: group.id,
      ten: (group.ten || '').trim() || `Phòng ban ${index + 1}`,
      loai: group.loai || 'ban_hang',
    }));
    const seenNames = new Set();
    for (const department of nextDepartments) {
      const normalizedName = department.ten.toLowerCase();
      if (seenNames.has(normalizedName)) {
        showToast('Tên nhóm / phòng ban không được trùng nhau.', 'warning');
        return;
      }
      seenNames.add(normalizedName);
    }

    appState.data.config.phong_ban = nextDepartments;
    appState.data.config.nhom_kinh_doanh = nextDepartments.map((department) => ({ id: department.id, ten: department.ten }));
    appState.data.config.nhiem_vu_lib = syncTaskLibraryForDepartments(originalDepartments, nextDepartments);
    closeModal();
    await persistFile('config.json', appState.data.config, 'Đã lưu danh sách nhóm.');
    rerenderApp();
  });
}

export function openEmployeeTaskModal(nvId) {
  const nv = appState.data.nhanVien.nhan_vien.find((item) => item.id === nvId);
  if (!nv) return;
  const departmentId = nv.phong_ban_id || nv.nhom_id || '';
  const taskLibrary = (appState.data.config.nhiem_vu_lib || []).filter((task) =>
    Array.isArray(task?.phong_ban_ids) && task.phong_ban_ids.includes(departmentId)
  );
  const selectedIds = new Set(Array.isArray(nv.nhiem_vu_ids) ? nv.nhiem_vu_ids : getTaskIdsForDepartment(departmentId));

  showModal([
    '<h3 class="modal-title">Gán nhiệm vụ cho nhân viên</h3>',
    `<p class="modal-copy">Nhân viên: <strong>${escapeHtml(nv.ho_ten)}</strong></p>`,
    '<form data-employee-task-form class="stack-list">',
    '<div class="field">',
    '<div class="field-help" style="color:var(--text-muted);font-size:.9rem">Chỉ hiện các nhiệm vụ áp dụng cho phòng ban của nhân viên này. CRUD thư viện toàn cục được quản lý ở trang Thiết lập.</div>',
    '<div class="task-dept-picker" style="margin-top:.75rem">',
    taskLibrary.length
      ? taskLibrary.map((task) => {
        const checked = selectedIds.has(task.id);
        const unitLabel = ACTIVITY_UNIT_META[task.don_vi] || 'Số';
        const typeLabel = task.loai === 'hoat_dong' ? 'Hoạt động' : 'Lead';
        return [
          `<label class="chip-toggle${checked ? ' is-active' : ''}">`,
          `<input type="checkbox" name="task_ids" value="${escapeHtml(task.id)}"${checked ? ' checked' : ''}>`,
          `<span>${escapeHtml(task.ten)} · ${escapeHtml(typeLabel)} · ${escapeHtml(unitLabel)}</span>`,
          '</label>',
        ].join('');
      }).join('')
      : '<p class="table-empty-note">Phòng ban này chưa có nhiệm vụ nào trong thư viện. Hãy thêm ở trang Thiết lập.</p>',
    '</div>',
    '</div>',
    '<div class="button-row">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    `<button type="submit" class="btn btn-primary"${taskLibrary.length ? '' : ' disabled'}>Lưu nhiệm vụ</button>`,
    '</div>',
    '</form>',
  ].join(''), { cardClass: 'is-wide' });

  const root = getModalRoot();
  root.querySelectorAll('.chip-toggle input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', () => {
      input.closest('.chip-toggle')?.classList.toggle('is-active', input.checked);
    });
  });

  root.querySelector('[data-modal-cancel]')?.addEventListener('click', closeModal, { once: true });
  root.querySelector('[data-employee-task-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextTaskIds = formData.getAll('task_ids').map((value) => String(value));
    if (!nextTaskIds.length) {
      showToast('Chọn ít nhất 1 nhiệm vụ cho nhân viên.', 'warning');
      return;
    }
    nv.nhiem_vu_ids = nextTaskIds;
    closeModal();
    await persistFile('nhan-vien.json', appState.data.nhanVien, 'Đã cập nhật nhiệm vụ cho nhân viên.');
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
      `<input class="input" type="number" min="0" ${ch.don_vi === 'gio' ? 'step="0.5"' : ch.don_vi === 'tien' ? 'step="1000"' : ''} name="ch_${escapeHtml(ch.id)}" value="${escapeHtml(getEmployeeTaskMonthTarget(nv, month, ch.id) || 0)}" placeholder="Mục tiêu">`,
      `<button type="button" class="btn-icon is-danger" data-delete-channel="${i}" aria-label="Xoá nội dung này" title="Xoá nội dung này">${renderIcon('x', { size: 14 })}</button>`,
      '</div>',
    ].join('')).join('');
  }

  function slugify(label) {
    return label.normalize('NFD').replace(/[\u0300-\u036f\u1ea0-\u1ef9]/g, '').replace(/[đĐ]/g, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || `ch_${Date.now()}`;
  }

  showModal([
    `<h3 class="modal-title">Quản lý — Tháng ${parseInt(mn, 10)}/${yr}</h3>`,
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
    `<button type="button" class="btn btn-soft" data-add-channel>${renderIcon('plus', { size: 14 })} Thêm</button>`,
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
    const existingTaskMap = new Map((appState.data.config.nhiem_vu_lib || []).map((task) => [task.id, task]));
    appState.data.config.lead_channels = channels;
    appState.data.config.nhiem_vu_lib = channels.map((channel) => ({
      id: channel.id,
      ten: channel.label,
      loai: channel.loai === 'hoat_dong' ? 'hoat_dong' : 'lead',
      don_vi: channel.loai === 'hoat_dong' ? (channel.don_vi || 'so') : 'so',
      phong_ban_ids: Array.isArray(existingTaskMap.get(channel.id)?.phong_ban_ids) && existingTaskMap.get(channel.id).phong_ban_ids.length
        ? existingTaskMap.get(channel.id).phong_ban_ids
        : [nv.phong_ban_id || nv.nhom_id || 'kd_1'],
    }));

    // 2. Update mục tiêu in nv data
    const nvIdx = appState.data.nhanVien.nhan_vien.findIndex((n) => n.id === nvId);
    if (nvIdx >= 0) {
      const emp = appState.data.nhanVien.nhan_vien[nvIdx];
      ensureEmployeeMonth(emp, month, channels);
      channels.forEach((ch) => {
        const target = numberValue(fd.get(`ch_${ch.id}`));
        setEmployeeTaskMonthTarget(emp, month, ch.id, target);
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
