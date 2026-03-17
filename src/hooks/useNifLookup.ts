import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NifLookupResult {
  // Basic info
  company_name: string | null;
  tax_id: string | null;
  
  // Address
  address: string | null;
  postal_code: string | null;
  city: string | null;
  
  // Geographic info
  region: string | null;
  county: string | null;
  parish: string | null;
  
  // Business info
  cae_codes: string[];
  cae_description: string | null;
  company_status: string | null;
  legal_nature: string | null;
  capital_social: string | null;
  founding_date: string | null;
  
  // Contacts
  email: string | null;
  phone: string | null;
  website: string | null;
  fax: string | null;
  
  // External links
  racius_url: string | null;
  
  // Rich context from Racius
  about: string | null;
  activity_description: string | null;
  company_age: number | null;
}

export interface UseNifLookupOptions {
  onSuccess?: (data: NifLookupResult) => void;
  onError?: (error: string) => void;
  showToasts?: boolean;
}

async function invokeNifLookup(cleanNif: string): Promise<{ data: any; error: any }> {
  return supabase.functions.invoke("lookup-company-nif", {
    body: { nif: cleanNif },
  });
}

export function useNifLookup(options: UseNifLookupOptions = {}) {
  const { onSuccess, onError, showToasts = true } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<NifLookupResult | null>(null);

  async function lookup(nif: string): Promise<NifLookupResult | null> {
    const cleanNif = nif.toString().replace(/\s/g, '');
    
    if (!cleanNif || cleanNif.length !== 9 || !/^\d{9}$/.test(cleanNif)) {
      const errorMsg = "NIF inválido. Deve ter 9 dígitos.";
      setStatus("error");
      setMessage(errorMsg);
      if (showToasts) toast.error(errorMsg);
      onError?.(errorMsg);
      return null;
    }

    setIsLoading(true);
    setStatus("idle");
    setMessage(null);

    // Try up to 2 attempts (initial + 1 silent retry for transient errors)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data: response, error } = await invokeNifLookup(cleanNif);

        if (error) {
          // Try to extract error message from the response context
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === 'function') {
            try {
              const body = await ctx.json();
              if (body?.retryable && attempt === 0) {
                console.log(`[NIF] Retryable error on attempt ${attempt + 1}, retrying...`);
                await new Promise(r => setTimeout(r, 600));
                continue;
              }
              if (body?.error) {
                setStatus("error");
                setMessage(body.error);
                if (showToasts) toast.error(body.error);
                onError?.(body.error);
                return null;
              }
            } catch {}
          }
          throw error;
        }

        // Handle retryable errors from backend (returned as 200 with retryable flag)
        if (response?.retryable && !response?.success && attempt === 0) {
          console.log(`[NIF] Retryable error on attempt ${attempt + 1}, retrying silently...`);
          await new Promise(r => setTimeout(r, 600));
          continue;
        }

        if (response?.error && !response?.success) {
          const errorMsg = response.retryable
            ? "Serviço temporariamente indisponível. Tente novamente."
            : response.error;
          setStatus("error");
          setMessage(errorMsg);
          if (showToasts) toast.error(errorMsg);
          onError?.(errorMsg);
          return null;
        }

        if (response?.success && response?.data) {
          const result: NifLookupResult = response.data;
          setData(result);
          setStatus("success");
          setMessage("Dados da empresa encontrados!");
          if (showToasts) toast.success("Dados da empresa encontrados!");
          console.log(`[COMPANIES] NIF lookup success: ${cleanNif}`);
          onSuccess?.(result);
          return result;
        } else {
          const errorMsg = "Empresa não encontrada para este NIF";
          setStatus("error");
          setMessage(errorMsg);
          if (showToasts) toast.error(errorMsg);
          onError?.(errorMsg);
          return null;
        }
      } catch (error) {
        // On first attempt, retry silently
        if (attempt === 0) {
          console.warn(`[NIF] Attempt ${attempt + 1} failed, retrying...`, (error as Error).message);
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        console.warn(`[COMPANIES] NIF lookup failed: ${cleanNif}`, error);
        const errorMsg = "Erro ao pesquisar empresa. Tente novamente.";
        setStatus("error");
        setMessage(errorMsg);
        if (showToasts) toast.error(errorMsg);
        onError?.(errorMsg);
        return null;
      }
    }

    setIsLoading(false);
    return null;
  }

  // Wrap lookup to always clear loading
  async function lookupWithCleanup(nif: string): Promise<NifLookupResult | null> {
    try {
      return await lookup(nif);
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setIsLoading(false);
    setStatus("idle");
    setMessage(null);
    setData(null);
  }

  return {
    lookup: lookupWithCleanup,
    reset,
    isLoading,
    status,
    message,
    data,
  };
}
