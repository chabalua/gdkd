// assets/api.js
// GitHub Contents API wrapper + auth + repo config + localStorage override.
// writeData() throws when GitHub fails — caller (persistFile in app.js) decides
// whether to fall back to localStorage with a clear warning.

export const APP_CONFIG = {
  owner: '',
  repo: '',
  branch: 'main',
  dataPath: 'assets/data',
};

const STORAGE_KEYS = {
  token: 'gdkd_token',
  repoOwner: 'gdkd_repo_owner',
  repoName: 'gdkd_repo_name',
  repoBranch: 'gdkd_repo_branch',
  overrides: {
    'config.json': 'gdkd_override_config',
    'cong-viec.json': 'gdkd_override_cong_viec',
    'xe.json': 'gdkd_override_xe',
    'nhan-vien.json': 'gdkd_override_nhan_vien',
    'khach-hang.json': 'gdkd_override_khach_hang',
    'lich-su.json': 'gdkd_override_lich_su',
    'cskh.json': 'gdkd_override_cskh',   // giữ để backward compat migration
    'orphan-cskh.json': 'gdkd_override_orphan_cskh',
  },
};

// === Auth token ===
export function getToken() {
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function setToken(token) {
  localStorage.setItem(STORAGE_KEYS.token, token);
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEYS.token);
}

// === Repo config ===
function getStoredRepoConfig() {
  return {
    owner: localStorage.getItem(STORAGE_KEYS.repoOwner) || '',
    repo: localStorage.getItem(STORAGE_KEYS.repoName) || '',
    branch: localStorage.getItem(STORAGE_KEYS.repoBranch) || '',
  };
}

function inferRepoConfigFromLocation() {
  if (window.location.hostname.endsWith('github.io')) {
    const owner = window.location.hostname.split('.')[0];
    const segments = window.location.pathname.split('/').filter(Boolean);
    const repo = segments[0] || '';
    return { owner, repo, branch: APP_CONFIG.branch };
  }
  return { owner: '', repo: '', branch: APP_CONFIG.branch };
}

export function getRepoConfig() {
  const inferred = inferRepoConfigFromLocation();
  const stored = getStoredRepoConfig();
  return {
    owner: stored.owner || APP_CONFIG.owner || inferred.owner,
    repo: stored.repo || APP_CONFIG.repo || inferred.repo,
    branch: stored.branch || APP_CONFIG.branch || inferred.branch || 'main',
  };
}

export function saveRepoConfig(owner, repo, branch) {
  localStorage.setItem(STORAGE_KEYS.repoOwner, owner);
  localStorage.setItem(STORAGE_KEYS.repoName, repo);
  localStorage.setItem(STORAGE_KEYS.repoBranch, branch || 'main');
}

// === Local override (browser-only fallback when GitHub fails) ===
function overrideStorageKey(filename) {
  return STORAGE_KEYS.overrides[filename];
}

export function readOverride(filename) {
  const key = overrideStorageKey(filename);
  if (!key) return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Không parse được dữ liệu local override', error);
    return null;
  }
}

export function writeOverride(filename, data) {
  const key = overrideStorageKey(filename);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function clearOverride(filename) {
  const key = overrideStorageKey(filename);
  if (!key) return;
  localStorage.removeItem(key);
}

// === Token verification ===
export async function verifyToken(token = getToken()) {
  if (!token) return false;
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('verifyToken failed', error);
    return false;
  }
}

// === Read data ===
async function readLocalData(filename) {
  const response = await fetch(`${APP_CONFIG.dataPath}/${filename}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Không đọc được file ${filename}`);
  }
  return response.json();
}

async function readRemoteData(filename) {
  const token = getToken();
  const repoConfig = getRepoConfig();
  if (!token || !repoConfig.owner || !repoConfig.repo) {
    throw new Error('Thiếu cấu hình GitHub API hoặc token đăng nhập.');
  }
  const url = `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${APP_CONFIG.dataPath}/${filename}?ref=${repoConfig.branch}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API trả về ${response.status} khi đọc ${filename}`);
  }
  const payload = await response.json();
  return JSON.parse(decodeURIComponent(escape(atob(payload.content))));
}

export async function readData(filename) {
  // Override (đã save offline) ưu tiên — TODO bước sau: cảnh báo khi override stale.
  const override = readOverride(filename);
  if (override) return override;

  const repoConfig = getRepoConfig();
  if (repoConfig.owner && repoConfig.repo && getToken()) {
    try {
      return await readRemoteData(filename);
    } catch (error) {
      console.warn(`readRemoteData(${filename}) thất bại, dùng file local làm fallback.`, error);
    }
  }
  return readLocalData(filename);
}

// === Write data ===
// Throws on any GitHub failure. Caller must catch and decide whether to fall back.
export async function writeData(filename, data) {
  const repoConfig = getRepoConfig();
  const token = getToken();
  if (!repoConfig.owner || !repoConfig.repo || !token) {
    throw new Error('Chưa cấu hình GitHub (owner/repo/token). Mở Cài đặt để thiết lập.');
  }

  const url = `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${APP_CONFIG.dataPath}/${filename}?ref=${repoConfig.branch}`;
  const currentResponse = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!currentResponse.ok && currentResponse.status !== 404) {
    throw new Error(`Không lấy được SHA của ${filename} (HTTP ${currentResponse.status}).`);
  }
  const current = currentResponse.ok ? await currentResponse.json() : null;

  const putResponse = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Update ${filename}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
      sha: current?.sha,
      branch: repoConfig.branch,
    }),
  });
  if (!putResponse.ok) {
    const errorBody = await putResponse.text().catch(() => '');
    throw new Error(`GitHub API trả về ${putResponse.status} khi ghi ${filename}. ${errorBody}`);
  }

  clearOverride(filename);
  return putResponse.json();
}

async function readOptionalData(filename, fallback) {
  try {
    return await readData(filename);
  } catch (error) {
    console.warn(`Không đọc được ${filename}, dùng fallback mặc định.`, error);
    return fallback;
  }
}

// === Read all data files cùng lúc ===
export async function readAllData() {
  const [config, congViec, xe, nhanVien, khachHang, lichSu] = await Promise.all([
    readData('config.json'),
    readData('cong-viec.json'),
    readData('xe.json'),
    readData('nhan-vien.json'),
    readData('khach-hang.json'),
    readOptionalData('lich-su.json', { lich_su: [] }),
  ]);
  return { config, congViec, xe, nhanVien, khachHang, lichSu };
}
