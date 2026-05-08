// assets/modals/cskh.js
import {
  showModal, closeModal, getModalRoot,
  escapeHtml, trimmedValue, numberValue, makeId,
  createField, createSelectField,
} from '../ui.js';
import { CSKH_STATUS_META } from '../models.js';
import { appState, persistFile, rerenderApp } from '../app.js';

export function openCskhModal(itemId) {
  const existing = appState.data.cskh.danh_sach.find((item) => item.id === itemId);
  const draft = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: makeId('cs'),
    ten_kh: '', xe: '', ngay_giao: '', ngay_cskh: '',
    kenh: 'dien_thoai', danh_gia: 5,
    phan_hoi_mau_xe: '', van_de: '',
    trang_thai_xu_ly: 'chua_xu_ly', ghi_chu_noi_bo: '',
  };

  showModal([
    `<h3 class="modal-title">${existing ? 'Cập nhật phản hồi CSKH' : 'Thêm phản hồi CSKH'}</h3>`,
    '<form data-cskh-form class="stack-list">',
    `<input type="hidden" name="item_id" value="${escapeHtml(draft.id)}">`,
    createField('Tên khách hàng', 'ten_kh', 'text', draft.ten_kh, 'required'),
    createField('Dòng xe', 'xe', 'text', draft.xe),
    createField('Ngày giao xe', 'ngay_giao', 'date', draft.ngay_giao || ''),
    createField('Ngày CSKH', 'ngay_cskh', 'date', draft.ngay_cskh || ''),
    createSelectField('Kênh CSKH', 'kenh', [
      { value: 'dien_thoai', label: 'Điện thoại' },
      { value: 'zalo', label: 'Zalo' },
      { value: 'truc_tiep', label: 'Trực tiếp' },
    ], draft.kenh || 'dien_thoai'),
    createField('Đánh giá (1-5)', 'danh_gia', 'number', draft.danh_gia || 5, 'min="1" max="5"'),
    createField('Phản hồi mẫu xe', 'phan_hoi_mau_xe', 'textarea', draft.phan_hoi_mau_xe || ''),
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
      ten_kh: trimmedValue(formData, 'ten_kh'),
      xe: trimmedValue(formData, 'xe'),
      ngay_giao: trimmedValue(formData, 'ngay_giao'),
      ngay_cskh: trimmedValue(formData, 'ngay_cskh'),
      kenh: trimmedValue(formData, 'kenh'),
      danh_gia: Math.max(1, Math.min(5, numberValue(formData.get('danh_gia')) || 1)),
      phan_hoi_mau_xe: trimmedValue(formData, 'phan_hoi_mau_xe'),
      van_de: trimmedValue(formData, 'van_de'),
      trang_thai_xu_ly: trimmedValue(formData, 'trang_thai_xu_ly'),
      ghi_chu_noi_bo: trimmedValue(formData, 'ghi_chu_noi_bo'),
    };
    if (existing) {
      const index = appState.data.cskh.danh_sach.findIndex((item) => item.id === existing.id);
      appState.data.cskh.danh_sach[index] = payload;
    } else {
      appState.data.cskh.danh_sach.unshift(payload);
    }
    closeModal();
    await persistFile('cskh.json', appState.data.cskh, existing ? 'Đã cập nhật phản hồi CSKH.' : 'Đã thêm phản hồi CSKH.');
    rerenderApp();
  });
}
