// assets/modals/repo-settings.js
import { showModal, closeModal, showToast, getModalRoot, trimmedValue, createField } from '../ui.js';
import { saveRepoConfig, getRepoConfig } from '../api.js';

export function openRepoSettingsModal() {
  const repoConfig = getRepoConfig();
  showModal([
    '<h3 class="modal-title">Cấu hình GitHub</h3>',
    '<p class="modal-copy">Nhập đúng owner, repo và branch để mọi thao tác CRUD ghi thẳng lên GitHub Contents API. Khi lưu fail, app sẽ giữ tạm bản trong localStorage và hiển thị cảnh báo rõ ràng (không silent fallback).</p>',
    '<form data-settings-form class="stack-list">',
    createField('Owner', 'owner', 'text', repoConfig.owner, 'placeholder="vd: ten-tai-khoan"'),
    createField('Repo', 'repo', 'text', repoConfig.repo, 'placeholder="vd: Omoda"'),
    createField('Branch', 'branch', 'text', repoConfig.branch || 'main', 'placeholder="main"'),
    '<div class="button-row">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    '<button type="submit" class="btn btn-primary">Lưu cấu hình</button>',
    '</div>',
    '</form>',
  ].join(''));

  const root = getModalRoot();
  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });
  root.querySelector('[data-settings-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    saveRepoConfig(
      trimmedValue(formData, 'owner'),
      trimmedValue(formData, 'repo'),
      trimmedValue(formData, 'branch') || 'main',
    );
    closeModal();
    showToast('Đã lưu cấu hình GitHub.', 'success');
  });
}
