import { renderShell } from './shell.js';
import { escapeHtml } from '../ui.js';
import { ACTIVITY_UNIT_META, getEmployeeGroups, getEmployeesByGroup } from '../models.js';
import { getPendingWriteCount } from '../api.js';

const TASK_TYPE_LABEL = {
  lead: 'Kênh lead',
  hoat_dong: 'Hoạt động',
};

function renderSummaryCards(departments, tasks) {
  const salesDepartments = departments.filter((department) => department.id.startsWith('kd_')).length;
  const supportDepartments = departments.length - salesDepartments;
  const activityTasks = tasks.filter((task) => task.loai === 'hoat_dong').length;
  return [
    '<section class="executive-grid page-card-spacer">',
    `<article class="executive-card"><span class="executive-label">Phòng ban</span><strong class="executive-value">${departments.length}</strong><span class="executive-meta">${salesDepartments} bán hàng · ${supportDepartments} hỗ trợ</span></article>`,
    `<article class="executive-card"><span class="executive-label">Nhiệm vụ</span><strong class="executive-value">${tasks.length}</strong><span class="executive-meta">${activityTasks} hoạt động · ${tasks.length - activityTasks} lead</span></article>`,
    '<article class="executive-card"><span class="executive-label">Vòng quản trị v3</span><strong class="executive-value executive-value-sm">config.json</strong><span class="executive-meta">Nguồn sự thật cho phòng ban và nhiệm vụ</span></article>',
    '</section>',
  ].join('');
}

function renderDepartmentSection(data, departments, tasks) {
  const rows = departments.map((department) => {
    const employeeCount = getEmployeesByGroup(data, department.id, { includeInactive: true }).length;
    const taskCount = tasks.filter((task) => task.phong_ban_ids.includes(department.id)).length;
    const typeLabel = department.id.startsWith('kd_') ? 'Bán hàng' : 'Hỗ trợ';
    return [
      '<tr>',
      `<td>${escapeHtml(department.ten)}</td>`,
      `<td><span class="badge">${escapeHtml(typeLabel)}</span></td>`,
      `<td class="is-number">${employeeCount}</td>`,
      `<td class="is-number">${taskCount}</td>`,
      '</tr>',
    ].join('');
  }).join('');
  return [
    '<article class="table-card page-card-spacer">',
    '<div class="table-header">',
    '<div><h3 class="table-title">Phòng ban</h3><p class="table-subtitle">Nhóm nhân sự hiển thị ở trang Nhân viên và được dùng để gán nhiệm vụ.</p></div>',
    '<div class="button-row"><button type="button" class="btn btn-primary" data-action="open-group-manager">Quản lý phòng ban</button></div>',
    '</div>',
    '<div class="simple-table-wrap">',
    '<table class="simple-table compact">',
    '<thead><tr><th>Tên phòng ban</th><th>Loại</th><th class="is-number">Nhân viên</th><th class="is-number">Nhiệm vụ</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '</div>',
    '</article>',
  ].join('');
}

function renderTaskSection(departments, tasks) {
  const departmentMap = new Map(departments.map((department) => [department.id, department.ten]));
  const rows = tasks.map((task) => {
    const departmentLabels = task.phong_ban_ids.map((id) => departmentMap.get(id) || id).join(', ');
    return [
      '<tr>',
      `<td>${escapeHtml(task.ten || task.label || task.id)}</td>`,
      `<td><span class="badge is-info">${escapeHtml(TASK_TYPE_LABEL[task.loai] || 'Lead')}</span></td>`,
      `<td>${escapeHtml(ACTIVITY_UNIT_META[task.don_vi] || 'Số')}</td>`,
      `<td>${escapeHtml(departmentLabels || '—')}</td>`,
      '</tr>',
    ].join('');
  }).join('');
  return [
    '<article class="table-card page-card-spacer">',
    '<div class="table-header">',
    '<div><h3 class="table-title">Nhiệm vụ / kênh lead</h3><p class="table-subtitle">Thư viện dùng chung cho nhập tuần, KPI derive và các bảng runtime.</p></div>',
    '<div class="button-row"><button type="button" class="btn btn-primary" data-action="open-task-library-manager">Quản lý nhiệm vụ</button></div>',
    '</div>',
    '<div class="simple-table-wrap">',
    '<table class="simple-table compact">',
    '<thead><tr><th>Tên nhiệm vụ</th><th>Loại</th><th>Đơn vị</th><th>Phòng ban áp dụng</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '</div>',
    '</article>',
  ].join('');
}

function renderGithubSection() {
  const pendingCount = getPendingWriteCount();
  return [
    '<article class="card page-card-spacer">',
    '<div class="table-header">',
    '<div><h3 class="table-title">Kết nối GitHub</h3><p class="table-subtitle">Token và repo config để mọi CRUD ghi thẳng lên GitHub Contents API.</p></div>',
    '<div class="button-row">',
    pendingCount ? `<button type="button" class="btn btn-primary" data-action="sync-pending-writes">Đồng bộ ${pendingCount} thay đổi</button>` : '',
    '<button type="button" class="btn btn-soft" data-action="open-settings">Mở cấu hình GitHub</button>',
    '</div>',
    '</div>',
    `<p class="muted" style="margin:0">${pendingCount ? `Hiện có ${pendingCount} thay đổi đang lưu nháp trên máy và chờ đẩy lên GitHub.` : 'Trang này hoàn tất vòng quản trị v3: quản lý phòng ban, thư viện nhiệm vụ và cấu hình nơi lưu dữ liệu.'}</p>`,
    '</article>',
  ].join('');
}

export default function renderSettingsPage(data) {
  const departments = getEmployeeGroups(data);
  const tasks = data.config?.nhiem_vu_lib || [];
  const content = [
    '<section class="section-header page-card-spacer">',
    '<div><h3 class="section-title">Thiết lập hệ thống</h3><p class="section-subtitle">Quản trị nguồn dữ liệu v3 cho phòng ban và nhiệm vụ dùng chung.</p></div>',
    '<div class="section-actions">',
    '<button type="button" class="btn btn-soft" data-action="open-settings">Đồng bộ GitHub</button>',
    '<button type="button" class="btn btn-soft" data-action="open-group-manager">Phòng ban</button>',
    '<button type="button" class="btn btn-primary" data-action="open-task-library-manager">Nhiệm vụ</button>',
    '</div>',
    '</section>',
    renderSummaryCards(departments, tasks),
    renderDepartmentSection(data, departments, tasks),
    renderTaskSection(departments, tasks),
    renderGithubSection(),
  ].join('');
  return renderShell('settings', content, data);
}