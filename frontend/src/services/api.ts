import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
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

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Partner API
export const partnerApi = {
  getAll: (params?: any) => api.get('/partners', { params }),
  getById: (id: string) => api.get(`/partners/${id}`),
  create: (data: any) => api.post('/partners', data),
  update: (id: string, data: any) => api.put(`/partners/${id}`, data),
  delete: (id: string) => api.delete(`/partners/${id}`),
  validate: (id: string) => api.get(`/partners/${id}/validate`),
};

// Tax Invoice API
export const taxInvoiceApi = {
  getAll: (params?: any) => api.get('/tax-invoices', { params }),
  getById: (id: string) => api.get(`/tax-invoices/${id}`),
  create: (data: any) => api.post('/tax-invoices', data),
  validate: (id: string) => api.get(`/tax-invoices/${id}/validate`),
  generateXml: (id: string) => api.post(`/tax-invoices/${id}/generate-xml`, null, {
    responseType: 'blob',
  }),
  bulkGenerateXml: (ids: string[]) => api.post('/tax-invoices/bulk-generate-xml', { ids }, {
    responseType: 'blob',
  }),
};

// Withholding Slip API
export const withholdingApi = {
  getAll: (params?: any) => api.get('/withholding-slips', { params }),
  getById: (id: string) => api.get(`/withholding-slips/${id}`),
  create: (data: any) => api.post('/withholding-slips', data),
  issue: (id: string) => api.post(`/withholding-slips/${id}/issue`),
  cancel: (id: string) => api.post(`/withholding-slips/${id}/cancel`),
  validate: (id: string) => api.get(`/withholding-slips/${id}/validate`),
  generatePph21Xml: (ids: string[]) => api.post('/withholding-slips/generate-pph21-xml', { ids }, {
    responseType: 'blob',
  }),
  generateUnifikasiXml: (ids: string[]) => api.post('/withholding-slips/generate-unifikasi-xml', { ids }, {
    responseType: 'blob',
  }),
};

// PPh 21 API
export const pph21Api = {
  calculateMonthly: (data: any) => api.post('/pph21/calculate-monthly', data),
  calculateYearEnd: (employeeId: string, taxYear: number) => 
    api.get(`/pph21/calculate-year-end/${employeeId}?taxYear=${taxYear}`),
  getTerRates: () => api.get('/pph21/ter-rates'),
};

// Tax Engine API
export const taxEngineApi = {
  getSummary: (period: string) => api.get('/tax-engine/summary', { params: { period } }),
  runPreValidation: (period: string) => api.post('/tax-engine/pre-validation', null, { params: { period } }),
  getXmlHistory: (params?: any) => api.get('/tax-engine/xml-history', { params }),
  getTaxMapping: () => api.get('/tax-engine/tax-mapping'),
};

// XML Export API
export const xmlExportApi = {
  exportTaxInvoices: (ids: string[], period?: string) => 
    api.post('/xml-export/tax-invoices', { ids }, { params: { period }, responseType: 'blob' }),
  exportPph21: (ids: string[], period?: string) => 
    api.post('/xml-export/pph21', { ids }, { params: { period }, responseType: 'blob' }),
  exportPphUnifikasi: (ids: string[], period?: string) => 
    api.post('/xml-export/pph-unifikasi', { ids }, { params: { period }, responseType: 'blob' }),
  validate: (data: any) => api.post('/xml-export/validate', data),
};

// Journal Entry API
export const journalApi = {
  getAll: (params?: any) => api.get('/journal-entries', { params }),
  getById: (id: string) => api.get(`/journal-entries/${id}`),
  create: (data: any) => api.post('/journal-entries', data),
  post: (id: string) => api.post(`/journal-entries/${id}/post`),
  reverse: (id: string) => api.post(`/journal-entries/${id}/reverse`),
};

// Account API
export const accountApi = {
  getAll: () => api.get('/accounts'),
  getById: (id: string) => api.get(`/accounts/${id}`),
  create: (data: any) => api.post('/accounts', data),
  getTaxAccounts: () => api.get('/accounts/tax-accounts'),
};

export default api;
