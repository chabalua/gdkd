// assets/components/button-toolbar.js
// Hệ thống nút chuẩn cho toàn app.
// Mọi view/modals dùng các helper ở đây thay vì tự viết HTML nút.
//
// Quy ước variant:
//   primary   → btn-primary   (hành động chính của trang: Thêm mới, Lưu)
//   accent    → btn-accent    (hành động nổi bật đặc biệt: Đồng bộ ngay)
//   secondary → btn-soft      (hành động phụ: Chỉnh sửa, Xem)
//   ghost     → btn-ghost     (hành động tertiary: Huỷ, Quay lại)
//   danger    → btn-danger    (hành động huỷ diệt: Xoá)

import { escapeHtml } from '../ui.js';

const VARIANT_CLASS = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  secondary: 'btn-soft',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

/**
 * Render 1 nút đơn.
 * @param {{ label:string, variant?:string, action?:string, id?:string,
 *           href?:string, disabled?:boolean, title?:string, size?:string,
 *           icon?:string, type?:string }} opts
 */
export function renderBtn(opts = {}) {
  const {
    label = '',
    variant = 'secondary',
    action = '',
    id = '',
    href = '',
    disabled = false,
    title = '',
    size = '',
    icon = '',
    type = 'button',
  } = opts;

  const variantClass = VARIANT_CLASS[variant] || 'btn-soft';
  const sizeClass = size === 'sm' ? ' btn-sm' : '';
  const disabledAttr = disabled ? ' disabled' : '';
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
  const actionAttr = action ? ` data-action="${escapeHtml(action)}"` : '';
  const idAttr = id ? ` data-id="${escapeHtml(id)}"` : '';
  const iconHtml = icon ? `<span class="btn-icon" aria-hidden="true">${icon}</span>` : '';

  if (href) {
    return `<a class="btn ${variantClass}${sizeClass}" href="${escapeHtml(href)}"${titleAttr}>${iconHtml}${escapeHtml(label)}</a>`;
  }
  return `<button type="${escapeHtml(type)}" class="btn ${variantClass}${sizeClass}"${actionAttr}${idAttr}${disabledAttr}${titleAttr}>${iconHtml}${escapeHtml(label)}</button>`;
}

/**
 * Render nhóm nút trong .button-row
 * @param {Array} actions - Mảng opts cho renderBtn
 */
export function renderBtnGroup(actions = []) {
  if (!actions.length) return '';
  return `<div class="button-row">${actions.map((opts) => renderBtn(opts)).join('')}</div>`;
}

// === Các bộ nút chuẩn dùng chung ===

/**
 * Bộ nút hàng: Chỉnh sửa + Xoá
 * @param {string} editAction - data-action cho nút sửa
 * @param {string} deleteAction - data-action cho nút xoá
 * @param {string} itemId - data-id
 * @param {{ deleteDisabled?:boolean, deleteTitle?:string }} opts
 */
export function rowActions_editDelete(editAction, deleteAction, itemId, opts = {}) {
  return [
    renderBtn({ label: 'Chỉnh sửa', variant: 'secondary', action: editAction, id: itemId }),
    renderBtn({
      label: 'Xoá', variant: 'danger', action: deleteAction, id: itemId,
      disabled: opts.deleteDisabled || false,
      title: opts.deleteTitle || '',
    }),
  ];
}

// === Nút chuẩn trong modal ===
export const MODAL_CANCEL = () => renderBtn({ label: 'Huỷ', variant: 'ghost', action: 'modal-cancel' });
export const MODAL_SAVE = (label) => renderBtn({ label: label || 'Lưu', variant: 'primary', type: 'submit' });
export function modalButtonRow(saveLabel) {
  return `<div class="button-row">${MODAL_CANCEL()}${MODAL_SAVE(saveLabel)}</div>`;
}
