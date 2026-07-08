import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { UnitSystem, CurrencyCode, getDefaultUnitSystem } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';

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

// Persist the preference to the user's profile (raw fetch — repo convention).
// Fire-and-forget: a failed save must never break the UI; localStorage still
// holds the value, so the experience degrades to per-device instead of erroring.
function saveUnitSystemToProfile(system: UnitSystem, userId: string) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    let accessToken = supabaseKey;
    try {
      const storedSession = localStorage.getItem(`sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`);
      if (storedSession) accessToken = JSON.parse(storedSession)?.access_token || supabaseKey;
    } catch (e) {}
    fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ unit_system: system }),
    }).then((r) => {
      if (!r.ok) console.error('[Units] Failed to save unit preference:', r.status);
    }).catch((e) => console.error('[Units] Failed to save unit preference:', e));

    // Keep AuthContext's cached profile in step, or the next reload would see
    // the stale unit_system and re-run the migration over our saved choice
    try {
      const cached = localStorage.getItem('cached_profile');
      if (cached) {
        const p = JSON.parse(cached);
        if (p && p.id === userId) {
          p.unit_system = system;
          localStorage.setItem('cached_profile', JSON.stringify(p));
        }
      }
    } catch (e) {}
  } catch (e) {
    console.error('[Units] Failed to save unit preference:', e);
  }
}

export function UnitsProvider({ children }: UnitsProviderProps) {
  const { user, profile } = useAuth();
  // Which user we've already run the sign-in precedence for (once per login)
  const syncedForUser = useRef<string | null>(null);

  // Load from localStorage or default to metric (instant boot; the profile
  // value takes over below once it arrives)
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => {
    const saved = localStorage.getItem('unitSystem');
    return (saved as UnitSystem) || 'metric';
  });

  // Signed-in precedence:
  //   a. profile.unit_system set -> the saved choice wins on every device.
  //      Re-applied whenever the profile VALUE changes, because AuthContext is
  //      cache-first: the first profile may be a stale localStorage snapshot
  //      and the fresh fetch lands moments later.
  //   b. else (explicit null = never chosen) a pre-existing localStorage value
  //      -> adopt it AND migrate it up to the profile — once per login.
  //   c. else brand-new user -> country-aware default (US -> imperial),
  //      saved to the profile — once per login.
  //   `undefined` (an ancient cached profile without the column) -> wait for
  //   the fresh fetch; acting on it caused migration to clobber saved choices.
  useEffect(() => {
    if (!user || !profile || profile.unit_system === undefined) return;

    if (profile.unit_system === 'metric' || profile.unit_system === 'imperial') {
      setUnitSystemState(profile.unit_system);
      return;
    }

    // unit_system is explicitly null — migrate/default once per login
    if (syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;

    const local = localStorage.getItem('unitSystem');
    if (local === 'metric' || local === 'imperial') {
      setUnitSystemState(local);
      saveUnitSystemToProfile(local, user.id);
      return;
    }
    const countryDefault = getDefaultUnitSystem(profile.country_code);
    setUnitSystemState(countryDefault);
    saveUnitSystemToProfile(countryDefault, user.id);
  }, [user, profile?.unit_system]);
  
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
    if (user) saveUnitSystemToProfile(system, user.id);
  };

  const toggleUnitSystem = () => {
    const next = unitSystem === 'metric' ? 'imperial' : 'metric';
    setUnitSystemState(next);
    if (user) saveUnitSystemToProfile(next, user.id);
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
