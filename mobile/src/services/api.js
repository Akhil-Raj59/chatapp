import axios from 'axios';
import { storage } from '../utils/storage';

const API_URL = 'http://192.168.51.56:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await storage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.clearAll();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/users/register', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  login: (data) => api.post('/users/login', data),
  logout: () => api.post('/users/logout'),
};

export const messageAPI = {
  getUsers: () => api.get('/messages/users'),
  getMessages: (userId) => api.get(`/messages/conversations/${userId}/messages`),
  getConversations: () => api.get('/messages/conversations'),
};

export default api;