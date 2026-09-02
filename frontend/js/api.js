const API_URL = 'http://localhost:5000/api';

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('nadi42_token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body || {})
  }),
  patch: (endpoint, body, options = {}) => apiRequest(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body || {})
  }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
  login: async (email, password) => {
    const result = await api.post('/auth/login', { email, password });
    const user = result.user || result.data?.user;
    if (result.token && user) {
      localStorage.setItem('nadi42_token', result.token);
      localStorage.setItem('nadi42_user', JSON.stringify(user));
    }
    return result;
  },
  register: async (payload) => {
    const result = await api.post('/auth/register', payload);
    const user = result.user || result.data?.user;
    if (result.token && user) {
      localStorage.setItem('nadi42_token', result.token);
      localStorage.setItem('nadi42_user', JSON.stringify(user));
    }
    return result;
  },
  ensureDemoSession: async (email = 'meena@nadi42.demo', password = 'Demo@123') => {
    const savedToken = localStorage.getItem('nadi42_token');
    if (savedToken) {
      return {
        token: savedToken,
        user: JSON.parse(localStorage.getItem('nadi42_user') || '{}')
      };
    }

    return api.login(email, password);
  }
};

window.api = api;
