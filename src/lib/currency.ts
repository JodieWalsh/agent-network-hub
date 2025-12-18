// Currency & Units Engine
// Mock exchange rates - structured for easy API integration later

export type CurrencyCode = 'AUD' | 'USD' | 'GBP' | 'EUR' | 'NZD' | 'CAD';
export type UnitSystem = 'metric' | 'imperial';

// Mock exchange rates (relative to AUD)
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  AUD: 1.0,
  USD: 0.65,
  GBP: 0.52,
  EUR: 0.61,
  NZD: 1.08,
  CAD: 0.88,
};

// Currency symbols
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  AUD: 'A$',
  USD: '$',
  GBP: '£',
  EUR: '€',
  NZD: 'NZ$',
  CAD: 'C$',
};

// Countries that use imperial system
const IMPERIAL_COUNTRIES = ['US', 'USA', 'United States', 'Myanmar', 'Liberia'];

export interface CurrencyConversion {
  originalAmount: number;
  originalCurrency: CurrencyCode;
  convertedAmount: number;
  convertedCurrency: CurrencyCode;
  rate: number;
}

/**
 * Convert amount from one currency to another
 * Uses mock rates - ready for API integration
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): CurrencyConversion {
  const fromRate = EXCHANGE_RATES[fromCurrency];
  const toRate = EXCHANGE_RATES[toCurrency];
  const rate = toRate / fromRate;
  
  return {
    originalAmount: amount,
    originalCurrency: fromCurrency,
    convertedAmount: Math.round(amount * rate),
    convertedCurrency: toCurrency,
    rate,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amountCents: number,
  currency: CurrencyCode = 'AUD'
): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const amount = amountCents / 100;
  
  return `${symbol}${amount.toLocaleString('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Format with conversion estimate
 */
export function formatWithConversion(
  amountCents: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): { primary: string; estimate: string | null } {
  const primary = formatCurrency(amountCents, fromCurrency);
  
  if (fromCurrency === toCurrency) {
    return { primary, estimate: null };
  }
  
  const conversion = convertCurrency(amountCents, fromCurrency, toCurrency);
  const estimate = `≈ ${formatCurrency(conversion.convertedAmount, toCurrency)}`;
  
  return { primary, estimate };
}

/**
 * Determine default unit system based on location
 */
export function getDefaultUnitSystem(country?: string): UnitSystem {
  if (!country) return 'metric';
  return IMPERIAL_COUNTRIES.some(c => 
    country.toLowerCase().includes(c.toLowerCase())
  ) ? 'imperial' : 'metric';
}

/**
 * Convert distance between units
 */
export function convertDistance(
  value: number,
  from: UnitSystem,
  to: UnitSystem
): number {
  if (from === to) return value;
  if (from === 'metric' && to === 'imperial') {
    return Math.round(value * 0.621371 * 10) / 10; // km to miles
  }
  return Math.round(value * 1.60934 * 10) / 10; // miles to km
}

/**
 * Format distance with units
 */
export function formatDistance(
  distanceKm: number,
  unitSystem: UnitSystem
): string {
  if (unitSystem === 'imperial') {
    const miles = convertDistance(distanceKm, 'metric', 'imperial');
    return `${miles} mi`;
  }
  return `${Math.round(distanceKm)} km`;
}

/**
 * Convert area between units
 */
export function convertArea(
  value: number,
  from: UnitSystem,
  to: UnitSystem
): number {
  if (from === to) return value;
  if (from === 'metric' && to === 'imperial') {
    return Math.round(value * 10.7639 * 10) / 10; // sqm to sqft
  }
  return Math.round(value * 0.092903 * 10) / 10; // sqft to sqm
}

/**
 * Format area with units
 */
export function formatArea(
  areaSqm: number,
  unitSystem: UnitSystem
): string {
  if (unitSystem === 'imperial') {
    const sqft = convertArea(areaSqm, 'metric', 'imperial');
    return `${sqft.toLocaleString()} sq ft`;
  }
  return `${areaSqm.toLocaleString()} m²`;
}
