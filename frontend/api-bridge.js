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

window.nadiApi = {
  login: (email, password) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  me: () => apiRequest('/auth/me'),
  mothers: {
    me: () => apiRequest('/mothers/me'),
    timeline: () => apiRequest('/mothers/me/timeline')
  },
  checkins: {
    create: (payload) => apiRequest('/checkins', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    latest: () => apiRequest('/checkins/latest')
  },
  cases: {
    list: () => apiRequest('/cases'),
    one: (id) => apiRequest(`/cases/${id}`),
    acknowledge: (id) => apiRequest(`/cases/${id}/acknowledge`, { method: 'PATCH' }),
    followUp: (id, payload) => apiRequest(`/cases/${id}/follow-up`, { method: 'PATCH', body: JSON.stringify(payload) }),
    resolve: (id) => apiRequest(`/cases/${id}/resolve`, { method: 'PATCH' })
  },
  asha: { dashboard: () => apiRequest('/asha/dashboard') },
  phc: { dashboard: () => apiRequest('/phc/dashboard') },
  facilities: { list: () => apiRequest('/facilities'), nearest: (lat, lng) => apiRequest(`/facilities/nearest?lat=${lat}&lng=${lng}`) }
};
