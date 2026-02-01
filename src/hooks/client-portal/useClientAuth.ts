import { useState, useEffect } from "react";
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
}

export function useClientAuth(): UseClientAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Safety timeout - never stay in loading state forever
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn("Client auth: Loading timeout reached");
        setLoading(false);
      }
    }, 10000);
    
    const fetchClientUser = async (userId: string) => {
      try {
        const { data, error: fetchError } = await supabase
          .from("client_users")
          .select("*")
          .eq("auth_user_id", userId)
          .in("status", ["active", "pending"])
          .maybeSingle();
        
        if (!isMounted) return;
        
        if (fetchError) {
          console.error("Error fetching client user:", fetchError);
          setError("Erro ao carregar perfil de cliente");
          setClientUser(null);
        } else {
          setClientUser(data as ClientUser | null);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Exception fetching client user:", err);
          setError("Erro ao carregar perfil");
          setClientUser(null);
        }
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchClientUser(session.user.id);
        } else {
          setClientUser(null);
          setError(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchClientUser(session.user.id);
      }
      
      setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
      setLoading(false);
      return { error };
    }
    
    // Set loading to false immediately after successful login
    // The onAuthStateChange will also set it, but this prevents race conditions
    setLoading(false);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setClientUser(null);
  };

  return {
    user,
    clientUser,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user && !!clientUser,
  };
}
