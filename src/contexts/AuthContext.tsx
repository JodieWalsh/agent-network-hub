import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserRole, ApprovalStatus, UserPermissionContext } from "@/lib/permissions";

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

  // Fetch profile data for the current user with timeout
  const fetchProfile = async (userId: string) => {
    console.log('🔵 [AuthContext] Fetching profile for user:', userId);

    try {
      // Wrap the entire operation in a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error('⏰ [AuthContext] Profile fetch timed out after 5 seconds');
          reject(new Error('Profile fetch timeout'));
        }, 5000);
      });

      const fetchPromise = (async () => {
        console.log('🔵 [AuthContext] Starting direct query...');
        const startTime = Date.now();

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        const duration = Date.now() - startTime;
        console.log(`🔵 [AuthContext] Query completed in ${duration}ms`);

        if (error) {
          console.error("🔴 [AuthContext] Failed to fetch profile:", error);
          throw error;
        }

        if (!data) {
          console.warn('⚠️ [AuthContext] No profile data returned');
          throw new Error('No profile data');
        }

        console.log('✅ [AuthContext] Profile fetched successfully:', {
          id: data.id,
          full_name: data.full_name,
          role: data.role,
          user_type: data.user_type,
        });

        return data;
      })();

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      setProfile(data as Profile);

      // Cache profile to localStorage for offline/fallback access
      try {
        localStorage.setItem('cached_profile', JSON.stringify(data));
        console.log('💾 [AuthContext] Profile cached to localStorage');
      } catch (cacheErr) {
        console.error('🔴 [AuthContext] Failed to cache profile:', cacheErr);
      }

    } catch (err) {
      console.error("🔴 [AuthContext] Profile fetch failed:", err instanceof Error ? err.message : String(err));

      // On timeout or error, try to load from localStorage as fallback
      try {
        const cachedProfile = localStorage.getItem('cached_profile');
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          console.log('📦 [AuthContext] Using cached profile from localStorage');
          setProfile(parsed);
          return;
        }
      } catch (cacheErr) {
        console.error('🔴 [AuthContext] Failed to load cached profile:', cacheErr);
      }

      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const ensureOAuthProfile = async (user: User) => {
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      const googleName = user.user_metadata.full_name || user.user_metadata.name;
      const googleAvatar = user.user_metadata.avatar_url || user.user_metadata.picture;

      if (!existingProfile) {
        // Create new profile for OAuth user
        await supabase.from('profiles').insert({
          id: user.id,
          full_name: googleName,
          avatar_url: googleAvatar,
          user_type: 'buyers_agent', // Default - they can change this later
          role: 'guest',
          approval_status: 'approved',
          reputation_score: 0,
          points: 0,
        });
      } else {
        // Update existing profile with Google data if avatar is missing
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, full_name')
          .eq('id', user.id)
          .single();

        const updates: any = {};
        if (!profile?.avatar_url && googleAvatar) {
          updates.avatar_url = googleAvatar;
        }
        if (!profile?.full_name && googleName) {
          updates.full_name = googleName;
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🟡 [AuthContext] Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);

        // Fetch profile when user logs in
        if (session?.user) {
          console.log('🟡 [AuthContext] User session active, fetching profile...');
          // Check if this is a new OAuth sign-in (SIGNED_IN event with OAuth provider)
          const isOAuthSignIn = event === 'SIGNED_IN' && session.user.app_metadata.provider === 'google';
          await fetchProfile(session.user.id);

          // If OAuth sign-in, ensure profile exists with Google data
          if (isOAuthSignIn) {
            console.log('🟡 [AuthContext] OAuth sign-in detected, ensuring profile...');
            await ensureOAuthProfile(session.user);
          }
        } else {
          console.log('🟡 [AuthContext] No user session, clearing profile');
          setProfile(null);
        }

        setLoading(false);
      }
    );

    console.log('🟡 [AuthContext] Fetching initial session...');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🟡 [AuthContext] Initial session retrieved:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('🟡 [AuthContext] Fetching profile for initial session...');
        await fetchProfile(session.user.id);

        // Ensure OAuth profile exists if this is an OAuth user
        if (session.user.app_metadata.provider === 'google') {
          console.log('🟡 [AuthContext] OAuth user, ensuring profile...');
          await ensureOAuthProfile(session.user);
        }
      } else {
        console.log('🟡 [AuthContext] No initial session found');
      }

      console.log('🟡 [AuthContext] Setting loading to false');
      setLoading(false);
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

    if (!error && data.user) {
      // Create profile with guest role by default
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        user_type: userType as "buyers_agent" | "real_estate_agent" | "conveyancer" | "mortgage_broker",
        role: 'guest' as UserRole,
        approval_status: 'approved' as ApprovalStatus,
        reputation_score: 0,
        points: 0,
      });

      if (profileError) {
        return { error: profileError as unknown as Error };
      }
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
