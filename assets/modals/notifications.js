// assets/modals/notifications.js
import { showModal, closeModal, getModalRoot, escapeHtml } from '../ui.js';
import { getReminderItems } from '../notify.js';

export function renderNotificationsPanel(data) {
  const items = getReminderItems(data);

  showModal([
    '<h3 class="modal-title">Thông báo</h3>',
    `<p class="modal-copy">${items.length ? 'Các nhắc việc đang được tổng hợp từ dữ liệu hiện có.' : 'Hiện chưa có nhắc việc nào.'}</p>`,
    `<div class="stack-list">${items.length ? items.map((item) => `<div class="timeline-note"><div class="timeline-date">${escapeHtml(item.label)}</div><div>${escapeHtml(item.detail)}</div></div>`).join('') : '<div class="timeline-note"><div class="timeline-date">Trống</div><div>Chưa có dữ liệu nhắc việc.</div></div>'}</div>`,
    '<div class="button-row" style="margin-top:16px;">',
    '<button type="button" class="btn btn-ghost" data-modal-close>Đóng</button>',
    '</div>',
  ].join(''));

  getModalRoot().querySelector('[data-modal-close]').addEventListener('click', closeModal, { once: true });
}
