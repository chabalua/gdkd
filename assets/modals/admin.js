import { showModal, closeModal, getModalRoot, escapeHtml, showToast } from '../ui.js';
import { ACTIVITY_UNIT_META, getEmployeeGroups } from '../models.js';
import { appState, persistFile, rerenderApp } from '../app.js';

const TASK_TYPE_META = {
  lead: 'Kênh lead',
  hoat_dong: 'Chỉ tiêu hoạt động',
};

function makeTaskId(label) {
  const base = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || `task_${Date.now()}`;
}

function getTaskDrafts() {
  return (appState.data?.config?.nhiem_vu_lib || []).map((task, index) => ({
    id: task?.id || `task_${index + 1}`,
    ten: task?.ten || task?.label || `Nhiệm vụ ${index + 1}`,
    loai: task?.loai === 'hoat_dong' ? 'hoat_dong' : 'lead',
    don_vi: task?.don_vi || 'so',
    phong_ban_ids: Array.isArray(task?.phong_ban_ids) && task.phong_ban_ids.length ? task.phong_ban_ids.filter(Boolean) : [],
  }));
}

function syncEmployeesWithTaskLibrary(tasks, departments) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const validTaskIds = new Set(tasks.map((task) => task.id));
  const fallbackDepartmentId = departments[0]?.id || '';

  (appState.data?.nhanVien?.nhan_vien || []).forEach((employee) => {
    const departmentId = employee.phong_ban_id || employee.nhom_id || fallbackDepartmentId;
    const allowedTaskIds = tasks
      .filter((task) => task.phong_ban_ids.includes(departmentId))
      .map((task) => task.id);
    const currentTaskIds = Array.isArray(employee.nhiem_vu_ids) ? employee.nhiem_vu_ids : [];
    const nextTaskIds = currentTaskIds.filter((taskId) => {
      const task = taskMap.get(taskId);
      return validTaskIds.has(taskId) && task?.phong_ban_ids.includes(departmentId);
    });
    employee.nhiem_vu_ids = nextTaskIds.length ? nextTaskIds : allowedTaskIds;

    Object.values(employee.du_lieu || {}).forEach((monthBlock) => {
      Object.values(monthBlock?.tuan || {}).forEach((weekBlock) => {
        Object.keys(weekBlock || {}).forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (!task || !task.phong_ban_ids.includes(departmentId)) {
            delete weekBlock[taskId];
          }
        });
      });
    });
  });
}

export function openTaskLibraryManagerModal() {
  const departments = getEmployeeGroups(appState.data);
  const tasks = getTaskDrafts();

  showModal([
    '<h3 class="modal-title">Quản lý nhiệm vụ / kênh lead</h3>',
    '<form data-task-library-form class="stack-list">',
    '<div class="field">',
    '<div class="field-help" style="color:var(--text-muted);font-size:.9rem">Thư viện nhiệm vụ dùng chung cho toàn app. Mỗi nhiệm vụ phải gắn ít nhất 1 phòng ban để nhập tuần, tính KPI và lọc đúng mặt bằng nhân sự.</div>',
    '<div data-task-library-list class="stack-list" style="margin-top:.75rem"></div>',
    '<div class="admin-add-grid" style="margin-top:.75rem">',
    '<input class="input" type="text" id="new-task-name" placeholder="Ví dụ: Lead website">',
    '<select class="select" id="new-task-type">',
    Object.entries(TASK_TYPE_META).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join(''),
    '</select>',
    '<select class="select" id="new-task-unit">',
    Object.entries(ACTIVITY_UNIT_META).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join(''),
    '</select>',
    '<button type="button" class="btn btn-primary" data-add-task>Thêm nhiệm vụ</button>',
    '</div>',
    '</div>',
    '<div class="button-row">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    '<button type="submit" class="btn btn-primary">Lưu thư viện nhiệm vụ</button>',
    '</div>',
    '</form>',
  ].join(''), { cardClass: 'is-wide' });

  const root = getModalRoot();
  const formEl = root.querySelector('[data-task-library-form]');
  const listEl = root.querySelector('[data-task-library-list]');
  const newNameInput = root.querySelector('#new-task-name');
  const newTypeSelect = root.querySelector('#new-task-type');
  const newUnitSelect = root.querySelector('#new-task-unit');

  function renderRows() {
    listEl.innerHTML = tasks.map((task, index) => [
      '<section class="admin-editor-card">',
      '<div class="admin-editor-grid">',
      `<input class="input" type="text" value="${escapeHtml(task.ten)}" data-task-name data-idx="${index}" aria-label="Tên nhiệm vụ ${index + 1}">`,
      `<select class="select" data-task-type data-idx="${index}">`,
      Object.entries(TASK_TYPE_META).map(([value, label]) => `<option value="${value}"${task.loai === value ? ' selected' : ''}>${escapeHtml(label)}</option>`).join(''),
      '</select>',
      `<select class="select" data-task-unit data-idx="${index}"${task.loai === 'hoat_dong' ? '' : ' disabled'}>`,
      Object.entries(ACTIVITY_UNIT_META).map(([value, label]) => `<option value="${value}"${task.don_vi === value ? ' selected' : ''}>${escapeHtml(label)}</option>`).join(''),
      '</select>',
      `<button type="button" class="btn btn-ghost" data-delete-task="${index}">Xoá</button>`,
      '</div>',
      '<div class="task-dept-picker">',
      departments.map((department) => {
        const checked = task.phong_ban_ids.includes(department.id);
        return [
          `<label class="chip-toggle${checked ? ' is-active' : ''}">`,
          `<input type="checkbox" data-task-dept data-idx="${index}" value="${escapeHtml(department.id)}"${checked ? ' checked' : ''}>`,
          `<span>${escapeHtml(department.ten)}</span>`,
          '</label>',
        ].join('');
      }).join(''),
      '</div>',
      '</section>',
    ].join('')).join('');

    listEl.querySelectorAll('[data-task-name]').forEach((input) => {
      input.addEventListener('input', () => {
        const index = Number(input.getAttribute('data-idx'));
        if (tasks[index]) tasks[index].ten = input.value;
      });
    });

    listEl.querySelectorAll('[data-task-type]').forEach((select) => {
      select.addEventListener('change', () => {
        const index = Number(select.getAttribute('data-idx'));
        if (!tasks[index]) return;
        tasks[index].loai = select.value === 'hoat_dong' ? 'hoat_dong' : 'lead';
        if (tasks[index].loai !== 'hoat_dong') tasks[index].don_vi = 'so';
        renderRows();
      });
    });

    listEl.querySelectorAll('[data-task-unit]').forEach((select) => {
      select.addEventListener('change', () => {
        const index = Number(select.getAttribute('data-idx'));
        if (!tasks[index]) return;
        tasks[index].don_vi = select.value || 'so';
      });
    });

    listEl.querySelectorAll('[data-delete-task]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-delete-task'));
        tasks.splice(index, 1);
        renderRows();
      });
    });

    listEl.querySelectorAll('[data-task-dept]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const index = Number(checkbox.getAttribute('data-idx'));
        const task = tasks[index];
        if (!task) return;
        const values = Array.from(listEl.querySelectorAll(`[data-task-dept][data-idx="${index}"]:checked`)).map((element) => element.value);
        task.phong_ban_ids = values;
        checkbox.closest('.chip-toggle')?.classList.toggle('is-active', checkbox.checked);
      });
    });
  }

  renderRows();

  newTypeSelect.addEventListener('change', () => {
    newUnitSelect.disabled = newTypeSelect.value !== 'hoat_dong';
    if (newTypeSelect.value !== 'hoat_dong') newUnitSelect.value = 'so';
  });

  root.querySelector('[data-add-task]').addEventListener('click', () => {
    const label = newNameInput.value.trim();
    if (!label) {
      showToast('Nhập tên nhiệm vụ trước khi thêm.', 'warning');
      return;
    }
    if (tasks.some((task) => task.ten.trim().toLowerCase() === label.toLowerCase())) {
      showToast('Tên nhiệm vụ này đã tồn tại.', 'warning');
      return;
    }
    const assignedDepartments = departments
      .filter((department) => newTypeSelect.value === 'hoat_dong' ? true : department.id.startsWith('kd_'))
      .map((department) => department.id);
    const existingIds = new Set(tasks.map((task) => task.id));
    const baseId = makeTaskId(label);
    let nextId = baseId;
    let suffix = 2;
    while (existingIds.has(nextId)) {
      nextId = `${baseId}_${suffix}`;
      suffix += 1;
    }
    tasks.push({
      id: nextId,
      ten: label,
      loai: newTypeSelect.value === 'hoat_dong' ? 'hoat_dong' : 'lead',
      don_vi: newTypeSelect.value === 'hoat_dong' ? (newUnitSelect.value || 'so') : 'so',
      phong_ban_ids: assignedDepartments.length ? assignedDepartments : departments.map((department) => department.id),
    });
    newNameInput.value = '';
    renderRows();
  });

  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });
  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const seenNames = new Set();
    const nextTasks = tasks.map((task, index) => ({
      id: task.id,
      ten: (task.ten || '').trim() || `Nhiệm vụ ${index + 1}`,
      loai: task.loai === 'hoat_dong' ? 'hoat_dong' : 'lead',
      don_vi: task.loai === 'hoat_dong' ? (task.don_vi || 'so') : 'so',
      phong_ban_ids: Array.isArray(task.phong_ban_ids) ? Array.from(new Set(task.phong_ban_ids.filter(Boolean))) : [],
    }));

    if (!nextTasks.length) {
      showToast('Cần ít nhất 1 nhiệm vụ trong thư viện.', 'warning');
      return;
    }

    for (const task of nextTasks) {
      const normalizedName = task.ten.toLowerCase();
      if (seenNames.has(normalizedName)) {
        showToast('Tên nhiệm vụ không được trùng nhau.', 'warning');
        return;
      }
      if (!task.phong_ban_ids.length) {
        showToast(`Nhiệm vụ "${task.ten}" chưa được gán phòng ban.`, 'warning');
        return;
      }
      seenNames.add(normalizedName);
    }

    appState.data.config.nhiem_vu_lib = nextTasks;
    appState.data.config.lead_channels = nextTasks.map((task) => ({
      id: task.id,
      label: task.ten,
      loai: task.loai,
      don_vi: task.don_vi,
    }));
    syncEmployeesWithTaskLibrary(nextTasks, departments);
    closeModal();
    await persistFile('config.json', appState.data.config, null);
    await persistFile('nhan-vien.json', appState.data.nhanVien, 'Đã lưu thư viện nhiệm vụ.');
    rerenderApp();
  });
}