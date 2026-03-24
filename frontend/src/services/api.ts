import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// FIX (Bug #8 Frontend): Do NOT store JWT in localStorage — it is vulnerable to XSS attacks.
// Instead, keep the token in module-level memory (cleared on page refresh) and
// persist the refresh-token via an HttpOnly cookie set by the server.
//
// How this works:
//   - On login, server responds with { accessToken } in the JSON body + sets
//     a HttpOnly refresh-token cookie automatically.
//   - We store the accessToken in memory only — no localStorage, no sessionStorage.
//   - On page refresh (memory cleared), call POST /auth/refresh — the browser sends
//     the HttpOnly cookie automatically, and the server issues a new accessToken.
//   - On 401, redirect to /login (refresh failed or session expired).
let _accessToken: string | null = null;

export const authToken = {
  get: () => _accessToken,
  set: (token: string) => { _accessToken = token; },
  clear: () => { _accessToken = null; },
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Required so the browser sends the HttpOnly refresh-token cookie on /auth/refresh
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    // FIX: Read from in-memory store, not localStorage
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Track if a refresh is already in progress to avoid parallel refresh calls
let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true;

      if (_isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve) => {
          _refreshQueue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      _isRefreshing = true;

      try {
        // Attempt silent token refresh using HttpOnly cookie
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken: string = data.accessToken;
        _accessToken = newToken;

        // Replay queued requests with the new token
        _refreshQueue.forEach((cb) => cb(newToken));
        _refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — session expired, redirect to login
        _accessToken = null;
        _refreshQueue = [];
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    // Store accessToken in memory, NOT localStorage
    if (res.data.accessToken) {
      authToken.set(res.data.accessToken);
    }
    return res;
  },
  logout: async () => {
    authToken.clear();
    // Call server to clear HttpOnly refresh-token cookie
    await api.post('/auth/logout').catch(() => {});
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
  refresh: () => api.post('/auth/refresh'),
};

// ── Feature 1 – Accounting & Finance ─────────────────────
export const accountApi = {
  getAll: () => api.get('/accounts'),
  getById: (id: string) => api.get(`/accounts/${id}`),
  create: (data: any) => api.post('/accounts', data),
  getTaxAccounts: () => api.get('/accounts/tax-accounts'),
};
export const journalApi = {
  getAll: (params?: any) => api.get('/journal-entries', { params }),
  getById: (id: string) => api.get(`/journal-entries/${id}`),
  create: (data: any) => api.post('/journal-entries', data),
  post: (id: string) => api.post(`/journal-entries/${id}/post`),
  reverse: (id: string) => api.post(`/journal-entries/${id}/reverse`),
};
export const budgetingApi = {
  getAll: (fiscalYear?: number) => api.get('/budgeting', { params: { fiscalYear } }),
  create: (data: any) => api.post('/budgeting', data),
  approve: (id: string) => api.post(`/budgeting/${id}/approve`),
  getVsActual: (id: string) => api.get(`/budgeting/${id}/vs-actual`),
};

// ── Feature 2 – Inventory Management ─────────────────────
export const inventoryApi = {
  getWarehouses: () => api.get('/inventory/warehouses'),
  createWarehouse: (data: any) => api.post('/inventory/warehouses', data),
  getStockByWarehouse: (warehouseId: string) => api.get(`/inventory/stock/${warehouseId}`),
  getStockSummary: (productId: string) => api.get(`/inventory/stock-summary/${productId}`),
  getLowStockAlerts: () => api.get('/inventory/low-stock-alerts'),
  createMovement: (data: any) => api.post('/inventory/movements', data),
  getMovements: (params?: any) => api.get('/inventory/movements', { params }),
};

// ── Feature 3 – Sales Management ─────────────────────────
export const salesOrderApi = {
  getQuotations: (params?: any) => api.get('/sales-orders/quotations', { params }),
  createQuotation: (data: any) => api.post('/sales-orders/quotations', data),
  convertToSO: (id: string) => api.post(`/sales-orders/quotations/${id}/convert`),
  getAll: (params?: any) => api.get('/sales-orders', { params }),
  getById: (id: string) => api.get(`/sales-orders/${id}`),
  confirm: (id: string) => api.post(`/sales-orders/${id}/confirm`),
  getSummary: (period?: string) => api.get('/sales-orders/summary', { params: { period } }),
};
export const taxInvoiceApi = {
  getAll: (params?: any) => api.get('/tax-invoices', { params }),
  getById: (id: string) => api.get(`/tax-invoices/${id}`),
  create: (data: any) => api.post('/tax-invoices', data),
  validate: (id: string) => api.get(`/tax-invoices/${id}/validate`),
  generateXml: (id: string) => api.post(`/tax-invoices/${id}/generate-xml`, null, { responseType: 'blob' }),
  bulkGenerateXml: (ids: string[]) => api.post('/tax-invoices/bulk-generate-xml', { ids }, { responseType: 'blob' }),
};

// ── Feature 4 – Purchase / Procurement ───────────────────
export const procurementApi = {
  getPurchaseRequests: (params?: any) => api.get('/procurement/purchase-requests', { params }),
  createPurchaseRequest: (data: any) => api.post('/procurement/purchase-requests', data),
  approvePR: (id: string) => api.post(`/procurement/purchase-requests/${id}/approve`),
  getPurchaseOrders: (params?: any) => api.get('/procurement/purchase-orders', { params }),
  getPurchaseOrderById: (id: string) => api.get(`/procurement/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => api.post('/procurement/purchase-orders', data),
  confirmPO: (id: string) => api.post(`/procurement/purchase-orders/${id}/confirm`),
  getPurchaseSummary: () => api.get('/procurement/purchase-orders/summary'),
};
export const withholdingApi = {
  getAll: (params?: any) => api.get('/withholding-slips', { params }),
  getById: (id: string) => api.get(`/withholding-slips/${id}`),
  create: (data: any) => api.post('/withholding-slips', data),
  issue: (id: string) => api.post(`/withholding-slips/${id}/issue`),
  cancel: (id: string) => api.post(`/withholding-slips/${id}/cancel`),
  validate: (id: string) => api.get(`/withholding-slips/${id}/validate`),
  generatePph21Xml: (ids: string[]) => api.post('/withholding-slips/generate-pph21-xml', { ids }, { responseType: 'blob' }),
  generateUnifikasiXml: (ids: string[]) => api.post('/withholding-slips/generate-unifikasi-xml', { ids }, { responseType: 'blob' }),
};

// ── Feature 5 – Audit Log ─────────────────────────────────
export const auditApi = {
  getLogs: (params?: any) => api.get('/audit-logs', { params }),
};

// ── Feature 6 – Dashboard & Reporting ────────────────────
export const taxEngineApi = {
  getSummary: (period: string) => api.get('/tax-engine/summary', { params: { period } }),
  runPreValidation: (period: string) => api.post('/tax-engine/pre-validation', null, { params: { period } }),
  getXmlHistory: (params?: any) => api.get('/tax-engine/xml-history', { params }),
  getTaxMapping: () => api.get('/tax-engine/tax-mapping'),
};
export const xmlExportApi = {
  exportTaxInvoices: (ids: string[], period?: string) => api.post('/xml-export/tax-invoices', { ids }, { params: { period }, responseType: 'blob' }),
  exportPph21: (ids: string[], period?: string) => api.post('/xml-export/pph21', { ids }, { params: { period }, responseType: 'blob' }),
  exportPphUnifikasi: (ids: string[], period?: string) => api.post('/xml-export/pph-unifikasi', { ids }, { params: { period }, responseType: 'blob' }),
  validate: (data: any) => api.post('/xml-export/validate', data),
};

// ── Feature 7 – Cash & Bank ───────────────────────────────
export const cashBankApi = {
  importBankStatement: (entries: any[]) => api.post('/cash-bank/bank-statements/import', { entries }),
  getUnreconciled: (accountId: string) => api.get(`/cash-bank/bank-statements/unreconciled/${accountId}`),
  reconcile: (id: string, journalEntryId: string) => api.post(`/cash-bank/bank-statements/${id}/reconcile`, { journalEntryId }),
  getBankBalance: (accountId: string) => api.get(`/cash-bank/bank-balance/${accountId}`),
  createPayment: (data: any) => api.post('/cash-bank/payments', data),
  getPayments: (params?: any) => api.get('/cash-bank/payments', { params }),
  getCashflow: (period: string) => api.get('/cash-bank/cashflow', { params: { period } }),
};

// ── Feature 8 – Pricing ───────────────────────────────────
export const pricingApi = {
  getPriceLists: (params?: any) => api.get('/pricing/price-lists', { params }),
  createPriceList: (data: any) => api.post('/pricing/price-lists', data),
  getProductPrice: (productId: string, type?: string, qty?: number) => api.get(`/pricing/product-price/${productId}`, { params: { type, qty } }),
  deactivatePriceList: (id: string) => api.post(`/pricing/price-lists/${id}/deactivate`),
};

// ── Feature 9 – CRM ───────────────────────────────────────
export const crmApi = {
  getLeads: (params?: any) => api.get('/crm/leads', { params }),
  createLead: (data: any) => api.post('/crm/leads', data),
  getLeadById: (id: string) => api.get(`/crm/leads/${id}`),
  updateLeadStatus: (id: string, status: string) => api.patch(`/crm/leads/${id}/status`, { status }),
  getPipelineSummary: () => api.get('/crm/leads/pipeline'),
  addActivity: (data: any) => api.post('/crm/activities', data),
  getCustomerHistory: (partnerId: string) => api.get(`/crm/customers/${partnerId}/history`),
};

// ── Feature 10 – Manufacturing ───────────────────────────
export const manufacturingApi = {
  getBoms: () => api.get('/manufacturing/bom'),
  getBomById: (id: string) => api.get(`/manufacturing/bom/${id}`),
  createBom: (data: any) => api.post('/manufacturing/bom', data),
  getWorkOrders: (params?: any) => api.get('/manufacturing/work-orders', { params }),
  getProductionSummary: () => api.get('/manufacturing/work-orders/summary'),
  createWorkOrder: (data: any) => api.post('/manufacturing/work-orders', data),
  updateWorkOrderStatus: (id: string, status: string, producedQty?: number) =>
    api.patch(`/manufacturing/work-orders/${id}/status`, { status, producedQty }),
};

// ── Feature 11 – Project Management ──────────────────────
export const projectsApi = {
  getAll: (params?: any) => api.get('/projects', { params }),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  updateStatus: (id: string, status: string) => api.patch(`/projects/${id}/status`, { status }),
  getSummary: () => api.get('/projects/summary'),
  createTask: (data: any) => api.post('/projects/tasks', data),
  updateTaskStatus: (id: string, status: string) => api.patch(`/projects/tasks/${id}/status`, { status }),
};

// ── Feature 12 – HR & Payroll ─────────────────────────────
export const hrApi = {
  getEmployees: (params?: any) => api.get('/hr/employees', { params }),
  createEmployee: (data: any) => api.post('/hr/employees', data),
  getEmployeeById: (id: string) => api.get(`/hr/employees/${id}`),
  recordAttendance: (data: any) => api.post('/hr/attendance', data),
  getAttendance: (employeeId: string, month: number, year: number) =>
    api.get(`/hr/attendance/${employeeId}`, { params: { month, year } }),
  generatePayslip: (data: any) => api.post('/hr/payslips/generate', data),
  getPayrollSummary: (period: string) => api.get('/hr/payroll/summary', { params: { period } }),
  approvePayslip: (id: string) => api.post(`/hr/payslips/${id}/approve`),
  markPaid: (id: string) => api.post(`/hr/payslips/${id}/mark-paid`),
};
export const pph21Api = {
  calculateMonthly: (data: any) => api.post('/pph21/calculate-monthly', data),
  calculateYearEnd: (employeeId: string, taxYear: number) =>
    api.get(`/pph21/calculate-year-end/${employeeId}`, { params: { taxYear } }),
  getTerRates: () => api.get('/pph21/ter-rates'),
};

// ── Master Data ───────────────────────────────────────────
export const partnerApi = {
  getAll: (params?: any) => api.get('/partners', { params }),
  getById: (id: string) => api.get(`/partners/${id}`),
  create: (data: any) => api.post('/partners', data),
  update: (id: string, data: any) => api.put(`/partners/${id}`, data),
  delete: (id: string) => api.delete(`/partners/${id}`),
  validate: (id: string) => api.get(`/partners/${id}/validate`),
};

// ── Feature 14 – API & Integrations ──────────────────────
export const integrationsApi = {
  createCharge: (data: any) => api.post('/integrations/payment/charge', data),
  checkPaymentStatus: (provider: string, transactionId: string) =>
    api.get(`/integrations/payment/status/${provider}/${transactionId}`),
  syncOrders: (provider: string, fromDate: string, toDate: string) =>
    api.post('/integrations/marketplace/sync', { provider, fromDate, toDate }),
  getShippingRates: (data: any) => api.post('/integrations/shipping/rates', data),
  createShipment: (data: any) => api.post('/integrations/shipping/shipment', data),
  trackShipment: (provider: string, awbNumber: string) =>
    api.get(`/integrations/shipping/track/${provider}/${awbNumber}`),
  getLogs: (params?: any) => api.get('/integrations/logs', { params }),
  getSummary: () => api.get('/integrations/summary'),
};

export default api;
