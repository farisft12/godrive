const API_BASE = import.meta.env.VITE_API_URL || '';

const isPublicPath = () => {
  const p = window.location.pathname || '';
  return p === '/' || p === '/login' || p === '/register' || p === '/verify' || p === '/pricing' || p === '/payment-success' || p.startsWith('/share/');
};

const getAuthHeader = () => {
  const token = localStorage.getItem('godrive_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  get: (url, config = {}) =>
    fetch(API_BASE + url, {
      ...config,
      headers: { ...getAuthHeader(), ...config.headers },
    }).then(async (res) => {
      if (res.status === 401) {
        localStorage.removeItem('godrive_token');
        if (!isPublicPath()) window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      return data;
    }),

  post: (url, body, config = {}) =>
    fetch(API_BASE + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...config.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...config,
    }).then(async (res) => {
      if (res.status === 401) {
        localStorage.removeItem('godrive_token');
        if (!isPublicPath()) window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      return data;
    }),

  put: (url, body, config = {}) =>
    fetch(API_BASE + url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...config.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...config,
    }).then(async (res) => {
      if (res.status === 401) {
        localStorage.removeItem('godrive_token');
        if (!isPublicPath()) window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      return data;
    }),

  delete: (url, config = {}) =>
    fetch(API_BASE + url, {
      method: 'DELETE',
      headers: { ...getAuthHeader(), ...config.headers },
      ...config,
    }).then(async (res) => {
      if (res.status === 401) {
        localStorage.removeItem('godrive_token');
        if (!isPublicPath()) window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      if (res.status === 204) return {};
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      return data;
    }),
};

export default api;
