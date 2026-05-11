// assets/views/khach-hang.js
// Render trang Quản lý Khách hàng với schema v2 (flat + FK).
import { renderShell, renderTableEmptyRow } from './shell.js';
import { escapeHtml, formatDate, formatCurrency } from '../ui.js';
import { KH_STATUS_META, isSetupComplete, formatPaymentType, getXeLabel, getNvLabel } from '../models.js';

// Tạo HTML badge cảnh báo "Cần gán" khi FK null
function missingFkBadge(label) {
  return `<span class="badge is-danger">⚠ Cần gán ${label}</span>`;
}

function renderKhRow(item, allData) {
  const status = KH_STATUS_META[item.trang_thai] || ['Chưa rõ', 'is-warning'];
  const nvLabel = item.nhan_vien_id
    ? escapeHtml(getNvLabel(allData, item.nhan_vien_id))
    : missingFkBadge('NV');
  const xeLabel = item.xe_id
    ? escapeHtml(getXeLabel(allData, item.xe_id))
    : missingFkBadge('Xe');
  const haystack = `${item.ten || ''} ${item.sdt || ''} ${item.so_hd || ''} ${getNvLabel(allData, item.nhan_vien_id)} ${getXeLabel(allData, item.xe_id)}`.toLowerCase();

  return [
    `<tr data-customer-row data-id="${escapeHtml(item.id)}"`,
    ` data-search="${escapeHtml(haystack)}"`,
    ` data-status="${escapeHtml(item.trang_thai || '')}"`,
    ` data-nv="${escapeHtml(item.nhan_vien_id || '')}"`,
    ` data-payment="${escapeHtml(item.hinh_thuc_tt || '')}">`,
    `<td><strong>${escapeHtml(item.ten)}</strong><br><span class="muted">${escapeHtml(item.sdt || '')}</span></td>`,
    `<td>${nvLabel}</td>`,
    `<td>${xeLabel}</td>`,
    `<td>${escapeHtml(item.so_hd || '—')}</td>`,
    `<td>${escapeHtml(formatPaymentType(item.hinh_thuc_tt))}</td>`,
    `<td><span class="badge ${status[1]}">${status[0]}</span></td>`,
    `<td>${item.ngay_ky ? formatDate(item.ngay_ky) : '—'}</td>`,
    `<td>${item.ngay_giao_du_kien ? formatDate(item.ngay_giao_du_kien) : '—'}</td>`,
    `<td>${item.ngay_giao_thuc_te ? formatDate(item.ngay_giao_thuc_te) : '—'}</td>`,
    '<td><div class="button-row">',
    `<button type="button" class="btn btn-soft" data-action="open-customer-edit" data-id="${escapeHtml(item.id)}">Sửa</button>`,
    `<button type="button" class="btn btn-danger" data-action="delete-customer" data-id="${escapeHtml(item.id)}">Xoá</button>`,
    '</div></td>',
    '</tr>',
  ].join('');
}

function renderKhCard(item, allData) {
  const status = KH_STATUS_META[item.trang_thai] || ['Chưa rõ', 'is-warning'];
  const nvLabel = item.nhan_vien_id
    ? escapeHtml(getNvLabel(allData, item.nhan_vien_id))
    : 'Cần gán NV';
  const xeLabel = item.xe_id
    ? escapeHtml(getXeLabel(allData, item.xe_id))
    : 'Cần gán Xe';
  const haystack = `${item.ten || ''} ${item.sdt || ''} ${item.so_hd || ''} ${getNvLabel(allData, item.nhan_vien_id)} ${getXeLabel(allData, item.xe_id)}`.toLowerCase();

  return [
    `<article class="customer-mobile-card" data-customer-row data-id="${escapeHtml(item.id)}"`,
    ` data-search="${escapeHtml(haystack)}" data-status="${escapeHtml(item.trang_thai || '')}"`,
    ` data-nv="${escapeHtml(item.nhan_vien_id || '')}" data-payment="${escapeHtml(item.hinh_thuc_tt || '')}">`,
    '<div class="customer-mobile-head">',
    '<div class="content-flex-1">',
    `<h3 class="card-title">${escapeHtml(item.ten)}</h3>`,
    `<p class="card-subtitle">${escapeHtml(item.sdt || 'Chưa cập nhật SĐT')}</p>`,
    '</div>',
    `<span class="badge ${status[1]}">${status[0]}</span>`,
    '</div>',
    '<div class="meta-pair-grid">',
    `<div class="meta-pair"><span class="meta-key">Nhân viên</span><span class="meta-value">${nvLabel}</span></div>`,
    `<div class="meta-pair"><span class="meta-key">Xe</span><span class="meta-value">${xeLabel}</span></div>`,
    `<div class="meta-pair"><span class="meta-key">Số HĐ</span><span class="meta-value">${escapeHtml(item.so_hd || '—')}</span></div>`,
    `<div class="meta-pair"><span class="meta-key">HTTT</span><span class="meta-value">${escapeHtml(formatPaymentType(item.hinh_thuc_tt))}</span></div>`,
    `<div class="meta-pair"><span class="meta-key">Ngày ký</span><span class="meta-value">${item.ngay_ky ? formatDate(item.ngay_ky) : '—'}</span></div>`,
    `<div class="meta-pair"><span class="meta-key">Dự kiến giao</span><span class="meta-value">${item.ngay_giao_du_kien ? formatDate(item.ngay_giao_du_kien) : '—'}</span></div>`,
    item.ngay_giao_thuc_te ? `<div class="meta-pair"><span class="meta-key">Giao thực tế</span><span class="meta-value">${formatDate(item.ngay_giao_thuc_te)}</span></div>` : '',
    item.muc_dong_mong_muon ? `<div class="meta-pair"><span class="meta-key">Mức đóng mong muốn</span><span class="meta-value">${formatCurrency(item.muc_dong_mong_muon)}</span></div>` : '',
    '</div>',
    '<div class="button-row button-row-top">',
    `<button type="button" class="btn btn-soft" data-action="open-customer-edit" data-id="${escapeHtml(item.id)}">Sửa</button>`,
    `<button type="button" class="btn btn-danger" data-action="delete-customer" data-id="${escapeHtml(item.id)}">Xoá</button>`,
    '</div>',
    '</article>',
  ].join('');
}

export default function renderKhachHangPage(data) {
  const allKh = data.khachHang.khach_hang;
  const setup = isSetupComplete(data);

  const setupBanner = !setup.all ? [
    '<div class="setup-warning-card">',
    '<span>⚠️</span>',
    '<div>',
    '<strong>Cần hoàn thiện setup trước khi nhập KH</strong>',
    '<ul class="muted-link-list">',
    !setup.co_xe ? '<li>Chưa có xe trong catalog — <a href="xe.html">Thêm xe</a></li>' : '',
    !setup.co_nv ? '<li>Chưa có nhân viên đang làm — <a href="nhan-vien.html">Thêm NV</a></li>' : '',
    '</ul>',
    '</div>',
    '</div>',
  ].join('') : '';

  // Build NV filter options
  const nvOptions = data.nhanVien.nhan_vien
    .filter((nv) => nv.trang_thai !== 'nghi_viec')
    .map((nv) => `<option value="${escapeHtml(nv.id)}">${escapeHtml(nv.ho_ten)}</option>`)
    .join('');

  const statusOptions = Object.entries(KH_STATUS_META)
    .map(([v, m]) => `<option value="${v}">${m[0]}</option>`)
    .join('');

  const rows = allKh.length
    ? allKh.map((item) => renderKhRow(item, data)).join('')
    : renderTableEmptyRow(10, 'Chưa có khách hàng nào.');
  const mobileCards = allKh.length
    ? allKh.map((item) => renderKhCard(item, data)).join('')
    : '<div class="table-empty-note">Chưa có khách hàng nào.</div>';

  const content = [
    setupBanner,

    '<article class="table-card">',
    '<div class="toolbar-row button-row-bottom">',
    '<div class="field toolbar-field-wide">',
    '<label class="field-label" for="kh-search">Tìm nhanh</label>',
    '<input class="input" id="kh-search" data-customer-search placeholder="Tên, SĐT, số HĐ, xe, NV..." />',
    '</div>',
    '<div class="field toolbar-field-narrow">',
    '<label class="field-label" for="kh-status">Trạng thái</label>',
    '<select class="select" id="kh-status" data-customer-status>',
    '<option value="all">Tất cả trạng thái</option>',
    statusOptions,
    '</select>',
    '</div>',
    '<div class="field toolbar-field-narrow">',
    '<label class="field-label" for="kh-nv">Nhân viên</label>',
    '<select class="select" id="kh-nv" data-customer-nv>',
    '<option value="all">Tất cả NV</option>',
    nvOptions,
    '</select>',
    '</div>',
    '<div class="field toolbar-field-narrow">',
    '<label class="field-label" for="kh-payment">Hình thức TT</label>',
    '<select class="select" id="kh-payment" data-customer-payment>',
    '<option value="all">Tất cả</option>',
    '<option value="vay_von">Vay vốn</option>',
    '<option value="tien_mat">Tiền mặt</option>',
    '<option value="ket_hop">Kết hợp</option>',
    '</select>',
    '</div>',
    '</div>',

    `<div class="button-row button-row-bottom"><button type="button" class="btn btn-primary" data-action="open-customer-create"${setup.all ? '' : ' disabled title="Cần setup master data trước"'}>+ Thêm khách hàng</button></div>`,

    `<div class="mobile-customer-list">${mobileCards}</div>`,
    '<div class="table-responsive desktop-customer-table"><table class="data-table">',
    '<thead><tr>',
    '<th>Tên KH</th><th>Nhân viên</th><th>Xe</th><th>Số HĐ</th>',
    '<th>HTTT</th><th>Trạng thái</th><th>Ngày ký</th><th>Dự kiến giao</th><th>Giao thực tế</th><th>Hành động</th>',
    '</tr></thead>',
    '<tbody>',
    rows,
    '</tbody></table></div>',
    '</article>',
  ].join('');

  return renderShell('khachhang', content, data);
}

