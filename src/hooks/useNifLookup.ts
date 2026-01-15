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
}

export interface UseNifLookupOptions {
  onSuccess?: (data: NifLookupResult) => void;
  onError?: (error: string) => void;
  showToasts?: boolean;
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

    try {
      const { data: response, error } = await supabase.functions.invoke("lookup-company-nif", {
        body: { nif: cleanNif },
      });

      if (error) throw error;

      if (response.error) {
        setStatus("error");
        setMessage(response.error);
        if (showToasts) toast.error(response.error);
        onError?.(response.error);
        return null;
      }

      if (response.success && response.data) {
        const result: NifLookupResult = response.data;
        setData(result);
        setStatus("success");
        setMessage("Dados da empresa encontrados!");
        if (showToasts) toast.success("Dados da empresa encontrados!");
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
      console.error("Error looking up company:", error);
      const errorMsg = "Erro ao pesquisar empresa. Tente novamente.";
      setStatus("error");
      setMessage(errorMsg);
      if (showToasts) toast.error(errorMsg);
      onError?.(errorMsg);
      return null;
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
    lookup,
    reset,
    isLoading,
    status,
    message,
    data,
  };
}
