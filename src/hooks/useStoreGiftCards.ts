import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StoreGiftCard {
  id: string;
  workspace_id: string;
  code: string;
  initial_balance: number;
  current_balance: number;
  currency: string;
  status: string;
  purchaser_name: string | null;
  purchaser_email: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  message: string | null;
  stripe_payment_intent_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GC-${segment()}-${segment()}-${segment()}`;
}

// Admin: list all gift cards for workspace
export function useStoreGiftCards(workspaceId: string) {
  return useQuery({
    queryKey: ["store-gift-cards", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_gift_cards")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as StoreGiftCard[];
    },
    enabled: !!workspaceId,
  });
}

// Admin: create gift card
export function useCreateGiftCard(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      initial_balance: number;
      currency?: string;
      recipient_name?: string;
      recipient_email?: string;
      message?: string;
    }) => {
      const code = generateGiftCardCode();
      const { data, error } = await supabase
        .from("store_gift_cards")
        .insert({
          workspace_id: workspaceId,
          code,
          initial_balance: input.initial_balance,
          current_balance: input.initial_balance,
          currency: input.currency || "EUR",
          status: "active",
          recipient_name: input.recipient_name || null,
          recipient_email: input.recipient_email || null,
          message: input.message || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-gift-cards", workspaceId] });
      toast.success("Gift Card criado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// Admin: toggle status
export function useToggleGiftCardStatus(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "active" ? "disabled" : "active";
      const { error } = await supabase
        .from("store_gift_cards")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-gift-cards", workspaceId] });
      toast.success("Estado atualizado!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// Public: validate gift card by code
export async function validateGiftCard(code: string, workspaceId: string) {
  const { data, error } = await supabase
    .from("store_gift_cards")
    .select("id, code, current_balance, currency, status, expires_at")
    .eq("code", code.toUpperCase().trim())
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  if (data.current_balance <= 0) return null;
  return data;
}
