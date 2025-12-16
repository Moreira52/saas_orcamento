import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combina classes Tailwind sem conflitos (usado pelos componentes shadcn)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatar número para moeda brasileira
// Ex: 10000.5 → "R$ 10.000,50"
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Formatar porcentagem com 1 casa decimal
// Ex: 97.5 → "97.5%"
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Converter string de moeda para número
// Ex: "R$ 10.000,50" → 10000.5
export function parseCurrency(value: string): number {
  // Remove tudo exceto números e vírgula, depois substitui vírgula por ponto
  return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'));
}
