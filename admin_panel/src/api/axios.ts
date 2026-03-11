import axios from 'axios';
import { getResolvedApiBaseUrl } from './config';

const api = axios.create({
    baseURL: `${getResolvedApiBaseUrl()}/`,
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
