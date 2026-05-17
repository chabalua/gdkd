import { renderShell } from './shell.js';
import { escapeHtml } from '../ui.js';
import { ACTIVITY_UNIT_META, getEmployeeGroups, getEmployeesByGroup } from '../models.js';
import { getPendingWriteCount, getLastSyncAt, getPendingWrites, getRepoConfig, getToken } from '../api.js';

function formatRelativeSync(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `hôm nay ${hh}:${mm}`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo} ${hh}:${mm}`;
}

const FILE_LABELS = {
  'config.json': 'Cấu hình',
  'xe.json': 'Catalog xe',
  'nhan-vien.json': 'Nhân viên',
  'khach-hang.json': 'Khách hàng',
  'cong-viec.json': 'Công việc',
  'lich-su.json': 'Lịch sử',
};

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
  const pendingWrites = getPendingWrites();
  const pendingFiles = Object.keys(pendingWrites);
  const lastSyncAt = getLastSyncAt();
  const lastSyncLabel = formatRelativeSync(lastSyncAt);
  const repoConfig = getRepoConfig();
  const hasGithubConfig = Boolean(repoConfig.owner && repoConfig.repo && getToken());

  const pendingList = pendingFiles.length
    ? `<ul class="sync-pending-list">${pendingFiles.map((f) => {
      const pw = pendingWrites[f] || {};
      const hasError = Boolean(pw.error);
      return `<li class="${hasError ? 'sync-pending-item is-failed' : ''}"><strong>${escapeHtml(FILE_LABELS[f] || f)}</strong> <span class="muted">(${escapeHtml(f)})</span>${hasError ? `<span class="badge is-danger sync-fail-badge">Lỗi</span><span class="text-subtle-sm sync-fail-msg">${escapeHtml(pw.error)}</span>` : ''}</li>`;
    }).join('')}</ul>`
    : '';

  const repoInfo = hasGithubConfig
    ? `<p class="muted sync-repo-info">📦 Kho: <strong>${escapeHtml(repoConfig.owner)}/${escapeHtml(repoConfig.repo)}</strong> · nhánh <code>${escapeHtml(repoConfig.branch)}</code></p>`
    : '<p class="text-danger sync-repo-info">⚠️ Chưa cấu hình GitHub. Bấm "Cấu hình GitHub" bên dưới để nhập token và repo.</p>';

  const pushButton = pendingCount
    ? `<button type="button" class="btn btn-primary btn-large sync-action-btn" data-action="sync-pending-writes">
         <span class="sync-action-icon" aria-hidden="true">⬆️</span>
         <span class="sync-action-text">
           <strong>Đẩy lên GitHub</strong>
           <span class="sync-action-sub">${pendingCount} file đang chờ đẩy</span>
         </span>
       </button>`
    : `<button type="button" class="btn btn-soft btn-large sync-action-btn" data-action="sync-pending-writes" disabled>
         <span class="sync-action-icon" aria-hidden="true">⬆️</span>
         <span class="sync-action-text">
           <strong>Đẩy lên GitHub</strong>
           <span class="sync-action-sub">Không có thay đổi mới để đẩy</span>
         </span>
       </button>`;

  const pullButton = `<button type="button" class="btn btn-soft btn-large sync-action-btn" data-action="pull-from-github"${hasGithubConfig ? '' : ' disabled'}>
       <span class="sync-action-icon" aria-hidden="true">⬇️</span>
       <span class="sync-action-text">
         <strong>Tải từ GitHub</strong>
         <span class="sync-action-sub">${lastSyncLabel ? `Lần tải gần nhất ${lastSyncLabel}` : 'Lấy dữ liệu mới nhất về máy'}</span>
       </span>
     </button>`;

  return [
    '<article class="card page-card-spacer sync-card">',
    '<div class="table-header">',
    '<div><h3 class="table-title">🔄 Đồng bộ dữ liệu với GitHub</h3>',
    '<p class="table-subtitle">App lưu thay đổi vào máy trước. Bấm <strong>Đẩy lên GitHub</strong> khi muốn đồng bộ. Mở app trên thiết bị khác bấm <strong>Tải từ GitHub</strong> để lấy bản mới nhất.</p>',
    '</div>',
    '</div>',
    repoInfo,
    '<div class="sync-action-grid">',
    pushButton,
    pullButton,
    '</div>',
    pendingCount ? [
      '<div class="sync-pending-box">',
      `<p class="sync-pending-title">📝 Có ${pendingCount} thay đổi chưa đẩy lên GitHub:</p>`,
      pendingList,
      '<p class="muted sync-pending-warn">⚠️ Các thay đổi này chỉ tồn tại trên thiết bị này. Bấm <strong>Đẩy lên GitHub</strong> để các thiết bị khác cũng thấy được.</p>',
      '</div>',
    ].join('') : '',
    '<div class="sync-footer">',
    '<button type="button" class="btn btn-ghost btn-small" data-action="open-settings">⚙️ Cấu hình GitHub (token, owner, repo)</button>',
    '</div>',
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
    renderGithubSection(),
    renderSummaryCards(departments, tasks),
    renderDepartmentSection(data, departments, tasks),
    renderTaskSection(departments, tasks),
  ].join('');
  return renderShell('settings', content, data);
}