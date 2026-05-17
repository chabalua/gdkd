// assets/views/xe.js
// Master data: catalog xe đang bán. Đây là LỚP 1 trong kiến trúc 3 lớp;
// KH (transaction) sẽ tham chiếu xe.id qua FK ở bước 4.

import { renderShell, renderEmptyState, renderTableEmptyRow } from './shell.js';
import { escapeHtml, formatCurrency, renderIcon } from '../ui.js';
import { XE_STATUS_META, countKhByXeId, formatXeColorSummary, formatXeFullName } from '../models.js';

export default function renderXePage(data) {
  const list = data.xe.xe;

  // Stats: đếm theo trạng thái
  const counts = list.reduce((acc, xe) => {
    acc[xe.trang_thai] = (acc[xe.trang_thai] || 0) + 1;
    return acc;
  }, {});

  // Tập hợp hãng duy nhất → chip filter
  const brands = Array.from(new Set(list.map((xe) => xe.hang).filter(Boolean))).sort();

  const rows = list.length
    ? list.map((xe) => {
      const meta = XE_STATUS_META[xe.trang_thai] || ['Chưa rõ', 'is-warning'];
      const refCount = countKhByXeId(data, xe.id);
      const colorSummary = formatXeColorSummary(xe);
      const haystack = `${xe.ma_xe || ''} ${xe.hang || ''} ${xe.dong || ''} ${xe.bien_the || ''} ${colorSummary}`.toLowerCase();
      return [
        `<tr data-xe-row data-search="${escapeHtml(haystack)}" data-brand="${escapeHtml(xe.hang || '')}" data-status="${escapeHtml(xe.trang_thai || '')}">`,
        `<td><strong>${escapeHtml(xe.ma_xe || '—')}</strong></td>`,
        `<td>${escapeHtml(xe.hang || '—')}</td>`,
        `<td>${escapeHtml(xe.dong || '—')}</td>`,
        `<td>${escapeHtml(xe.bien_the || '—')}</td>`,
        `<td>${escapeHtml(colorSummary || '—')}</td>`,
        `<td class="is-number">${escapeHtml(xe.nam || '—')}</td>`,
        `<td class="is-number">${formatCurrency(xe.gia_niem_yet)}</td>`,
        `<td><span class="badge ${meta[1]}">${escapeHtml(meta[0])}</span></td>`,
        `<td class="is-number">${refCount}</td>`,
        '<td><div class="button-row">',
        `<button type="button" class="btn-icon" data-action="open-xe-edit" data-id="${escapeHtml(xe.id)}" aria-label="Chỉnh sửa" title="Chỉnh sửa">${renderIcon('edit', { size: 16 })}</button>`,
        `<button type="button" class="btn-icon is-danger" data-action="delete-xe" data-id="${escapeHtml(xe.id)}" ${refCount > 0 ? 'disabled title="Có KH đang dùng xe này"' : 'aria-label="Xoá" title="Xoá"'}>${renderIcon('trash', { size: 16 })}</button>`,
        '</div></td>',
        '</tr>',
      ].join('');
    }).join('')
    : renderTableEmptyRow(10, 'Catalog xe đang trống. Hãy thêm dòng xe đầu tiên trước khi nhập KH.');

  const brandChips = brands.length
    ? brands.map((brand) => `<button type="button" class="btn btn-ghost is-pill" data-xe-brand-chip data-value="${escapeHtml(brand)}">${escapeHtml(brand)}</button>`).join('')
    : '';

  const content = [
    '<section class="summary-grid">',
    `<article class="summary-card"><div class="count-label">Tổng dòng xe</div><div class="count-value">${list.length}</div></article>`,
    `<article class="summary-card"><div class="count-label">Đang bán</div><div class="count-value">${counts.dang_ban || 0}</div></article>`,
    `<article class="summary-card"><div class="count-label">Sắp về</div><div class="count-value">${counts.sap_ve || 0}</div></article>`,
    `<article class="summary-card"><div class="count-label">Ngừng bán</div><div class="count-value">${counts.ngung_ban || 0}</div></article>`,
    '</section>',

    '<div class="utility-space"></div>',

    '<section class="section-header">',
    '<div><h3 class="section-title">Catalog xe</h3><p class="section-subtitle">Master data dùng làm dropdown khi nhập KH ở bước 4.</p></div>',
    `<button type="button" class="btn btn-primary" data-action="open-xe-create">${renderIcon('plus', { size: 16 })} Thêm dòng xe</button>`,
    '</section>',

    '<section class="table-card">',
    '<div class="toolbar-row">',
    '<div class="field toolbar-field-wide"><label class="field-label" for="xe-search">Tìm catalog</label><input class="input" id="xe-search" data-xe-search placeholder="Tìm theo mã, hãng, dòng, biến thể, màu..." /></div>',
    '<div class="field toolbar-field-medium"><label class="field-label" for="xe-status-filter">Trạng thái</label><select class="select" id="xe-status-filter" data-xe-status><option value="all">Tất cả</option>',
    Object.entries(XE_STATUS_META).map((entry) => `<option value="${entry[0]}">${escapeHtml(entry[1][0])}</option>`).join(''),
    '</select></div>',
    '</div>',

    brandChips ? `<div class="button-row button-row-bottom"><button type="button" class="btn btn-soft is-pill" data-xe-brand-chip data-value="all">Tất cả hãng</button>${brandChips}</div>` : '',

    list.length
      ? '<div class="table-responsive"><table class="data-table"><thead><tr><th>Mã xe</th><th>Hãng</th><th>Dòng</th><th>Biến thể</th><th>Màu</th><th class="is-number">Năm</th><th class="is-number">Giá niêm yết</th><th>Trạng thái</th><th class="is-number">KH</th><th>Hành động</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : renderEmptyState('Chưa có xe trong catalog', 'Thêm các dòng xe đang bán để có dropdown khi nhập KH ở bước tiếp theo.', 'Thêm dòng xe đầu tiên', 'open-xe-create'),
    '</section>',
  ].join('');

  return renderShell('xe', content, data);
}

// Helper export để app.js gọi sau khi render (filter logic)
export function filterXeRows() {
  const search = document.querySelector('[data-xe-search]');
  const status = document.querySelector('[data-xe-status]');
  const brandActive = document.querySelector('[data-xe-brand-chip].is-active');
  const query = (search?.value || '').trim().toLowerCase();
  const statusValue = status?.value || 'all';
  const brandValue = brandActive?.getAttribute('data-value') || 'all';

  document.querySelectorAll('[data-xe-row]').forEach((row) => {
    const haystack = row.getAttribute('data-search') || '';
    const brand = row.getAttribute('data-brand') || '';
    const rowStatus = row.getAttribute('data-status') || '';
    const visible =
      (!query || haystack.includes(query)) &&
      (statusValue === 'all' || rowStatus === statusValue) &&
      (brandValue === 'all' || brand === brandValue);
    row.style.display = visible ? '' : 'none';
  });
}

export { formatXeFullName };
