// assets/views/cong-viec.js
import { renderShell, renderEmptyState } from './shell.js';
import { escapeHtml, formatDate, calcPercent, getPercentClass, renderProgressBar, renderIcon } from '../ui.js';
import { hasCongViecData } from '../models.js';

export default function renderCongViecPage(data) {
  if (!hasCongViecData(data.congViec)) {
    return renderShell('congviec', renderEmptyState('Chưa có công việc trọng tâm', 'Bạn chưa nhập dữ liệu sự kiện lái thử, video, livestream hoặc Zalo OA cho tháng này.', 'Trang này sẽ nối tiếp sau', 'todo-work'), data);
  }

  const sections = [
    {
      icon: renderIcon('calendar', { size: 20 }),
      title: 'Sự kiện lái thử',
      value: data.congViec.su_kien_lai_thu.danh_sach.length,
      target: data.congViec.su_kien_lai_thu.muc_tieu,
      items: data.congViec.su_kien_lai_thu.danh_sach.map((item) => `${formatDate(item.ngay)} · ${item.dia_diem} · ${item.so_kh} KH`),
    },
    {
      icon: renderIcon('activity', { size: 20 }),
      title: 'Videos nội dung',
      value: data.congViec.videos.da_hoan_thanh,
      target: data.congViec.videos.muc_tieu,
      items: data.congViec.videos.tuyen_noi_dung,
    },
    {
      icon: renderIcon('clock', { size: 20 }),
      title: 'Giờ livestream',
      value: data.congViec.livestream.da_live_gio,
      target: data.congViec.livestream.muc_tieu_gio,
      items: data.congViec.livestream.lich.map((item) => `${formatDate(item.ngay)} · ${item.kenh} · ${item.gio_bat_dau}-${item.gio_ket_thuc}`),
    },
    {
      icon: renderIcon('phone', { size: 20 }),
      title: 'Zalo OA quét',
      value: data.congViec.zalo_oa.thuc_te,
      target: data.congViec.zalo_oa.muc_tieu,
      items: data.congViec.zalo_oa.theo_tuan.map((item, index) => `Tuần ${index + 1}: ${item} lượt`),
    },
  ];

  const content = `<section class="stack-list">${sections.map((section) => [
    '<article class="card">',
    '<div class="card-header">',
    `<div><div class="metric-icon" aria-hidden="true">${section.icon}</div><h3 class="card-title">${escapeHtml(section.title)}</h3></div>`,
    `<span class="badge ${getPercentClass(calcPercent(section.value, section.target))}">${calcPercent(section.value, section.target)}%</span>`,
    '</div>',
    `<div class="metric-value">${escapeHtml(section.value)} / ${escapeHtml(section.target)}</div>`,
    renderProgressBar(calcPercent(section.value, section.target)),
    section.items.length ? `<div class="note-list-spaced">${section.items.map((item) => `<div class="timeline-note">${escapeHtml(item)}</div>`).join('')}</div>` : '<div class="timeline-note button-row-top">Chưa có mục chi tiết.</div>',
    '</article>',
  ].join('')).join('')}</section>`;

  return renderShell('congviec', content, data);
}
