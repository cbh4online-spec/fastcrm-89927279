import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import type { ClientUser } from "@/types/client-user";

interface UseClientAuthReturn {
  user: User | null;
  clientUser: ClientUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasAuthButNoClient: boolean;
}

export function useClientAuth(): UseClientAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientChecked, setClientChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientUser = useCallback(async (userId: string) => {
    setClientLoading(true);
    setClientChecked(false);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("client_users")
        .select("*")
        .eq("auth_user_id", userId)
        .in("status", ["active", "pending"])
        .maybeSingle();
      
      if (fetchError) {
        console.error("Error fetching client user:", fetchError);
        setError("Erro ao carregar perfil de cliente");
        setClientUser(null);
      } else {
        setClientUser(data as ClientUser | null);
        setError(null);
      }
    } catch (err) {
      console.error("Exception fetching client user:", err);
      setError("Erro ao carregar perfil");
      setClientUser(null);
    } finally {
      setClientLoading(false);
      setClientChecked(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Safety timeout - never stay in loading state forever
    const loadingTimeout = setTimeout(() => {
      if (isMounted && authLoading) {
        console.warn("Client auth: Loading timeout reached");
        setAuthLoading(false);
        setClientChecked(true);
      }
    }, 10000);
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log("Client auth state change:", event, session?.user?.email);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchClientUser(session.user.id);
        } else {
          setClientUser(null);
          setClientChecked(true);
          setError(null);
        }
        
        setAuthLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      console.log("Client auth initial session:", session?.user?.email);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchClientUser(session.user.id);
      } else {
        setClientChecked(true);
      }
      
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [fetchClientUser]);

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true);
    setClientChecked(false);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
      setAuthLoading(false);
      setClientChecked(true);
      return { error };
    }
    
    // Auth state change listener will handle the rest
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setClientUser(null);
    setClientChecked(false);
    setError(null);
  };

  // Loading is TRUE if:
  // - Auth is still loading OR
  // - We have user but client is still loading
  const loading = authLoading || (!!user && clientLoading);
  
  // hasAuthButNoClient is TRUE only when EVERYTHING has been verified:
  // 1. We have authenticated user
  // 2. We DON'T have clientUser
  // 3. We're NOT in general loading
  // 4. We've already checked for clientUser (fetchClientUser finished)
  // 5. There's no error
  const hasAuthButNoClient = !!user && !clientUser && !loading && clientChecked && !error;

  return {
    user,
    clientUser,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user && !!clientUser,
    hasAuthButNoClient,
  };
}
