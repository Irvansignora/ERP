'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Users, FileText, Receipt, Calculator, BarChart3, Settings,
  TrendingUp, AlertCircle, CheckCircle2, Download, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { partnerApi, taxInvoiceApi, withholdingApi, taxEngineApi } from '@/services/api';

interface DashboardStats {
  totalPartners: number;
  totalInvoices: number;
  totalWithholdingSlips: number;
  pendingXmlExports: number;
  vatOutTotal: number;
  pph21Total: number;
  pph23Total: number;
}

interface Activity {
  id: string | number;
  type: string;
  description: string;
  date: string;
  status: 'success' | 'error' | 'info';
}

// FIX: Was entirely hardcoded with TODO — now fetches real data from API
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPartners: 0, totalInvoices: 0, totalWithholdingSlips: 0,
    pendingXmlExports: 0, vatOutTotal: 0, pph21Total: 0, pph23Total: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPeriod = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [partnersRes, invoicesRes, withholdingRes, taxSummaryRes] = await Promise.allSettled([
        partnerApi.getAll({ limit: 1 }),
        taxInvoiceApi.getAll({ limit: 1 }),
        withholdingApi.getAll({ limit: 1 }),
        taxEngineApi.getSummary(currentPeriod),
      ]);

      let pendingXml = 0;
      try {
        const pRes = await taxInvoiceApi.getAll({ xmlGenerated: false, limit: 1 });
        pendingXml = pRes.data?.total ?? 0;
      } catch { /* non-critical */ }

      const summary = taxSummaryRes.status === 'fulfilled' ? taxSummaryRes.value.data : null;

      setStats({
        totalPartners: partnersRes.status === 'fulfilled' ? (partnersRes.value.data?.total ?? 0) : 0,
        totalInvoices: invoicesRes.status === 'fulfilled' ? (invoicesRes.value.data?.total ?? 0) : 0,
        totalWithholdingSlips: withholdingRes.status === 'fulfilled' ? (withholdingRes.value.data?.total ?? 0) : 0,
        pendingXmlExports: pendingXml,
        vatOutTotal: summary?.vatOutTotal ?? 0,
        pph21Total: summary?.pph21Total ?? 0,
        pph23Total: summary?.pph23Total ?? 0,
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
      setError('Gagal memuat data. Periksa koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }, [currentPeriod]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const menuItems = [
    { title: 'Master Data', description: 'Kelola partner, produk, dan master data lainnya', icon: Users, href: '/partners', color: 'bg-blue-500' },
    { title: 'Pajak Keluaran', description: 'Faktur pajak keluaran dan ekspor XML', icon: FileText, href: '/invoices', color: 'bg-green-500' },
    { title: 'Pajak Masukan & PPh', description: 'Bukti potong dan PPh Unifikasi', icon: Receipt, href: '/withholding', color: 'bg-purple-500' },
    { title: 'PPh 21', description: 'Perhitungan PPh 21 dengan sistem TER', icon: Calculator, href: '/pph21', color: 'bg-orange-500' },
    { title: 'Tax Engine', description: 'Ringkasan pajak dan validasi', icon: BarChart3, href: '/tax-engine', color: 'bg-red-500' },
    { title: 'Laporan', description: 'Laporan keuangan dan pajak', icon: TrendingUp, href: '/reports', color: 'bg-teal-500' },
  ];

  const periodLabel = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  const Skeleton = () => <span className="inline-block w-16 h-7 bg-gray-200 rounded animate-pulse" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CoreTax ERP</h1>
                <p className="text-xs text-gray-500">Indonesian Tax Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-blue-600 border-blue-600">v1.0.0</Badge>
              <Button variant="ghost" size="icon" onClick={fetchDashboardData} disabled={loading} title="Refresh">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Selamat Datang</h2>
          <p className="text-gray-600">Kelola pajak perusahaan Anda dengan mudah dan akurat</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchDashboardData} className="ml-auto">Coba Lagi</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Partner', value: stats.totalPartners, sub: 'Customer & Vendor', icon: Users },
            { label: 'Faktur Pajak', value: stats.totalInvoices, sub: 'Keluaran & Masukan', icon: FileText },
            { label: 'Bukti Potong', value: stats.totalWithholdingSlips, sub: 'PPh 21, 23, 4(2)', icon: Receipt },
            { label: 'Menunggu Export', value: stats.pendingXmlExports, sub: 'Dokumen belum diexport', icon: Download },
          ].map(({ label, value, sub, icon: Icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? <Skeleton /> : value}</div>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ringkasan Pajak Bulan Ini</CardTitle>
            <CardDescription>Periode: {periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">PPN Keluaran</p>
                <p className="text-2xl font-bold text-green-600">{loading ? <Skeleton /> : formatCurrency(stats.vatOutTotal)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">PPh 21 (TER)</p>
                <p className="text-2xl font-bold text-blue-600">{loading ? <Skeleton /> : formatCurrency(stats.pph21Total)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">PPh 23</p>
                <p className="text-2xl font-bold text-purple-600">{loading ? <Skeleton /> : formatCurrency(stats.pph23Total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {menuItems.map((item) => (
            <Link key={item.title} href={item.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`${item.color} p-3 rounded-lg`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>Log ekspor XML dan aktivitas sistem</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada aktivitas. Mulai buat faktur pajak atau bukti potong.
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    {activity.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                    {activity.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                    {activity.status === 'info' && <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.date}</p>
                    </div>
                    <Badge variant={activity.status === 'success' ? 'default' : activity.status === 'error' ? 'destructive' : 'secondary'}>
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
