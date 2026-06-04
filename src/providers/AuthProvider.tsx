
import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const loadProfile = async (userId: string) => {
    const { data } = await (supabase.from('profiles') as any)
      .select('id, county, civic_credits, verification_status')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as AuthProfile);
  };

  useEffect(() => {
    // Set up auth state listener
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

        // Show success toast for sign in
        if (event === 'SIGNED_IN' && session?.user) {
          toast({
            title: "Welcome back!",
            description: "You have successfully signed in to CEKA.",
          });
        }

        // Show success toast for sign up
        if (event === 'SIGNED_UP' && session?.user) {
          toast({
            title: "Account created!",
            description: "Welcome to CEKA! Your account has been created successfully.",
          });
        }
      }
    );

    // Get initial session
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
  }, [toast]);

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
