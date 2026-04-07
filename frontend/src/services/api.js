import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Depending on backend port
    headers: {
        'Content-Type': 'application/json'
    }
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Global error handling strategy if needed
        return Promise.reject(error);
    }
);

export const companyApi = {
    getAll: (params) => api.get('/companies', { params }),
    getOne: (symbol) => api.get(`/companies/${symbol}`),
    add: (data) => api.post('/companies', data),
};

export const stockApi = {
    getHistorical: (companyId, params) => api.get(`/stocks/${companyId}`, { params }),
    addBulk: (data) => api.post('/stocks', { data })
};

export const tradeApi = {
    getHistory: (params) => api.get('/trades', { params }),
    add: (data) => api.post('/trades', data)
};

export const indicatorApi = {
    getIndicators: (companyId, params) => api.get(`/indicators/${companyId}`, { params }),
    add: (data) => api.post('/indicators', data)
};

export const externalApi = {
    fetchNews: (data) => api.post('/external/news', data),
    fetchHistorical: (data) => api.post('/external/historical', data),
    fetchProfile: (data) => api.post('/external/profile', data)
};

// [SCREENER FEATURE] — remove this block to disable
export const screenerApi = {
    run: (params) => api.get('/screener', { params })
};
// [/SCREENER FEATURE]

export default api;
