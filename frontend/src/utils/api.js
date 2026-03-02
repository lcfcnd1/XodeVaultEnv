const BASE = '/api';

function getToken() {
  return localStorage.getItem('xv_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register: (username, password) =>
    fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(handleResponse),

  login: (username, password) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(handleResponse),

  // Secrets
  getSecrets: () =>
    fetch(`${BASE}/secrets`, { headers: authHeaders() }).then(handleResponse),

  getSecret: (id) =>
    fetch(`${BASE}/secrets/${id}`, { headers: authHeaders() }).then(handleResponse),

  createSecret: (payload) =>
    fetch(`${BASE}/secrets`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  updateSecret: (id, payload) =>
    fetch(`${BASE}/secrets/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  deleteSecret: (id) =>
    fetch(`${BASE}/secrets/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handleResponse),

  // Share
  listShares: () =>
    fetch(`${BASE}/share`, { headers: authHeaders() }).then(handleResponse),

  createShare: (payload) =>
    fetch(`${BASE}/share`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  getShare: (id) =>
    fetch(`${BASE}/share/${id}`).then(handleResponse),

  deleteShare: (id) =>
    fetch(`${BASE}/share/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handleResponse),
};
