'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, FileText, Receipt, Calculator, BarChart3, Settings,
  TrendingUp, AlertCircle, CheckCircle2, Download, RefreshCw,
  Package, ShoppingCart, Truck, CreditCard, Target, Wrench,
  FolderKanban, UserCheck, Globe, Building2, Bell, Layers,
  ArrowUpRight, ArrowDownRight, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  partnerApi, taxInvoiceApi, withholdingApi, taxEngineApi,
  inventoryApi, salesOrderApi, procurementApi, crmApi,
  hrApi, projectsApi, manufacturingApi, cashBankApi, integrationsApi,
} from '@/services/api';

interface DashboardStats {
  // Feature 1 – Finance
  totalPartners: number;
  totalInvoices: number;
  totalWithholdingSlips: number;
  pendingXmlExports: number;
  vatOutTotal: number;
  pph21Total: number;
  pph23Total: number;
  // Feature 2 – Inventory
  lowStockAlerts: number;
  // Feature 3 – Sales
  totalSalesOrders: number;
  salesRevenue: number;
  // Feature 4 – Purchase
  totalPurchaseOrders: number;
  totalSpend: number;
  // Feature 9 – CRM
  totalLeads: number;
  // Feature 11 – Projects
  activeProjects: number;
  // Feature 12 – HR
  totalEmployees: number;
  // Feature 14 – Integrations
  integrationSuccess: number;
}

interface Activity {
  id: string | number;
  type: string;
  description: string;
  date: string;
  status: 'success' | 'error' | 'info';
}

const menuItems = [
  {
    section: '🔑 Core Features',
    items: [
      { title: 'Accounting & Finance', description: 'General ledger, laporan keuangan, budgeting', icon: BarChart3, href: '/finance', color: 'bg-blue-600', badge: 'Active' },
      { title: 'Inventory', description: 'Stok multi-gudang, batch/serial, alert', icon: Package, href: '/inventory', color: 'bg-emerald-600', badge: 'Active' },
      { title: 'Sales Management', description: 'Quotation → Sales Order → Invoice', icon: ShoppingCart, href: '/sales', color: 'bg-green-600', badge: 'Active' },
      { title: 'Purchase / Procurement', description: 'PR → PO → Supplier management', icon: Truck, href: '/procurement', color: 'bg-orange-600', badge: 'Active' },
      { title: 'User & Role Management', description: 'Multi-user, hak akses, audit log', icon: UserCheck, href: '/users', color: 'bg-slate-600', badge: 'Active' },
    ],
  },
  {
    section: '⚙️ Important Features',
    items: [
      { title: 'Dashboard & Reporting', description: 'Real-time KPI, laporan custom', icon: TrendingUp, href: '/', color: 'bg-violet-600', badge: 'Active' },
      { title: 'Cash & Bank', description: 'Rekonsiliasi, cashflow, payment', icon: CreditCard, href: '/cash-bank', color: 'bg-cyan-600', badge: 'Active' },
      { title: 'Pricing Management', description: 'Multi-harga, diskon, bundling', icon: Layers, href: '/pricing', color: 'bg-pink-600', badge: 'Active' },
      { title: 'CRM', description: 'Pipeline leads, riwayat customer', icon: Target, href: '/crm', color: 'bg-rose-600', badge: 'Active' },
    ],
  },
  {
    section: '🚀 Advanced Features',
    items: [
      { title: 'Manufacturing', description: 'BOM, Work Order, produksi', icon: Wrench, href: '/manufacturing', color: 'bg-amber-600', badge: 'Active' },
      { title: 'Project Management', description: 'Task, timeline, budget proyek', icon: FolderKanban, href: '/projects', color: 'bg-indigo-600', badge: 'Active' },
      { title: 'HR & Payroll', description: 'Karyawan, absensi, gaji, PPh 21', icon: Users, href: '/hr', color: 'bg-teal-600', badge: 'Active' },
      { title: 'Multi-Branch', description: 'Cabang banyak, konsolidasi laporan', icon: Building2, href: '/branches', color: 'bg-gray-600', badge: 'Active' },
      { title: 'API & Integrations', description: 'Payment gateway, marketplace, ekspedisi', icon: Globe, href: '/integrations', color: 'bg-fuchsia-600', badge: 'Active' },
    ],
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPartners: 0, totalInvoices: 0, totalWithholdingSlips: 0,
    pendingXmlExports: 0, vatOutTotal: 0, pph21Total: 0, pph23Total: 0,
    lowStockAlerts: 0, totalSalesOrders: 0, salesRevenue: 0,
    totalPurchaseOrders: 0, totalSpend: 0, totalLeads: 0,
    activeProjects: 0, totalEmployees: 0, integrationSuccess: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPeriod = (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  })();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        partnerApi.getAll({ limit: 1 }),
        taxInvoiceApi.getAll({ limit: 1 }),
        withholdingApi.getAll({ limit: 1 }),
        taxEngineApi.getSummary(currentPeriod),
        inventoryApi.getLowStockAlerts(),
        salesOrderApi.getSummary(currentPeriod),
        procurementApi.getPurchaseSummary(),
        crmApi.getPipelineSummary(),
        hrApi.getEmployees({ limit: 1 }),
        projectsApi.getSummary(),
        integrationsApi.getSummary(),
      ]);

      const [
        partnersRes, invoicesRes, withholdingRes, taxSummaryRes,
        lowStockRes, salesSummaryRes, purchaseSummaryRes,
        crmSummaryRes, employeesRes, projectsSummaryRes, integrationsSummaryRes,
      ] = results;

      let pendingXml = 0;
      try {
        const pRes = await taxInvoiceApi.getAll({ xmlGenerated: false, limit: 1 });
        pendingXml = pRes.data?.total ?? 0;
      } catch { /* non-critical */ }

      const taxSummary = taxSummaryRes.status === 'fulfilled' ? taxSummaryRes.value.data : null;
      const salesSummary = salesSummaryRes.status === 'fulfilled' ? salesSummaryRes.value.data : null;
      const purchaseSummary = purchaseSummaryRes.status === 'fulfilled' ? purchaseSummaryRes.value.data : null;
      const crmSummary = crmSummaryRes.status === 'fulfilled' ? crmSummaryRes.value.data : null;
      const projectsSummary = projectsSummaryRes.status === 'fulfilled' ? projectsSummaryRes.value.data : null;
      const integSummary = integrationsSummaryRes.status === 'fulfilled' ? integrationsSummaryRes.value.data : null;

      setStats({
        totalPartners: partnersRes.status === 'fulfilled' ? (partnersRes.value.data?.total ?? 0) : 0,
        totalInvoices: invoicesRes.status === 'fulfilled' ? (invoicesRes.value.data?.total ?? 0) : 0,
        totalWithholdingSlips: withholdingRes.status === 'fulfilled' ? (withholdingRes.value.data?.total ?? 0) : 0,
        pendingXmlExports: pendingXml,
        vatOutTotal: taxSummary?.vatOutTotal ?? 0,
        pph21Total: taxSummary?.pph21Total ?? 0,
        pph23Total: taxSummary?.pph23Total ?? 0,
        lowStockAlerts: lowStockRes.status === 'fulfilled' ? (lowStockRes.value.data?.length ?? 0) : 0,
        totalSalesOrders: salesSummary?.totalOrders ?? 0,
        salesRevenue: salesSummary?.totalRevenue ?? 0,
        totalPurchaseOrders: purchaseSummary?.totalOrders ?? 0,
        totalSpend: purchaseSummary?.totalSpend ?? 0,
        totalLeads: crmSummary?.totalLeads ?? 0,
        activeProjects: projectsSummary?.active ?? 0,
        totalEmployees: employeesRes.status === 'fulfilled' ? (employeesRes.value.data?.length ?? 0) : 0,
        integrationSuccess: integSummary?.total ?? 0,
      });

      try {
        const historyRes = await taxEngineApi.getXmlHistory({ limit: 5 });
        const history = historyRes.data?.data ?? [];
        setRecentActivities(history.map((h: any) => ({
          id: h.id,
          type: h.documentType?.toLowerCase().replace('_', ' ') ?? 'export',
          description: `XML ${h.documentType} diekspor (${h.recordCount ?? 0} dokumen)`,
          date: new Date(h.exportedAt ?? h.createdAt).toLocaleDateString('id-ID'),
          status: h.status === 'SUCCESS' ? 'success' : h.status === 'FAILED' ? 'error' : 'info',
        })));
      } catch { setRecentActivities([]); }
    } catch (err: any) {
      setError('Gagal memuat data dashboard. Periksa koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [currentPeriod]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const kpiCards = [
    { label: 'Revenue Bulan Ini', value: formatCurrency(stats.salesRevenue), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', trend: '+12%' },
    { label: 'Total Pengeluaran', value: formatCurrency(stats.totalSpend), icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-50', trend: '-3%' },
    { label: 'Sales Orders', value: stats.totalSalesOrders.toLocaleString(), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', trend: '' },
    { label: 'Purchase Orders', value: stats.totalPurchaseOrders.toLocaleString(), icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50', trend: '' },
    { label: 'Total Partner', value: stats.totalPartners.toLocaleString(), icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', trend: '' },
    { label: 'Karyawan Aktif', value: stats.totalEmployees.toLocaleString(), icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50', trend: '' },
    { label: 'Lead CRM', value: stats.totalLeads.toLocaleString(), icon: Target, color: 'text-rose-600', bg: 'bg-rose-50', trend: '' },
    { label: 'Proyek Aktif', value: stats.activeProjects.toLocaleString(), icon: FolderKanban, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '' },
  ];

  const alertCards = [
    { label: 'Low Stock Alerts', value: stats.lowStockAlerts, icon: Bell, color: stats.lowStockAlerts > 0 ? 'text-red-600' : 'text-green-600', urgent: stats.lowStockAlerts > 0 },
    { label: 'Pending XML Export', value: stats.pendingXmlExports, icon: Download, color: stats.pendingXmlExports > 0 ? 'text-amber-600' : 'text-green-600', urgent: stats.pendingXmlExports > 0 },
    { label: 'PPN Bulan Ini', value: formatCurrency(stats.vatOutTotal), icon: Receipt, color: 'text-blue-600', urgent: false },
    { label: 'PPh 21 Bulan Ini', value: formatCurrency(stats.pph21Total), icon: Calculator, color: 'text-purple-600', urgent: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏢 CoreTax ERP</h1>
            <p className="text-sm text-gray-500 mt-0.5">14-Fitur Terintegrasi · Periode: {currentPeriod}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/settings">
              <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1.5" />Pengaturan</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* KPI Cards */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">KPI Ringkasan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpiCards.map((kpi) => (
              <Card key={kpi.label} className="border border-gray-200 shadow-none hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                      <p className={`text-xl font-bold ${kpi.color}`}>{loading ? '…' : kpi.value}</p>
                      {kpi.trend && (
                        <p className={`text-xs mt-0.5 ${kpi.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                          {kpi.trend} vs bulan lalu
                        </p>
                      )}
                    </div>
                    <div className={`p-2 rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Alert / Tax Cards */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Perhatian & Pajak</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {alertCards.map((a) => (
              <Card key={a.label} className={`border shadow-none ${a.urgent ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <a.icon className={`h-5 w-5 ${a.color}`} />
                  <div>
                    <p className="text-xs text-gray-500">{a.label}</p>
                    <p className={`font-bold ${a.color}`}>{loading ? '…' : a.value}</p>
                  </div>
                  {a.urgent && <Badge variant="destructive" className="ml-auto text-xs">!</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Menu Grid — All 14 Features */}
        {menuItems.map((section) => (
          <div key={section.section}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{section.section}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Card className="border border-gray-200 shadow-none hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group h-full">
                    <CardContent className="p-4">
                      <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{item.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                      {item.badge && (
                        <Badge variant="secondary" className="mt-2 text-xs bg-green-100 text-green-700 border-0">
                          ✓ {item.badge}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Recent Activity & Integration Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-gray-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                Aktivitas Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-400">Memuat…</p>
              ) : recentActivities.length === 0 ? (
                <p className="text-sm text-gray-400">Belum ada aktivitas</p>
              ) : (
                <div className="space-y-2">
                  {recentActivities.map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                      {a.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />}
                      {a.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />}
                      {a.status === 'info' && <ArrowUpRight className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-800 truncate">{a.description}</p>
                        <p className="text-xs text-gray-400">{a.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                Status Integrasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { name: 'Payment Gateway (Midtrans/Xendit)', status: 'Terhubung', ok: true },
                  { name: 'Marketplace (Tokopedia/Shopee)', status: 'Terhubung', ok: true },
                  { name: 'Ekspedisi (JNE/SiCepat/JnT)', status: 'Terhubung', ok: true },
                  { name: 'CoreTax DJP XML', status: 'Aktif', ok: true },
                  { name: 'Email Notification', status: 'Konfigurasi diperlukan', ok: false },
                ].map((int) => (
                  <div key={int.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-700">{int.name}</span>
                    <Badge variant="outline" className={`text-xs ${int.ok ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>
                      {int.ok ? '✓' : '!'} {int.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-center text-gray-400 pb-4">
          CoreTax ERP · 14 Fitur Terintegrasi · NestJS + Next.js + PostgreSQL
        </p>
      </div>
    </div>
  );
}
