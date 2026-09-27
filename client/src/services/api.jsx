import axios from 'axios';

// Base API configuration
const API = axios.create({
  baseURL: '/api', // Proxied through Vite to localhost:5001
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => API.post('/auth/register', userData),
  login: (credentials) => API.post('/auth/login', credentials),
  getProfile: () => API.get('/auth/me'),
  updateProfile: (updates) => API.put('/auth/profile', updates),
};

// Donations API
export const donationsAPI = {
  create: (donationData) => API.post('/donations', donationData),
  getAll: (params = {}) => API.get('/donations', { params }),
  getById: (id) => API.get(`/donations/${id}`),
  update: (id, updates) => API.put(`/donations/${id}`, updates),
  delete: (id) => API.delete(`/donations/${id}`),
};

// NGOs API
export const ngosAPI = {
  getAll: (params = {}) => API.get('/ngos', { params }),
  getById: (id) => API.get(`/ngos/${id}`),
  updateProfile: (updates) => API.put('/ngos/profile', updates),
  rate: (id, rating) => API.post(`/ngos/${id}/rate`, rating),
  getNearby: (lat, lng, radius = 10) => API.get(`/ngos/nearby/${lat}/${lng}?radius=${radius}`),
  search: (searchParams) => API.post('/ngos/search', searchParams), // NEW: AI-powered search
};

// Matching API (Phase 2)
export const matchingAPI = {
  findMatches: (donationId) => API.post(`/matching/${donationId}`),
};

// Chat API (Phase 2)
export const chatAPI = {
  query: (question) => API.post('/chat', { question }),
};

// MCP API (Phase 3)
export const mcpAPI = {
  execute: (server, tool, params) => API.post('/mcp/execute', { server, tool, params }),
};

export default API;