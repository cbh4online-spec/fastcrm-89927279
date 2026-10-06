import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { consentPhoneKey } from "@/lib/whatsapp/consent";

/** Lê opt-out e último consentimento WhatsApp de um número (RLS por workspace). Fail-closed. */
export function useWhatsAppStopSignals(workspaceId?: string | null, phone?: string | null) {
  const digits = consentPhoneKey(phone);
  const q = useQuery({
    queryKey: ["whatsapp-stop-signals", workspaceId, digits],
    enabled: !!workspaceId && digits.length >= 6,
    staleTime: 60_000,
    queryFn: async () => {
      const variants = Array.from(new Set([digits, `+${digits}`, phone ?? ""].filter(Boolean)));
      const list = variants.map((v) => `phone.eq.${v}`).join(",");
      const [opt, cons] = await Promise.all([
        supabase.from("whatsapp_optouts").select("id").eq("workspace_id", workspaceId!).or(list).limit(1),
        supabase.from("whatsapp_consents").select("status,updated_at").eq("workspace_id", workspaceId!).or(list)
          .order("updated_at", { ascending: false }).limit(1),
      ]);
      if (opt.error) throw opt.error;
      if (cons.error) throw cons.error;
      const last = (cons.data ?? [])[0] as { status?: string } | undefined;
      return { optedOut: (opt.data ?? []).length > 0, consentRevoked: last?.status === "revoked", consentGranted: last?.status === "granted" };
    },
  });
  const noPhone = digits.length < 6;
  return {
    optedOut: q.data?.optedOut ?? false,
    consentRevoked: q.data?.consentRevoked ?? false,
    consentGranted: q.data?.consentGranted ?? false,
    pending: !noPhone && (q.isLoading || q.isError || !q.data),
    isError: q.isError,
  };
}
