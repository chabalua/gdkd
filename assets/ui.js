// assets/ui.js
// Small DOM helpers + format utilities + modal/toast/field builders.
// Pure UI primitives — không biết về data hay business logic.

import { icon as renderIcon } from './components/icons.js';

let modalRoot = null;
let toastRoot = null;

// Re-export icon helper để mọi view có thể import từ ui.js (giảm import paths).
export { renderIcon };

// === Escape & format ===
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
  }
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export function formatDate(isoDate) {
  if (!isoDate) return 'Chưa cập nhật';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('vi-VN');
}

export function formatDateTime(isoDate) {
  if (!isoDate) return 'Chưa cập nhật';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

export function getCurrentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

// === Percent / progress ===
export function calcPercent(actual, target) {
  const denominator = Number(target || 0);
  if (!denominator) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(actual || 0) / denominator) * 100)));
}

export function getPercentClass(percent) {
  if (percent >= 80) return 'is-success';
  if (percent >= 50) return 'is-warning';
  return 'is-danger';
}

export function renderProgressBar(percent) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
  return [
    '<div class="progress-track" aria-hidden="true">',
    `<div class="progress-bar ${getPercentClass(safePercent)}" style="width:${safePercent}%"></div>`,
    '</div>',
  ].join('');
}

// === Avatar / initials ===
export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export function avatarHtml(name, accent) {
  return `<span class="avatar${accent ? ' is-accent' : ''}">${escapeHtml(initials(name || 'GĐ'))}</span>`;
}

// === Form value helpers ===
export function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function trimmedValue(formData, key) {
  return String(formData.get(key) || '').trim();
}

export function makeId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// === Toast ===
function ensureToastRoot() {
  if (!toastRoot) {
    toastRoot = document.createElement('div');
    toastRoot.className = 'toast-stack';
    document.body.appendChild(toastRoot);
  }
}

export function showToast(message, type = 'info') {
  ensureToastRoot();
  const toast = document.createElement('div');
  toast.className = `toast is-${type}`;
  toast.textContent = message;
  toastRoot.appendChild(toast);
  // warning/error giữ lâu hơn để user kịp đọc
  const ttl = (type === 'error' || type === 'warning') ? 5500 : 3200;
  window.setTimeout(() => toast.remove(), ttl);
}

// === Modal ===
function ensureModalRoot() {
  if (!modalRoot) {
    modalRoot = document.createElement('div');
    modalRoot.className = 'modal-root';
    modalRoot.innerHTML = '<div class="modal-card"></div>';
    modalRoot.addEventListener('click', (event) => {
      if (event.target === modalRoot) closeModal();
    });
    document.body.appendChild(modalRoot);
  }
}

export function getModalRoot() {
  ensureModalRoot();
  return modalRoot;
}

export function showModal(html, options = {}) {
  ensureModalRoot();
  const modalCard = modalRoot.querySelector('.modal-card');
  modalCard.className = 'modal-card';
  if (options.cardClass) modalCard.classList.add(options.cardClass);
  modalCard.innerHTML = html;
  modalRoot.classList.add('is-open');
  document.body.classList.add('modal-open');
}

export function closeModal() {
  if (modalRoot) modalRoot.classList.remove('is-open');
  document.body.classList.remove('modal-open');
}

export function confirmAction(message, onConfirm) {
  showModal([
    '<h3 class="modal-title">Xác nhận thao tác</h3>',
    `<p class="modal-copy">${escapeHtml(message)}</p>`,
    '<div class="button-row">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    '<button type="button" class="btn btn-danger" data-modal-confirm>Xác nhận</button>',
    '</div>',
  ].join(''));
  modalRoot.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });
  modalRoot.querySelector('[data-modal-confirm]').addEventListener('click', () => {
    closeModal();
    if (typeof onConfirm === 'function') onConfirm();
  }, { once: true });
}

// === Form field builders ===
export function createField(label, name, type, value, extra = '') {
  if (type === 'textarea') {
    return `<label class="field"><span class="field-label">${escapeHtml(label)}</span><textarea class="textarea" name="${escapeHtml(name)}" ${extra}>${escapeHtml(value || '')}</textarea></label>`;
  }
  return `<label class="field"><span class="field-label">${escapeHtml(label)}</span><input class="input" type="${escapeHtml(type)}" name="${escapeHtml(name)}" value="${escapeHtml(value || '')}" ${extra}></label>`;
}

export function createSelectField(label, name, options, value, extra = '') {
  return [
    `<label class="field"><span class="field-label">${escapeHtml(label)}</span><select class="select" name="${escapeHtml(name)}" ${extra}>`,
    options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === value ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join(''),
    '</select></label>',
  ].join('');
}

// === Range picker (sessionStorage key "gdkd_range") ===
const RANGE_KEY = 'gdkd_range';

export function getCurrentRange() {
  try {
    const raw = sessionStorage.getItem(RANGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { months: [getCurrentMonth()] };
}

export function saveRange(range) {
  try { sessionStorage.setItem(RANGE_KEY, JSON.stringify(range)); } catch { /* ignore */ }
}

export function parseRangeValue(val) {
  if (!val) return null;
  if (val.startsWith('m:')) return { months: [val.slice(2)] };
  if (val.startsWith('q:')) {
    const parts = val.split(':');
    const yn = Number(parts[1]);
    const qn = Number(parts[2]);
    return { months: [(qn - 1) * 3 + 1, (qn - 1) * 3 + 2, (qn - 1) * 3 + 3].map((m) => `${yn}-${String(m).padStart(2, '0')}`) };
  }
  if (val.startsWith('y:')) {
    const yn = Number(val.slice(2));
    return { months: Array.from({ length: 12 }, (_, i) => `${yn}-${String(i + 1).padStart(2, '0')}`) };
  }
  return null;
}

export function getRangeLabel(range) {
  const months = range?.months || [];
  if (!months.length) return 'Chưa chọn';
  if (months.length === 1) {
    const [year, mon] = months[0].split('-');
    return `Tháng ${parseInt(mon, 10)}/${year}`;
  }
  if (months.length === 3) {
    const [y, m1] = months[0].split('-');
    const m1n = parseInt(m1, 10);
    const quarters = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
    const qIdx = quarters.findIndex(
      (q) => q[0] === m1n &&
        months[1].endsWith(`-${String(q[1]).padStart(2, '0')}`) &&
        months[2].endsWith(`-${String(q[2]).padStart(2, '0')}`),
    );
    if (qIdx >= 0) return `Quý ${qIdx + 1}/${y}`;
  }
  if (months.length === 12) {
    const year = months[0].split('-')[0];
    if (months.every((m) => m.startsWith(year))) return `Năm ${year}`;
  }
  const [ys, ms] = months[0].split('-');
  const [ye, me] = months[months.length - 1].split('-');
  if (ys === ye) return `Tháng ${parseInt(ms, 10)}–${parseInt(me, 10)}/${ys}`;
  return `${months[0]} → ${months[months.length - 1]}`;
}

export function renderRangePicker(currentRange) {
  const months = currentRange?.months || [];
  const today = getCurrentMonth();
  const [curYear, curMon] = today.split('-').map(Number);

  const monthOpts = [];
  for (let i = 0; i < 12; i++) {
    let y = curYear; let m = curMon - i;
    while (m <= 0) { m += 12; y--; }
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const sel = months.length === 1 && months[0] === key ? ' selected' : '';
    monthOpts.push(`<option value="m:${key}"${sel}>Tháng ${m}/${y}</option>`);
  }

  const qOpts = [];
  for (let i = 0; i < 4; i++) {
    let q = Math.ceil(curMon / 3) - i; let y = curYear;
    while (q <= 0) { q += 4; y--; }
    const qMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3].map((m2) => `${y}-${String(m2).padStart(2, '0')}`);
    const sel = months.length === 3 && qMonths.every((m2, idx) => months[idx] === m2) ? ' selected' : '';
    qOpts.push(`<option value="q:${y}:${q}"${sel}>Quý ${q}/${y}</option>`);
  }

  const yearMonths = Array.from({ length: 12 }, (_, i) => `${curYear}-${String(i + 1).padStart(2, '0')}`);
  const yearSel = months.length === 12 && yearMonths.every((m2, idx) => months[idx] === m2) ? ' selected' : '';

  return [
    '<div class="range-picker">',
    '<select class="select select-sm" data-range-picker aria-label="Chọn kỳ thống kê">',
    `<optgroup label="Tháng">${monthOpts.join('')}</optgroup>`,
    `<optgroup label="Quý">${qOpts.join('')}</optgroup>`,
    '<optgroup label="Năm">',
    `<option value="y:${curYear}"${yearSel}>Năm ${curYear}</option>`,
    `<option value="y:${curYear - 1}">Năm ${curYear - 1}</option>`,
    '</optgroup>',
    '</select>',
    '</div>',
  ].join('');
}

// === Badge / status pill ===
/**
 * Render 1 badge pill.
 * @param {string} text
 * @param {'success'|'warning'|'danger'|'info'|'purple'|'neutral'} [variant='neutral']
 */
export function renderBadge(text, variant = 'neutral') {
  const cls = variant && variant !== 'neutral' ? ` is-${variant}` : '';
  return `<span class="badge${cls}">${escapeHtml(text)}</span>`;
}

/**
 * Render 1 status pill có dot indicator (tier color-coded).
 * @param {string} label
 * @param {string} [dotColor] CSS color (var hoặc hex). Mặc định currentColor.
 * @param {string} [variant] thêm class is-<variant>
 */
export function renderStatusPill(label, dotColor, variant) {
  const cls = variant ? ` is-${variant}` : '';
  const color = dotColor || 'currentColor';
  return [
    `<span class="status-pill${cls}">`,
    `<span class="tier-dot" style="background:${color}" aria-hidden="true"></span>`,
    escapeHtml(label),
    '</span>',
  ].join('');
}

// === Sparkline SVG ===
/**
 * Render 1 sparkline inline SVG.
 * @param {number[]} values - chuỗi số liệu (>= 2 điểm)
 * @param {object} [opts]
 * @param {number} [opts.width=120]
 * @param {number} [opts.height=36]
 * @param {boolean} [opts.area=true] - vẽ area gradient bên dưới
 * @param {boolean} [opts.lastDot=true] - chấm điểm cuối
 * @returns {string} HTML SVG string
 */
export function renderSparkline(values, opts = {}) {
  const series = (values || []).map((v) => Number(v) || 0);
  if (series.length < 2) {
    return '<svg class="sparkline-svg" viewBox="0 0 120 36" aria-hidden="true"></svg>';
  }
  const w = opts.width ?? 120;
  const h = opts.height ?? 36;
  const showArea = opts.area !== false;
  const showDot = opts.lastDot !== false;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = w / (series.length - 1);
  const points = series.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y];
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${path} L${w.toFixed(1)},${h} L0,${h} Z`;
  const last = points[points.length - 1];
  return [
    `<svg class="sparkline-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">`,
    showArea ? [
      '<defs><linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="currentColor" stop-opacity="0.4"/>',
      '<stop offset="100%" stop-color="currentColor" stop-opacity="0"/>',
      '</linearGradient></defs>',
      `<path class="sparkline-area" d="${areaPath}" fill="url(#spark-grad)"/>`,
    ].join('') : '',
    `<path class="sparkline-line" d="${path}"/>`,
    showDot ? `<circle class="sparkline-dot" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.5"/>` : '',
    '</svg>',
  ].join('');
}

// === Stacked bar ===
export function renderStackedBar({ segments, target = 0, height = 22 }) {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
  const maxVal = Math.max(total, target || 0, 1);
  const bars = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const widthPct = Math.max(1, Math.round((s.value / maxVal) * 100));
      const pctText = s.pct_personal !== null && s.pct_personal !== undefined ? ` (${s.pct_personal}% mục tiêu)` : '';
      const tip = `${escapeHtml(s.nv_ten || s.nv_id || '')}: ${s.value}${pctText}`;
      return `<div class="stacked-bar-segment" style="width:${widthPct}%;background:${s.color};height:${height}px" title="${tip}"></div>`;
    });
  const usedPct = total > 0 ? Math.round((total / maxVal) * 100) : 0;
  if (usedPct < 100 || bars.length === 0) {
    bars.push(`<div class="stacked-bar-segment" style="width:${100 - usedPct}%;background:var(--neutral);height:${height}px"></div>`);
  }
  return `<div class="stacked-bar-track" style="height:${height}px">${bars.join('')}</div>`;
}
