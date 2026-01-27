import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserRole, ApprovalStatus, UserPermissionContext } from "@/lib/permissions";
import { createDefaultPreferences } from "@/lib/notifications";

// Helper to get auth headers for raw fetch (workaround for Supabase client hanging)
const getAuthHeaders = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let accessToken = supabaseKey;
  try {
    const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
    const storedSession = localStorage.getItem(storageKey);
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      accessToken = parsed?.access_token || supabaseKey;
    }
  } catch (e) {}

  return { supabaseUrl, supabaseKey, accessToken };
};

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  user_type: string;
  approval_status: ApprovalStatus;
  reputation_score: number;
  points: number;
  city: string | null;
  bio: string | null;
  is_verified: boolean;
  // Subscription fields
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  stripe_customer_id: string | null;
  // Stripe Connect fields (for inspectors)
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_complete: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, userType: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile data for the current user - FAST with cache-first approach
  const fetchProfile = async (userId: string) => {
    console.log('🔵 [AuthContext] Fetching profile for user:', userId);

    // IMMEDIATELY try to use cached profile to avoid blocking
    try {
      const cachedProfile = localStorage.getItem('cached_profile');
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        // Only use cache if it's for the same user
        if (parsed.id === userId) {
          console.log('📦 [AuthContext] Using cached profile immediately');
          setProfile(parsed);
        }
      }
    } catch (cacheErr) {
      // Ignore cache errors
    }

    // Then fetch fresh data using raw fetch (Supabase client hangs)
    try {
      const startTime = Date.now();
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=*&id=eq.${userId}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.pgrst.object+json',
          },
        }
      );

      const duration = Date.now() - startTime;
      console.log(`🔵 [AuthContext] Query completed in ${duration}ms`);

      if (!response.ok) {
        console.error("🔴 [AuthContext] Failed to fetch profile:", response.status);
        return; // Keep using cached profile if we have one
      }

      const data = await response.json();

      if (data) {
        console.log('✅ [AuthContext] Profile fetched successfully');
        setProfile(data as Profile);

        // Update cache
        try {
          localStorage.setItem('cached_profile', JSON.stringify(data));
        } catch (cacheErr) {
          // Ignore
        }
      }
    } catch (err) {
      console.error("🔴 [AuthContext] Profile fetch error:", err instanceof Error ? err.message : String(err));
      // Keep using cached profile if available
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Ensure profile exists for email/password users (after email confirmation)
  const ensureEmailUserProfile = async (user: User) => {
    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // Check if profile already exists
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id&id=eq.${user.id}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const profiles = await checkResponse.json();

      if (!profiles || profiles.length === 0) {
        // Profile doesn't exist, create it
        console.log('🟡 [AuthContext] Creating profile for email user:', user.id);

        // Get user metadata (set during signup)
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        const userType = user.user_metadata?.user_type || 'buyers_agent';

        const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            id: user.id,
            email: user.email,
            full_name: fullName,
            user_type: userType,
            role: 'guest',
            approval_status: 'pending', // All new users require admin approval
            application_date: new Date().toISOString(),
            reputation_score: 0,
            points: 0,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('🔴 [AuthContext] Profile creation failed:', errorText);
        } else {
          console.log('✅ [AuthContext] Email user profile created successfully');
          // Create default notification preferences for new user
          try {
            await createDefaultPreferences(user.id);
            console.log('✅ [AuthContext] Default notification preferences created');
          } catch (notifError) {
            console.error('🔴 [AuthContext] Failed to create notification preferences:', notifError);
          }
          // Refresh profile to get the new data
          await fetchProfile(user.id);
        }
      } else {
        console.log('🟡 [AuthContext] Profile already exists for email user');
      }
    } catch (error) {
      console.error('🔴 [AuthContext] Error ensuring email user profile:', error);
    }
  };

  const ensureOAuthProfile = async (user: User) => {
    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // Check if profile already exists
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id,avatar_url,full_name&id=eq.${user.id}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const profiles = await checkResponse.json();
      const existingProfile = profiles?.[0];

      const googleName = user.user_metadata.full_name || user.user_metadata.name;
      const googleAvatar = user.user_metadata.avatar_url || user.user_metadata.picture;

      if (!existingProfile) {
        // Create new profile for OAuth user
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            id: user.id,
            email: user.email,
            full_name: googleName,
            avatar_url: googleAvatar,
            user_type: 'buyers_agent', // Default - they can change this later
            role: 'guest',
            approval_status: 'pending', // All new users require admin approval
            application_date: new Date().toISOString(),
            reputation_score: 0,
            points: 0,
          }),
        });

        if (profileResponse.ok) {
          // Create default notification preferences for new OAuth user
          try {
            await createDefaultPreferences(user.id);
            console.log('✅ [AuthContext] Default notification preferences created for OAuth user');
          } catch (notifError) {
            console.error('🔴 [AuthContext] Failed to create notification preferences:', notifError);
          }
        }
      } else {
        // Update existing profile with Google data if avatar is missing
        const updates: any = {};
        if (!existingProfile.avatar_url && googleAvatar) {
          updates.avatar_url = googleAvatar;
        }
        if (!existingProfile.full_name && googleName) {
          updates.full_name = googleName;
        }

        if (Object.keys(updates).length > 0) {
          await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(updates),
          });
        }
      }

      // Refresh profile to get updated data
      await fetchProfile(user.id);
    } catch (error) {
      console.error('Error ensuring OAuth profile:', error);
    }
  };

  useEffect(() => {
    console.log('🟡 [AuthContext] Setting up auth state listener');

    // IMPORTANT: onAuthStateChange callback runs synchronously.
    // Calling async Supabase methods directly here causes a DEADLOCK.
    // We must use setTimeout to defer async operations.
    // See: https://github.com/supabase/supabase-js/issues/1620
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🟡 [AuthContext] Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);

        // Fetch profile when user logs in - DEFERRED to avoid deadlock
        if (session?.user) {
          console.log('🟡 [AuthContext] User session active, deferring profile fetch...');
          const isOAuthSignIn = event === 'SIGNED_IN' && session.user.app_metadata.provider === 'google';
          const isEmailConfirmation = event === 'SIGNED_IN' && !session.user.app_metadata.provider;

          // Defer async operations to avoid Supabase client deadlock
          setTimeout(async () => {
            // First, try to fetch existing profile
            await fetchProfile(session.user.id);

            // If OAuth sign-in, ensure profile exists with Google data
            if (isOAuthSignIn) {
              console.log('🟡 [AuthContext] OAuth sign-in detected, ensuring profile...');
              await ensureOAuthProfile(session.user);
            }

            // If email confirmation (new user), ensure profile exists
            if (isEmailConfirmation) {
              console.log('🟡 [AuthContext] Email sign-in detected, ensuring profile exists...');
              await ensureEmailUserProfile(session.user);
            }

            setLoading(false);
          }, 0);
        } else {
          console.log('🟡 [AuthContext] No user session, clearing profile');
          setProfile(null);
          setLoading(false);
        }
      }
    );

    console.log('🟡 [AuthContext] Fetching initial session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🟡 [AuthContext] Initial session retrieved:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('🟡 [AuthContext] Deferring profile fetch for initial session...');

        // Defer async operations to avoid Supabase client deadlock
        setTimeout(async () => {
          await fetchProfile(session.user.id);

          if (session.user.app_metadata.provider === 'google') {
            console.log('🟡 [AuthContext] OAuth user, ensuring profile...');
            await ensureOAuthProfile(session.user);
          }
          console.log('🟡 [AuthContext] Setting loading to false');
          setLoading(false);
        }, 0);
      } else {
        console.log('🟡 [AuthContext] No initial session found');
        setLoading(false);
      }
    }).catch((err) => {
      console.error('🔴 [AuthContext] getSession error:', err);
      setLoading(false);
    });

    return () => {
      console.log('🟡 [AuthContext] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, userType: string) => {
    const redirectUrl = `${window.location.origin}/`;

    console.log('[AuthContext] Starting signup for:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          user_type: userType,
        },
      },
    });

    console.log('[AuthContext] Signup result:', {
      hasUser: !!data.user,
      hasSession: !!data.session,
      error: error?.message
    });

    if (!error && data.user && data.session) {
      // Create profile with guest role by default
      // Use Supabase client - deadlock is now fixed with setTimeout in auth callback
      console.log('[AuthContext] Creating profile for new user:', data.user.id);

      // Small delay to ensure auth state is fully propagated
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          user_type: userType as "buyers_agent" | "real_estate_agent" | "conveyancer" | "mortgage_broker",
          role: 'guest',
          approval_status: 'pending', // All new users require admin approval
          application_date: new Date().toISOString(),
          reputation_score: 0,
          points: 0,
        });

        if (profileError) {
          console.error('Profile creation failed:', profileError);
          return { error: profileError as unknown as Error };
        }

        console.log('[AuthContext] Profile created successfully');

        // Create default notification preferences for new user
        try {
          await createDefaultPreferences(data.user.id);
          console.log('[AuthContext] Default notification preferences created');
        } catch (notifError) {
          console.error('[AuthContext] Failed to create notification preferences:', notifError);
          // Don't fail signup if notification preferences fail
        }
      } catch (profileError: any) {
        console.error('Profile creation error:', profileError);
        return { error: profileError as Error };
      }
    } else if (!error && data.user && !data.session) {
      // Email confirmation required - profile will be created after confirmation
      console.log('[AuthContext] Email confirmation required, profile will be created after confirmation');
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    console.log('🟢 AuthContext signOut() called');
    try {
      // Add timeout wrapper (3 seconds)
      console.log('🟢 Calling supabase.auth.signOut() with timeout...');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sign out timeout')), 3000)
      );

      const signOutPromise = supabase.auth.signOut();

      const result = await Promise.race([signOutPromise, timeoutPromise]);
      const { error } = result as any;

      if (error) {
        console.error('🟢 Supabase signOut error:', error);
        // Don't throw - still clear state locally
      }

      console.log('🟢 Supabase signOut completed, clearing state...');
      // Explicitly clear state (even if Supabase call failed)
      setUser(null);
      setSession(null);
      setProfile(null);
      console.log('🟢 State cleared successfully');
    } catch (error) {
      console.error('🟢 Sign out error (clearing state anyway):', error);
      // Clear state even on timeout/error
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper hook to get permission context for current user
export function usePermissions(): UserPermissionContext {
  const { user, profile } = useAuth();
  return {
    isAuthenticated: !!user,
    role: profile?.role || null,
    approvalStatus: profile?.approval_status || null,
    userId: user?.id || null,
  };
}
