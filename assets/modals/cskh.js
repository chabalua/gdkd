// assets/modals/cskh.js
import {
  showModal, closeModal, getModalRoot,
  escapeHtml, trimmedValue, numberValue, makeId,
  createField, createSelectField,
} from '../ui.js';
import { CSKH_STATUS_META } from '../models.js';
import { appState, persistFile, rerenderApp } from '../app.js';

function resolveCskhContext(itemId) {
  const customers = appState.data?.khachHang?.khach_hang || [];
  if (!itemId) return { customer: null, existing: null };

  const directCustomer = customers.find((item) => item.id === itemId);
  if (directCustomer) {
    return { customer: directCustomer, existing: null };
  }

  for (const customer of customers) {
    const existing = (customer.cskh || []).find((entry) => entry.id === itemId);
    if (existing) {
      return { customer, existing };
    }
  }

  return { customer: null, existing: null };
}

export function openCskhModal(itemId) {
  const { customer, existing } = resolveCskhContext(itemId);
  if (!customer) {
    showModal([
      '<h3 class="modal-title">Thiếu ngữ cảnh khách hàng</h3>',
      '<p class="modal-copy">Hãy mở phản hồi CSKH từ hồ sơ khách hàng hoặc màn hình CSKH để app biết cần lưu vào khách nào.</p>',
      '<div class="button-row">',
      '<button type="button" class="btn btn-ghost" data-modal-cancel>Đóng</button>',
      '</div>',
    ].join(''));
    getModalRoot().querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });
    return;
  }

  const draft = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: makeId('cs'),
    ngay: '',
    kenh: 'dien_thoai', danh_gia: 5,
    phan_hoi: '', van_de: '',
    trang_thai_xu_ly: 'chua_xu_ly', ghi_chu_noi_bo: '',
  };

  showModal([
    `<h3 class="modal-title">${existing ? 'Cập nhật phản hồi CSKH' : 'Thêm phản hồi CSKH'}</h3>`,
    '<form data-cskh-form class="stack-list">',
    `<input type="hidden" name="item_id" value="${escapeHtml(draft.id)}">`,
    `<div class="info-strip"><strong>${escapeHtml(customer.ten || 'Khách hàng')}</strong><span>${escapeHtml(customer.ngay_giao_thuc_te || 'Chưa có ngày giao thực tế')}</span></div>`,
    createField('Ngày CSKH', 'ngay', 'date', draft.ngay || ''),
    createSelectField('Kênh CSKH', 'kenh', [
      { value: 'dien_thoai', label: 'Điện thoại' },
      { value: 'zalo', label: 'Zalo' },
      { value: 'truc_tiep', label: 'Trực tiếp' },
    ], draft.kenh || 'dien_thoai'),
    createField('Đánh giá (1-5)', 'danh_gia', 'number', draft.danh_gia || 5, 'min="1" max="5"'),
    createField('Phản hồi khách hàng', 'phan_hoi', 'textarea', draft.phan_hoi || ''),
    createField('Vấn đề', 'van_de', 'textarea', draft.van_de || ''),
    createSelectField('Trạng thái xử lý', 'trang_thai_xu_ly', Object.entries(CSKH_STATUS_META).map((entry) => ({ value: entry[0], label: entry[1][0] })), draft.trang_thai_xu_ly || 'chua_xu_ly'),
    createField('Ghi chú nội bộ', 'ghi_chu_noi_bo', 'textarea', draft.ghi_chu_noi_bo || ''),
    '<div class="button-row">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    `<button type="submit" class="btn btn-primary">${existing ? 'Lưu thay đổi' : 'Thêm phản hồi'}</button>`,
    '</div>',
    '</form>',
  ].join(''));

  const root = getModalRoot();
  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });
  root.querySelector('[data-cskh-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      ...(existing || {}),
      id: trimmedValue(formData, 'item_id'),
      ngay: trimmedValue(formData, 'ngay'),
      kenh: trimmedValue(formData, 'kenh'),
      danh_gia: Math.max(1, Math.min(5, numberValue(formData.get('danh_gia')) || 1)),
      phan_hoi: trimmedValue(formData, 'phan_hoi'),
      van_de: trimmedValue(formData, 'van_de'),
      trang_thai_xu_ly: trimmedValue(formData, 'trang_thai_xu_ly'),
      ghi_chu_noi_bo: trimmedValue(formData, 'ghi_chu_noi_bo'),
    };

    if (!Array.isArray(customer.cskh)) customer.cskh = [];
    if (existing) {
      const index = customer.cskh.findIndex((item) => item.id === existing.id);
      if (index >= 0) customer.cskh[index] = payload;
    } else {
      customer.cskh.unshift(payload);
    }
    closeModal();
    await persistFile('khach-hang.json', appState.data.khachHang, existing ? 'Đã cập nhật phản hồi CSKH.' : 'Đã thêm phản hồi CSKH.');
    rerenderApp();
  });
}
