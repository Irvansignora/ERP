import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function validateNpwp16(npwp: string): boolean {
  const clean = npwp.replace(/\D/g, '');
  return clean.length === 16 && /^\d{16}$/.test(clean);
}

export function validateNik(nik: string): boolean {
  const clean = nik.replace(/\D/g, '');
  return clean.length === 16 && /^\d{16}$/.test(clean);
}

export function validateNitku(nitku: string): boolean {
  const clean = nitku.replace(/\D/g, '');
  return clean.length === 22 && /^\d{22}$/.test(clean);
}

export function formatNpwp(npwp: string): string {
  const clean = npwp.replace(/\D/g, '');
  if (clean.length === 15) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}.${clean.slice(8, 9)}-${clean.slice(9, 12)}.${clean.slice(12)}`;
  }
  if (clean.length === 16) {
    return clean;
  }
  return npwp;
}

export function generatePeriodOptions(): { value: string; label: string }[] {
  const options = [];
  const currentYear = new Date().getFullYear();
  
  for (let year = currentYear; year >= currentYear - 2; year--) {
    for (let month = 12; month >= 1; month--) {
      const value = `${year}-${month.toString().padStart(2, '0')}`;
      const label = new Date(year, month - 1).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
      });
      options.push({ value, label });
    }
  }
  
  return options;
}
