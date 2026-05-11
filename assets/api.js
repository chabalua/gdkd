// assets/api.js
// GitHub Contents API wrapper + auth + repo config.
// writeData() throws when GitHub fails — caller (persistFile in app.js) decides
// how to surface the failure and retry.

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
  pendingWrites: 'gdkd_pending_writes',
};

function safeJsonParse(rawValue, fallback) {
  if (!rawValue) return fallback;
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn('Không parse được JSON lưu cục bộ.', error);
    return fallback;
  }
}

function savePendingWritesMap(pendingWrites) {
  localStorage.setItem(STORAGE_KEYS.pendingWrites, JSON.stringify(pendingWrites));
}

export function getPendingWrites() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.pendingWrites), {});
}

export function getPendingWriteCount() {
  return Object.keys(getPendingWrites()).length;
}

export function savePendingWrite(filename, data, errorMessage = '') {
  const pendingWrites = getPendingWrites();
  pendingWrites[filename] = {
    data,
    error: errorMessage,
    updated_at: new Date().toISOString(),
  };
  savePendingWritesMap(pendingWrites);
}

export function clearPendingWrite(filename) {
  const pendingWrites = getPendingWrites();
  if (!pendingWrites[filename]) return;
  delete pendingWrites[filename];
  savePendingWritesMap(pendingWrites);
}

export async function pushPendingWrites() {
  const pendingWrites = getPendingWrites();
  const nextPendingWrites = { ...pendingWrites };
  const synced = [];
  const failures = [];
  for (const [filename, payload] of Object.entries(pendingWrites)) {
    try {
      await writeData(filename, payload?.data);
      delete nextPendingWrites[filename];
      synced.push(filename);
    } catch (error) {
      nextPendingWrites[filename] = {
        ...(payload || {}),
        error: error.message,
        updated_at: new Date().toISOString(),
      };
      failures.push({ filename, message: error.message });
    }
  }
  savePendingWritesMap(nextPendingWrites);
  return { synced, failures, remaining: Object.keys(nextPendingWrites).length };
}

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
  let [config, congViec, xe, nhanVien, khachHang, lichSu] = await Promise.all([
    readData('config.json'),
    readData('cong-viec.json'),
    readData('xe.json'),
    readData('nhan-vien.json'),
    readData('khach-hang.json'),
    readOptionalData('lich-su.json', { lich_su: [] }),
  ]);
  const pendingWrites = getPendingWrites();
  config = pendingWrites['config.json']?.data || config;
  congViec = pendingWrites['cong-viec.json']?.data || congViec;
  xe = pendingWrites['xe.json']?.data || xe;
  nhanVien = pendingWrites['nhan-vien.json']?.data || nhanVien;
  khachHang = pendingWrites['khach-hang.json']?.data || khachHang;
  lichSu = pendingWrites['lich-su.json']?.data || lichSu;
  return { config, congViec, xe, nhanVien, khachHang, lichSu };
}
