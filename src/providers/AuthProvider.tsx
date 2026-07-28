
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuthProfile {
  id: string;
  county?: string;
  civic_credits?: number;
  verification_status?: 'unverified' | 'official_org' | 'ceka_partner' | 'supporter';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // ── CRITICAL: Store toast in a ref so the subscription useEffect NEVER
  //    re-runs due to a toast reference change.  The subscription must remain
  //    alive for the full lifetime of the AuthProvider, otherwise SIGNED_IN
  //    events fired right after signInWithPassword() are silently dropped.
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  // StrictMode guard: prevents double-initialization on dev double-mount
  const initialized = useRef(false);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await (supabase.from('profiles') as any)
      .select('id, county, civic_credits, verification_status')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as AuthProfile);
  }, []);

  useEffect(() => {
    // Prevent double-mount in React 18 StrictMode from firing two auth bootstrap calls
    if (initialized.current) return;
    initialized.current = true;

    // Set up auth state listener — dependency array is EMPTY so this never re-runs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
           loadProfile(session.user.id).finally(() => setLoading(false));
        } else {
           setProfile(null);
           setLoading(false);
        }

        // Use toastRef to call toast without it being a dependency of this effect
        if (event === 'SIGNED_IN' && session?.user) {
          toastRef.current({
            title: "Welcome back!",
            description: "You have successfully signed in to CEKA.",
          });
        }

        if (event === 'SIGNED_UP' && session?.user) {
          toastRef.current({
            title: "Account created!",
            description: "Welcome to CEKA! Your account has been created successfully.",
          });
        }
      }
    );

    // Get initial session — fires once per app lifetime due to initialized guard
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
         loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
         setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // ← Empty deps: subscription must never be re-created

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
