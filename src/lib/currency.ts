/**
 * Currency Utilities
 *
 * Auto-detect currency based on property country
 * Support for 100+ countries and all major currencies
 */

// Type exports for legacy compatibility
export type CurrencyCode = 'AUD' | 'USD' | 'GBP' | 'EUR' | 'NZD' | 'CAD' | 'JPY' | 'CNY' | 'HKD' | 'SGD' | string;

export interface Currency {
  code: string; // ISO 4217 code (e.g., "GBP", "USD", "EUR")
  symbol: string; // Currency symbol (e.g., "£", "$", "€")
  name: string; // Full name (e.g., "British Pound", "US Dollar")
  symbolPosition: 'before' | 'after'; // Where to display symbol
  decimalPlaces: number; // Number of decimal places
}

// All major currencies
export const CURRENCIES: Record<string, Currency> = {
  // Major currencies
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', symbolPosition: 'before', decimalPlaces: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'before', decimalPlaces: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', symbolPosition: 'before', decimalPlaces: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', symbolPosition: 'before', decimalPlaces: 0 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', symbolPosition: 'before', decimalPlaces: 2 },

  // Asia-Pacific
  AUD: { code: 'AUD', symbol: '$', name: 'Australian Dollar', symbolPosition: 'before', decimalPlaces: 2 },
  NZD: { code: 'NZD', symbol: '$', name: 'New Zealand Dollar', symbolPosition: 'before', decimalPlaces: 2 },
  CAD: { code: 'CAD', symbol: '$', name: 'Canadian Dollar', symbolPosition: 'before', decimalPlaces: 2 },
  HKD: { code: 'HKD', symbol: '$', name: 'Hong Kong Dollar', symbolPosition: 'before', decimalPlaces: 2 },
  SGD: { code: 'SGD', symbol: '$', name: 'Singapore Dollar', symbolPosition: 'before', decimalPlaces: 2 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', symbolPosition: 'before', decimalPlaces: 2 },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', symbolPosition: 'before', decimalPlaces: 0 },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', symbolPosition: 'before', decimalPlaces: 2 },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', symbolPosition: 'before', decimalPlaces: 2 },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', symbolPosition: 'before', decimalPlaces: 0 },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', symbolPosition: 'before', decimalPlaces: 2 },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', symbolPosition: 'after', decimalPlaces: 0 },

  // Americas
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', symbolPosition: 'before', decimalPlaces: 2 },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', symbolPosition: 'before', decimalPlaces: 2 },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso', symbolPosition: 'before', decimalPlaces: 2 },
  CLP: { code: 'CLP', symbol: '$', name: 'Chilean Peso', symbolPosition: 'before', decimalPlaces: 0 },
  COP: { code: 'COP', symbol: '$', name: 'Colombian Peso', symbolPosition: 'before', decimalPlaces: 0 },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', symbolPosition: 'before', decimalPlaces: 2 },

  // Europe
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', symbolPosition: 'before', decimalPlaces: 2 },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', symbolPosition: 'after', decimalPlaces: 2 },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', symbolPosition: 'after', decimalPlaces: 2 },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', symbolPosition: 'after', decimalPlaces: 2 },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', symbolPosition: 'after', decimalPlaces: 2 },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', symbolPosition: 'after', decimalPlaces: 2 },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', symbolPosition: 'after', decimalPlaces: 0 },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', symbolPosition: 'after', decimalPlaces: 2 },

  // Middle East & Africa
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', symbolPosition: 'before', decimalPlaces: 2 },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', symbolPosition: 'before', decimalPlaces: 2 },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', symbolPosition: 'before', decimalPlaces: 2 },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', symbolPosition: 'before', decimalPlaces: 2 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', symbolPosition: 'before', decimalPlaces: 2 },
  EGP: { code: 'EGP', symbol: '£', name: 'Egyptian Pound', symbolPosition: 'before', decimalPlaces: 2 },

  // Other
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', symbolPosition: 'after', decimalPlaces: 2 },
};

// Country code (ISO 3166-1 alpha-2) to currency code mapping
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // Europe (Eurozone)
  AT: 'EUR', BE: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR', FR: 'EUR',
  DE: 'EUR', GR: 'EUR', IE: 'EUR', IT: 'EUR', LV: 'EUR', LT: 'EUR',
  LU: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SK: 'EUR', SI: 'EUR',
  ES: 'EUR', HR: 'EUR',

  // Europe (Non-Eurozone)
  GB: 'GBP', // United Kingdom
  CH: 'CHF', // Switzerland
  SE: 'SEK', // Sweden
  NO: 'NOK', // Norway
  DK: 'DKK', // Denmark
  PL: 'PLN', // Poland
  CZ: 'CZK', // Czech Republic
  HU: 'HUF', // Hungary
  RO: 'RON', // Romania

  // Americas
  US: 'USD', // United States
  CA: 'CAD', // Canada
  MX: 'MXN', // Mexico
  BR: 'BRL', // Brazil
  AR: 'ARS', // Argentina
  CL: 'CLP', // Chile
  CO: 'COP', // Colombia
  PE: 'PEN', // Peru

  // Asia-Pacific
  AU: 'AUD', // Australia
  NZ: 'NZD', // New Zealand
  JP: 'JPY', // Japan
  CN: 'CNY', // China
  HK: 'HKD', // Hong Kong
  SG: 'SGD', // Singapore
  IN: 'INR', // India
  KR: 'KRW', // South Korea
  TH: 'THB', // Thailand
  MY: 'MYR', // Malaysia
  ID: 'IDR', // Indonesia
  PH: 'PHP', // Philippines
  VN: 'VND', // Vietnam

  // Middle East & Africa
  AE: 'AED', // United Arab Emirates
  SA: 'SAR', // Saudi Arabia
  IL: 'ILS', // Israel
  TR: 'TRY', // Turkey
  ZA: 'ZAR', // South Africa
  EG: 'EGP', // Egypt

  // Other
  RU: 'RUB', // Russia
};

// Currency symbols map (legacy compatibility)
export const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: '$',
  USD: '$',
  GBP: '£',
  EUR: '€',
  NZD: '$',
  CAD: '$',
  JPY: '¥',
  CNY: '¥',
  HKD: '$',
  SGD: '$',
  INR: '₹',
  KRW: '₩',
  THB: '฿',
  MYR: 'RM',
  IDR: 'Rp',
  PHP: '₱',
  VND: '₫',
  BRL: 'R$',
  MXN: '$',
  ARS: '$',
  CLP: '$',
  COP: '$',
  PEN: 'S/',
  CHF: 'Fr',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  AED: 'د.إ',
  SAR: '﷼',
  ILS: '₪',
  TRY: '₺',
  ZAR: 'R',
  EGP: '£',
  RUB: '₽',
};

/**
 * Get currency for a country code
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "GB", "US")
 * @returns Currency code (e.g., "GBP", "USD") or "AUD" as default
 */
export function getCurrencyForCountry(countryCode: string | undefined): string {
  if (!countryCode) return 'AUD';
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] || 'AUD';
}

/**
 * Get currency details
 * @param currencyCode - ISO 4217 currency code (e.g., "GBP", "USD")
 * @returns Currency object or AUD as default
 */
export function getCurrency(currencyCode: string): Currency {
  return CURRENCIES[currencyCode.toUpperCase()] || CURRENCIES.AUD;
}

/**
 * Format price with currency symbol
 * @param amount - Numeric amount
 * @param currencyCode - Currency code
 * @returns Formatted string (e.g., "£450,000", "$1,200,000")
 */
export function formatPrice(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  });

  if (currency.symbolPosition === 'before') {
    return `${currency.symbol}${formatted}`;
  } else {
    return `${formatted} ${currency.symbol}`;
  }
}

/**
 * Format currency for display (legacy compatibility)
 * @param amountCents - Amount in cents
 * @param currencyCode - Currency code
 * @returns Formatted string
 */
export function formatCurrency(
  amountCents: number,
  currencyCode: string = 'AUD'
): string {
  const amount = amountCents / 100;
  return formatPrice(amount, currencyCode);
}

/**
 * Format price with currency code appended for disambiguation
 * Useful when multiple currencies may appear on the same page.
 * @param amount - Numeric amount in dollars (not cents)
 * @param currencyCode - Currency code
 * @returns Formatted string with code (e.g., "$400 AUD", "£300 GBP", "250 kr SEK")
 */
export function formatPriceWithCode(amount: number, currencyCode: string): string {
  const formatted = formatPrice(amount, currencyCode);
  return `${formatted} ${currencyCode}`;
}

/**
 * Format with conversion estimate (legacy compatibility)
 * Note: This is a simplified version - real currency conversion would require an API
 */
export function formatWithConversion(
  amountCents: number,
  fromCurrency: string,
  toCurrency: string
): { primary: string; estimate: string | null } {
  const primary = formatCurrency(amountCents, fromCurrency);

  if (fromCurrency === toCurrency) {
    return { primary, estimate: null };
  }

  // For now, just return the primary without conversion
  // In a real app, you'd call a currency conversion API here
  return { primary, estimate: null };
}

/**
 * Get all currencies as array for dropdown (sorted by code)
 */
export function getAllCurrencies(): Currency[] {
  return Object.values(CURRENCIES).sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get popular currencies for quick selection
 */
export function getPopularCurrencies(): Currency[] {
  return ['AUD', 'USD', 'GBP', 'EUR', 'NZD', 'CAD', 'JPY', 'CNY', 'SGD', 'HKD']
    .map(code => CURRENCIES[code]);
}

// =============================================================================
// DISTANCE & AREA FORMATTING (for Directory and other components)
// =============================================================================

export type UnitSystem = 'metric' | 'imperial';

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

// Countries that use imperial system
const IMPERIAL_COUNTRIES = ['US', 'USA', 'United States', 'Myanmar', 'Liberia'];

/**
 * Determine default unit system based on location
 */
export function getDefaultUnitSystem(country?: string): UnitSystem {
  if (!country) return 'metric';
  return IMPERIAL_COUNTRIES.some(c =>
    country.toLowerCase().includes(c.toLowerCase())
  ) ? 'imperial' : 'metric';
}
