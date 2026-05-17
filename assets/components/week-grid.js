import { escapeHtml, calcPercent, getPercentClass } from '../ui.js';
import { ACTIVITY_UNIT_META, getWeekOfMonth } from '../models.js';

function getDaysInMonth(month) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex, 0).getDate();
}

function getWeekMetrics(employee, month, week, taskId) {
  return employee?.du_lieu?.[month]?.tuan?.[String(week)]?.[taskId]
    || employee?.du_lieu?.[month]?.tuan?.[week]?.[taskId]
    || null;
}

function getTaskLabel(task) {
  if (task.loai !== 'hoat_dong') return task.label;
  return `${task.label} (${ACTIVITY_UNIT_META[task.don_vi] || 'Số'})`;
}

function getStep(task) {
  if (task.don_vi === 'gio') return '0.5';
  if (task.don_vi === 'tien') return '1000';
  return '1';
}

export function renderWeekGrid({ nvId, month, channels, data, canEdit }) {
  const employee = (data?.nhanVien?.nhan_vien || []).find((item) => item.id === nvId);
  if (!employee) {
    return '<article class="table-card"><p class="table-empty-note">Không tìm thấy nhân viên.</p></article>';
  }

  const allKh = data?.khachHang?.khach_hang || [];
  const daysInMonth = getDaysInMonth(month);
  const weeks = [1, 2, 3, 4, 5];
  const showWeekFive = daysInMonth >= 29;
  const leadChannels = channels.filter((task) => task.loai !== 'hoat_dong');

  const channelRows = channels.map((task) => {
    const totalActual = weeks.reduce((sum, week) => sum + Number(getWeekMetrics(employee, month, week, task.id)?.thuc_te || 0), 0);
    const totalTarget = weeks.reduce((sum, week) => sum + Number(getWeekMetrics(employee, month, week, task.id)?.muc_tieu || 0), 0);
    const pct = totalTarget > 0 ? calcPercent(totalActual, totalTarget) : null;
    const pctClass = pct !== null ? getPercentClass(pct) : '';
    const inputs = weeks.map((week) => {
      const metrics = getWeekMetrics(employee, month, week, task.id) || {};
      const actual = Number(metrics.thuc_te || 0);
      const target = Number(metrics.muc_tieu || 0);
      const disabled = !canEdit || (week === 5 && !showWeekFive);
      const cellValue = week === 5 && !showWeekFive ? '—' : [
        '<div class="week-cell-stack">',
        `<label class="week-cell-label" title="Mục tiêu tuần"><span class="week-cell-tag">Mục tiêu</span><input class="input is-compact table-input-sm week-cell-input is-target" type="number" min="0" step="${getStep(task)}" data-week-task-target data-nv-id="${escapeHtml(nvId)}" data-task-id="${escapeHtml(task.id)}" data-task-loai="${escapeHtml(task.loai || 'lead')}" data-tuan="${week}" data-month="${escapeHtml(month)}" value="${target}"${disabled ? ' disabled' : ''} aria-label="Mục tiêu ${escapeHtml(task.label)} tuần ${week}"></label>`,
        `<label class="week-cell-label" title="Thực tế đã làm"><span class="week-cell-tag">Thực tế</span><input class="input is-compact table-input-sm week-cell-input" type="number" min="0" step="${getStep(task)}" data-week-task-input data-nv-id="${escapeHtml(nvId)}" data-task-id="${escapeHtml(task.id)}" data-task-loai="${escapeHtml(task.loai || 'lead')}" data-tuan="${week}" data-month="${escapeHtml(month)}" value="${actual}"${disabled ? ' disabled' : ''} aria-label="Thực tế ${escapeHtml(task.label)} tuần ${week}"></label>`,
        '</div>',
      ].join('');
      return `<td class="is-number">${cellValue}</td>`;
    }).join('');
    return [
      '<tr>',
      `<td class="channel-label">${escapeHtml(getTaskLabel(task))}</td>`,
      inputs,
      `<td class="is-number" data-task-total="${escapeHtml(task.id)}">${totalActual}</td>`,
      `<td class="is-number" data-task-target="${escapeHtml(task.id)}">${totalTarget || '—'}</td>`,
      `<td class="is-number ${pctClass}" data-task-pct="${escapeHtml(task.id)}">${pct !== null ? `${pct}%` : '—'}</td>`,
      '</tr>',
    ].join('');
  }).join('');

  const mobileTaskCards = channels.map((task) => {
    const totalActual = weeks.reduce((sum, week) => sum + Number(getWeekMetrics(employee, month, week, task.id)?.thuc_te || 0), 0);
    const totalTarget = weeks.reduce((sum, week) => sum + Number(getWeekMetrics(employee, month, week, task.id)?.muc_tieu || 0), 0);
    const pct = totalTarget > 0 ? calcPercent(totalActual, totalTarget) : null;
    const pctClass = pct !== null ? getPercentClass(pct) : '';
    const weekItems = weeks.map((week) => {
      const metrics = getWeekMetrics(employee, month, week, task.id) || {};
      const actual = Number(metrics.thuc_te || 0);
      const target = Number(metrics.muc_tieu || 0);
      const disabled = !canEdit || (week === 5 && !showWeekFive);
      if (week === 5 && !showWeekFive) {
        return [
          '<div class="mobile-week-item">',
          `<span class="mobile-week-label">T${week}</span>`,
          '<div class="mobile-week-empty">—</div>',
          '</div>',
        ].join('');
      }
      return [
        '<div class="mobile-week-item">',
        `<span class="mobile-week-label">T${week}</span>`,
        `<label class="week-cell-label" title="Mục tiêu tuần"><span class="week-cell-tag">Mục tiêu</span><input class="input is-compact mobile-week-input week-cell-input is-target" type="number" min="0" step="${getStep(task)}" data-week-task-target data-nv-id="${escapeHtml(nvId)}" data-task-id="${escapeHtml(task.id)}" data-task-loai="${escapeHtml(task.loai || 'lead')}" data-tuan="${week}" data-month="${escapeHtml(month)}" value="${target}"${disabled ? ' disabled' : ''} aria-label="Mục tiêu ${escapeHtml(task.label)} tuần ${week}"></label>`,
        `<label class="week-cell-label" title="Thực tế đã làm"><span class="week-cell-tag">Thực tế</span><input class="input is-compact mobile-week-input week-cell-input" type="number" min="0" step="${getStep(task)}" data-week-task-input data-nv-id="${escapeHtml(nvId)}" data-task-id="${escapeHtml(task.id)}" data-task-loai="${escapeHtml(task.loai || 'lead')}" data-tuan="${week}" data-month="${escapeHtml(month)}" value="${actual}"${disabled ? ' disabled' : ''} aria-label="Thực tế ${escapeHtml(task.label)} tuần ${week}"></label>`,
        '</div>',
      ].join('');
    }).join('');
    return [
      '<details class="mobile-lead-card" open>',
      '<summary class="mobile-lead-summary">',
      '<div class="content-flex-1">',
      `<h4 class="mobile-lead-title">${escapeHtml(getTaskLabel(task))}</h4>`,
      '<div class="mobile-lead-meta">',
      `<span class="badge is-info">Thực tế ${totalActual}</span>`,
      `<span class="badge" data-task-target="${escapeHtml(task.id)}">Mục tiêu ${totalTarget || '—'}</span>`,
      `<span class="badge ${pctClass}" data-task-pct="${escapeHtml(task.id)}">${pct !== null ? `${pct}%` : '—'}</span>`,
      '</div>',
      '</div>',
      '<span class="mobile-lead-chevron" aria-hidden="true">▾</span>',
      '</summary>',
      `<div class="mobile-week-grid">${weekItems}</div>`,
      `<div class="mobile-summary-grid">` +
        `<div class="mobile-summary-card"><span class="mobile-week-label">Tổng thực tế</span><div class="mobile-week-value" data-task-total="${escapeHtml(task.id)}">${totalActual}</div></div>` +
        `<div class="mobile-summary-card is-activity"><span class="mobile-week-label">Mục tiêu</span><div class="mobile-week-value" data-task-target="${escapeHtml(task.id)}">${totalTarget || '—'}</div></div>` +
      '</div>',
      '</details>',
    ].join('');
  }).join('');

  const weekLeadTotals = weeks.map((week) => leadChannels.reduce((sum, task) => sum + Number(getWeekMetrics(employee, month, week, task.id)?.thuc_te || 0), 0));
  const allLeadTotal = weekLeadTotals.reduce((sum, value) => sum + value, 0);
  const duKyTotals = weeks.map((week) => allKh.filter((kh) =>
    kh.nhan_vien_id === nvId &&
    kh.ngay_du_kien_ky?.startsWith(month) &&
    getWeekOfMonth(kh.ngay_du_kien_ky) === week
  ).length);
  const allDuKy = duKyTotals.reduce((sum, value) => sum + value, 0);
  const cvTotals = weeks.map((week, index) => {
    const lead = weekLeadTotals[index];
    return lead > 0 ? Math.round((duKyTotals[index] / lead) * 100) : null;
  });
  const allCv = allLeadTotal > 0 ? Math.round((allDuKy / allLeadTotal) * 100) : null;

  const mobileSummary = [
    '<div class="mobile-lead-stack">',
    mobileTaskCards,
    '<div class="count-grid">',
    `<div class="mobile-summary-card"><div class="mobile-summary-title">Tổng lead</div><div class="mobile-week-value" data-all-lead-total>${allLeadTotal}</div></div>`,
    `<div class="mobile-summary-card"><div class="mobile-summary-title">Dự ký</div><div class="mobile-week-value">${allDuKy}</div></div>`,
    `<div class="mobile-summary-card is-activity"><div class="mobile-summary-title">Tỷ lệ CV</div><div class="mobile-week-value" data-all-cv>${allCv !== null ? `${allCv}%` : '—'}</div></div>`,
    '</div>',
    '</div>',
  ].join('');

  return [
    '<article class="table-card">',
    '<div class="table-header">',
    '<div>',
    `<h3 class="table-title">Nhập tuần · ${escapeHtml(month)}</h3>`,
    `<p class="table-subtitle">${canEdit ? 'Nhập mục tiêu và số thực tế theo tuần, lưu tự động sau 600ms.' : 'Khoá nhập khi đang xem nhiều tháng. Chọn 1 tháng cụ thể để chỉnh.'}</p>`,
    '</div>',
    `<div class="button-row"><button type="button" class="btn btn-soft" data-action="open-manage-modal" data-id="${escapeHtml(nvId)}"${canEdit ? '' : ' disabled'}>+ Gán thêm nhiệm vụ</button></div>`,
    '</div>',
    '<div class="table-responsive lead-table-scroll desktop-lead-table">',
    '<table class="data-table data-table-lead">',
    '<thead><tr><th>Nhiệm vụ</th><th class="is-number">T1</th><th class="is-number">T2</th><th class="is-number">T3</th><th class="is-number">T4</th><th class="is-number">T5</th><th class="is-number">Tổng TT</th><th class="is-number" title="Mục tiêu tổng">Mục tiêu</th><th class="is-number">%</th></tr></thead>',
    '<tbody>',
    channelRows,
    '<tr class="lead-total-row">',
    '<td>TỔNG LEAD</td>',
    weeks.map((week, index) => `<td class="is-number" data-week-lead-total="${week}">${week === 5 && !showWeekFive ? '—' : `<strong>${weekLeadTotals[index]}</strong>`}</td>`).join(''),
    `<td class="is-number" data-all-lead-total><strong>${allLeadTotal}</strong></td>`,
    '<td></td><td></td>',
    '</tr>',
    '<tr class="derived-row">',
    '<td><em>Dự ký (derive)</em></td>',
    weeks.map((week, index) => `<td class="is-number" data-week-du-ky="${week}">${week === 5 && !showWeekFive ? '—' : duKyTotals[index]}</td>`).join(''),
    `<td class="is-number">${allDuKy}</td>`,
    '<td>—</td><td>—</td>',
    '</tr>',
    '<tr class="derived-row">',
    '<td><em>Tỷ lệ CV</em></td>',
    weeks.map((week, index) => `<td class="is-number" data-week-cv="${week}">${week === 5 && !showWeekFive ? '—' : (cvTotals[index] !== null ? `${cvTotals[index]}%` : '—')}</td>`).join(''),
    `<td class="is-number" data-all-cv>${allCv !== null ? `${allCv}%` : '—'}</td>`,
    '<td>—</td><td>—</td>',
    '</tr>',
    '</tbody>',
    '</table>',
    '</div>',
    mobileSummary,
    '</article>',
  ].join('');
}