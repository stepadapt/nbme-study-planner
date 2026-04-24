// API client — all requests go through Vite proxy to /api
const BASE = '/api';

function getToken() {
  return localStorage.getItem('nbme_token');
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────
export const api = {
  auth: {
    signup: (email, password, name, agreedToTerms) =>
      request('POST', '/auth/signup', { email, password, name, agreedToTerms }),
    login: (email, password) => request('POST', '/auth/login', { email, password }),
    me: () => request('GET', '/auth/me'),
    verifyEmail: (token) => request('GET', `/auth/verify?token=${encodeURIComponent(token)}`),
    resendVerification: () => request('POST', '/auth/resend-verification'),
    forgotPassword: (email) => request('POST', '/auth/forgot-password', { email }),
    resetPassword: (token, password) => request('POST', '/auth/reset-password', { token, password }),
  },

  profile: {
    get: () => request('GET', '/profile'),
    save: (profile) => request('PUT', '/profile', profile),
  },

  assessments: {
    list: () => request('GET', '/assessments'),
    save: (data) => request('POST', '/assessments', data),
    update: (id, data) => request('PUT', `/assessments/${id}`, data),
    delete: (id) => request('DELETE', `/assessments/${id}`),
  },

  plans: {
    list: () => request('GET', '/plans'),
    latest: () => request('GET', '/plans/latest'),
    save: (data) => request('POST', '/plans', data),
    update: (id, data) => request('PUT', `/plans/${id}`, data),
  },

  ai: {
    // Upload screenshot and parse NBME scores
    parseScreenshot: async (file, examId) => {
      const formData = new FormData();
      formData.append('screenshot', file);
      if (examId) formData.append('examId', examId);

      const token = getToken();
      const res = await fetch(`${BASE}/ai/parse-screenshot`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parse failed');
      return data;
    },

    // Enrich a generated plan with AI-specific sub-topics and step recommendations
    planIntelligence: (studentData, basePlan) =>
      request('POST', '/ai/plan-intelligence', { student_data: studentData, base_plan: basePlan }),

    // Streaming chat — returns an async iterator of text chunks.
    // Backend fetches all student context (scores, plan, profile) fresh from DB
    // on every call — no need to send planContext from the frontend.
    chat: async function* (messages) {
      const token = getToken();
      const res = await fetch(`${BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Chat failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.text) yield payload.text;
              if (payload.done || payload.error) return;
            } catch { /* ignore parse errors */ }
          }
        }
      }
    },
  },

  feedback: {
    submit: (data) => request('POST', '/feedback', data),
  },

  reset: {
    full: () => request('POST', '/reset/full'),
    keepScores: () => request('POST', '/reset/keep-scores'),
    archive: () => request('POST', '/reset/archive'),
  },

  cycles: {
    list: () => request('GET', '/plans/archived-cycles'),
  },

  schedule: {
    get: () => request('GET', '/schedule'),
    save: (blocks) => request('PUT', '/schedule', { blocks }),
  },

  export: {
    downloadPdf: () => {
      const token = getToken();
      return fetch(`${BASE}/export/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    },
    downloadDocx: () => {
      const token = getToken();
      return fetch(`${BASE}/export/docx`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    },
  },
};
