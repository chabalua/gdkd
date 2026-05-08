// assets/views/cskh.js
// CSKH page: filter từ khach_hang (schema v2) thay vì cskh.json cũ.
import { renderShell, renderEmptyState } from './shell.js';
import { escapeHtml, formatDate, numberValue } from '../ui.js';
import { CSKH_STATUS_META, getNvLabel, getXeLabel } from '../models.js';

// KH cần CSKH: đã giao && (chưa có cskh nào sau 7 ngày || có cskh chưa xử lý xong)
function needsCskh(kh) {
  if (!['da_giao', 'dong_cskh'].includes(kh.trang_thai)) return false;
  if (!Array.isArray(kh.cskh)) return true;
  const hasUnresolved = kh.cskh.some((c) => c.trang_thai_xu_ly !== 'da_xu_ly');
  if (hasUnresolved) return true;
  if (kh.cskh.length === 0 && kh.ngay_giao_thuc_te) {
    const days = Math.round((Date.now() - new Date(kh.ngay_giao_thuc_te).getTime()) / 86400000);
    return days > 7;
  }
  return false;
}

export default function renderCskhPage(data) {
  const allKh = data.khachHang.khach_hang;
  const daGiao = allKh.filter((kh) => ['da_giao', 'dong_cskh'].includes(kh.trang_thai));
  const canXuLy = daGiao.filter(needsCskh);

  // Tính đánh giá trung bình từ tất cả CSKH entries
  const allEntries = daGiao.flatMap((kh) => kh.cskh || []);
  const avg = allEntries.length
    ? (allEntries.reduce((sum, c) => sum + numberValue(c.danh_gia), 0) / allEntries.length).toFixed(1)
    : '0';

  const cards = canXuLy.map((kh) => {
    const unresolved = (kh.cskh || []).filter((c) => c.trang_thai_xu_ly !== 'da_xu_ly');
    const lastEntry = (kh.cskh || []).at(-1);
    const metaStatus = lastEntry
      ? (CSKH_STATUS_META[lastEntry.trang_thai_xu_ly] || ['Chưa rõ', 'is-warning'])
      : ['Chưa có phản hồi', 'is-danger'];
    const nvName = escapeHtml(getNvLabel(data, kh.nhan_vien_id));
    const xeName = escapeHtml(getXeLabel(data, kh.xe_id));
    const haystack = `${kh.ten || ''} ${nvName} ${xeName}`.toLowerCase();

    return [
      `<article class="feedback-card" data-cskh-card data-search="${escapeHtml(haystack)}">`,
      '<div class="feedback-row">',
      '<div class="content-flex-1">',
      `<h3 class="card-title">${escapeHtml(kh.ten)}</h3>`,
      `<p class="card-subtitle">${xeName} · NV: ${nvName}</p>`,
      kh.ngay_giao_thuc_te ? `<p class="card-subtitle">Giao: ${formatDate(kh.ngay_giao_thuc_te)}</p>` : '',
      '</div>',
      `<span class="badge ${metaStatus[1]}">${metaStatus[0]}</span>`,
      '</div>',
      lastEntry ? `<div class="star-row" aria-label="${lastEntry.danh_gia} sao">${'★'.repeat(numberValue(lastEntry.danh_gia))}${'☆'.repeat(5 - numberValue(lastEntry.danh_gia))}</div>` : '',
      lastEntry?.phan_hoi ? `<div class="timeline-note button-row-top">💬 ${escapeHtml(lastEntry.phan_hoi)}</div>` : '',
      unresolved.length ? `<div class="timeline-note text-danger">⚠ ${unresolved.length} vấn đề chưa xử lý xong</div>` : '',
      '<div class="button-row button-row-top">',
      `<button type="button" class="btn btn-soft" data-action="open-customer-edit" data-id="${escapeHtml(kh.id)}">Thêm phản hồi / Sửa KH</button>`,
      '</div>',
      '</article>',
    ].join('');
  }).join('');

  const dongCskh = allKh.filter((kh) => kh.trang_thai === 'dong_cskh').length;

  const content = [
    '<section class="summary-grid">',
    `<article class="summary-card"><div class="count-label">Tổng đã giao</div><div class="count-value">${daGiao.length}</div></article>`,
    `<article class="summary-card"><div class="count-label">Cần xử lý CSKH</div><div class="count-value text-danger">${canXuLy.length}</div></article>`,
    `<article class="summary-card"><div class="count-label">Đánh giá TB</div><div class="count-value">${avg}★</div></article>`,
    `<article class="summary-card"><div class="count-label">Đã đóng CSKH</div><div class="count-value text-success">${dongCskh}</div></article>`,
    '</section>',
    '<div class="utility-space"></div>',
    '<section class="section-header"><div><h3 class="section-title">Khách hàng cần chăm sóc sau giao xe</h3><p class="section-subtitle">KH đã giao xe có phản hồi chưa xử lý hoặc chưa được CSKH sau 7 ngày.</p></div></section>',
    '<section class="table-card">',
    '<div class="toolbar-row"><div class="field toolbar-field-wide"><label class="field-label" for="cskh-search">Tìm nhanh</label><input class="input" id="cskh-search" data-cskh-search placeholder="Tìm theo tên KH, xe, nhân viên..." /></div></div>',
    canXuLy.length ? `<section class="cskh-grid">${cards}</section>` : renderEmptyState('Không có KH nào cần CSKH', 'Tất cả KH đã giao đều đã được chăm sóc đầy đủ.', '', ''),
    '</section>',
  ].join('');

  return renderShell('cskh', content, data);
}


