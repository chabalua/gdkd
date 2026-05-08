// assets/modals/setup-muc-tieu.js
// Modal nhập mục tiêu tháng: mục tiêu công ty (3 KPI) + mục tiêu cá nhân từng NV.
// Lưu vào config.muc_tieu_thang[month]. Không nhập KPI thực tế — chỉ mục tiêu.

import {
  showModal, closeModal, getModalRoot,
  numberValue, createField, escapeHtml,
} from '../ui.js';
import { appState, persistFile, rerenderApp } from '../app.js';

export function openSetupMucTieuModal() {
  const data = appState.data;
  const month = data.config.thang_hien_tai;
  const mt = data.config.muc_tieu_thang?.[month] || {};
  const nvList = data.nhanVien.nhan_vien.filter((nv) => nv.trang_thai !== 'nghi_viec');

  const nvRows = nvList.map((nv) => {
    const nvMt = mt.muc_tieu_nv?.[nv.id]?.xe_ky_moi ?? '';
    return [
      '<div class="field">',
      `<label class="field-label">${escapeHtml(nv.ho_ten)} — Xe ký mới</label>`,
      `<input class="input" type="number" name="nv_xe_ky_moi_${escapeHtml(nv.id)}" value="${escapeHtml(String(nvMt))}" min="0" placeholder="Mục tiêu xe ký mới" />`,
      '</div>',
    ].join('');
  }).join('');

  showModal([
    `<h3 class="modal-title">Mục tiêu tháng ${escapeHtml(month)}</h3>`,
    '<form data-setup-muc-tieu-form class="stack-list">',

    '<p class="section-subtitle" style="margin:0 0 8px">Mục tiêu công ty</p>',
    createField('Xe ký mới (tháng)', 'xe_ky_moi', 'number', mt.xe_ky_moi ?? '', 'min="0" placeholder="VD: 20"'),
    createField('HĐ xuất trong tháng', 'hd_xuat_thang', 'number', mt.hd_xuat_thang ?? '', 'min="0" placeholder="VD: 18"'),
    createField('Lead phát sinh', 'lead_phat_sinh', 'number', mt.lead_phat_sinh ?? '', 'min="0" placeholder="VD: 150"'),

    nvList.length
      ? [
        '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">',
        '<p class="section-subtitle" style="margin:0 0 8px">Mục tiêu cá nhân NV (xe ký mới)</p>',
        nvRows,
      ].join('')
      : '<p class="muted" style="font-size:.85rem">Chưa có nhân viên đang làm. Thêm NV trước.</p>',

    '<div class="button-row" style="margin-top:12px">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    '<button type="submit" class="btn btn-primary">Lưu mục tiêu</button>',
    '</div>',
    '</form>',
  ].join(''));

  const root = getModalRoot();
  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });

  root.querySelector('[data-setup-muc-tieu-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);

    const mucTieuNv = {};
    nvList.forEach((nv) => {
      const val = numberValue(fd.get(`nv_xe_ky_moi_${nv.id}`));
      if (val > 0) {
        mucTieuNv[nv.id] = { xe_ky_moi: val };
      }
    });

    const newMt = {
      xe_ky_moi: numberValue(fd.get('xe_ky_moi')),
      hd_xuat_thang: numberValue(fd.get('hd_xuat_thang')),
      lead_phat_sinh: numberValue(fd.get('lead_phat_sinh')),
      muc_tieu_nv: mucTieuNv,
    };

    if (!data.config.muc_tieu_thang) {
      data.config.muc_tieu_thang = {};
    }
    data.config.muc_tieu_thang[month] = newMt;

    closeModal();
    await persistFile('config.json', {
      thang_hien_tai: data.config.thang_hien_tai,
      showroom: data.config.showroom,
      muc_tieu_thang: data.config.muc_tieu_thang,
      lead_channels: data.config.lead_channels,
      nhom_kinh_doanh: data.config.nhom_kinh_doanh,
    }, 'Đã lưu mục tiêu tháng.');
    rerenderApp();
  });
}
