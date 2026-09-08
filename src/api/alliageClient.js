const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'alliage_access_token';

function captureOauthToken() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('access_token');
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  url.searchParams.delete('access_token');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

captureOauthToken();

async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Erro ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body || {}) });

function entityClient(entity) {
  return {
    list(sort = '', limit = 500, skip = 0) {
      const params = new URLSearchParams({ sort, limit: String(limit), skip: String(skip) });
      return api(`/api/entities/${entity}?${params}`);
    },
    filter(filter = {}, sort = '', limit = 500, skip = 0) {
      const params = new URLSearchParams({ filter: JSON.stringify(filter), sort, limit: String(limit), skip: String(skip) });
      return api(`/api/entities/${entity}?${params}`);
    },
    get(id) {
      return api(`/api/entities/${entity}/${encodeURIComponent(id)}`);
    },
    create(data) {
      return api(`/api/entities/${entity}`, json('POST', data));
    },
    update(id, data) {
      return api(`/api/entities/${entity}/${encodeURIComponent(id)}`, json('PATCH', data));
    },
    delete(id) {
      return api(`/api/entities/${entity}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    async deleteMany(filter = {}) {
      const records = await this.filter(filter, '', 5000);
      await Promise.all(records.map(record => this.delete(record.id)));
      return { deleted: records.length };
    },
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

export const alliage = {
  auth: {
    async loginViaEmailPassword(email, password) {
      const result = await api('/api/auth/login', json('POST', { email, password }));
      localStorage.setItem(TOKEN_KEY, result.access_token);
      return result;
    },
    loginWithProvider(provider, redirect = '/') {
      window.location.href = `${API_BASE}/api/auth/oauth/${provider}?redirect=${encodeURIComponent(redirect)}`;
    },
    async register(payload) {
      return api('/api/auth/register', json('POST', payload));
    },
    async verifyOtp(payload) {
      return api('/api/auth/verify-otp', json('POST', payload));
    },
    async resendOtp(email) {
      return api('/api/auth/resend-otp', json('POST', { email }));
    },
    async resetPasswordRequest(email) {
      return api('/api/auth/password-reset/request', json('POST', { email }));
    },
    async resetPassword(payload) {
      return api('/api/auth/password-reset', json('POST', payload));
    },
    async me() {
      return api('/api/auth/me');
    },
    async isAuthenticated() {
      try {
        await api('/api/auth/me');
        return true;
      } catch {
        return false;
      }
    },
    async updateMe(payload) {
      return api('/api/auth/me', json('PATCH', payload));
    },
    setToken(token) {
      localStorage.setItem(TOKEN_KEY, token);
    },
    logout(redirect) {
      localStorage.removeItem(TOKEN_KEY);
      if (redirect !== undefined) window.location.href = typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/login';
    },
    redirectToLogin() {
      window.location.href = '/login';
    },
  },
  entities: Object.fromEntries(['TrainingRequest', 'TrainingSchedule', 'Client', 'TeamMember', 'UserAuthorization', 'RoutingRule', 'SatisfactionSurvey', 'TrainingEvaluation', 'EmailTemplate', 'SurveyResponse', 'User'].map(entity => [entity, entityClient(entity)])),
  functions: {
    invoke(name, payload = {}) {
      return api(`/api/functions/${encodeURIComponent(name)}`, json('POST', payload));
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const data = await fileToDataUrl(file);
        return api('/api/uploads', json('POST', { name: file.name, type: file.type, data }));
      },
      async InvokeLLM(payload) {
        const response = await api('/api/functions/invokeLLM', json('POST', payload));
        return response.data;
      },
    },
  },
  users: {
    inviteUser(email, role) {
      return api('/api/users/invite', json('POST', { email, role }));
    },
  },
};
