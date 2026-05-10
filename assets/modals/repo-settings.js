// assets/modals/repo-settings.js
import { showModal, closeModal, showToast, getModalRoot, trimmedValue, createField } from '../ui.js';
import { saveRepoConfig, getRepoConfig, getToken, setToken, clearToken, verifyToken } from '../api.js';

export function openRepoSettingsModal() {
  const repoConfig = getRepoConfig();
  const token = getToken() || '';
  showModal([
    '<h3 class="modal-title">Cấu hình GitHub</h3>',
    '<p class="modal-copy">Nhập token, owner, repo và branch để mọi thao tác CRUD ghi thẳng lên GitHub Contents API. Token sẽ được lưu cục bộ trên máy này, nên app sẽ không hỏi lại mỗi lần mở.</p>',
    '<form data-settings-form class="stack-list">',
    createField('GitHub Token', 'token', 'password', token, 'placeholder="Nhập Personal Access Token" autocomplete="off"'),
    createField('Owner', 'owner', 'text', repoConfig.owner, 'placeholder="vd: ten-tai-khoan"'),
    createField('Repo', 'repo', 'text', repoConfig.repo, 'placeholder="vd: Omoda"'),
    createField('Branch', 'branch', 'text', repoConfig.branch || 'main', 'placeholder="main"'),
    '<p class="modal-copy" data-settings-status>Nếu để trống token, app sẽ chỉ đọc dữ liệu local và không thể ghi lên GitHub.</p>',
    '<div class="button-row">',
    '<button type="button" class="btn btn-ghost" data-modal-cancel>Huỷ</button>',
    '<button type="submit" class="btn btn-primary">Lưu cấu hình</button>',
    '</div>',
    '</form>',
  ].join(''));

  const root = getModalRoot();
  root.querySelector('[data-modal-cancel]').addEventListener('click', closeModal, { once: true });
  root.querySelector('[data-settings-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextToken = trimmedValue(formData, 'token');
    const statusNode = root.querySelector('[data-settings-status]');

    if (nextToken && nextToken !== token) {
      statusNode.textContent = 'Đang kiểm tra token...';
      const valid = await verifyToken(nextToken);
      if (!valid) {
        statusNode.textContent = 'Không xác thực được token. Kiểm tra lại token hoặc kết nối mạng rồi thử lại.';
        showToast('Token GitHub chưa hợp lệ.', 'error');
        return;
      }
    }

    if (nextToken) {
      setToken(nextToken);
    } else {
      clearToken();
    }

    saveRepoConfig(
      trimmedValue(formData, 'owner'),
      trimmedValue(formData, 'repo'),
      trimmedValue(formData, 'branch') || 'main',
    );
    closeModal();
    showToast('Đã lưu cấu hình GitHub.', 'success');
  });
}
