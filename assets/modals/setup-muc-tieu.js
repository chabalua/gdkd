// assets/modals/setup-muc-tieu.js
// Modal nhập mục tiêu tháng: mục tiêu công ty (3 KPI) + mục tiêu cá nhân từng NV.
// Lưu vào config.muc_tieu_thang[month]. Không nhập KPI thực tế — chỉ mục tiêu.

import {
  showModal, closeModal, getModalRoot,
  numberValue, createField, escapeHtml,
} from '../ui.js';
import { getActiveMonth } from '../models.js';
import { appState, persistFile, rerenderApp } from '../app.js';

export function openSetupMucTieuModal() {
  const data = appState.data;
  const month = getActiveMonth(data);
  const mt = data.config.muc_tieu_thang?.[month] || {};
  const nvList = data.nhanVien.nhan_vien.filter((nv) => nv.trang_thai !== 'nghi_viec');
  const [yr, mn] = month.split('-');

  const nvRows = nvList.map((nv) => {
    const nvMt = mt.muc_tieu_nv?.[nv.id] || {};
    const xeKy = nvMt.xe_ky_moi ?? '';
    const hdXuat = nvMt.hd_xuat_thang ?? '';
    const lead = nvMt.lead_phat_sinh ?? '';
    return [
      '<div class="muc-tieu-nv-row">',
      `<div class="muc-tieu-nv-name">${escapeHtml(nv.ho_ten)}</div>`,
      '<div class="muc-tieu-nv-inputs">',
      `<label class="field"><span class="field-label">Xe ký</span><input class="input" type="number" name="nv_xe_ky_moi_${escapeHtml(nv.id)}" value="${escapeHtml(String(xeKy))}" min="0" placeholder="0" /></label>`,
      `<label class="field"><span class="field-label">HĐ xuất</span><input class="input" type="number" name="nv_hd_xuat_thang_${escapeHtml(nv.id)}" value="${escapeHtml(String(hdXuat))}" min="0" placeholder="0" /></label>`,
      `<label class="field"><span class="field-label">Lead</span><input class="input" type="number" name="nv_lead_phat_sinh_${escapeHtml(nv.id)}" value="${escapeHtml(String(lead))}" min="0" placeholder="0" /></label>`,
      '</div>',
      '</div>',
    ].join('');
  }).join('');

  showModal([
    `<h3 class="modal-title">Mục tiêu tháng ${parseInt(mn, 10)}/${yr}</h3>`,
    `<p class="modal-copy" style="margin:0 0 8px;color:var(--text-muted);font-size:.85rem">Đổi tháng bằng Range picker ở topbar trước khi mở modal này.</p>`,
    '<form data-setup-muc-tieu-form class="stack-list">',

    '<p class="section-subtitle" style="margin:0 0 8px">Mục tiêu công ty</p>',
    createField('Xe ký mới (tháng)', 'xe_ky_moi', 'number', mt.xe_ky_moi ?? '', 'min="0" placeholder="VD: 20"'),
    createField('HĐ xuất trong tháng', 'hd_xuat_thang', 'number', mt.hd_xuat_thang ?? '', 'min="0" placeholder="VD: 18"'),
    createField('Lead phát sinh', 'lead_phat_sinh', 'number', mt.lead_phat_sinh ?? '', 'min="0" placeholder="VD: 150"'),

    nvList.length
      ? [
        '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">',
        '<p class="section-subtitle" style="margin:0 0 8px">Mục tiêu cá nhân NV (chỉ điền nếu khác mặc định)</p>',
        '<div class="muc-tieu-nv-list">',
        nvRows,
        '</div>',
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
      const xeKy = numberValue(fd.get(`nv_xe_ky_moi_${nv.id}`));
      const hdXuat = numberValue(fd.get(`nv_hd_xuat_thang_${nv.id}`));
      const lead = numberValue(fd.get(`nv_lead_phat_sinh_${nv.id}`));
      if (xeKy > 0 || hdXuat > 0 || lead > 0) {
        mucTieuNv[nv.id] = {
          xe_ky_moi: xeKy,
          hd_xuat_thang: hdXuat,
          lead_phat_sinh: lead,
        };
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
    const { cong_ty, gdkd, ...persistConfig } = data.config;
    await persistFile('config.json', persistConfig, 'Đã lưu mục tiêu tháng.');
    rerenderApp();
  });
}
