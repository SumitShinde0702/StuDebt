import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Student API calls
export const studentApi = {
  getProfile: () => api.get('/student/profile'),
  getLoanRequests: () => api.get('/student/loan-requests'),
  getOffers: () => api.get('/student/offers'),
  getAgreements: () => api.get('/student/agreements'),
  createLoanRequest: (data) => api.post('/loan-requests', data),
  deleteLoanRequest: (id) => api.delete(`/loan-requests/${id}`),
  acceptOffer: (requestId, offerId, data) => 
    api.post(`/loan-requests/${requestId}/accept-offer`, { offerId, ...data }),
  getLoanRequestById: (id) => api.get(`/loan-requests/${id}`),
  updateLoanRequest: (id, data) => api.put(`/loan-requests/${id}`, data),
};

// Company API calls
export const companyApi = {
  getProfile: () => api.get('/company/profile'),
  getOffers: () => api.get('/company/offers'),
  getAgreements: () => api.get('/company/agreements'),
  getAvailableRequests: () => api.get('/company/available-requests'),
  createOffer: (requestId, data) => 
    api.post(`/loan-requests/${requestId}/offers`, data),
};

// Auth API calls
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  validate: () => api.get('/auth/validate'),
};

export default api; 