export interface ExchangeData {
  rate: number;
  parallelRate?: number;
  lastUpdated: string;
  summary: string;
  sources: Source[];
}

export interface Source {
  title: string;
  uri: string;
}

export type CurrencyCode = 'USD' | 'NGN' | 'EUR' | 'GBP' | 'CAD';

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, { name: string; flag: string; symbol: string }> = {
  USD: { name: 'US Dollar', flag: 'https://flagcdn.com/us.svg', symbol: '$' },
  NGN: { name: 'Nigerian Naira', flag: 'https://flagcdn.com/ng.svg', symbol: '₦' },
  EUR: { name: 'Euro', flag: 'https://flagcdn.com/eu.svg', symbol: '€' },
  GBP: { name: 'British Pound', flag: 'https://flagcdn.com/gb.svg', symbol: '£' },
  CAD: { name: 'Canadian Dollar', flag: 'https://flagcdn.com/ca.svg', symbol: 'C$' },
};

export interface ConversionState {
  amount: string;
  from: CurrencyCode;
  to: CurrencyCode;
}