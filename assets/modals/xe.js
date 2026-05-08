// assets/modals/xe.js
// Form thêm/sửa dòng xe trong catalog. Mã xe có nút "Gợi ý" tự sinh từ
// hãng/dòng/biến thể/màu/năm; user vẫn có thể sửa tay.

import {
  showModal, closeModal, getModalRoot,
  escapeHtml, trimmedValue, numberValue, makeId,
  createField, createSelectField,
} from '../ui.js';
import { XE_STATUS_META, suggestMaXe } from '../models.js';
import { appState, persistFile, rerenderApp } from '../app.js';

export function openXeModal(xeId) {
  const existing = appState.data.xe.xe.find((item) => item.id === xeId);
  const draft = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: makeId('x'),
    ma_xe: '',
    hang: '',
    dong: '',
    bien_the: '',
    mau: '',
    nam: new Date().getFullYear(),
    gia_niem_yet: 0,
    trang_thai: 'dang_ban',
  };

  const statusOptions = Object.entries(XE_STATUS_META).map(([value, meta]) => ({
    value,
    label: meta[0],
  }));

  showModal([
    `<h3 class="modal-title">${existing ? 'Cập nhật dòng xe' : 'Thêm dòng xe'}</h3>`,
    '<form data-xe-form class="stack-list form-grid-two">',
    `<input type="hidden" name="xe_id" value="${escapeHtml(draft.id)}">`,

    // Hàng đặc biệt: ma_xe + nút gợi ý cùng dòng
    `<label class="field" style="grid-column: 1 / -1;">
       <span class="field-label">Mã xe</span>
       <div class="button-row" style="gap:8px; align-items:stretch;">
         <input class="input" type="text" name="ma_xe" value="${escapeHtml(draft.ma_xe || '')}" placeholder="VD: OMODA-C5-PRE-WHT-2025" required style="flex:1;">
         <button type="button" class="btn btn-soft" data-xe-suggest>Gợi ý từ thông tin bên dưới</button>
       </div>
     </label>`,

    createField('Hãng', 'hang', 'text', draft.hang, 'required placeholder="Omoda"'),
    createField('Dòng xe', 'dong', 'text', draft.dong, 'required placeholder="C5"'),
    createField('Biến thể', 'bien_the', 'text', draft.bien_the, 'placeholder="Premium / Tiêu chuẩn"'),
    createField('Màu', 'mau', 'text', draft.mau, 'placeholder="Trắng"'),
    createField('Năm sản xuất', 'nam', 'number', draft.nam || new Date().getFullYear(), 'min="2000" max="2099"'),
    createField('Giá niêm yết (VND)', 'gia_niem_yet', 'number', draft.gia_niem_yet || 0, 'min="0" step="1000000"'),
    createSelectField('Trạng thái', 'trang_thai', statusOptions, draft.trang_thai || 'dang_ban'),

    '<div class="button-row" style="grid-column: 1 / -1;">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    `<button type="submit" class="btn btn-primary">${existing ? 'Lưu thay đổi' : 'Tạo dòng xe'}</button>`,
    '</div>',
    '</form>',
  ].join(''), { cardClass: 'is-wide' });

  const root = getModalRoot();
  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });

  // Nút "Gợi ý mã xe": đọc 5 trường hiện tại, tự build slug
  root.querySelector('[data-xe-suggest]').addEventListener('click', () => {
    const form = root.querySelector('[data-xe-form]');
    const fd = new FormData(form);
    const suggested = suggestMaXe({
      hang: fd.get('hang'),
      dong: fd.get('dong'),
      bien_the: fd.get('bien_the'),
      mau: fd.get('mau'),
      nam: fd.get('nam'),
    });
    form.querySelector('input[name="ma_xe"]').value = suggested;
  });

  root.querySelector('[data-xe-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload = {
      id: trimmedValue(formData, 'xe_id'),
      ma_xe: trimmedValue(formData, 'ma_xe'),
      hang: trimmedValue(formData, 'hang'),
      dong: trimmedValue(formData, 'dong'),
      bien_the: trimmedValue(formData, 'bien_the'),
      mau: trimmedValue(formData, 'mau'),
      nam: numberValue(formData.get('nam')),
      gia_niem_yet: numberValue(formData.get('gia_niem_yet')),
      trang_thai: trimmedValue(formData, 'trang_thai') || 'dang_ban',
    };

    if (existing) {
      const index = appState.data.xe.xe.findIndex((item) => item.id === existing.id);
      appState.data.xe.xe[index] = payload;
    } else {
      appState.data.xe.xe.unshift(payload);
    }

    closeModal();
    await persistFile('xe.json', appState.data.xe, existing ? 'Đã cập nhật dòng xe.' : 'Đã thêm dòng xe vào catalog.');
    rerenderApp();
  });
}
