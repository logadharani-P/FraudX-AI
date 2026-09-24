/**
 * FraudX AI — Central Frontend API Client
 * Connects React UI to FastAPI backend with JWT handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('fraudx_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(url, config);
    if (res.status === 401) {
      localStorage.removeItem('fraudx_token');
      localStorage.removeItem('fraudx_user');
    }
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorData.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  auth: {
    login: (email, password, role) =>
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      }),
    me: () => request('/api/auth/me'),
    logout: () =>
      request('/api/auth/logout', { method: 'POST' }).finally(() => {
        localStorage.removeItem('fraudx_token');
        localStorage.removeItem('fraudx_user');
      }),
    register: (userData) =>
      request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    verifyMfa: (payload) =>
      request('/api/auth/verify-mfa', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    resendMfa: (payload) =>
      request('/api/auth/resend-mfa', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    challenge: (email) =>
      request('/api/auth/challenge', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  },

  dashboard: {
    getStats: () => request('/api/dashboard/stats'),
    getActivity: () => request('/api/dashboard/activity'),
    getRiskOverview: () => request('/api/dashboard/risk-overview'),
  },

  transactions: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      const qStr = query.toString();
      return request(`/api/transactions${qStr ? `?${qStr}` : ''}`);
    },
    get: (id) => request(`/api/transactions/${id}`),
    getMap: (limit = 250) => request(`/api/transactions/map?limit=${limit}`),
  },

  alerts: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      const qStr = query.toString();
      return request(`/api/alerts${qStr ? `?${qStr}` : ''}`);
    },
    get: (id) => request(`/api/alerts/${id}`),
    update: (id, data) =>
      request(`/api/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  investigations: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      const qStr = query.toString();
      return request(`/api/investigations${qStr ? `?${qStr}` : ''}`);
    },
    create: (data) =>
      request('/api/investigations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id) => request(`/api/investigations/${id}`),
    update: (id, data) =>
      request(`/api/investigations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    addAction: (id, data) =>
      request(`/api/investigations/${id}/actions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  members: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      const qStr = query.toString();
      return request(`/api/members${qStr ? `?${qStr}` : ''}`);
    },
    get: (id) => request(`/api/members/${id}`),
    getTransactions: (id) => request(`/api/members/${id}/transactions`),
    getAlerts: (id) => request(`/api/members/${id}/alerts`),
  },

  risk: {
    getDistribution: () => request('/api/risk/distribution'),
    getByType: () => request('/api/risk/by-type'),
    getNetwork: (memberId) => request(`/api/risk/network/${memberId}`),
  },

  reports: {
    list: () => request('/api/reports'),
    get: (id) => request(`/api/reports/${id}`),
    getDownloadUrl: (id, format = 'csv') => `${API_BASE_URL}/api/reports/${id}?format=${format}`,
  },

  agent: {
    chat: (message, context = null) =>
      request('/api/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message, context }),
      }),
  },

  audit: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      const qStr = query.toString();
      return request(`/api/audit${qStr ? `?${qStr}` : ''}`);
    },
  },
};

export default api;
