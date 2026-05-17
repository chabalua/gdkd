// assets/modals/customer.js
// Form thêm/sửa KH theo schema v2: dropdown FK cho NV + Xe, tiến độ, CSKH.
import {
  showModal, closeModal, getModalRoot,
  escapeHtml, trimmedValue, numberValue, makeId, showToast,
  createField, createSelectField,
} from '../ui.js';
import { KH_STATUS_META, CSKH_STATUS_META, getLeadChannels, getXeColorOptions, isValidStatusTransition } from '../models.js';
import { appState, persistFile, rerenderApp } from '../app.js';

// === Helpers ===
function nvOptions(allData, selectedId) {
  return [
    { value: '', label: '— Chọn nhân viên phụ trách —' },
    ...allData.nhanVien.nhan_vien
    .filter((nv) => nv.trang_thai !== 'nghi_viec')
    .map((nv) => ({ value: nv.id, label: nv.ho_ten })),
  ];
}

function xeOptions(allData) {
  return [
    { value: '', label: '— Chọn xe —' },
    ...allData.xe.xe
    .filter((x) => ['dang_ban', 'sap_ve'].includes(x.trang_thai))
    .map((x) => {
      const label = [x.ma_xe, [x.hang, x.dong, x.bien_the].filter(Boolean).join(' ')].filter(Boolean).join(' · ') +
        (x.mau ? ` · ${x.mau}` : '') +
        (x.gia_niem_yet ? ` · ${Math.round(x.gia_niem_yet / 1e9 * 10) / 10}tỷ` : '');
      return { value: x.id, label };
    }),
  ];
}

function renderXeColorField(allData, xeId, selectedColor = '') {
  const selectedXe = (allData?.xe?.xe || []).find((item) => item.id === xeId);
  const colors = getXeColorOptions(selectedXe);
  const dataListId = 'customer-xe-color-options';
  return [
    '<label class="field">',
    '<span class="field-label">Màu xe</span>',
    `<input class="input" type="text" name="mau_xe" list="${dataListId}" value="${escapeHtml(selectedColor || '')}" placeholder="${escapeHtml(colors.length ? 'Chọn hoặc gõ màu xe' : 'Ví dụ: Trắng / Đen / Xám')}">`,
    colors.length
      ? `<datalist id="${dataListId}">${colors.map((color) => `<option value="${escapeHtml(color)}"></option>`).join('')}</datalist>`
      : '',
    `<span class="muted">${escapeHtml(colors.length ? 'Màu được gợi ý từ catalog của dòng xe đã chọn.' : 'Catalog chưa khai báo màu cho dòng xe này, bạn có thể tự nhập tạm.')}</span>`,
    '</label>',
  ].join('');
}

function renderTienDo(tienDo) {
  if (!Array.isArray(tienDo) || tienDo.length === 0) {
    return '<p class="customer-log-empty">Chưa có cập nhật nào.</p>';
  }
  return tienDo.map((step, i) => [
    `<div class="tien-do-item customer-log-item" data-tiendo-index="${i}">`,
    `<span class="customer-log-date">${escapeHtml(step.ngay || '')}</span>`,
    `<span class="customer-log-step">${step.buoc || ''}</span>`,
    `<span class="customer-log-content">${escapeHtml(step.noi_dung || '')}</span>`,
    `<button type="button" class="btn btn-ghost btn-sm" data-delete-tiendo="${i}" title="Xoá bước này">✕</button>`,
    '</div>',
  ].join('')).join('');
}

function renderCskhList(cskhList) {
  if (!Array.isArray(cskhList) || cskhList.length === 0) {
    return '<p class="customer-log-empty">Chưa có phản hồi CSKH.</p>';
  }
  return cskhList.map((c, i) => {
    const statusMeta = CSKH_STATUS_META[c.trang_thai_xu_ly] || ['Chưa rõ', 'is-warning'];
    return [
      `<div class="cskh-item customer-feedback-item" data-cskh-index="${i}">`,
      '<div class="customer-feedback-head">',
      `<strong>${escapeHtml(c.ngay || '')} · ${escapeHtml(c.kenh || '')} · ${'⭐'.repeat(c.danh_gia || 0)}</strong>`,
      `<span class="badge ${statusMeta[1]}">${statusMeta[0]}</span>`,
      `<button type="button" class="btn btn-ghost btn-sm" data-delete-cskh="${i}" title="Xoá phản hồi này">✕</button>`,
      `</div>`,
      c.phan_hoi ? `<p class="customer-feedback-line">💬 ${escapeHtml(c.phan_hoi)}</p>` : '',
      c.van_de ? `<p class="customer-feedback-line is-danger">⚠ ${escapeHtml(c.van_de)}</p>` : '',
      c.ghi_chu_noi_bo ? `<p class="customer-feedback-line is-muted">📝 ${escapeHtml(c.ghi_chu_noi_bo)}</p>` : '',
      '</div>',
    ].join('');
  }).join('');
}

// === Modal mở form ===
export function openCustomerModal(customerId, prefillOptions) {
  // backward compat: prefillOptions can be a string (nvId) or an object
  const prefillNvId = typeof prefillOptions === 'string' ? prefillOptions : (prefillOptions?.prefillNvId || '');
  const prefillStatus = (typeof prefillOptions === 'object' && prefillOptions?.prefillStatus) ? prefillOptions.prefillStatus : 'du_ky';
  const allData = appState.data;
  const list = allData.khachHang.khach_hang;
  const existing = customerId ? list.find((item) => item.id === customerId) : null;

  const draft = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: makeId('kh'),
    ten: '', sdt: '', dia_chi: '',
    nhan_vien_id: prefillNvId || '',
    xe_id: '',
    mau_xe: '',
    ghi_chu_ctkm: '',
    trang_thai: prefillStatus || 'du_ky',
    ngay_du_kien_ky: '', ngay_ky: '',
    ngay_giao_du_kien: '', ngay_giao_thuc_te: '',
    ngay_xuat_hd: '',
    hinh_thuc_tt: 'vay_von', ngan_hang: '',
    so_tien_vay: 0, muc_dong_mong_muon: 0,
    so_hd: '',
    tien_do: [],
    cskh: [],
    kenh_lead: '',
  };

  const nvOpts = nvOptions(allData);
  const xeOpts = xeOptions(allData);
  const statusOpts = Object.entries(KH_STATUS_META).map(([v, m]) => ({ value: v, label: m[0] }));
  const leadChannelOptions = getLeadChannels(allData)
    .filter((channel) => channel.loai !== 'hoat_dong')
    .map((channel) => ({ value: channel.id, label: channel.label }));

  // Xuất hoá đơn là cờ độc lập với pipeline — KH có thể xuất HĐ ở bất kỳ status nào.
  // Field ngày xuất HĐ luôn hiện (cùng cụm với checkbox), không gắn với trạng thái.
  const showGiao = ['da_giao', 'dong_cskh'].includes(draft.trang_thai);
  const showCskh = showGiao;
  const daXuatHd = Boolean(draft.ngay_xuat_hd);

  const formHtml = [
    `<h3 class="modal-title">${existing ? 'Cập nhật khách hàng' : 'Thêm khách hàng'}</h3>`,
    `<form data-customer-form class="customer-form">`,
    `<input type="hidden" name="customer_id" value="${escapeHtml(draft.id)}">`,

    '<fieldset class="customer-form-section"><legend>Thông tin cơ bản</legend>',
    createField('Tên khách hàng', 'ten', 'text', draft.ten, 'required'),
    createField('Số điện thoại', 'sdt', 'tel', draft.sdt),
    createField('Địa chỉ', 'dia_chi', 'text', draft.dia_chi || ''),
    createSelectField('Nhân viên phụ trách (*)', 'nhan_vien_id', nvOpts, draft.nhan_vien_id, 'required'),
    createSelectField('Xe (*)', 'xe_id', xeOpts, draft.xe_id, 'required'),
    `<div id="customer-xe-color-field">${renderXeColorField(allData, draft.xe_id, draft.mau_xe || '')}</div>`,
    createSelectField('Kênh lead (nguồn KH)', 'kenh_lead', [
      { value: '', label: '— Chưa rõ kênh —' },
      ...leadChannelOptions,
    ], draft.kenh_lead || ''),
    createField('Ghi chú CTKM', 'ghi_chu_ctkm', 'textarea', draft.ghi_chu_ctkm || ''),
    '</fieldset>',

    '<fieldset class="customer-form-section"><legend>Trạng thái & Ngày</legend>',
    createSelectField('Trạng thái', 'trang_thai', statusOpts, draft.trang_thai),
    `<div id="field-ngay-du-kien-ky" class="field-toggle${draft.trang_thai === 'du_ky' ? '' : ' is-hidden'}">`,
    createField('Ngày dự kiến ký', 'ngay_du_kien_ky', 'date', draft.ngay_du_kien_ky || ''),
    `</div>`,
    createField('Ngày ký HĐ', 'ngay_ky', 'date', draft.ngay_ky || ''),
    createField('Dự kiến giao xe', 'ngay_giao_du_kien', 'date', draft.ngay_giao_du_kien || ''),
    `<div id="field-ngay-giao-thuc-te" class="field-toggle${showGiao ? '' : ' is-hidden'}">`,
    createField('Ngày giao thực tế', 'ngay_giao_thuc_te', 'date', draft.ngay_giao_thuc_te || ''),
    `</div>`,
    '</fieldset>',

    '<fieldset class="customer-form-section"><legend>🧾 Hoá đơn</legend>',
    '<label class="field xhd-toggle-row">',
    `<input type="checkbox" name="da_xuat_hd"${daXuatHd ? ' checked' : ''} data-toggle-xhd>`,
    '<span class="field-label is-inline">Đã xuất hoá đơn</span>',
    '</label>',
    `<div id="field-ngay-xuat-hd" class="field-toggle${daXuatHd ? '' : ' is-hidden'}">`,
    createField('Ngày xuất hoá đơn', 'ngay_xuat_hd', 'date', draft.ngay_xuat_hd || ''),
    `</div>`,
    '</fieldset>',

    '<fieldset class="customer-form-section"><legend>Thanh toán</legend>',
    createSelectField('Hình thức TT', 'hinh_thuc_tt', [
      { value: 'vay_von', label: 'Vay vốn' },
      { value: 'tien_mat', label: 'Tiền mặt' },
      { value: 'ket_hop', label: 'Kết hợp' },
    ], draft.hinh_thuc_tt),
    createField('Ngân hàng', 'ngan_hang', 'text', draft.ngan_hang || ''),
    createField('Số tiền vay (VND)', 'so_tien_vay', 'number', String(draft.so_tien_vay || 0), 'min="0"'),
    createField('Mức đóng mong muốn (VND)', 'muc_dong_mong_muon', 'number', String(draft.muc_dong_mong_muon || 0), 'min="0"'),
    createField('Số hợp đồng', 'so_hd', 'text', draft.so_hd || ''),
    '</fieldset>',

    '<fieldset class="customer-form-section"><legend>Tiến độ (Append-only)</legend>',
    `<div id="tien-do-list" class="button-row-bottom">${renderTienDo(draft.tien_do)}</div>`,
    '<div class="customer-subpanel">',
    '<strong class="customer-subpanel-title">+ Thêm cập nhật mới</strong>',
    createField('Ngày', 'td_ngay', 'date', new Date().toISOString().slice(0, 10)),
    createField('Bước (số)', 'td_buoc', 'number', String((draft.tien_do?.length || 0) + 1), 'min="1"'),
    createField('Nội dung', 'td_noi_dung', 'textarea', ''),
    '</div>',
    '</fieldset>',

    `<fieldset id="cskh-section" class="customer-form-section field-toggle${showCskh ? '' : ' is-hidden'}"><legend>CSKH sau giao xe</legend>`,
    `<div id="cskh-list" class="button-row-bottom">${renderCskhList(draft.cskh)}</div>`,
    '<div class="customer-subpanel">',
    '<strong class="customer-subpanel-title">+ Thêm phản hồi CSKH</strong>',
    createField('Ngày', 'cskh_ngay', 'date', new Date().toISOString().slice(0, 10)),
    createSelectField('Kênh', 'cskh_kenh', [
      { value: 'dien_thoai', label: 'Điện thoại' },
      { value: 'zalo', label: 'Zalo' },
      { value: 'truc_tiep', label: 'Trực tiếp' },
    ], 'zalo'),
    createField('Đánh giá (1-5)', 'cskh_danh_gia', 'number', '5', 'min="1" max="5"'),
    createField('Phản hồi của KH', 'cskh_phan_hoi', 'textarea', ''),
    createField('Vấn đề cần xử lý', 'cskh_van_de', 'textarea', ''),
    createSelectField('Trạng thái xử lý', 'cskh_trang_thai_xu_ly', [
      { value: 'chua_xu_ly', label: 'Chưa xử lý' },
      { value: 'dang_xu_ly', label: 'Đang xử lý' },
      { value: 'da_xu_ly', label: 'Đã xử lý' },
    ], 'chua_xu_ly'),
    createField('Ghi chú nội bộ', 'cskh_ghi_chu_noi_bo', 'textarea', ''),
    '</div>',
    '</fieldset>',

    '<div class="button-row">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    `<button type="submit" class="btn btn-primary">${existing ? 'Lưu thay đổi' : 'Tạo khách hàng'}</button>`,
    '</div>',
    '</form>',
  ].join('');

  showModal(formHtml);

  const root = getModalRoot();
  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });

  // Working copies — cho phép xoá entry trước khi save
  const workingTienDo = Array.isArray(draft.tien_do) ? draft.tien_do.slice() : [];
  const workingCskh = Array.isArray(draft.cskh) ? draft.cskh.slice() : [];

  function refreshTienDoList() {
    root.querySelector('#tien-do-list').innerHTML = renderTienDo(workingTienDo);
    root.querySelectorAll('[data-delete-tiendo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-delete-tiendo'));
        workingTienDo.splice(idx, 1);
        refreshTienDoList();
      });
    });
    // Cập nhật giá trị mặc định "Bước (số)"
    const buocInput = root.querySelector('[name="td_buoc"]');
    if (buocInput) buocInput.value = String(workingTienDo.length + 1);
  }

  function refreshCskhList() {
    root.querySelector('#cskh-list').innerHTML = renderCskhList(workingCskh);
    root.querySelectorAll('[data-delete-cskh]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-delete-cskh'));
        workingCskh.splice(idx, 1);
        refreshCskhList();
      });
    });
  }

  refreshTienDoList();
  refreshCskhList();

  // Hiện/ẩn field khi đổi trạng thái
  const statusSelect = root.querySelector('[name="trang_thai"]');
  const xeSelect = root.querySelector('[name="xe_id"]');
  // Lưu status gốc khi mở modal (chỉ áp dụng nếu đang sửa KH có sẵn). KH mới
  // chưa có trạng thái cũ → không cần chặn lùi.
  const originalStatus = existing ? existing.trang_thai : null;
  function toggleConditionalFields() {
    const val = statusSelect.value;
    // Chặn lùi pipeline ngay khi user vừa chọn (UX rõ hơn là chỉ chặn lúc submit).
    if (originalStatus) {
      const [ok, reason] = isValidStatusTransition(originalStatus, val);
      if (!ok) {
        showToast(reason, 'warning');
        statusSelect.value = originalStatus;
        return;
      }
    }
    const isDuKy = val === 'du_ky';
    const isGiao = ['da_giao', 'dong_cskh'].includes(val);
    root.querySelector('#field-ngay-du-kien-ky').classList.toggle('is-hidden', !isDuKy);
    root.querySelector('#field-ngay-giao-thuc-te').classList.toggle('is-hidden', !isGiao);
    root.querySelector('#cskh-section').classList.toggle('is-hidden', !isGiao);

    // Auto-fill ngày giao = hôm nay khi user vừa chuyển sang Đã giao mà field rỗng.
    const today = new Date().toISOString().slice(0, 10);
    const giaoInput = root.querySelector('[name="ngay_giao_thuc_te"]');
    if (isGiao && giaoInput && !giaoInput.value) giaoInput.value = today;
  }
  statusSelect.addEventListener('change', toggleConditionalFields);

  // Auto-suy status từ các field ngày — tránh quên cập nhật pipeline.
  // Chỉ TIẾN lên, không LÙI. Nếu status hiện tại đã cao hơn suy luận → giữ nguyên.
  function inferStatusFromDates() {
    const ngayKy = root.querySelector('[name="ngay_ky"]')?.value || '';
    const ngayGiao = root.querySelector('[name="ngay_giao_thuc_te"]')?.value || '';
    const current = statusSelect.value;
    const currentIdx = ['du_ky', 'moi_ky', 'dang_xu_ly', 'cho_giao', 'da_giao', 'dong_cskh'].indexOf(current);
    let suggested = null;
    if (ngayGiao) suggested = 'da_giao';
    else if (ngayKy) suggested = 'moi_ky';
    if (!suggested) return;
    const suggestedIdx = ['du_ky', 'moi_ky', 'dang_xu_ly', 'cho_giao', 'da_giao', 'dong_cskh'].indexOf(suggested);
    // Chỉ tự nâng status nếu user đang ở mức thấp hơn — không che status user đã chủ động chọn cao hơn.
    if (suggestedIdx > currentIdx) {
      statusSelect.value = suggested;
      toggleConditionalFields();
      showToast(`Đã tự cập nhật trạng thái → ${KH_STATUS_META[suggested][0]} theo ngày bạn vừa nhập.`, 'info');
    }
  }
  ['ngay_ky', 'ngay_giao_thuc_te'].forEach((fieldName) => {
    const input = root.querySelector(`[name="${fieldName}"]`);
    if (input) input.addEventListener('change', inferStatusFromDates);
  });

  // Checkbox "Đã xuất HĐ" — độc lập với pipeline trạng thái.
  // Tick: hiện field ngày + auto-fill hôm nay (nếu rỗng).
  // Bỏ tick: ẩn field, clear ngày (để KPI bỏ đếm KH này).
  const xhdCheckbox = root.querySelector('[data-toggle-xhd]');
  xhdCheckbox.addEventListener('change', () => {
    const fieldWrap = root.querySelector('#field-ngay-xuat-hd');
    const xhdInput = root.querySelector('[name="ngay_xuat_hd"]');
    if (xhdCheckbox.checked) {
      fieldWrap.classList.remove('is-hidden');
      if (xhdInput && !xhdInput.value) {
        xhdInput.value = new Date().toISOString().slice(0, 10);
      }
    } else {
      fieldWrap.classList.add('is-hidden');
      if (xhdInput) xhdInput.value = '';
    }
  });
  xeSelect.addEventListener('change', () => {
    const currentColor = root.querySelector('[name="mau_xe"]')?.value || '';
    root.querySelector('#customer-xe-color-field').innerHTML = renderXeColorField(allData, xeSelect.value, currentColor);
  });

  root.querySelector('[data-customer-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const id = trimmedValue(fd, 'customer_id');

    // Validate required FKs
    const nvId = trimmedValue(fd, 'nhan_vien_id');
    const xeId = trimmedValue(fd, 'xe_id');
    if (!nvId) {
      showToast('Vui lòng chọn nhân viên phụ trách.', 'warning');
      return;
    }
    if (!xeId) {
      showToast('Vui lòng chọn xe.', 'warning');
      return;
    }
    const assignedEmployee = appState.data.nhanVien.nhan_vien.find((item) => item.id === nvId);
    if (!assignedEmployee || assignedEmployee.trang_thai === 'nghi_viec') {
      showToast('Nhân viên phụ trách không còn hợp lệ. Hãy chọn lại.', 'warning');
      return;
    }
    const selectedXe = appState.data.xe.xe.find((item) => item.id === xeId);
    if (!selectedXe) {
      showToast('Dòng xe không còn tồn tại trong catalog. Hãy chọn lại.', 'warning');
      return;
    }

    const trangThai = trimmedValue(fd, 'trang_thai');
    // Defense-in-depth: validate pipeline ngay cả khi UI bị bypass (devtools, paste, v.v.).
    if (existing) {
      const [ok, reason] = isValidStatusTransition(existing.trang_thai, trangThai);
      if (!ok) {
        showToast(reason, 'warning');
        return;
      }
    }
    const ngayGiaoThucTe = trimmedValue(fd, 'ngay_giao_thuc_te');
    // ngay_xuat_hd chỉ lưu khi checkbox đã tick. Nếu untick thì coi như chưa xuất.
    const daXuatHdChecked = fd.get('da_xuat_hd') === 'on';
    const ngayXuatHd = daXuatHdChecked ? trimmedValue(fd, 'ngay_xuat_hd') : '';
    if (['da_giao', 'dong_cskh'].includes(trangThai) && !ngayGiaoThucTe) {
      showToast('Khi trạng thái là đã giao hoặc đóng CSKH, cần nhập ngày giao thực tế.', 'warning');
      return;
    }
    if (daXuatHdChecked && !ngayXuatHd) {
      showToast('Đã tick "Đã xuất hoá đơn", vui lòng nhập ngày xuất.', 'warning');
      return;
    }

    // Build payload
    const payload = {
      ...(existing || {}),
      id,
      ten: trimmedValue(fd, 'ten'),
      sdt: trimmedValue(fd, 'sdt'),
      dia_chi: trimmedValue(fd, 'dia_chi'),
      nhan_vien_id: nvId,
      xe_id: xeId,
      mau_xe: trimmedValue(fd, 'mau_xe'),
      ghi_chu_ctkm: trimmedValue(fd, 'ghi_chu_ctkm'),
      trang_thai: trangThai,
      ngay_du_kien_ky: trimmedValue(fd, 'ngay_du_kien_ky') || null,
      ngay_ky: trimmedValue(fd, 'ngay_ky') || null,
      ngay_giao_du_kien: trimmedValue(fd, 'ngay_giao_du_kien') || null,
      ngay_giao_thuc_te: ngayGiaoThucTe || null,
      ngay_xuat_hd: ngayXuatHd || null,
      hinh_thuc_tt: trimmedValue(fd, 'hinh_thuc_tt'),
      ngan_hang: trimmedValue(fd, 'ngan_hang'),
      so_tien_vay: numberValue(fd.get('so_tien_vay')),
      muc_dong_mong_muon: numberValue(fd.get('muc_dong_mong_muon')),
      so_hd: trimmedValue(fd, 'so_hd'),
      kenh_lead: trimmedValue(fd, 'kenh_lead') || '',
      tien_do: workingTienDo.slice(),
      cskh: workingCskh.slice(),
    };

    // Append tiến độ nếu có nội dung
    const tdNd = trimmedValue(fd, 'td_noi_dung');
    if (tdNd) {
      const requestedBuoc = numberValue(fd.get('td_buoc')) || payload.tien_do.length + 1;
      const usedBuocs = new Set(payload.tien_do.map((s) => Number(s.buoc) || 0));
      let finalBuoc = requestedBuoc;
      while (usedBuocs.has(finalBuoc)) finalBuoc += 1;
      payload.tien_do.push({
        ngay: trimmedValue(fd, 'td_ngay') || new Date().toISOString().slice(0, 10),
        buoc: finalBuoc,
        noi_dung: tdNd,
      });
    }

    // Append CSKH nếu có phản hồi
    const cskhPhanHoi = trimmedValue(fd, 'cskh_phan_hoi');
    const cskhVanDe = trimmedValue(fd, 'cskh_van_de');
    if (cskhPhanHoi || cskhVanDe) {
      payload.cskh.push({
        id: makeId('cs'),
        ngay: trimmedValue(fd, 'cskh_ngay') || new Date().toISOString().slice(0, 10),
        kenh: trimmedValue(fd, 'cskh_kenh'),
        danh_gia: numberValue(fd.get('cskh_danh_gia')) || 5,
        phan_hoi: cskhPhanHoi,
        van_de: cskhVanDe,
        trang_thai_xu_ly: trimmedValue(fd, 'cskh_trang_thai_xu_ly') || 'chua_xu_ly',
        ghi_chu_noi_bo: trimmedValue(fd, 'cskh_ghi_chu_noi_bo'),
      });
    }

    if (existing) {
      const index = appState.data.khachHang.khach_hang.findIndex((item) => item.id === existing.id);
      if (index < 0) {
        showToast('Không tìm thấy khách hàng để cập nhật. Hãy tải lại trang.', 'error');
        return;
      }
      appState.data.khachHang.khach_hang[index] = payload;
    } else {
      appState.data.khachHang.khach_hang.unshift(payload);
    }

    closeModal();
    await persistFile('khach-hang.json', appState.data.khachHang, existing ? 'Đã cập nhật khách hàng.' : 'Đã thêm khách hàng.');
    rerenderApp();
  });
}

