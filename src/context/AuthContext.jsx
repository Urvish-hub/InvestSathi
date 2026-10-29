import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, getSupabaseConfig } from '../lib/supabaseClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configStatus, setConfigStatus] = useState(getSupabaseConfig());

  // Function to load profile from public.profiles table
  const loadUserProfile = async (userId) => {
    if (!userId || !isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Could not load profile from profiles table:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('Error fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const currentConfig = getSupabaseConfig();
      setConfigStatus(currentConfig);

      if (!currentConfig.isConfigured) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const sessionRes = await supabase.auth.getSession();
        const initialSession = sessionRes?.data?.session || null;

        if (sessionRes?.error) {
          console.warn('Auth getSession warning:', sessionRes.error.message);
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            const userProf = await loadUserProfile(initialSession.user.id);
            if (mounted) setProfile(userProf);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize Supabase auth:', err);
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Set up auth state change listener safely
    let authSubscription = null;
    try {
      const authRes = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession || null);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const userProf = await loadUserProfile(currentSession.user.id);
          if (mounted) setProfile(userProf);
        } else {
          if (mounted) setProfile(null);
        }
        setLoading(false);
      });

      authSubscription = authRes?.data?.subscription || null;
    } catch (authErr) {
      console.warn('Could not subscribe to auth state changes:', authErr);
      if (mounted) setLoading(false);
    }

    return () => {
      mounted = false;
      if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  /**
   * Register with email, password, and full name.
   */
  const signUp = async (email, password, fullName) => {
    const cfg = getSupabaseConfig();
    if (!cfg.isConfigured) {
      throw new Error(
        cfg.configError ||
        'Supabase is not configured yet. Please set your Supabase Project URL and Key via the setup dialog or in .env.'
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) throw error;

    // If session was immediately created (email confirmation disabled in Supabase), ensure profile exists
    if (data?.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName.trim(),
        });
      } catch (e) {
        // Ignored; trigger handles this in PostgreSQL
      }
    }

    return data;
  };

  /**
   * Log in with email and password.
   */
  const signIn = async (email, password) => {
    const cfg = getSupabaseConfig();
    if (!cfg.isConfigured) {
      throw new Error(
        cfg.configError ||
        'Supabase is not configured yet. Please set your Supabase Project URL and Key via the setup dialog or in .env.'
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;

    if (data?.user) {
      const userProf = await loadUserProfile(data.user.id);
      setProfile(userProf);
    }

    return data;
  };

  /**
   * Sign out current user.
   */
  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Sign out warning:', error.message);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  /**
   * Send password reset email.
   */
  const resetPassword = async (email) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please add your credentials in Settings or .env.');
    }

    const redirectUrl = `${window.location.origin}/reset-password`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });

    if (error) throw error;
    return data;
  };

  /**
   * Update password (after following password reset link).
   */
  const updatePassword = async (newPassword) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please add your credentials in Settings or .env.');
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  };

  /**
   * Update profile details in public.profiles.
   */
  const updateProfile = async (updates) => {
    if (!user) throw new Error('User not logged in');

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isConfigured: configStatus.isConfigured,
    configStatus,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile: () => user && loadUserProfile(user.id).then(setProfile),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
