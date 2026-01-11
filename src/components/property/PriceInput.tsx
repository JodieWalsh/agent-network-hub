/**
 * PriceInput Component
 *
 * Smart price input with automatic currency detection and manual override
 * - Shows currency symbol in input (£, $, €, ¥, etc.)
 * - Displays currency code and name below
 * - Allows manual currency selection via dropdown
 * - Auto-detects currency from property country
 */

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCurrency, getPopularCurrencies, getAllCurrencies, Currency } from '@/lib/currency';

interface PriceInputProps {
  value: string;
  currency: string;
  onChange: (value: string) => void;
  onCurrencyChange: (currency: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function PriceInput({
  value,
  currency,
  onChange,
  onCurrencyChange,
  disabled = false,
  required = false,
}: PriceInputProps) {
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);
  const currencyData = getCurrency(currency);
  const popularCurrencies = getPopularCurrencies();
  const allCurrencies = getAllCurrencies();

  // Determine which currencies to show in dropdown
  const displayCurrencies = showAllCurrencies ? allCurrencies : popularCurrencies;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {/* Currency Symbol (Visual Indicator) */}
        <div className="flex flex-col items-center justify-center">
          <Label className="text-xs text-muted-foreground mb-1">Symbol</Label>
          <div className="flex items-center justify-center w-12 h-[42px] bg-accent border border-border rounded-md text-lg font-semibold text-foreground">
            {currencyData.symbol}
          </div>
        </div>

        {/* Price Input */}
        <div className="flex-1">
          <Label htmlFor="price">
            Price {required && '*'}
          </Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter price in ${currencyData.code}`}
            disabled={disabled}
            required={required}
            className="text-base"
          />
        </div>

        {/* Currency Selector */}
        <div className="w-32">
          <Label htmlFor="currency" className="text-xs text-muted-foreground">
            Currency
          </Label>
          <Select value={currency} onValueChange={onCurrencyChange}>
            <SelectTrigger id="currency" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Popular Currencies */}
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Popular
              </div>
              {popularCurrencies.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.code} - {curr.symbol}
                </SelectItem>
              ))}

              {/* Show All / Show Less Toggle */}
              <div className="border-t border-border my-1"></div>
              <button
                type="button"
                onClick={() => setShowAllCurrencies(!showAllCurrencies)}
                className="w-full px-2 py-1.5 text-xs text-forest hover:bg-accent rounded-sm text-left"
              >
                {showAllCurrencies ? '▲ Show less' : '▼ Show all currencies'}
              </button>

              {/* All Currencies (when expanded) */}
              {showAllCurrencies && (
                <>
                  <div className="border-t border-border my-1"></div>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    All Currencies
                  </div>
                  {allCurrencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Currency Info Display */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">{currencyData.code}</span>
        <span>•</span>
        <span>{currencyData.name}</span>
        <span>•</span>
        <span className="text-xs">Enter whole number only (e.g., 900000 for {currencyData.symbol}900,000)</span>
      </div>
    </div>
  );
}
