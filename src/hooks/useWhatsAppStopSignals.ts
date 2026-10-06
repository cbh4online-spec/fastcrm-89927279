import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { phoneOptOutVariants } from "@/lib/whatsapp/phoneVariants";

/** Lê opt-out e último consentimento WhatsApp de um número (RLS por workspace). Fail-closed. */
export function useWhatsAppStopSignals(workspaceId?: string | null, phone?: string | null) {
  const variants = phoneOptOutVariants(phone);
  const key = variants[0] ?? "";
  const q = useQuery({
    queryKey: ["whatsapp-stop-signals", workspaceId, key],
    enabled: !!workspaceId && variants.length > 0,
    retry: 1,
    staleTime: 60_000,
    queryFn: async () => {
      // Só consulta os números equivalentes a este contacto (nunca a lista completa).
      const [opt, cons] = await Promise.all([
        supabase.from("whatsapp_optouts").select("id").eq("workspace_id", workspaceId!).in("phone", variants).limit(1),
        supabase.from("whatsapp_consents").select("status,updated_at").eq("workspace_id", workspaceId!).in("phone", variants)
          .order("updated_at", { ascending: false }).limit(1),
      ]);
      if (opt.error) throw opt.error;
      if (cons.error) throw cons.error;
      const last = (cons.data ?? [])[0] as { status?: string } | undefined;
      return { optedOut: (opt.data ?? []).length > 0, consentRevoked: last?.status === "revoked", consentGranted: last?.status === "granted" };
    },
  });
  const noPhone = variants.length === 0;
  return {
    optedOut: q.data?.optedOut ?? false,
    consentRevoked: q.data?.consentRevoked ?? false,
    consentGranted: q.data?.consentGranted ?? false,
    pending: !noPhone && (q.isLoading || q.isError || !q.data),
    isError: q.isError,
  };
}
