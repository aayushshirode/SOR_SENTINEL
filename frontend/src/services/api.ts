// SOR SENTINEL — API Service Layer
import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  TokenResponse, User, Analysis, PaginatedAnalyses,
  DashboardSummary, DashboardActivity, ContactForm, ApiError,
  DigiKeeperDocument, DocumentListResponse, DocumentUploadResponse, DocumentDeleteResponse,
  CubbisChatRequest, CubbisChatResponse, CubbisConversationDetail, CubbisConversationListResponse, CubbisDeleteResponse,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

// ── Axios Instance ────────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000,
});

// ── Token Management ──────────────────────────────────────────────────────────
export const tokenStorage = {
  getAccessToken: (): string | null => sessionStorage.getItem('access_token'),
  getRefreshToken: (): string | null => sessionStorage.getItem('refresh_token'),
  setTokens: (access: string, refresh: string): void => {
    sessionStorage.setItem('access_token', access);
    sessionStorage.setItem('refresh_token', refresh);
  },
  clearTokens: (): void => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
  },
};

// ── Request Interceptor (attach token) ────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor (handle 401) ─────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      tokenStorage.clearTokens();
      // Don't redirect here — let the auth context handle it
    }
    return Promise.reject(error);
  }
);

// ── Error Helper ──────────────────────────────────────────────────────────────
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.errors?.length) {
      return data.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    }
    if (typeof data?.detail === 'string') return data.detail;
    if (error.code === 'ERR_NETWORK') return 'Cannot connect to server. Is the backend running?';
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    full_name: string; email: string; password: string;
    confirm_password: string; terms_accepted: boolean;
  }) => api.post<TokenResponse>('/auth/register', data),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<User>('/auth/me'),
};

// ── User API ──────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => api.get<User>('/users/me'),
  updateProfile: (data: { full_name?: string; avatar_url?: string }) =>
    api.put<User>('/users/me', data),
  changePassword: (data: {
    current_password: string; new_password: string; confirm_new_password: string;
  }) => api.post('/users/me/change-password', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<User>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeAvatar: () => api.delete<User>('/users/me/avatar'),
  submitFeedback: (data: { category: string; message: string }) =>
    api.post<{ message: string; id: number }>('/users/feedback', data),
  submitReview: (data: { rating: number; review?: string }) =>
    api.post<{ message: string; id: number }>('/users/review', data),
};

export interface AnalysisFilterParams {
  page?: number;
  page_size?: number;
  analysis_type?: string;
  status?: string;
  verdict?: string;
  sensitivity_level?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}

// ── Analysis API ──────────────────────────────────────────────────────────────
export const analysisApi = {
  analyzeText: (text: string) =>
    api.post<Analysis>('/analyses/text', { text }, { timeout: 120000 }),

  analyzeUrl: (url: string) =>
    api.post<Analysis>('/analyses/url', { url }, { timeout: 120000 }),

  listAnalyses: (params: AnalysisFilterParams) =>
    api.get<PaginatedAnalyses>('/analyses/', { params }),

  getAnalysis: (id: number) => api.get<Analysis>(`/analyses/${id}`),

  deleteAnalysis: (id: number) => api.delete(`/analyses/${id}`),

  exportCsv: (params?: Omit<AnalysisFilterParams, 'page' | 'page_size'>) =>
    api.get('/analyses/export/csv', { params, responseType: 'blob' }),

  exportPdf: (params?: Omit<AnalysisFilterParams, 'page' | 'page_size'>) =>
    api.get('/analyses/export/pdf', { params, responseType: 'blob' }),
};

// ── Dashboard API ─────────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary'),
  getActivity: (days?: number, view?: 'daily' | 'weekly' | 'monthly') =>
    api.get<DashboardActivity>('/dashboard/activity', { params: { days, view } }),
};

// ── Contact API ───────────────────────────────────────────────────────────────
export const contactApi = {
  submit: (data: ContactForm) => api.post('/contact/', data),
};

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminApi = {
  getOverview: () => api.get('/admin/overview'),
  getUsers: (params: { page?: number; page_size?: number; search?: string }) =>
    api.get('/admin/users', { params }),
  activateUser: (id: number) => api.put(`/admin/users/${id}/activate`),
  deactivateUser: (id: number) => api.put(`/admin/users/${id}/deactivate`),
  getAnalyses: (params: { page?: number; page_size?: number; search?: string }) =>
    api.get('/admin/analyses', { params }),
  getMessages: (params: { page?: number; status?: string }) =>
    api.get('/admin/messages', { params }),
  markMessageRead: (id: number) => api.put(`/admin/messages/${id}/read`),
  getAuditLogs: (params: { page?: number; user_id?: number; action?: string }) =>
    api.get('/admin/audit-logs', { params }),
};

// ── DigiKeeper API ────────────────────────────────────────────────────────────
export const digikeeperApi = {
  list: (params?: { category?: string; search?: string; sort_by?: 'date' | 'name' | 'size' | string; sort_order?: string; order?: string }) =>
    api.get<DocumentListResponse>('/digikeeper/documents', { params }),

  get: (id: number) =>
    api.get<DigiKeeperDocument>(`/digikeeper/documents/${id}`),

  upload: (file: File, category: string, title?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (title && title.trim()) {
      formData.append('title', title.trim());
    }
    return api.post<DocumentUploadResponse>('/digikeeper/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  download: async (id: number, filename: string) => {
    const response = await api.get(`/digikeeper/documents/${id}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return response;
  },

  delete: (id: number) =>
    api.delete<DocumentDeleteResponse>(`/digikeeper/documents/${id}`),
};

// ── Cubbis AI Cyber Assistant API ─────────────────────────────────────────────
export const cubbisApi = {
  chat: (data: CubbisChatRequest) =>
    api.post<CubbisChatResponse>('/cubbis/chat', data),

  listConversations: (params?: { limit?: number; offset?: number }) =>
    api.get<CubbisConversationListResponse>('/cubbis/conversations', { params }),

  getConversation: (id: number) =>
    api.get<CubbisConversationDetail>(`/cubbis/conversations/${id}`),

  deleteConversation: (id: number) =>
    api.delete<CubbisDeleteResponse>(`/cubbis/conversations/${id}`),

  clearHistory: () =>
    api.delete<CubbisDeleteResponse>('/cubbis/history'),
};

// ── Health API ────────────────────────────────────────────────────────────────
export const healthApi = {
  basic: () => api.get('/health/'),
  detailed: () => api.get('/health/detailed'),
};

export default api;
