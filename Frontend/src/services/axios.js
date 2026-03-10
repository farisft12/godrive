import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('godrive_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('godrive_token');
      const path = window.location.pathname || '';
      const isPublic = path === '/' || path === '/login' || path === '/register' || path === '/verify' || path === '/pricing' || path === '/payment-success' || path.startsWith('/share/');
      if (!isPublic) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email, password) =>
    axiosInstance.post('/api/auth/login', { email, password }).then((r) => r.data),
  register: (data) =>
    axiosInstance.post('/api/auth/register', data).then((r) => r.data),
  sendVerification: (email) =>
    axiosInstance.post('/api/auth/send-verification', { email }).then((r) => r.data),
  verify: (email, code) =>
    axiosInstance.post('/api/auth/verify', { email, code }).then((r) => r.data),
  me: () => axiosInstance.get('/api/auth/me').then((r) => r.data),
  logout: () => axiosInstance.post('/api/auth/logout').then((r) => r.data),
};

export const plansApi = {
  getPlans: () => axiosInstance.get('/api/plans').then((r) => r.data),
};

export const settingsApi = {
  getPaymentSettings: () => axiosInstance.get('/api/settings/payment').then((r) => r.data),
};

export const paymentsApi = {
  createOrder: (plan_id, billing_interval = 'monthly') =>
    axiosInstance.post('/api/payments', { plan_id, billing_interval }).then((r) => r.data),
  getOrder: (orderId) => axiosInstance.get(`/api/payments/${orderId}`).then((r) => r.data),
  listMyPayments: (params) => axiosInstance.get('/api/payments/my', { params }).then((r) => r.data),
  uploadProof: (orderId, formData) =>
    axiosInstance.post(`/api/payments/${orderId}/proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  getProofImageUrl: (orderId) => `${API_BASE}/api/payments/${orderId}/proof/image`,
  getQrisImageUrl: (orderId) => `${API_BASE}/api/payments/${orderId}/qris-image`,
  generateQris: (orderId, amount) =>
    axiosInstance.post('/api/payments/generate-qris', { orderId, amount }).then((r) => r.data),
};

export const foldersApi = {
  list: (parentId = null) =>
    axiosInstance.get('/api/folders', { params: parentId != null ? { parent_id: parentId } : {} }).then((r) => r.data),
  listAll: () =>
    axiosInstance.get('/api/folders', { params: { all: 'true' } }).then((r) => r.data),
  create: (name, parentId = null) =>
    axiosInstance.post('/api/folders', { name, parent_id: parentId }).then((r) => r.data),
  update: (id, data) => axiosInstance.put(`/api/folders/${id}`, data).then((r) => r.data),
  delete: (id) => axiosInstance.delete(`/api/folders/${id}`),
};

export const filesApi = {
  list: (folderId = null, trashed = false) =>
    axiosInstance
      .get('/api/files', { params: { folder_id: folderId || undefined, trashed } })
      .then((r) => r.data),
  get: (id) => axiosInstance.get(`/api/files/${id}`).then((r) => r.data),
  upload: (formData, onProgress) =>
    axiosInstance.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }).then((r) => r.data),
  rename: (id, original_name) =>
    axiosInstance.put(`/api/files/${id}/rename`, { original_name }).then((r) => r.data),
  move: (id, folder_id) =>
    axiosInstance.put(`/api/files/${id}/move`, { folder_id }).then((r) => r.data),
  trash: (id) => axiosInstance.post(`/api/files/${id}/trash`).then((r) => r.data),
  restore: (id) => axiosInstance.post(`/api/files/${id}/restore`).then((r) => r.data),
  delete: (id) => axiosInstance.delete(`/api/files/${id}`),
  download: async (id, filename) => {
    const token = localStorage.getItem('godrive_token');
    const res = await fetch(`${API_BASE}/api/files/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const shareApi = {
  create: (payload, options = {}) =>
    axiosInstance.post('/api/share/create', { ...payload, ...options }).then((r) => r.data),
  list: () =>
    axiosInstance.get('/api/share/list').then((r) => r.data),
  getByFile: (fileId) =>
    axiosInstance.get(`/api/share/by-file/${fileId}`).then((r) => r.data),
  getByFolder: (folderId) =>
    axiosInstance.get(`/api/share/by-folder/${folderId}`).then((r) => r.data),
  getCollaborators: (shareId) =>
    axiosInstance.get(`/api/share/${shareId}/collaborators`).then((r) => r.data),
  addCollaborator: (shareId, body) =>
    axiosInstance.post(`/api/share/${shareId}/collaborators`, body).then((r) => r.data),
  removeCollaborator: (shareId, collaboratorId) =>
    axiosInstance.delete(`/api/share/${shareId}/collaborators/${collaboratorId}`),
  getByToken: (token, password = '', folderId = null) => {
    const params = new URLSearchParams();
    if (password) params.set('password', password);
    if (folderId) params.set('folder_id', folderId);
    const qs = params.toString();
    return fetch(`${API_BASE}/api/share/${token}${qs ? `?${qs}` : ''}`).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const e = new Error(data.error || 'Failed to load');
        e.requiresPassword = data.requiresPassword;
        throw e;
      }
      return data;
    });
  },
  uploadToShare: (token, formData, password = '', onProgress) => {
    const url = `${API_BASE}/api/share/${token}/upload${password ? `?password=${encodeURIComponent(password)}` : ''}`;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({ loaded: e.loaded, total: e.total, percent: (e.loaded / e.total) * 100 });
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({});
          }
        } else {
          let err;
          try {
            const data = JSON.parse(xhr.responseText);
            err = new Error(data.error || 'Upload failed');
          } catch {
            err = new Error('Upload failed');
          }
          reject(err);
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.send(formData);
    });
  },
  getDownloadUrl: (token, password = '') =>
    `${API_BASE}/api/share/${token}/download${password ? `?password=${encodeURIComponent(password)}` : ''}`,
};

export const searchApi = {
  search: (q) => axiosInstance.get('/api/search', { params: { q } }).then((r) => r.data),
};

export const systemApi = {
  storage: () => axiosInstance.get('/api/system/storage').then((r) => r.data),
};

export const usersApi = {
  getProfile: () => axiosInstance.get('/api/users/profile').then((r) => r.data),
  getActivity: (params) => axiosInstance.get('/api/users/activity', { params }).then((r) => r.data),
  updateProfile: (data) => axiosInstance.put('/api/users/profile', data).then((r) => r.data),
  changePassword: (current_password, new_password) =>
    axiosInstance.post('/api/users/change-password', { current_password, new_password }).then((r) => r.data),
};

export const adminApi = {
  getStats: () => axiosInstance.get('/api/admin/stats').then((r) => r.data),
  getStorageAnalytics: () => axiosInstance.get('/api/admin/storage').then((r) => r.data),
  listUsers: (params) => axiosInstance.get('/api/admin/users', { params }).then((r) => r.data),
  getUser: (id) => axiosInstance.get(`/api/admin/users/${id}`).then((r) => r.data),
  updateUser: (id, data) => axiosInstance.patch(`/api/admin/users/${id}`, data).then((r) => r.data),
  createUser: (data) => axiosInstance.post('/api/admin/users', data).then((r) => r.data),
  listFiles: (params) => axiosInstance.get('/api/admin/files', { params }).then((r) => r.data),
  listShares: (params) => axiosInstance.get('/api/admin/shares', { params }).then((r) => r.data),
  listLogs: (params) => axiosInstance.get('/api/admin/logs', { params }).then((r) => r.data),
  getServerHealth: () => axiosInstance.get('/api/admin/server').then((r) => r.data),
  getPlans: () => axiosInstance.get('/api/admin/plans').then((r) => r.data),
  updatePlan: (id, data) => axiosInstance.patch(`/api/admin/plans/${id}`, data).then((r) => r.data),
  createPlan: (data) => axiosInstance.post('/api/admin/plans', data).then((r) => r.data),
  deletePlan: (id) => axiosInstance.delete(`/api/admin/plans/${id}`),
  getSettings: () => axiosInstance.get('/api/admin/settings').then((r) => r.data),
  updateSettings: (data) => axiosInstance.patch('/api/admin/settings', data).then((r) => r.data),
  deleteUser: (id) => axiosInstance.delete(`/api/admin/users/${id}`),
  listPayments: (params) => axiosInstance.get('/api/admin/payments', { params }).then((r) => r.data),
  getPayment: (id) => axiosInstance.get(`/api/admin/payments/${id}`).then((r) => r.data),
  getPaymentStats: () => axiosInstance.get('/api/admin/payments/stats').then((r) => r.data),
  approvePayment: (id) => axiosInstance.patch(`/api/admin/payments/${id}/approve`).then((r) => r.data),
  rejectPayment: (id, body) => axiosInstance.patch(`/api/admin/payments/${id}/reject`, body || {}).then((r) => r.data),
  getPaymentProofUrl: (id) => `${API_BASE}/api/admin/payments/${id}/proof/image`,
};

export default axiosInstance;
