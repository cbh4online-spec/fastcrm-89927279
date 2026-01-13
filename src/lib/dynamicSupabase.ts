import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Cache for dynamic Supabase clients
const clientCache = new Map<string, SupabaseClient<Database>>();

export function createDynamicClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient<Database> {
  const cacheKey = `${supabaseUrl}:${supabaseAnonKey}`;
  
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  clientCache.set(cacheKey, client);
  return client;
}

export function clearClientCache() {
  clientCache.clear();
}
