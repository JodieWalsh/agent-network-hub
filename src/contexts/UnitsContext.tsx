import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UnitSystem, CurrencyCode, getDefaultUnitSystem } from '@/lib/currency';

interface UnitsContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  toggleUnitSystem: () => void;
  userCurrency: CurrencyCode;
  setUserCurrency: (currency: CurrencyCode) => void;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

interface UnitsProviderProps {
  children: ReactNode;
}

export function UnitsProvider({ children }: UnitsProviderProps) {
  // Load from localStorage or default to metric
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => {
    const saved = localStorage.getItem('unitSystem');
    return (saved as UnitSystem) || 'metric';
  });
  
  const [userCurrency, setUserCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('userCurrency');
    return (saved as CurrencyCode) || 'AUD';
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('unitSystem', unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    localStorage.setItem('userCurrency', userCurrency);
  }, [userCurrency]);

  const setUnitSystem = (system: UnitSystem) => {
    setUnitSystemState(system);
  };

  const toggleUnitSystem = () => {
    setUnitSystemState(prev => prev === 'metric' ? 'imperial' : 'metric');
  };

  const setUserCurrency = (currency: CurrencyCode) => {
    setUserCurrencyState(currency);
  };

  return (
    <UnitsContext.Provider
      value={{
        unitSystem,
        setUnitSystem,
        toggleUnitSystem,
        userCurrency,
        setUserCurrency,
      }}
    >
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (context === undefined) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return context;
}
