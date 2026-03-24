'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Building2, 
  User,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { partnerApi } from '@/services/api';

interface Partner {
  id: string;
  code: string;
  name: string;
  type: 'CUSTOMER' | 'VENDOR' | 'BOTH';
  npwp16?: string;
  nik?: string;
  taxStatus: 'PKP' | 'NON_PKP';
  isPkp: boolean;
  isEmployee: boolean;
  email?: string;
  phone?: string;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await partnerApi.getAll({
        search: searchQuery,
        type: filterType,
      });
      setPartners(response.data.data || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
      // Mock data for demo
      setPartners([
        { id: '1', code: 'CUST-001', name: 'PT Maju Jaya', type: 'CUSTOMER', npwp16: '0018852632007000', taxStatus: 'PKP', isPkp: true, isEmployee: false, email: 'finance@majujaya.co.id' },
        { id: '2', code: 'VEND-001', name: 'PT Sukses Abadi', type: 'VENDOR', npwp16: '0023456789012000', taxStatus: 'PKP', isPkp: true, isEmployee: false, email: 'billing@suksesabadi.co.id' },
        { id: '3', code: 'EMP-001', name: 'Budi Santoso', type: 'BOTH', nik: '3175012345678901', taxStatus: 'NON_PKP', isPkp: false, isEmployee: true, email: 'budi@company.co.id' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      CUSTOMER: 'default',
      VENDOR: 'secondary',
      BOTH: 'outline',
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  const getTaxStatusBadge = (isPkp: boolean) => {
    return isPkp ? (
      <Badge variant="success">PKP</Badge>
    ) : (
      <Badge variant="outline">Non-PKP</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                ← Kembali
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Master Data - Partner</h1>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Partner
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Partner</p>
                  <p className="text-2xl font-bold">{partners.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">PKP</p>
                  <p className="text-2xl font-bold">{partners.filter(p => p.isPkp).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">Karyawan</p>
                  <p className="text-2xl font-bold">{partners.filter(p => p.isEmployee).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-500">Non-PKP</p>
                  <p className="text-2xl font-bold">{partners.filter(p => !p.isPkp).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari partner..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Partner</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>NPWP/NIK</TableHead>
                  <TableHead>Status Pajak</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : partners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Tidak ada data partner
                    </TableCell>
                  </TableRow>
                ) : (
                  partners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          {partner.isEmployee && (
                            <Badge variant="secondary" className="text-xs">Karyawan</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(partner.type)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {partner.npwp16 && <p>NPWP: {partner.npwp16}</p>}
                          {partner.nik && <p>NIK: {partner.nik}</p>}
                        </div>
                      </TableCell>
                      <TableCell>{getTaxStatusBadge(partner.isPkp)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {partner.email && <p>{partner.email}</p>}
                          {partner.phone && <p>{partner.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
