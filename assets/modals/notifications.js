// assets/modals/notifications.js
import { showModal, closeModal, getModalRoot, escapeHtml, showToast } from '../ui.js';
import { getReminderItems, canNotify, getNotificationPermission, requestPermission, checkReminders } from '../notify.js';

export function renderNotificationsPanel(data) {
  const items = getReminderItems(data);
  const notificationSupported = canNotify();
  const permission = getNotificationPermission();
  const permissionLabel = !notificationSupported
    ? 'Thiết bị/trình duyệt này chưa hỗ trợ thông báo web.'
    : permission === 'granted'
      ? 'Thông báo đã được bật trên thiết bị này.'
      : permission === 'denied'
        ? 'Thông báo đang bị chặn. Hãy bật lại trong cài đặt trình duyệt hoặc cài đặt app trên điện thoại.'
        : 'Để hiện thông báo trên điện thoại, hãy bấm Bật thông báo và cho phép quyền hệ thống. Trên iPhone, nên cài app ra màn hình chính trước.';

  showModal([
    '<h3 class="modal-title">Thông báo</h3>',
    `<p class="modal-copy">${items.length ? 'Các nhắc việc đang được tổng hợp từ dữ liệu hiện có.' : 'Hiện chưa có nhắc việc nào.'}</p>`,
    `<p class="modal-copy">${escapeHtml(permissionLabel)}</p>`,
    `<div class="stack-list">${items.length ? items.map((item) => `<div class="timeline-note"><div class="timeline-date">${escapeHtml(item.label)}</div><div>${escapeHtml(item.detail)}</div></div>`).join('') : '<div class="timeline-note"><div class="timeline-date">Trống</div><div>Chưa có dữ liệu nhắc việc.</div></div>'}</div>`,
    '<div class="button-row" style="margin-top:16px;">',
    notificationSupported && permission !== 'granted' ? '<button type="button" class="btn btn-primary" data-enable-notifications>Bật thông báo</button>' : '',
    '<button type="button" class="btn btn-ghost" data-modal-close>Đóng</button>',
    '</div>',
  ].join(''));

  const root = getModalRoot();
  root.querySelector('[data-modal-close]').addEventListener('click', closeModal, { once: true });
  const enableButton = root.querySelector('[data-enable-notifications]');
  if (enableButton) {
    enableButton.addEventListener('click', async () => {
      const nextPermission = await requestPermission();
      if (nextPermission === 'granted') {
        checkReminders(data);
        showToast('Đã bật thông báo trên thiết bị này.', 'success');
      } else if (nextPermission === 'denied') {
        showToast('Thông báo đang bị chặn. Hãy bật lại trong cài đặt trình duyệt.', 'warning');
      } else {
        showToast('Thiết bị chưa hỗ trợ thông báo web nền.', 'warning');
      }
      renderNotificationsPanel(data);
    }, { once: true });
  }
}
