// assets/views/tuan-tong-hop.js
// Batch entry tuần — 1 màn cho cả công ty, không cần vào từng NV.
// Bảng: rows = NV của phòng ban đang chọn, columns = task của phòng ban,
// mỗi cell có stack Mục tiêu/Thực tế. Autosave per cell qua data-batch-cell-input/target.

import { renderShell, renderEmptyState } from './shell.js';
import { escapeHtml, renderRangePicker, getCurrentRange, getRangeLabel } from '../ui.js';
import {
  getActiveMonth, isSingleMonthRange,
  getEmployeeGroups, getEmployeesByGroup,
  ACTIVITY_UNIT_META,
} from '../models.js';

function getDaysInMonth(month) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex, 0).getDate();
}

function getWeekMetrics(employee, month, week, taskId) {
  return employee?.du_lieu?.[month]?.tuan?.[String(week)]?.[taskId]
    || employee?.du_lieu?.[month]?.tuan?.[week]?.[taskId]
    || null;
}

function getStep(task) {
  if (task.don_vi === 'gio') return '0.5';
  if (task.don_vi === 'tien') return '1000';
  return '1';
}

function getTaskLabel(task) {
  if (task.loai !== 'hoat_dong') return task.label || task.ten || task.id;
  const unit = ACTIVITY_UNIT_META[task.don_vi] || 'Số';
  return `${task.label || task.ten || task.id} (${unit})`;
}

// === Lấy task của 1 phòng ban: union các nhiem_vu_ids của NV trong phòng đó,
// đối chiếu với config.nhiem_vu_lib để có meta (loai/don_vi).
function getDepartmentTasks(allData, departmentId) {
  const lib = Array.isArray(allData?.config?.nhiem_vu_lib) ? allData.config.nhiem_vu_lib : [];
  const libMap = Object.fromEntries(lib.map((task) => [task.id, task]));
  const employees = getEmployeesByGroup(allData, departmentId);
  const ids = new Set();
  employees.forEach((nv) => {
    (nv.nhiem_vu_ids || []).forEach((id) => ids.add(id));
  });
  return Array.from(ids)
    .map((id) => libMap[id])
    .filter(Boolean)
    .map((task) => ({
      id: task.id,
      label: task.ten || task.label || task.id,
      loai: task.loai === 'hoat_dong' ? 'hoat_dong' : 'lead',
      don_vi: task.don_vi || 'so',
    }));
}

function renderWeekTable({ month, week, employees, tasks, canEdit, showWeekFive }) {
  if (!employees.length || !tasks.length) {
    return '<p class="table-empty-note">Phòng ban này chưa có nhân viên hoặc chưa có nhiệm vụ được gán.</p>';
  }
  const disabled = !canEdit || (week === 5 && !showWeekFive);

  const headerCols = tasks.map((task) => `<th class="is-number" title="${escapeHtml(getTaskLabel(task))}">${escapeHtml(task.label)}</th>`).join('');

  const rows = employees.map((nv) => {
    const cells = tasks.map((task) => {
      const metrics = getWeekMetrics(nv, month, week, task.id) || {};
      const target = Number(metrics.muc_tieu || 0);
      const actual = Number(metrics.thuc_te || 0);
      const cellAttrs = `data-nv-id="${escapeHtml(nv.id)}" data-task-id="${escapeHtml(task.id)}" data-task-loai="${escapeHtml(task.loai)}" data-tuan="${week}" data-month="${escapeHtml(month)}"`;
      if (week === 5 && !showWeekFive) {
        return '<td class="is-number">—</td>';
      }
      return [
        '<td class="is-number">',
        '<div class="week-cell-stack">',
        `<label class="week-cell-label" title="Mục tiêu tuần"><span class="week-cell-tag">Mục tiêu</span><input class="input is-compact table-input-sm week-cell-input is-target" type="number" min="0" step="${getStep(task)}" data-batch-cell-target ${cellAttrs} value="${target}"${disabled ? ' disabled' : ''} aria-label="Mục tiêu ${escapeHtml(task.label)} của ${escapeHtml(nv.ho_ten)} tuần ${week}"></label>`,
        `<label class="week-cell-label" title="Thực tế đã làm"><span class="week-cell-tag">Thực tế</span><input class="input is-compact table-input-sm week-cell-input" type="number" min="0" step="${getStep(task)}" data-batch-cell-input ${cellAttrs} value="${actual}"${disabled ? ' disabled' : ''} aria-label="Thực tế ${escapeHtml(task.label)} của ${escapeHtml(nv.ho_ten)} tuần ${week}"></label>`,
        '</div>',
        '</td>',
      ].join('');
    }).join('');

    return [
      '<tr>',
      `<td class="channel-label"><a href="nhan-vien-detail.html?id=${escapeHtml(nv.id)}" class="nv-link">${escapeHtml(nv.ho_ten)}</a></td>`,
      cells,
      '</tr>',
    ].join('');
  }).join('');

  return [
    '<div class="table-responsive lead-table-scroll">',
    '<table class="data-table data-table-lead">',
    `<thead><tr><th>Nhân viên</th>${headerCols}</tr></thead>`,
    `<tbody>${rows}</tbody>`,
    '</table>',
    '</div>',
  ].join('');
}

export default function renderTuanTongHopPage(data) {
  const range = getCurrentRange();
  const rangeLabel = getRangeLabel(range);
  const month = getActiveMonth(data);
  const canEdit = isSingleMonthRange();
  const daysInMonth = getDaysInMonth(month);
  const showWeekFive = daysInMonth >= 29;

  const groups = getEmployeeGroups(data).filter((group) => {
    const phongBan = (data?.config?.phong_ban || []).find((p) => p.id === group.id);
    // Mặc định chỉ lấy phòng ban_hang (KPI). User vẫn switch sang phòng khác qua dropdown.
    return phongBan ? phongBan.loai !== 'ho_tro' : true;
  });
  const allGroups = getEmployeeGroups(data);

  // Phòng ban đang xem — từ URL `?dept=ID`, fallback phòng đầu tiên có NV.
  const params = new URLSearchParams(window.location.search);
  const requestedDept = params.get('dept') || '';
  const firstWithMembers = allGroups.find((g) => getEmployeesByGroup(data, g.id).length > 0);
  const activeDeptId = requestedDept || firstWithMembers?.id || (allGroups[0]?.id || '');

  // Tuần đang xem — từ URL `?week=N`, fallback 1.
  const requestedWeek = Number(params.get('week') || '0');
  const activeWeek = [1, 2, 3, 4, 5].includes(requestedWeek) ? requestedWeek : 1;

  const employees = getEmployeesByGroup(data, activeDeptId);
  const tasks = getDepartmentTasks(data, activeDeptId);

  const groupOptions = allGroups.map((group) => {
    const count = getEmployeesByGroup(data, group.id).length;
    return `<option value="${escapeHtml(group.id)}"${group.id === activeDeptId ? ' selected' : ''}>${escapeHtml(group.ten)} (${count} NV)</option>`;
  }).join('');

  const weekTabs = [1, 2, 3, 4, 5].map((week) => {
    const disabled = week === 5 && !showWeekFive;
    const url = new URL(window.location.href);
    url.searchParams.set('dept', activeDeptId);
    url.searchParams.set('week', String(week));
    return `<a class="tab-button${week === activeWeek ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}" href="${disabled ? '#' : url.pathname + url.search}" aria-disabled="${disabled ? 'true' : 'false'}">Tuần ${week}${disabled ? ' (—)' : ''}</a>`;
  }).join('');

  const banner = !canEdit ? [
    '<div class="setup-warning-card" style="background:var(--warning-light)">',
    '<span>🔒</span>',
    '<div>',
    `<strong>Đang xem ${escapeHtml(rangeLabel)}</strong>`,
    '<p class="muted" style="margin:4px 0 0">Bảng nhập bị khoá khi chọn quý/năm. Chọn 1 tháng cụ thể trong picker để chỉnh.</p>',
    '</div>',
    '</div>',
  ].join('') : '';

  const noDataHint = !employees.length
    ? renderEmptyState(
        'Phòng ban chưa có nhân viên đang làm',
        'Mở trang Nhân viên để thêm/cập nhật nhân viên cho phòng ban này.',
        'Mở trang Nhân viên',
        ''
      )
    : !tasks.length
      ? renderEmptyState(
          'Chưa có nhiệm vụ nào được gán cho phòng ban',
          'Vào chi tiết từng NV, bấm "+ Gán thêm nhiệm vụ" để chọn từ thư viện nhiệm vụ.',
          '',
          ''
        )
      : '';

  const content = [
    banner,
    '<section class="page-card-spacer">',
    '<div class="section-header"><div>',
    `<h2 class="section-title">📅 Nhập tuần · ${escapeHtml(rangeLabel)}</h2>`,
    `<p class="section-subtitle">Bảng nhập gọn cho cả phòng ban — 1 màn cho mọi NV cùng tuần. Tự lưu tạm khi gõ.</p>`,
    '</div></div>',

    '<div class="toolbar-row button-row-bottom">',
    '<div class="field toolbar-field-wide">',
    '<label class="field-label" for="batch-dept">Phòng ban</label>',
    `<select class="input" id="batch-dept" data-batch-dept-select>${groupOptions}</select>`,
    '</div>',
    '<div class="field toolbar-field-wide">',
    '<label class="field-label">Khoảng thời gian</label>',
    renderRangePicker(range),
    '</div>',
    '</div>',

    '<div class="tab-group" role="tablist" aria-label="Chọn tuần">',
    weekTabs,
    '</div>',

    noDataHint || renderWeekTable({ month, week: activeWeek, employees, tasks, canEdit, showWeekFive }),
    '</section>',
  ].join('');

  return renderShell('tuan-tong-hop', content, data);
}
